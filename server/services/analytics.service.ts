import { format, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { Expense } from '@/types'
import { expenseRepository } from '../db/repositories/expense.repo'
import { fromUTC } from '../../lib/datetime'

// Re-export utility functions from lib/analytics.ts
export {
  getCategoryTotals,
  getPlatformStats,
  getPaymentMethodStats,
  getSpendingTrend,
  getSummaryTotals,
  getAvailableCategories,
  getCategoryTrend,
  getFilteredSpendingTrend,
  type TrendPeriod,
  type TrendPoint,
  type SimpleDatum,
  type ComparisonDatum,
  type SummaryTotals,
  type CategoryTrendPoint,
} from '../../lib/analytics'

// Business logic for analytics can be added here as needed
export class AnalyticsService {
  async getAnalyticsData() {
    // Get recent expenses for analytics (last 100 for performance)
    const expenses = await expenseRepository.getExpenses({ limit: 100 })

    // Convert UTC times to local times for calculations
    const expensesWithLocalTime = expenses.map((expense) => ({
      ...expense,
      datetime: fromUTC(expense.datetime),
      type: expense.type?.toUpperCase?.() as 'EXPENSE' | 'INFLOW' || 'EXPENSE',
      source: expense.source?.toUpperCase?.() as 'MANUAL' | 'AI' | 'RECURRING' || 'MANUAL',
      bill_instance_id: expense.bill_instance_id ?? null,
    }))

    const { getSummaryTotals, getCategoryTotals } = await import('../../lib/analytics')

    const summary = getSummaryTotals(expensesWithLocalTime)
    const categoryTotals = getCategoryTotals(expensesWithLocalTime)
    const topCategories = categoryTotals.slice(0, 3)

    return {
      summary,
      topCategories,
      totalTransactions: expenses.length,
    }
  }
}

export const analyticsService = new AnalyticsService()
