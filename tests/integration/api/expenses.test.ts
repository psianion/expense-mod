import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/expenses/route'
import { clearMockStore, createExpensePayload } from '../../setup'

beforeEach(() => {
  clearMockStore()
})

function jsonBody(body: object) {
  return new NextRequest('http://localhost/api/expenses', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('GET /api/expenses', () => {
  it('returns empty expenses when none exist', async () => {
    const req = new NextRequest('http://localhost/api/expenses')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.expenses).toEqual([])
  })

  it('returns expenses with type filter', async () => {
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, type: 'EXPENSE' } }))
    const req = new NextRequest('http://localhost/api/expenses?type=EXPENSE')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.expenses.length).toBe(1)
    expect(body.data.expenses[0].type).toBe('EXPENSE')
  })

  it('returns expenses with category filter', async () => {
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, category: 'Food' } }))
    const req = new NextRequest('http://localhost/api/expenses?category=Food')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.expenses[0].category).toBe('Food')
  })

  it('accepts pagination params', async () => {
    const req = new NextRequest('http://localhost/api/expenses?limit=10&offset=0')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })
})

describe('POST /api/expenses', () => {
  it('creates expense and returns result', async () => {
    const res = await POST(
      jsonBody({
        expense: {
          amount: 100,
          datetime: new Date().toISOString(),
          category: 'Food',
          platform: 'Other',
          payment_method: 'Other',
          type: 'EXPENSE',
          tags: [],
        },
        source: 'MANUAL',
      })
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.expense).toBeDefined()
    expect(body.data.expense.amount).toBe(100)
    expect(body.data.expense.id).toBeDefined()
  })

  it('returns 400 for invalid payload (negative amount)', async () => {
    const res = await POST(
      jsonBody({
        expense: {
          amount: -10,
          datetime: new Date().toISOString(),
          category: 'Other',
          platform: 'Other',
          payment_method: 'Other',
          type: 'EXPENSE',
          tags: [],
        },
        source: 'MANUAL',
      })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error?.code).toBe('VALIDATION_ERROR')
  })

  it('accepts AI source', async () => {
    const res = await POST(
      jsonBody({
        ...createExpensePayload,
        source: 'AI',
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.expense.source).toBe('AI')
  })
})
