import { describe, it, expect, vi, beforeEach } from 'vitest'
import { clearMockStore, getMockStore, getDemoUserContext } from '../../setup'

// Mock file-parser and classifiers
vi.mock('@server/import/file-parser', () => ({
  parseFile: vi.fn(async () => ({
    format: 'HDFC',
    rows: [
      { raw_data: {}, amount: 450, datetime: '2026-02-15T00:00:00', type: 'EXPENSE', narration: 'Zomato' },
      { raw_data: {}, amount: 200, datetime: '2026-02-14T00:00:00', type: 'EXPENSE', narration: 'XYZABC unknown' },
    ],
  })),
}))

vi.mock('@server/import/rule-classifier', () => ({
  classifyRows: vi.fn((rows) => rows.map((r: { narration: string; amount: number; datetime: string; type: string }) => ({
    ...r,
    category: r.narration === 'Zomato' ? 'Food' : null,
    platform: r.narration === 'Zomato' ? 'Zomato' : null,
    payment_method: null,
    notes: null,
    tags: [],
    recurring_flag: false,
    confidence: r.narration === 'Zomato'
      ? { amount: 1.0, datetime: 0.95, type: 1.0, category: 0.9, platform: 0.8, payment_method: 0 }
      : { amount: 1.0, datetime: 0.95, type: 1.0, category: 0, platform: 0, payment_method: 0 },
    classified_by: 'RULE',
  }))),
}))

vi.mock('@server/queue/ai-classification-queue', () => ({
  aiClassificationQueue: {
    enqueue: vi.fn(async (rows: unknown[]) => rows.map((r: unknown) => {
      const row = r as { narration: string }
      return { ...row, category: 'Other', platform: null, payment_method: null, notes: null, tags: [], recurring_flag: false, confidence: { category: 0.6 }, classified_by: 'AI' }
    })),
  },
}))

import { importService } from '@server/services/import.service'

const demoUser = getDemoUserContext()

// Helper to flush all pending microtasks so the async pipeline completes
async function flushPipeline() {
  await new Promise(r => setTimeout(r, 0))
  await new Promise(r => setTimeout(r, 0))
}

beforeEach(() => clearMockStore())

describe('ImportService.createSession', () => {
  it('returns a sessionId immediately', async () => {
    const buf = Buffer.from('csv content')
    const result = await importService.createSession(buf, 'test.csv', 'text/csv', demoUser)
    expect(result.sessionId).toBeDefined()
    expect(typeof result.sessionId).toBe('string')
  })

  it('rejects unsupported file types', async () => {
    const buf = Buffer.from('pdf content')
    await expect(
      importService.createSession(buf, 'report.pdf', 'application/pdf', demoUser)
    ).rejects.toThrow('Unsupported file type')
  })

  it('splits rows into auto and review queues by confidence threshold', async () => {
    const buf = Buffer.from('csv content')
    const { sessionId } = await importService.createSession(buf, 'test.csv', 'text/csv', demoUser)
    await flushPipeline()
    const session = await importService.getSession(sessionId, demoUser)
    expect(session.auto_count).toBe(0)    // Zomato missing payment_method confidence
    expect(session.review_count).toBe(2)  // both go to AI
  })
})

describe('ImportService.getRows', () => {
  it('throws 409 when session is still PARSING', async () => {
    const buf = Buffer.from('csv content')
    const { sessionId } = await importService.createSession(buf, 'test.csv', 'text/csv', demoUser)
    // Session is PARSING immediately after creation (before pipeline completes)
    const store = getMockStore()
    const session = store.import_sessions.find(s => s.id === sessionId)
    // Force session to stay PARSING
    if (session) (session as Record<string, unknown>).status = 'PARSING'
    await expect(importService.getRows(sessionId, demoUser)).rejects.toThrow('still parsing')
  })
})

describe('ImportService.confirmRow', () => {
  it('creates an expense and marks row CONFIRMED', async () => {
    const buf = Buffer.from('csv content')
    const { sessionId } = await importService.createSession(buf, 'test.csv', 'text/csv', demoUser)
    await flushPipeline()
    const rows = await importService.getRows(sessionId, demoUser)
    const row = rows[0]

    await importService.confirmRow(row.id, {
      action: 'CONFIRM',
      fields: { category: 'Food', payment_method: 'UPI' },
    }, demoUser)

    const store = getMockStore()
    expect(store.expenses.length).toBe(1)
    expect(store.import_rows.find(r => r.id === row.id)?.status).toBe('CONFIRMED')
  })
})
