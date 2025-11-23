import * as React from 'react'

import { TrendPeriod, getCategoryTotals, getPaymentMethodStats, getPlatformStats, getSpendingTrend, getSummaryTotals } from '../lib/analytics'
import { Expense } from '../types'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { CategoryPieChart } from './charts/CategoryPieChart'
import { PlatformBarChart } from './charts/PlatformBarChart'
import { PaymentMethodChart } from './charts/PaymentMethodChart'
import { SpendingTrendChart } from './charts/SpendingTrendChart'

type AnalyticsDashboardProps = {
  expenses: Expense[]
  isLoading: boolean
  currency: string
}

const periodLabels: Record<TrendPeriod, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

export function AnalyticsDashboard({ expenses, isLoading, currency }: AnalyticsDashboardProps) {
  const [trendPeriod, setTrendPeriod] = React.useState<TrendPeriod>('daily')

  const summary = React.useMemo(() => getSummaryTotals(expenses), [expenses])
  const categoryTotals = React.useMemo(() => getCategoryTotals(expenses), [expenses])
  const platformStats = React.useMemo(() => getPlatformStats(expenses), [expenses])
  const paymentStats = React.useMemo(() => getPaymentMethodStats(expenses), [expenses])
  const trendData = React.useMemo(() => getSpendingTrend(expenses, trendPeriod), [expenses, trendPeriod])

  const topCategories = categoryTotals.slice(0, 3).map((item) => ({
    name: item.name,
    amount: item.value,
  }))

  const topPlatforms = platformStats.slice(0, 3).map((item) => ({
    name: item.name,
    amount: item.expense,
  }))

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-center justify-center">
            <div className="flex items-center space-x-3 text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Crunching the numbers...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!expenses.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Start by adding a few expenses to unlock insights.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Spending overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <SummaryStat label="Total expenses" value={summary.expenseTotal} currency={currency} tone="expense" />
            <SummaryStat label="Total inflows" value={summary.inflowTotal} currency={currency} tone="inflow" />
            <SummaryStat label="Net balance" value={summary.net} currency={currency} tone={summary.net >= 0 ? 'inflow' : 'expense'} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Spending trends</CardTitle>
            <p className="text-sm text-muted-foreground">Compare expenses and inflows over time.</p>
          </div>
          <div className="flex gap-2">
            {(Object.keys(periodLabels) as TrendPeriod[]).map((period) => (
              <Button
                key={period}
                variant={trendPeriod === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTrendPeriod(period)}
              >
                {periodLabels[period]}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <SpendingTrendChart data={trendData} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Category distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryPieChart data={categoryTotals} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Platform breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <PlatformBarChart data={platformStats} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment methods</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentMethodChart data={paymentStats} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick highlights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <HighlightsList title="Top categories" items={topCategories} currency={currency} emptyLabel="No categories yet." />
            <HighlightsList title="Top platforms" items={topPlatforms} currency={currency} emptyLabel="No platform data yet." />
            <div className="rounded-md bg-muted/60 p-3 text-muted-foreground">
              <p>
                Tracking {expenses.length} transaction{expenses.length !== 1 ? 's' : ''} this period.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

type SummaryStatProps = {
  label: string
  value: number
  currency: string
  tone: 'expense' | 'inflow'
}

function SummaryStat({ label, value, currency, tone }: SummaryStatProps) {
  const isExpense = tone === 'expense'
  const formatted = `${currency} ${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold ${isExpense ? 'text-red-600' : 'text-green-600'}`}>
        {isExpense && value > 0 ? '-' : value > 0 ? '+' : ''}
        {formatted}
      </p>
    </div>
  )
}

type HighlightItem = {
  name: string
  amount: number
}

type HighlightsListProps = {
  title: string
  items: HighlightItem[]
  currency: string
  emptyLabel: string
}

function HighlightsList({ title, items, currency, emptyLabel }: HighlightsListProps) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.name} className="flex items-center justify-between rounded-md bg-background p-2">
              <span className="font-medium">{item.name}</span>
              <span>
                {currency}{' '}
                {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

