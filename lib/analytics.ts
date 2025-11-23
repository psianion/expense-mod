import { format, startOfDay, startOfMonth, startOfWeek } from 'date-fns'

import { Expense } from '../types'

export type TrendPeriod = 'daily' | 'weekly' | 'monthly'

export type TrendPoint = {
  label: string
  expense: number
  inflow: number
}

export type SimpleDatum = {
  name: string
  value: number
}

export type ComparisonDatum = {
  name: string
  expense: number
}

export type SummaryTotals = {
  expenseTotal: number
  inflowTotal: number
  net: number
}

export type CategoryTrendPoint = {
  label: string
  [category: string]: string | number
}

const round = (value: number) => Number(value.toFixed(2))

const safeKey = (value: string | null, fallback: string) =>
  (value?.trim() || fallback).replace(/\s+/g, ' ')

const bucketForDate = (date: Date, period: TrendPeriod) => {
  if (period === 'daily') {
    const day = startOfDay(date)
    return { timestamp: day.getTime(), label: format(day, 'MMM dd') }
  }

  if (period === 'weekly') {
    const week = startOfWeek(date, { weekStartsOn: 1 })
    return { timestamp: week.getTime(), label: `${format(week, "'W'w")} ${format(week, 'yyyy')}` }
  }

  const month = startOfMonth(date)
  return { timestamp: month.getTime(), label: format(month, 'MMM yyyy') }
}

export const getCategoryTotals = (expenses: Expense[]): SimpleDatum[] => {
  const totals = new Map<string, number>()

  expenses.forEach((expense) => {
    if (expense.type !== 'expense') return

    const key = safeKey(expense.category, 'Uncategorized')
    totals.set(key, (totals.get(key) ?? 0) + expense.amount)
  })

  return Array.from(totals.entries())
    .map(([name, value]) => ({ name, value: round(value) }))
    .sort((a, b) => b.value - a.value)
}

export const getPlatformStats = (expenses: Expense[]): ComparisonDatum[] => {
  const totals = new Map<string, number>()

  expenses.forEach((expense) => {
    if (expense.type !== 'expense') return

    const key = safeKey(expense.platform, 'Unknown platform')
    totals.set(key, (totals.get(key) ?? 0) + expense.amount)
  })

  return Array.from(totals.entries())
    .map(([name, expense]) => ({ name, expense: round(expense) }))
    .sort((a, b) => b.expense - a.expense)
}

export const getPaymentMethodStats = (expenses: Expense[]): ComparisonDatum[] => {
  const totals = new Map<string, number>()

  expenses.forEach((expense) => {
    if (expense.type !== 'expense') return

    const key = safeKey(expense.payment_method, 'Unknown method')
    totals.set(key, (totals.get(key) ?? 0) + expense.amount)
  })

  return Array.from(totals.entries())
    .map(([name, expense]) => ({ name, expense: round(expense) }))
    .sort((a, b) => b.expense - a.expense)
}

export const getSpendingTrend = (expenses: Expense[], period: TrendPeriod): TrendPoint[] => {
  const buckets = new Map<
    number,
    {
      label: string
      expense: number
      inflow: number
    }
  >()

  expenses.forEach((expense) => {
    if (!expense.datetime) return

    const parsedDate = new Date(expense.datetime)
    if (Number.isNaN(parsedDate.getTime())) return

    const bucket = bucketForDate(parsedDate, period)
    const existing = buckets.get(bucket.timestamp) ?? {
      label: bucket.label,
      expense: 0,
      inflow: 0,
    }

    if (expense.type === 'expense') {
      existing.expense += expense.amount
    } else {
      existing.inflow += expense.amount
    }

    buckets.set(bucket.timestamp, existing)
  })

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, bucket]) => ({
      label: bucket.label,
      expense: round(bucket.expense),
      inflow: round(bucket.inflow),
    }))
}

export const getSummaryTotals = (expenses: Expense[]): SummaryTotals => {
  const summary = expenses.reduce(
    (acc, expense) => {
      if (expense.type === 'expense') {
        acc.expenseTotal += expense.amount
      } else {
        acc.inflowTotal += expense.amount
      }
      return acc
    },
    { expenseTotal: 0, inflowTotal: 0 }
  )

  return {
    expenseTotal: round(summary.expenseTotal),
    inflowTotal: round(summary.inflowTotal),
    net: round(summary.inflowTotal - summary.expenseTotal),
  }
}

export const getAvailableCategories = (expenses: Expense[]): string[] => {
  const categories = new Set<string>()
  expenses.forEach((expense) => {
    if (expense.type === 'expense' && expense.category) {
      categories.add(safeKey(expense.category, 'Uncategorized'))
    }
  })
  return Array.from(categories).sort()
}

export const getCategoryTrend = (
  expenses: Expense[],
  period: TrendPeriod,
  selectedCategories?: string[]
): CategoryTrendPoint[] => {
  const buckets = new Map<
    number,
    {
      label: string
      [category: string]: string | number
    }
  >()

  // Filter expenses by selected categories if provided
  const filteredExpenses = selectedCategories && selectedCategories.length > 0
    ? expenses.filter((expense) => {
        if (expense.type !== 'expense' || !expense.category) return false
        const categoryKey = safeKey(expense.category, 'Uncategorized')
        return selectedCategories.includes(categoryKey)
      })
    : expenses.filter((expense) => expense.type === 'expense')

  // Get all unique categories from filtered expenses
  const categories = new Set<string>()
  filteredExpenses.forEach((expense) => {
    if (expense.category) {
      categories.add(safeKey(expense.category, 'Uncategorized'))
    }
  })

  filteredExpenses.forEach((expense) => {
    if (!expense.datetime || !expense.category) return

    const parsedDate = new Date(expense.datetime)
    if (Number.isNaN(parsedDate.getTime())) return

    const bucket = bucketForDate(parsedDate, period)
    const categoryKey = safeKey(expense.category, 'Uncategorized')
    
    const existing = buckets.get(bucket.timestamp) ?? {
      label: bucket.label,
    }
    
    // Initialize all categories to 0 for this bucket
    categories.forEach((cat) => {
      if (!(cat in existing)) {
        existing[cat] = 0
      }
    })
    
    existing[categoryKey] = (existing[categoryKey] as number || 0) + expense.amount
    buckets.set(bucket.timestamp, existing)
  })

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, bucket]) => {
      const result: CategoryTrendPoint = { label: bucket.label }
      categories.forEach((cat) => {
        result[cat] = round((bucket[cat] as number) || 0)
      })
      return result
    })
}

export const getFilteredSpendingTrend = (
  expenses: Expense[],
  period: TrendPeriod,
  selectedCategories?: string[]
): TrendPoint[] => {
  const filteredExpenses = selectedCategories && selectedCategories.length > 0
    ? expenses.filter((expense) => {
        if (expense.type !== 'expense' || !expense.category) return false
        const categoryKey = safeKey(expense.category, 'Uncategorized')
        return selectedCategories.includes(categoryKey)
      })
    : expenses

  return getSpendingTrend(filteredExpenses, period)
}

