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

    // Parse datetime string (already in local time format from database conversion)
    // Use Date constructor which interprets the string in local timezone
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

