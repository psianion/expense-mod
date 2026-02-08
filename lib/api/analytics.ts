import apiClient from './client'
import type { Expense } from '@/types'
import type { AnalyticsFilters } from '@features/analytics/types'

export interface AnalyticsResponse {
  expenses: Expense[]
  totalCount: number
}

export interface AnalyticsData {
  summary: {
    expenseTotal: number
    inflowTotal: number
    net: number
  }
  topCategories: Array<{ name: string; value: number }>
  totalTransactions: number
}

export const analyticsApi = {
  /**
   * Get analytics data summary (for preview card)
   */
  async getAnalyticsData(): Promise<AnalyticsData> {
    const response = await apiClient.get<AnalyticsData>('/analytics')
    return response.data
  },

  /**
   * Get expenses with filters for analytics
   */
  async getAnalytics(filters?: AnalyticsFilters): Promise<Expense[]> {
    const params = new URLSearchParams()

    if (filters?.type && filters.type !== 'ALL') {
      params.append('type', filters.type)
    }

    if (filters?.dateRange) {
      params.append('date_from', filters.dateRange.start)
      params.append('date_to', filters.dateRange.end)
    }

    if (filters?.categories?.length) {
      params.append('categories', filters.categories.join(','))
    }

    if (filters?.platforms?.length) {
      params.append('platforms', filters.platforms.join(','))
    }

    if (filters?.paymentMethods?.length) {
      params.append('payment_methods', filters.paymentMethods.join(','))
    }

    if (filters?.tags?.length) {
      params.append('tags', filters.tags.join(','))
    }

    if (filters?.source) {
      params.append('source', filters.source)
    }

    const response = await apiClient.get<AnalyticsResponse>(
      `/expenses${params.toString() ? `?${params.toString()}` : ''}`
    )

    return response.data.expenses
  },

  /**
   * Get analytics summary for a date range
   */
  async getAnalyticsSummary(filters?: AnalyticsFilters): Promise<{
    totalExpenses: number
    totalInflows: number
    netBalance: number
    transactionCount: number
    averageTransaction: number
  }> {
    const expenses = await this.getAnalytics(filters)

    const summary = expenses.reduce(
      (acc, expense) => {
        acc.transactionCount++
        if (expense.type === 'EXPENSE') {
          acc.totalExpenses += expense.amount
        } else {
          acc.totalInflows += expense.amount
        }
        return acc
      },
      {
        totalExpenses: 0,
        totalInflows: 0,
        transactionCount: 0,
      }
    )

    return {
      ...summary,
      netBalance: summary.totalInflows - summary.totalExpenses,
      averageTransaction:
        summary.transactionCount > 0
          ? (summary.totalExpenses + summary.totalInflows) / summary.transactionCount
          : 0,
    }
  },

  /**
   * Get comparison data for two periods
   */
  async getComparison(
    currentFilters: AnalyticsFilters,
    previousFilters: AnalyticsFilters
  ): Promise<{
    current: Expense[]
    previous: Expense[]
  }> {
    const [current, previous] = await Promise.all([
      this.getAnalytics(currentFilters),
      this.getAnalytics(previousFilters),
    ])

    return { current, previous }
  },
}
