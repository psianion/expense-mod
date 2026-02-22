import type { ExpenseFilters, BillFilters } from '@/lib/api/types'
import type { AnalyticsFilters } from '@features/analytics/types'

export const queryKeys = {
  expenses: {
    all: ['expenses'] as const,
    lists: () => [...queryKeys.expenses.all, 'list'] as const,
    list: (filters?: ExpenseFilters) => [...queryKeys.expenses.lists(), filters] as const,
    recent: (limit: number) => [...queryKeys.expenses.all, 'recent', limit] as const,
    detail: (id: string) => [...queryKeys.expenses.all, 'detail', id] as const,
    facets: () => [...queryKeys.expenses.all, 'facets'] as const,
  },
  bills: {
    all: ['bills'] as const,
    lists: () => [...queryKeys.bills.all, 'list'] as const,
    list: (filters?: BillFilters) => [...queryKeys.bills.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.bills.all, 'detail', id] as const,
  },
  billInstances: {
    all: ['billInstances'] as const,
    lists: () => [...queryKeys.billInstances.all, 'list'] as const,
    list: (status?: string[]) => [...queryKeys.billInstances.lists(), status] as const,
    upcoming: (limit: number) => [...queryKeys.billInstances.all, 'upcoming', limit] as const,
  },
  importSessions: {
    all: ['import-sessions'] as const,
    detail: (id: string) => ['import-sessions', id] as const,
    rows: (id: string) => ['import-sessions', id, 'rows'] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    filtered: (filters?: AnalyticsFilters) => [...queryKeys.analytics.all, 'filtered', filters] as const,
    summary: (filters?: AnalyticsFilters) => [...queryKeys.analytics.all, 'summary', filters] as const,
    comparison: (current: AnalyticsFilters, previous: AnalyticsFilters) => 
      [...queryKeys.analytics.all, 'comparison', current, previous] as const,
  },
} as const
