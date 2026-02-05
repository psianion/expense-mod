import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockParseResult = {
  parsed: {
    amount: 42.5,
    datetime: new Date().toISOString(),
    category: 'Food',
    platform: 'Other',
    payment_method: 'Other',
    type: 'EXPENSE' as const,
    tags: ['lunch'],
  },
  raw_model_output: '{}',
  bill_match: null,
}

vi.mock('@server/ai/ai.service', () => ({
  aiService: {
    parseExpense: vi.fn().mockResolvedValue(mockParseResult),
  },
}))

const { POST } = await import('@/app/api/ai/parse-expense/route')

describe('POST /api/ai/parse-expense', () => {
  it('returns parsed expense when text is provided', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/ai/parse-expense', {
        method: 'POST',
        body: JSON.stringify({ text: 'lunch 42.50' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.parsed).toBeDefined()
    expect(body.data.parsed.amount).toBeDefined()
    expect(body.data.raw_model_output).toBeDefined()
  })

  it('returns 400 or error when text is missing', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/ai/parse-expense', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('returns 400 when text is not a string', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/ai/parse-expense', {
        method: 'POST',
        body: JSON.stringify({ text: 123 }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
