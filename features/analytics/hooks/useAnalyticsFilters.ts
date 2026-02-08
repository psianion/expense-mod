import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import type { AnalyticsFilters, DateRangePreset } from '@features/analytics/types'
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns'

/**
 * Date range presets for quick selection
 */
export const dateRangePresets: DateRangePreset[] = [
  {
    label: 'Today',
    getValue: () => ({
      start: startOfDay(new Date()),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 7 Days',
    getValue: () => ({
      start: startOfDay(subDays(new Date(), 7)),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 30 Days',
    getValue: () => ({
      start: startOfDay(subDays(new Date(), 30)),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'This Month',
    getValue: () => ({
      start: startOfMonth(new Date()),
      end: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last Month',
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1)
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
      }
    },
  },
  {
    label: 'This Year',
    getValue: () => ({
      start: startOfYear(new Date()),
      end: endOfDay(new Date()),
    }),
  },
]

/**
 * Hook for managing analytics filters with URL persistence
 */
export function useAnalyticsFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Parse filters from URL
  const filters = useMemo((): AnalyticsFilters => {
    const period = (searchParams.get('period') as AnalyticsFilters['period']) || 'MONTHLY'
    const dateRangeStart = searchParams.get('dateStart')
    const dateRangeEnd = searchParams.get('dateEnd')
    const type = searchParams.get('type') as AnalyticsFilters['type']
    const categories = searchParams.get('categories')?.split(',').filter(Boolean)
    const platforms = searchParams.get('platforms')?.split(',').filter(Boolean)
    const paymentMethods = searchParams.get('paymentMethods')?.split(',').filter(Boolean)
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const source = searchParams.get('source') as AnalyticsFilters['source']

    return {
      period,
      dateRange: dateRangeStart && dateRangeEnd
        ? { start: dateRangeStart, end: dateRangeEnd }
        : undefined,
      type: type || 'ALL',
      categories,
      platforms,
      paymentMethods,
      tags,
      source,
    }
  }, [searchParams])

  // Update filters (merges with existing)
  const updateFilters = useCallback(
    (updates: Partial<AnalyticsFilters>) => {
      const params = new URLSearchParams(searchParams.toString())

      // Update period
      if (updates.period !== undefined) {
        params.set('period', updates.period)
      }

      // Update date range
      if (updates.dateRange !== undefined) {
        if (updates.dateRange) {
          params.set('dateStart', updates.dateRange.start)
          params.set('dateEnd', updates.dateRange.end)
        } else {
          params.delete('dateStart')
          params.delete('dateEnd')
        }
      }

      // Update type
      if (updates.type !== undefined) {
        if (updates.type === 'ALL') {
          params.delete('type')
        } else {
          params.set('type', updates.type)
        }
      }

      // Update categories
      if (updates.categories !== undefined) {
        if (updates.categories.length > 0) {
          params.set('categories', updates.categories.join(','))
        } else {
          params.delete('categories')
        }
      }

      // Update platforms
      if (updates.platforms !== undefined) {
        if (updates.platforms.length > 0) {
          params.set('platforms', updates.platforms.join(','))
        } else {
          params.delete('platforms')
        }
      }

      // Update payment methods
      if (updates.paymentMethods !== undefined) {
        if (updates.paymentMethods.length > 0) {
          params.set('paymentMethods', updates.paymentMethods.join(','))
        } else {
          params.delete('paymentMethods')
        }
      }

      // Update tags
      if (updates.tags !== undefined) {
        if (updates.tags.length > 0) {
          params.set('tags', updates.tags.join(','))
        } else {
          params.delete('tags')
        }
      }

      // Update source
      if (updates.source !== undefined) {
        if (updates.source) {
          params.set('source', updates.source)
        } else {
          params.delete('source')
        }
      }

      router.push(`?${params.toString()}`, { scroll: false })
    },
    [searchParams, router]
  )

  // Clear all filters
  const clearFilters = useCallback(() => {
    router.push('?period=MONTHLY', { scroll: false })
  }, [router])

  // Apply date range preset
  const applyDatePreset = useCallback(
    (preset: DateRangePreset) => {
      const { start, end } = preset.getValue()
      updateFilters({
        dateRange: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      })
    },
    [updateFilters]
  )

  // Check if filters are active (anything beyond defaults)
  const hasActiveFilters = useMemo(() => {
    return (
      filters.dateRange !== undefined ||
      (filters.type && filters.type !== 'ALL') ||
      (filters.categories && filters.categories.length > 0) ||
      (filters.platforms && filters.platforms.length > 0) ||
      (filters.paymentMethods && filters.paymentMethods.length > 0) ||
      (filters.tags && filters.tags.length > 0) ||
      filters.source !== undefined
    )
  }, [filters])

  return {
    filters,
    updateFilters,
    clearFilters,
    applyDatePreset,
    hasActiveFilters,
    presets: dateRangePresets,
  }
}
