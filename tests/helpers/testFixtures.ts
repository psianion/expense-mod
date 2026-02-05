/**
 * UI-specific test fixtures: preview data, chart data, credit card configs.
 * Extends tests/helpers/testData.ts for component and E2E UI tests.
 */
import type { ParsedExpense } from '@/types'
import { sampleExpense, sampleBill, sampleBillInstance } from './testData'

const now = new Date().toISOString()

/** Parsed expense as returned by AI parse API for preview modal */
export const mockExpensePreview: ParsedExpense = {
  amount: 42.5,
  datetime: now,
  category: 'Food',
  platform: 'Swiggy',
  payment_method: 'Card',
  type: 'EXPENSE',
  tags: ['lunch'],
}

/** Minimal parsed expense for empty/partial UI states */
export const mockExpensePreviewMinimal: ParsedExpense = {
  amount: 10,
  datetime: now,
  category: 'Other',
  platform: 'Other',
  payment_method: 'Other',
  type: 'EXPENSE',
  tags: [],
}

/** Sample spending trend data for chart components (TrendPoint shape) */
export const mockSpendingTrendData = [
  { label: 'Jan 1', expense: 100, inflow: 20 },
  { label: 'Jan 2', expense: 85, inflow: 0 },
  { label: 'Jan 3', expense: 150, inflow: 50 },
]

/** Category distribution for pie chart */
export const mockCategoryDistribution = [
  { name: 'Food', value: 400, fill: '#888' },
  { name: 'Transport', value: 200, fill: '#444' },
  { name: 'Bills', value: 300, fill: '#666' },
]

/** Credit card config for settings/analytics tests */
export const mockCreditCardConfig = {
  id: 'card-1',
  name: 'Primary Card',
  statement_day: 15,
  payment_due_day: 22,
}

/** Re-export base test data for convenience */
export { sampleExpense, sampleBill, sampleBillInstance }
