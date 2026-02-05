import { describe, it, expect } from 'vitest'
import { createExpenseSchema, expenseSchema } from '@server/validators/expense.schema'

describe('expenseSchema', () => {
  it('accepts valid expense with required fields', () => {
    const result = expenseSchema.safeParse({
      amount: 100,
      datetime: '2025-02-01T12:00:00',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.amount).toBe(100)
      expect(result.data.category).toBe('Other')
      expect(result.data.type).toBe('EXPENSE')
    }
  })

  it('rejects negative amount', () => {
    const result = expenseSchema.safeParse({
      amount: -10,
      datetime: '2025-02-01T12:00:00',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid type', () => {
    const result = expenseSchema.safeParse({
      amount: 100,
      datetime: '2025-02-01T12:00:00',
      type: 'INVALID',
    })
    expect(result.success).toBe(false)
  })

  it('accepts INFLOW type', () => {
    const result = expenseSchema.safeParse({
      amount: 500,
      datetime: '2025-02-01T12:00:00',
      type: 'INFLOW',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.type).toBe('INFLOW')
  })

  it('applies defaults for category, platform, payment_method, tags', () => {
    const result = expenseSchema.safeParse({
      amount: 50,
      datetime: '2025-02-01T12:00:00',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.category).toBe('Other')
      expect(result.data.platform).toBe('Other')
      expect(result.data.payment_method).toBe('Other')
      expect(result.data.tags).toEqual([])
    }
  })
})

describe('createExpenseSchema', () => {
  it('accepts valid create payload with MANUAL source', () => {
    const result = createExpenseSchema.safeParse({
      expense: {
        amount: 100,
        datetime: '2025-02-01T12:00:00',
        category: 'Food',
      },
      source: 'MANUAL',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.source).toBe('MANUAL')
      expect(result.data.expense.amount).toBe(100)
    }
  })

  it('accepts optional billMatch', () => {
    const result = createExpenseSchema.safeParse({
      expense: {
        amount: 100,
        datetime: '2025-02-01T12:00:00',
      },
      source: 'AI',
      billMatch: {
        bill_id: 'b0000000-0000-0000-0000-000000000001',
        bill_name: 'Rent',
      },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.billMatch?.bill_id).toBeDefined()
      expect(result.data.billMatch?.bill_name).toBe('Rent')
    }
  })

  it('rejects invalid source', () => {
    const result = createExpenseSchema.safeParse({
      expense: { amount: 100, datetime: '2025-02-01T12:00:00' },
      source: 'INVALID',
    })
    expect(result.success).toBe(false)
  })

  it('rejects when expense amount is invalid', () => {
    const result = createExpenseSchema.safeParse({
      expense: { amount: -1, datetime: '2025-02-01T12:00:00' },
      source: 'MANUAL',
    })
    expect(result.success).toBe(false)
  })
})
