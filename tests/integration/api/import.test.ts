import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { clearMockStore, getMockStore, getDemoUserContext } from '../../setup'

// Must mock before importing routes that pull in the service pipeline
vi.mock('@server/import/pdf-extractor', () => ({
  extractPdfText: vi.fn(async () => 'fake pdf text content'),
  PdfPasswordError: class PdfPasswordError extends Error {
    constructor(public code: string) { super(code) }
  },
}))

vi.mock('@server/import/ai-row-extractor', () => ({
  extractRowsFromText: vi.fn(async () => ([
    { raw_data: {}, amount: 450, datetime: '2026-02-15T00:00:00', type: 'EXPENSE', narration: 'Zomato' },
    { raw_data: {}, amount: 200, datetime: '2026-02-14T00:00:00', type: 'EXPENSE', narration: 'Unknown vendor' },
  ])),
}))

vi.mock('@server/import/rule-classifier', () => ({
  classifyRows: vi.fn((rows) =>
    rows.map((r: { narration: string; amount: number; datetime: string; type: string }) => ({
      ...r,
      category: null,
      platform: null,
      payment_method: null,
      notes: null,
      tags: [],
      recurring_flag: false,
      confidence: { amount: 1.0, datetime: 0.95, type: 1.0, category: 0, platform: 0, payment_method: 0 },
      classified_by: 'RULE',
    }))
  ),
}))

vi.mock('@server/queue/ai-classification-queue', () => ({
  aiClassificationQueue: {
    enqueue: vi.fn(async (rows: unknown[]) =>
      rows.map((r: unknown) => ({
        ...(r as object),
        category: 'Other',
        platform: null,
        payment_method: null,
        notes: null,
        tags: [],
        recurring_flag: false,
        confidence: { category: 0.6 },
        classified_by: 'AI',
      }))
    ),
  },
}))

import { POST as postSession } from '@/app/api/import/sessions/route'
import { GET as getSession } from '@/app/api/import/sessions/[id]/route'
import { GET as getRows } from '@/app/api/import/sessions/[id]/rows/route'
import { PATCH as patchRow } from '@/app/api/import/sessions/[id]/rows/[rowId]/route'
import { POST as confirmAll } from '@/app/api/import/sessions/[id]/confirm-all/route'

// Helper to flush the async pipeline
async function flushPipeline() {
  await new Promise(r => setTimeout(r, 0))
  await new Promise(r => setTimeout(r, 0))
}

function makeFormDataRequest(file: File): NextRequest {
  const fd = new FormData()
  fd.append('file', file)
  return new NextRequest('http://localhost/api/import/sessions', {
    method: 'POST',
    body: fd,
  })
}

