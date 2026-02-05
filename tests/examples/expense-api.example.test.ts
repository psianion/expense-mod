/**
 * Example integration test for the expenses API.
 * Copy this pattern when adding tests for new endpoints or cases.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/expenses/route'
import { clearMockStore } from '../setup'

beforeEach(() => {
  clearMockStore()
})

describe('Example: GET /api/expenses', () => {
  it('returns 200 and data shape', async () => {
    const req = new NextRequest('http://localhost/api/expenses')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(Array.isArray(body.data.expenses)).toBe(true)
  })
})

describe('Example: POST /api/expenses', () => {
  it('creates expense with valid payload', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense: {
            amount: 10,
            datetime: new Date().toISOString(),
            category: 'Other',
            platform: 'Other',
            payment_method: 'Other',
            type: 'EXPENSE',
            tags: [],
          },
          source: 'MANUAL',
        }),
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data.expense.id).toBeDefined()
    expect(data.data.expense.amount).toBe(10)
  })
})
