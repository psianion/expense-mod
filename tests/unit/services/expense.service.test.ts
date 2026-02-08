import { describe, it, expect, beforeEach } from 'vitest'
import { expenseService } from '@server/services/expense.service'
import { clearMockStore, getMockStore, createExpensePayload, getDemoUserContext } from '../../setup'

const demoUser = getDemoUserContext()

beforeEach(() => {
  clearMockStore()
})

describe('ExpenseService', () => {
  describe('createExpense', () => {
    it('creates expense and returns expense with id', async () => {
      const result = await expenseService.createExpense({
        ...createExpensePayload,
        expense: {
          ...createExpensePayload.expense,
          amount: 75,
          category: 'Transport',
        },
      }, demoUser)

      expect(result.expense).toBeDefined()
      expect(result.expense.id).toBeDefined()
      expect(result.expense.amount).toBe(75)
      expect(result.expense.category).toBe('Transport')
      expect(result.expense.source).toBe('MANUAL')
      expect(result.matchedBillId).toBeNull()
    })

    it('returns matchedBillId when billMatch is provided and bill exists', async () => {
      const store = getMockStore()
      const billId = 'b0000000-0000-0000-0000-000000000001'
      store.bills.push({
        id: billId,
        user_id: demoUser.userId,
        name: 'Rent',
        type: 'BILL',
        frequency: 'MONTHLY',
        day_of_month: 1,
        day_of_week: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)

      const result = await expenseService.createExpense({
        expense: {
          amount: 1200,
          datetime: new Date().toISOString(),
          category: 'Rent',
          platform: 'Other',
          payment_method: 'Other',
          type: 'EXPENSE',
          tags: [],
        },
        source: 'AI',
        billMatch: { bill_id: billId, bill_name: 'Rent' },
      }, demoUser)

      expect(result.expense).toBeDefined()
      expect(result.matchedBillId).toBe(billId)
    })
  })

  describe('getExpenses', () => {
    it('returns empty array when no expenses', async () => {
      const expenses = await expenseService.getExpenses(undefined, demoUser)
      expect(expenses).toEqual([])
    })

    it('returns expenses with filters', async () => {
      await expenseService.createExpense({
        ...createExpensePayload,
        expense: { ...createExpensePayload.expense, category: 'Food' },
      }, demoUser)
      const expenses = await expenseService.getExpenses({ category: 'Food' }, demoUser)
      expect(expenses.length).toBe(1)
      expect(expenses[0].category).toBe('Food')
    })
  })
})