function makeJsonRequest(url: string, method: string, body: object): NextRequest {
  return new NextRequest(url, {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const _ = getDemoUserContext() // ensure demo user env is configured

beforeEach(() => clearMockStore())

// ────────────────────────────────────────────────────────────
// POST /api/import/sessions
// ────────────────────────────────────────────────────────────
describe('POST /api/import/sessions', () => {
  it('returns 400 when no file is provided', async () => {
    const req = new NextRequest('http://localhost/api/import/sessions', {
      method: 'POST',
      body: new FormData(), // empty form
    })
    const res = await postSession(req)
    expect(res.status).toBe(400)
  })

  it('returns 422 for non-PDF file type (.csv)', async () => {
    const file = new File(['csv content'], 'report.csv', { type: 'text/csv' })
    const res = await postSession(makeFormDataRequest(file))
    expect(res.status).toBe(422)
  })

  it('returns sessionId for a valid PDF upload', async () => {
    const file = new File(['%PDF-1.4 fake'], 'statement.pdf', { type: 'application/pdf' })
    const res = await postSession(makeFormDataRequest(file))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(typeof body.data.sessionId).toBe('string')
  })
})

// ────────────────────────────────────────────────────────────
// GET /api/import/sessions/[id]
// ────────────────────────────────────────────────────────────
describe('GET /api/import/sessions/[id]', () => {
  it('returns 404 for unknown session id', async () => {
    const req = new NextRequest('http://localhost/api/import/sessions/unknown-id')
    const res = await getSession(req, { params: { id: 'unknown-id' } })
    expect(res.status).toBe(404)
  })

  it('returns session data for a known session', async () => {
    const file = new File(['%PDF-1.4 fake'], 'statement.pdf', { type: 'application/pdf' })
    const postRes = await postSession(makeFormDataRequest(file))
    const { data: { sessionId } } = await postRes.json()

    const req = new NextRequest(`http://localhost/api/import/sessions/${sessionId}`)
    const res = await getSession(req, { params: { id: sessionId } })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.session.id).toBe(sessionId)
  })
})

// ────────────────────────────────────────────────────────────
// GET /api/import/sessions/[id]/rows
// ────────────────────────────────────────────────────────────
describe('GET /api/import/sessions/[id]/rows', () => {
  it('returns 409 while session is still PARSING', async () => {
    const file = new File(['%PDF-1.4 fake'], 'statement.pdf', { type: 'application/pdf' })
    const postRes = await postSession(makeFormDataRequest(file))
    const { data: { sessionId } } = await postRes.json()

    // Force session to stay in PARSING state
    const store = getMockStore()
    const session = store.import_sessions.find(s => s.id === sessionId)
    if (session) (session as Record<string, unknown>).status = 'PARSING'

    const req = new NextRequest(`http://localhost/api/import/sessions/${sessionId}/rows`)
    const res = await getRows(req, { params: { id: sessionId } })
    expect(res.status).toBe(409)
  })

  it('returns rows after pipeline completes', async () => {
    const file = new File(['%PDF-1.4 fake'], 'statement.pdf', { type: 'application/pdf' })
    const postRes = await postSession(makeFormDataRequest(file))
    const { data: { sessionId } } = await postRes.json()
    await flushPipeline()

    const req = new NextRequest(`http://localhost/api/import/sessions/${sessionId}/rows`)
    const res = await getRows(req, { params: { id: sessionId } })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(Array.isArray(body.data.rows)).toBe(true)
    expect(body.data.rows.length).toBe(2)
  })
})

// ────────────────────────────────────────────────────────────
// PATCH /api/import/sessions/[id]/rows/[rowId]
// ────────────────────────────────────────────────────────────
describe('PATCH /api/import/sessions/[id]/rows/[rowId]', () => {
  it('returns 422 for invalid action value', async () => {
    const req = makeJsonRequest(
      'http://localhost/api/import/sessions/s/rows/r',
      'PATCH',
      { action: 'INVALID' }
    )
    const res = await patchRow(req, { params: { id: 's', rowId: 'r' } })
    expect(res.status).toBe(400)
  })

  it('confirms a row and returns updated row', async () => {
    const file = new File(['%PDF-1.4 fake'], 'statement.pdf', { type: 'application/pdf' })
    const postRes = await postSession(makeFormDataRequest(file))
    const { data: { sessionId } } = await postRes.json()
    await flushPipeline()

    const rowsReq = new NextRequest(`http://localhost/api/import/sessions/${sessionId}/rows`)
    const rowsRes = await getRows(rowsReq, { params: { id: sessionId } })
    const { data: { rows } } = await rowsRes.json()
    const rowId = rows[0].id

    const req = makeJsonRequest(
      `http://localhost/api/import/sessions/${sessionId}/rows/${rowId}`,
      'PATCH',
      { action: 'CONFIRM', fields: { category: 'Food', payment_method: 'UPI' } }
    )
    const res = await patchRow(req, { params: { id: sessionId, rowId } })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.row.status).toBe('CONFIRMED')
  })
})

// ────────────────────────────────────────────────────────────
// POST /api/import/sessions/[id]/confirm-all
// ────────────────────────────────────────────────────────────
describe('POST /api/import/sessions/[id]/confirm-all', () => {
  it('returns 422 for invalid scope', async () => {
    const req = makeJsonRequest(
      'http://localhost/api/import/sessions/s/confirm-all',
      'POST',
      { scope: 'INVALID' }
    )
    const res = await confirmAll(req, { params: { id: 's' } })
    expect(res.status).toBe(400)
  })

  it('imports all pending rows and returns count', async () => {
    const file = new File(['%PDF-1.4 fake'], 'statement.pdf', { type: 'application/pdf' })
    const postRes = await postSession(makeFormDataRequest(file))
    const { data: { sessionId } } = await postRes.json()
    await flushPipeline()

    const req = makeJsonRequest(
      `http://localhost/api/import/sessions/${sessionId}/confirm-all`,
      'POST',
      { scope: 'ALL' }
    )
    const res = await confirmAll(req, { params: { id: sessionId } })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.imported).toBe(2)

    const store = getMockStore()
    expect(store.expenses.length).toBe(2)
  })
})
