import { describe, it, expect } from 'vitest'
import { postProcessParsedExpense } from '@server/ai/expense-parser/postProcessor'

describe('postProcessParsedExpense', () => {
  it('parses valid JSON and applies defaults', () => {
    const raw = JSON.stringify({
      amount: 100,
      datetime: '2025-02-01T12:00:00',
      category: 'Food',
      platform: 'Swiggy',
      payment_method: 'UPI',
      type: 'EXPENSE',
      tags: ['lunch'],
    })
    const result = postProcessParsedExpense('lunch 100', raw)
    expect(result.amount).toBe(100)
    expect(result.category).toBe('Food')
    expect(result.platform).toBe('Swiggy')
    expect(result.payment_method).toBe('UPI')
    expect(result.type).toBe('EXPENSE')
    expect(result.tags).toEqual(['lunch'])
  })

  it('falls back to parsing amount from text when JSON invalid', () => {
    const result = postProcessParsedExpense('coffee 45.50', 'invalid json')
    expect(result.amount).toBe(45.5)
    expect(result.category).toBe('Other')
    expect(result.type).toBe('EXPENSE')
    expect(result.tags).toContain('coffee 45.50')
  })

  it('normalizes type to uppercase', () => {
    const raw = JSON.stringify({
      amount: 50,
      type: 'inflow',
    })
    const result = postProcessParsedExpense('income', raw)
    expect(result.type).toBe('INFLOW')
  })

  it('applies defaults for missing category, platform, payment_method, tags', () => {
    const raw = JSON.stringify({
      amount: 20,
      type: 'EXPENSE',
    })
    const result = postProcessParsedExpense('snack', raw)
    expect(result.category).toBe('Other')
    expect(result.platform).toBe('Other')
    expect(result.payment_method).toBe('Other')
    expect(result.tags).toEqual([])
  })
})

