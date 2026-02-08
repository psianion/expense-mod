import { describe, it, expect, beforeEach } from 'vitest'
import { analyticsService } from '@server/services/analytics.service'
import { clearMockStore, createExpensePayload, getDemoUserContext } from '../../setup'
import { expenseService } from '@server/services/expense.service'

const demoUser = getDemoUserContext()

beforeEach(() => {
  clearMockStore()
})

describe('AnalyticsService', () => {
  describe('getAnalyticsData', () => {
    it('returns summary and topCategories with no expenses', async () => {
      const data = await analyticsService.getAnalyticsData(demoUser)
      expect(data).toHaveProperty('summary')
      expect(data).toHaveProperty('topCategories')
      expect(data).toHaveProperty('totalTransactions')
      expect(data.totalTransactions).toBe(0)
      expect(Array.isArray(data.topCategories)).toBe(true)
    })

    it('includes expense count and category totals when expenses exist', async () => {
      await expenseService.createExpense({
        ...createExpensePayload,
        expense: { ...createExpensePayload.expense, amount: 100, category: 'Food' },
      }, demoUser)
      await expenseService.createExpense({
        ...createExpensePayload,
        expense: { ...createExpensePayload.expense, amount: 50, category: 'Transport' },
      }, demoUser)

      const data = await analyticsService.getAnalyticsData(demoUser)
      expect(data.totalTransactions).toBe(2)
      expect(data.summary).toBeDefined()
      expect(data.topCategories.length).toBeGreaterThan(0)
    })
  })
})
