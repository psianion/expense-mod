import { describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/analytics/route'
import { clearMockStore, createExpensePayload, getDemoUserContext } from '../../setup'
import { expenseService } from '@server/services/expense.service'

const demoUser = getDemoUserContext()

beforeEach(() => {
  clearMockStore()
})

describe('GET /api/analytics', () => {
  it('returns analytics data structure', async () => {
    const req = new NextRequest('http://localhost/api/analytics')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data).toHaveProperty('summary')
    expect(body.data).toHaveProperty('topCategories')
    expect(body.data).toHaveProperty('totalTransactions')
    expect(Array.isArray(body.data.topCategories)).toBe(true)
  })

  it('includes transaction count when expenses exist', async () => {
    await expenseService.createExpense({
      ...createExpensePayload,
      expense: { ...createExpensePayload.expense, amount: 50, category: 'Food' },
    }, demoUser)
    const req = new NextRequest('http://localhost/api/analytics')
    const res = await GET(req)
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.totalTransactions).toBe(1)
  })
})
