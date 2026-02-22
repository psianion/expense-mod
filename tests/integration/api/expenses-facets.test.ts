import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as FACETS_GET } from '@/app/api/expenses/facets/route'
import { POST } from '@/app/api/expenses/route'
import { clearMockStore, createExpensePayload } from '../../setup'

beforeEach(() => { clearMockStore() })

function jsonBody(body: object) {
  return new NextRequest('http://localhost/api/expenses', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('GET /api/expenses/facets', () => {
  it('returns empty arrays when no expenses', async () => {
    const req = new NextRequest('http://localhost/api/expenses/facets')
    const res = await FACETS_GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.categories).toEqual([])
    expect(body.data.platforms).toEqual([])
    expect(body.data.payment_methods).toEqual([])
  })

  it('returns distinct sorted categories from expenses', async () => {
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, category: 'Food' } }))
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, category: 'Food' } }))
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, category: 'Transport' } }))
    const req = new NextRequest('http://localhost/api/expenses/facets')
    const res = await FACETS_GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.categories).toEqual(['Food', 'Transport'])
  })

  it('returns distinct platforms and payment_methods', async () => {
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, platform: 'Swiggy', payment_method: 'UPI' } }))
    await POST(jsonBody({ ...createExpensePayload, expense: { ...createExpensePayload.expense, platform: 'Amazon', payment_method: 'UPI' } }))
    const req = new NextRequest('http://localhost/api/expenses/facets')
    const res = await FACETS_GET(req)
    const body = await res.json()
    expect(body.data.platforms).toEqual(['Amazon', 'Swiggy'])
    expect(body.data.payment_methods).toEqual(['UPI'])
  })
})
