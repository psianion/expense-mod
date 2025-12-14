import * as React from 'react'

import { TrendPeriod, getCategoryTotals, getCategoryTrend, getAvailableCategories, getPaymentMethodStats, getPlatformStats, getFilteredSpendingTrend, getSummaryTotals } from '@lib/analytics'
import { Expense } from '@/types'
import { Button } from '@components/ui/button'
import { formatPrice } from '@/lib/formatPrice'
import { AnimatedButton } from '@lib/animations'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'
import { CategoryPieChart } from '@features/analytics/components/CategoryPieChart'
import { PlatformBarChart } from './PlatformBarChart'
import { PaymentMethodChart } from './PaymentMethodChart'
import { SpendingTrendChart } from './SpendingTrendChart'
import { CategoryTrendsChart } from './CategoryTrendsChart'
import { MultiSelect } from '@components/ui/multi-select'
import { StaggerContainer, StaggerItem, AnimatedCard, chartReveal } from '@lib/animations'

type AnalyticsDashboardProps = {
  expenses: Expense[]
  isLoading: boolean
  currency: string
}

const periodLabels: Record<TrendPeriod, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
}

export function AnalyticsDashboard({ expenses, isLoading, currency }: AnalyticsDashboardProps) {
  const [trendPeriod, setTrendPeriod] = React.useState<TrendPeriod>('DAILY')
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([])

  const summary = React.useMemo(() => getSummaryTotals(expenses), [expenses])
  const categoryTotals = React.useMemo(() => getCategoryTotals(expenses), [expenses])
  const platformStats = React.useMemo(() => getPlatformStats(expenses), [expenses])
  const paymentStats = React.useMemo(() => getPaymentMethodStats(expenses), [expenses])
  const availableCategories = React.useMemo(() => getAvailableCategories(expenses), [expenses])
  
  const trendData = React.useMemo(
    () => getFilteredSpendingTrend(expenses, trendPeriod, selectedCategories.length > 0 ? selectedCategories : undefined),
    [expenses, trendPeriod, selectedCategories]
  )

  const categoryTrendData = React.useMemo(
    () => getCategoryTrend(expenses, trendPeriod, selectedCategories.length > 0 ? selectedCategories : undefined),
    [expenses, trendPeriod, selectedCategories]
  )

  const categoryOptions = React.useMemo(
    () => availableCategories.map((cat) => ({ label: cat, value: cat })),
    [availableCategories]
  )

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
    <StaggerContainer className="space-y-4">
      <StaggerItem>
        <AnimatedCard hover={false}>
          <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Spending trends</CardTitle>
                <p className="text-sm text-muted-foreground">Compare expenses and inflows over time.</p>
              </div>
              <div className="flex gap-2">
                {(Object.keys(periodLabels) as TrendPeriod[]).map((period) => (
                  <AnimatedButton
                    key={period}
                    variant={trendPeriod === period ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTrendPeriod(period)}
                  >
                    {periodLabels[period]}
                  </AnimatedButton>
                ))}
              </div>
            </div>
            {availableCategories.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Filter by category:</span>
                <MultiSelect
                  options={categoryOptions}
                  selected={selectedCategories}
                  onChange={setSelectedCategories}
                  placeholder="All categories"
                  className="w-full max-w-xs"
                />
              </div>
            )}
          </CardHeader>
          <CardContent>
            <SpendingTrendChart data={trendData} />
          </CardContent>
        </AnimatedCard>
      </StaggerItem>

      <StaggerItem>
        <AnimatedCard hover={false}>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Category trends</CardTitle>
              <p className="text-sm text-muted-foreground">Track spending by category over time.</p>
            </div>
          <div className="flex gap-2">
            {(Object.keys(periodLabels) as TrendPeriod[]).map((period) => (
              <AnimatedButton
                key={period}
                variant={trendPeriod === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTrendPeriod(period)}
              >
                {periodLabels[period]}
              </AnimatedButton>
            ))}
          </div>
          </CardHeader>
          <CardContent>
            <CategoryTrendsChart
              data={categoryTrendData}
              categories={selectedCategories.length > 0 ? selectedCategories : availableCategories}
            />
          </CardContent>
        </AnimatedCard>
      </StaggerItem>

      <StaggerItem>
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatedCard hover={false}>
            <CardHeader>
              <CardTitle>Category distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryPieChart data={categoryTotals} />
            </CardContent>
          </AnimatedCard>
          <AnimatedCard hover={false}>
            <CardHeader>
              <CardTitle>Platform breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <PlatformBarChart data={platformStats} />
            </CardContent>
          </AnimatedCard>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatedCard hover={false}>
            <CardHeader>
              <CardTitle>Payment methods</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentMethodChart data={paymentStats} />
            </CardContent>
          </AnimatedCard>
          <AnimatedCard hover={false}>
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
          </AnimatedCard>
        </div>
      </StaggerItem>
    </StaggerContainer>
  )
}

type SummaryStatProps = {
  label: string
  value: number
  currency: string
  tone: 'EXPENSE' | 'INFLOW'
}

function SummaryStat({ label, value, currency, tone }: SummaryStatProps) {
  const isExpense = tone === 'EXPENSE'
  const formatted = formatPrice(Math.abs(value))

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
                {formatPrice(item.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

