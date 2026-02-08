import * as React from 'react'

import { TrendPeriod, getCategoryTotals, getCategoryTrend, getAvailableCategories, getPaymentMethodStats, getPlatformStats, getFilteredSpendingTrend, getSummaryTotals, getCreditCardAnalytics, getCreditCardComparison } from '@lib/analytics'
import { Expense } from '@/types'
import { Button } from '@components/ui/button'
import { formatPrice } from '@/lib/formatPrice'
import { getUserPreferences } from '@/lib/userPreferences'
import { AnimatedButton } from '@components/animations'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'
import { CategoryPieChart } from '@features/analytics/components/CategoryPieChart'
import { PlatformBarChart } from './PlatformBarChart'
import { PaymentMethodChart } from './PaymentMethodChart'
import { SpendingTrendChart } from './SpendingTrendChart'
import { CategoryTrendsChart } from './CategoryTrendsChart'
import { MultiSelect } from '@components/ui/multi-select'
import { StaggerContainer, StaggerItem, AnimatedCard, chartReveal } from '@components/animations'
import { FiltersPanel } from './FiltersPanel'
import { MetricsGrid } from './MetricCard'
import { SpendingHeatmap } from './SpendingHeatmap'
import { ComparisonView } from './ComparisonView'
import type { AnalyticsFilters, KPIMetric } from '@features/analytics/types'
import { useAnalyticsComparisonQuery } from '@/lib/query/hooks/useAnalyticsQuery'
import { subDays, subMonths } from 'date-fns'

type AnalyticsDashboardProps = {
  expenses: Expense[]
  isLoading: boolean
  currency: string
  filters?: AnalyticsFilters
}

const periodLabels: Record<TrendPeriod, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
}

export function AnalyticsDashboard({ expenses, isLoading, currency, filters }: AnalyticsDashboardProps) {
  const [trendPeriod, setTrendPeriod] = React.useState<TrendPeriod>(filters?.period || 'MONTHLY')
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(filters?.categories || [])
  const [showComparison, setShowComparison] = React.useState(false)

  // Get comparison data if date range is set
  const previousFilters = React.useMemo(() => {
    if (!filters?.dateRange || !showComparison) return null

    const start = new Date(filters.dateRange.start)
    const end = new Date(filters.dateRange.end)
    const duration = end.getTime() - start.getTime()

    return {
      ...filters,
      dateRange: {
        start: new Date(start.getTime() - duration).toISOString(),
        end: start.toISOString(),
      },
    }
  }, [filters, showComparison])

  const { data: comparisonData } = useAnalyticsComparisonQuery(
    filters!,
    previousFilters!,
    showComparison && !!previousFilters
  )

  const summary = React.useMemo(() => getSummaryTotals(expenses), [expenses])
  const categoryTotals = React.useMemo(() => getCategoryTotals(expenses), [expenses])
  const platformStats = React.useMemo(() => getPlatformStats(expenses), [expenses])
  const paymentStats = React.useMemo(() => getPaymentMethodStats(expenses), [expenses])
  const availableCategories = React.useMemo(() => getAvailableCategories(expenses), [expenses])
  const availablePlatforms = React.useMemo(
    () => Array.from(new Set(expenses.map(e => e.platform).filter(Boolean))),
    [expenses]
  )
  const availablePaymentMethods = React.useMemo(
    () => Array.from(new Set(expenses.map(e => e.payment_method).filter(Boolean))),
    [expenses]
  )

  // KPI Metrics
  const kpiMetrics = React.useMemo((): KPIMetric[] => {
    const avgTransaction = expenses.length > 0 ? summary.expenseTotal / expenses.length : 0
    
    return [
      {
        label: 'Total Expenses',
        value: summary.expenseTotal,
        formatted: formatPrice(summary.expenseTotal),
      },
      {
        label: 'Total Inflows',
        value: summary.inflowTotal,
        formatted: formatPrice(summary.inflowTotal),
      },
      {
        label: 'Net Balance',
        value: summary.net,
        formatted: formatPrice(summary.net),
      },
      {
        label: 'Transactions',
        value: expenses.length,
        formatted: expenses.length.toString(),
      },
      {
        label: 'Avg Transaction',
        value: avgTransaction,
        formatted: formatPrice(avgTransaction),
      },
      {
        label: 'Categories',
        value: availableCategories.length,
        formatted: availableCategories.length.toString(),
      },
    ]
  }, [summary, expenses, availableCategories])

  // Credit card analytics
  const creditCards = React.useMemo(() => getUserPreferences().creditCards, [])
  const creditCardComparison = React.useMemo(() =>
    creditCards.length > 0 ? getCreditCardComparison(expenses, creditCards.map(card => card.name)) : [],
    [expenses, creditCards]
  )
  
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
      <div className="space-y-4">
        <FiltersPanel
          expenses={expenses}
          availableCategories={availableCategories}
          availablePlatforms={availablePlatforms}
          availablePaymentMethods={availablePaymentMethods}
        />
        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No expenses found for the selected filters. Try adjusting your filters or add some expenses to get started.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters Panel */}
      <FiltersPanel
        expenses={expenses}
        availableCategories={availableCategories}
        availablePlatforms={availablePlatforms}
        availablePaymentMethods={availablePaymentMethods}
      />

      <StaggerContainer className="space-y-4">{/* KPI Metrics Grid */}
        <StaggerItem>
          <MetricsGrid metrics={kpiMetrics} />
        </StaggerItem>

        {/* Comparison View */}
        {showComparison && comparisonData && previousFilters && filters && (
          <StaggerItem>
            <ComparisonView
              currentExpenses={comparisonData.current}
              previousExpenses={comparisonData.previous}
              currentFilters={filters}
              previousFilters={previousFilters}
              currency={currency}
            />
          </StaggerItem>
        )}

        {/* Toggle Comparison Button */}
        {filters?.dateRange && (
          <StaggerItem>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
              >
                {showComparison ? 'Hide' : 'Show'} Period Comparison
              </Button>
            </div>
          </StaggerItem>
        )}

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

        {/* Spending Heatmap */}
        <StaggerItem>
          <SpendingHeatmap expenses={expenses} currency={currency} />
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

        {/* Credit Card Insights */}
        {creditCards.length > 0 && (
          <StaggerItem>
            <AnimatedCard hover={false}>
              <CardHeader>
                <CardTitle>Credit Card Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {creditCardComparison.map((card) => (
                    <div key={card.name} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{card.name}</span>
                        <span className="text-lg font-bold">{formatPrice(card.expense)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {((card.expense / summary.expenseTotal) * 100).toFixed(1)}% of spending
                      </div>
                    </div>
                  ))}
                </div>

                {creditCardComparison.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span>Total Credit Card Spending:</span>
                      <span className="font-semibold">
                        {formatPrice(creditCardComparison.reduce((sum, card) => sum + card.expense, 0))}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {((creditCardComparison.reduce((sum, card) => sum + card.expense, 0) / summary.expenseTotal) * 100).toFixed(1)}% of total expenses
                    </div>
                  </div>
                )}
              </CardContent>
            </AnimatedCard>
          </StaggerItem>
        )}
      </StaggerContainer>
    </div>
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

