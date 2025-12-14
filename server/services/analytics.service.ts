import { format, startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { Expense } from '@/types'

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
  // Add business logic methods here as the analytics feature grows
  async getAnalyticsData() {
    // Implementation will depend on what analytics data is needed
    return {}
  }
}

export const analyticsService = new AnalyticsService()
