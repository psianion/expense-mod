import type { ExpenseFilters, BillFilters } from '@/lib/api/types'

export const queryKeys = {
  expenses: {
    all: ['expenses'] as const,
    lists: () => [...queryKeys.expenses.all, 'list'] as const,
    list: (filters?: ExpenseFilters) => [...queryKeys.expenses.lists(), filters] as const,
    recent: (limit: number) => [...queryKeys.expenses.all, 'recent', limit] as const,
    detail: (id: string) => [...queryKeys.expenses.all, 'detail', id] as const,
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
  analytics: {
    all: ['analytics'] as const,
    byPeriod: (period: string) => [...queryKeys.analytics.all, period] as const,
  },
} as const
