import { describe, it, expect } from 'vitest'
import { classifyRows } from '@server/import/rule-classifier'
import type { RawImportRow } from '@/types/import'

const row = (narration: string, amount = 100, type: 'EXPENSE'|'INFLOW' = 'EXPENSE'): RawImportRow => ({
  raw_data: {}, amount, datetime: '2026-02-15T00:00:00', type, narration,
})

describe('classifyRows', () => {
  it('classifies Zomato as Food with high confidence', () => {
    const [result] = classifyRows([row('Zomato Order UPI')])
    expect(result.category).toBe('Food')
    expect(result.confidence.category).toBeGreaterThanOrEqual(0.85)
  })

  it('classifies Netflix as Entertainment', () => {
    const [result] = classifyRows([row('NETFLIX SUBSCRIPTION')])
    expect(result.category).toBe('Entertainment')
  })

  it('classifies Uber as Transport', () => {
    const [result] = classifyRows([row('Uber trip payment')])
    expect(result.category).toBe('Transport')
  })

  it('classifies Amazon as Shopping', () => {
    const [result] = classifyRows([row('Amazon Pay order')])
    expect(result.category).toBe('Shopping')
  })

  it('extracts UPI payment method from narration', () => {
    const [result] = classifyRows([row('Zomato UPI/zomato@paytm')])
    expect(result.payment_method).toBe('UPI')
    expect(result.confidence.payment_method).toBe(1.0)
  })

  it('extracts NEFT payment method', () => {
    const [result] = classifyRows([row('NEFT transfer from employer')])
    expect(result.payment_method).toBe('Bank Transfer')
    expect(result.confidence.payment_method).toBe(1.0)
  })

  it('extracts ATM as Cash', () => {
    const [result] = classifyRows([row('ATM withdrawal')])
    expect(result.payment_method).toBe('Cash')
  })

  it('marks recurring_flag when same merchant appears 2+ times', () => {
    const rows = [row('Netflix subscription'), row('Netflix monthly charge')]
    const results = classifyRows(rows)
    expect(results[0].recurring_flag).toBe(true)
    expect(results[1].recurring_flag).toBe(true)
  })

  it('does not mark recurring_flag for unique merchants', () => {
    const rows = [row('Zomato'), row('Swiggy')]
    const results = classifyRows(rows)
    expect(results[0].recurring_flag).toBe(false)
    expect(results[1].recurring_flag).toBe(false)
  })

  it('unknown narration gets null category with zero confidence', () => {
    const [result] = classifyRows([row('XYZABC123 random string')])
    expect(result.category).toBeNull()
    expect(result.confidence.category ?? 0).toBe(0)
  })

  it('all fields ≥ 0.80 classified_by stays RULE', () => {
    const [result] = classifyRows([row('Zomato UPI payment')])
    expect(result.classified_by).toBe('RULE')
  })
})
