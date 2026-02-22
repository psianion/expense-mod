import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/expenses/route'
import { clearMockStore, createExpensePayload } from '../../setup'

beforeEach(() => { clearMockStore() })

function jsonBody(body: object) {
  return new NextRequest('http://localhost/api/expenses', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('GET /api/expenses - search and pagination', () => {
  it('returns total count in response', async () => {
    const req = new NextRequest('http://localhost/api/expenses')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(typeof body.data.total).toBe('number')
  })

  it('filters by search term matching category', async () => {
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, category: 'Groceries' } }))
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, category: 'Transport' } }))
    const req = new NextRequest('http://localhost/api/expenses?search=grocer')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.expenses.length).toBe(1)
    expect(body.data.expenses[0].category).toBe('Groceries')
  })

  it('returns paginated results with correct total', async () => {
    for (let i = 0; i < 5; i++) {
      await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, amount: i + 1 } }))
    }
    const req = new NextRequest('http://localhost/api/expenses?page=1&limit=2')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.expenses.length).toBe(2)
    expect(body.data.total).toBe(5)
  })

  it('sorts by amount ascending', async () => {
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, amount: 300 } }))
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, amount: 100 } }))
    const req = new NextRequest('http://localhost/api/expenses?sort_by=amount&sort_order=asc')
    const res = await GET(req)
    const body = await res.json()
    expect(body.data.expenses[0].amount).toBe(100)
    expect(body.data.expenses[1].amount).toBe(300)
  })
})
