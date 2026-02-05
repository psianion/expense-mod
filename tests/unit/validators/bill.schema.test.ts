import { describe, it, expect } from 'vitest'
import { createBillSchema, billSchema } from '@server/validators/bill.schema'

describe('createBillSchema', () => {
  it('accepts valid MONTHLY bill with day_of_month', () => {
    const result = createBillSchema.safeParse({
      name: 'Rent',
      type: 'BILL',
      frequency: 'MONTHLY',
      day_of_month: 15,
      day_of_week: null,
      amount: 1200,
      auto_post: false,
      notes: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.frequency).toBe('MONTHLY')
      expect(result.data.day_of_month).toBe(15)
    }
  })

  it('accepts valid WEEKLY bill with day_of_week', () => {
    const result = createBillSchema.safeParse({
      name: 'Cleaning',
      type: 'BILL',
      frequency: 'WEEKLY',
      day_of_week: 0,
      day_of_month: null,
      amount: 50,
      auto_post: false,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.frequency).toBe('WEEKLY')
      expect(result.data.day_of_week).toBe(0)
    }
  })

  it('rejects MONTHLY without day_of_month (via billSchema refinement)', () => {
    const result = billSchema.safeParse({
      id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Rent',
      type: 'BILL',
      frequency: 'MONTHLY',
      day_of_week: null,
      amount: 1200,
      auto_post: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejects WEEKLY without day_of_week (via billSchema refinement)', () => {
    const result = billSchema.safeParse({
      id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Cleaning',
      type: 'BILL',
      frequency: 'WEEKLY',
      day_of_month: null,
      amount: 50,
      auto_post: false,
    })
    expect(result.success).toBe(false)
  })

  it('accepts all bill types', () => {
    const types = ['BILL', 'EMI', 'CREDITCARD', 'SUBSCRIPTION', 'SALARY', 'INCOME'] as const
    for (const type of types) {
      const result = createBillSchema.safeParse({
        name: type,
        type,
        frequency: 'MONTHLY',
        day_of_month: 1,
        amount: 100,
        auto_post: false,
      })
      expect(result.success, `type ${type}`).toBe(true)
    }
  })

  it('rejects empty name', () => {
    const result = createBillSchema.safeParse({
      name: '',
      type: 'BILL',
      frequency: 'MONTHLY',
      day_of_month: 1,
      auto_post: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid frequency', () => {
    const result = createBillSchema.safeParse({
      name: 'Rent',
      type: 'BILL',
      frequency: 'DAILY',
      day_of_month: 1,
      auto_post: false,
    })
    expect(result.success).toBe(false)
  })
})

describe('billSchema', () => {
  it('accepts id for update', () => {
    const result = billSchema.safeParse({
      id: 'b0000000-0000-0000-0000-000000000001',
      name: 'Rent',
      type: 'BILL',
      frequency: 'MONTHLY',
      day_of_month: 1,
      amount: 1200,
      auto_post: false,
    })
    expect(result.success).toBe(true)
  })
})
