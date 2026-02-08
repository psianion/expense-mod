import { useQuery, useQueryClient } from '@tanstack/react-query'
import { analyticsApi } from '@/lib/api/analytics'
import { queryKeys } from '../queryKeys'
import type { AnalyticsFilters } from '@features/analytics/types'
import type { Expense } from '@/types'

/**
 * Query hook for analytics data with filters
 */
export function useAnalyticsQuery(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: queryKeys.analytics.filtered(filters),
    queryFn: () => analyticsApi.getAnalytics(filters),
    staleTime: 1000 * 60 * 1, // 1 minute - analytics data doesn't change that frequently
  })
}

/**
 * Query hook for analytics summary
 */
export function useAnalyticsSummaryQuery(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: queryKeys.analytics.summary(filters),
    queryFn: () => analyticsApi.getAnalyticsSummary(filters),
    staleTime: 1000 * 60 * 1,
  })
}

/**
 * Query hook for comparison data between two periods
 */
export function useAnalyticsComparisonQuery(
  currentFilters: AnalyticsFilters,
  previousFilters: AnalyticsFilters,
  enabled = true
) {
  return useQuery({
    queryKey: queryKeys.analytics.comparison(currentFilters, previousFilters),
    queryFn: () => analyticsApi.getComparison(currentFilters, previousFilters),
    enabled,
    staleTime: 1000 * 60 * 1,
  })
}

/**
 * Hook to invalidate analytics queries (useful after expense changes)
 */
export function useInvalidateAnalytics() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all })
  }
}
