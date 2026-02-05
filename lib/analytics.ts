import { format, startOfDay, startOfMonth, startOfWeek } from 'date-fns'

import { Expense } from '@/types/expense'

export type TrendPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY'

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
  if (period === 'DAILY') {
    const day = startOfDay(date)
    return { timestamp: day.getTime(), label: format(day, 'MMM dd') }
  }

  if (period === 'WEEKLY') {
    const week = startOfWeek(date, { weekStartsOn: 1 })
    return { timestamp: week.getTime(), label: `${format(week, "'W'w")} ${format(week, 'yyyy')}` }
  }

  const month = startOfMonth(date)
  return { timestamp: month.getTime(), label: format(month, 'MMM yyyy') }
}

export const getCategoryTotals = (expenses: Expense[]): SimpleDatum[] => {
  const totals = new Map<string, number>()

  expenses.forEach((expense) => {
    if (expense.type !== 'EXPENSE') return

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
    if (expense.type !== 'EXPENSE') return

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
    if (expense.type !== 'EXPENSE') return

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

    if (expense.type === 'EXPENSE') {
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
      if (expense.type === 'EXPENSE') {
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
    if (expense.type === 'EXPENSE' && expense.category) {
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
        if (expense.type !== 'EXPENSE' || !expense.category) return false
        const categoryKey = safeKey(expense.category, 'Uncategorized')
        return selectedCategories.includes(categoryKey)
      })
    : expenses.filter((expense) => expense.type === 'EXPENSE')

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
        if (expense.type !== 'EXPENSE' || !expense.category) return false
        const categoryKey = safeKey(expense.category, 'Uncategorized')
        return selectedCategories.includes(categoryKey)
      })
    : expenses

  return getSpendingTrend(filteredExpenses, period)
}

// Credit Card Analytics Functions (Phase 2)

export interface CreditCardAnalytics {
  cardName: string
  totalSpent: number
  transactionCount: number
  averageTransaction: number
  categories: ComparisonDatum[]
  platforms: ComparisonDatum[]
  currentPeriod: {
    spent: number
    transactions: number
  }
  previousPeriod?: {
    spent: number
    transactions: number
  }
}

/**
 * Get analytics for a specific credit card
 */
export const getCreditCardAnalytics = (
  expenses: Expense[],
  cardName: string,
  cardConfig?: any // Would come from user preferences
): CreditCardAnalytics => {
  // Filter expenses by this credit card
  const cardExpenses = expenses.filter(expense =>
    expense.type === 'EXPENSE' &&
    expense.payment_method === cardName
  )

  const totalSpent = round(cardExpenses.reduce((sum, exp) => sum + exp.amount, 0))
  const transactionCount = cardExpenses.length
  const averageTransaction = transactionCount > 0 ? round(totalSpent / transactionCount) : 0

  // Category breakdown for this card
  const categories = getCategoryTotals(cardExpenses)

  // Platform breakdown for this card
  const platforms = getPlatformStats(cardExpenses)

  // Current period analysis (would use creditCardUtils in real implementation)
  const currentPeriodExpenses = cardExpenses // Simplified - would filter by current period
  const currentPeriod = {
    spent: round(currentPeriodExpenses.reduce((sum, exp) => sum + exp.amount, 0)),
    transactions: currentPeriodExpenses.length
  }

  return {
    cardName,
    totalSpent,
    transactionCount,
    averageTransaction,
    categories,
    platforms,
    currentPeriod
  }
}

/**
 * Get spending comparison across all credit cards
 */
export const getCreditCardComparison = (
  expenses: Expense[],
  creditCards: string[]
): ComparisonDatum[] => {
  return creditCards.map(cardName => {
    const cardExpenses = expenses.filter(expense =>
      expense.type === 'EXPENSE' &&
      expense.payment_method === cardName
    )

    const totalSpent = cardExpenses.reduce((sum, exp) => sum + exp.amount, 0)

    return {
      name: cardName,
      expense: round(totalSpent)
    }
  }).sort((a, b) => b.expense - a.expense)
}

/**
 * Get expenses for a specific credit card statement period
 */
export const getCreditCardPeriodExpenses = (
  expenses: Expense[],
  cardName: string,
  periodStart: Date,
  periodEnd: Date
): Expense[] => {
  return expenses.filter(expense => {
    if (expense.type !== 'EXPENSE' || expense.payment_method !== cardName) {
      return false
    }

    const expenseDate = new Date(expense.datetime)
    return expenseDate >= periodStart && expenseDate <= periodEnd
  })
}

/**
 * Calculate credit utilization (spent vs limit)
 */
export const getCreditUtilization = (
  currentSpent: number,
  creditLimit: number
): { percentage: number; status: 'low' | 'medium' | 'high' | 'over_limit' } => {
  const percentage = (currentSpent / creditLimit) * 100

  let status: 'low' | 'medium' | 'high' | 'over_limit'
  if (percentage > 100) status = 'over_limit'
  else if (percentage > 80) status = 'high'
  else if (percentage > 50) status = 'medium'
  else status = 'low'

  return { percentage: round(percentage), status }
}

