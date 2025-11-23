import * as React from 'react'

import { TrendPeriod, getCategoryTotals, getCategoryTrend, getAvailableCategories, getPaymentMethodStats, getPlatformStats, getFilteredSpendingTrend, getSummaryTotals } from '../lib/analytics'
import { Expense } from '../types'
import { Button } from './ui/button'
import { CategoryPieChart } from './charts/CategoryPieChart'
import { PlatformBarChart } from './charts/PlatformBarChart'
import { PaymentMethodChart } from './charts/PaymentMethodChart'
import { SpendingTrendChart } from './charts/SpendingTrendChart'
import { CategoryTrendsChart } from './charts/CategoryTrendsChart'
import { ChartCard } from './charts/ChartCard'
import { ChartFullscreen } from './charts/ChartFullscreen'
import { MultiSelect } from './ui/multi-select'

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
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([])
  const [fullscreenChart, setFullscreenChart] = React.useState<string | null>(null)
  const [initialRect, setInitialRect] = React.useState<DOMRect | null>(null)
  
  const cardRefs = React.useRef<{ [key: string]: HTMLDivElement | null }>({})

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
      <div className="flex h-40 items-center justify-center">
        <div className="flex items-center space-x-3 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Crunching the numbers...</span>
        </div>
      </div>
    )
  }

  if (!expenses.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Start by adding a few expenses to unlock insights.
      </div>
    )
  }

  const renderPeriodFilters = () => (
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
  )

  const renderCategoryFilter = () => (
    availableCategories.length > 0 && (
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
    )
  )

  const handleFullscreen = (chartId: string) => (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    setInitialRect(rect)
    setFullscreenChart(chartId)
  }

  const handleCloseFullscreen = () => {
    setFullscreenChart(null)
    // Clear initialRect after animation completes
    setTimeout(() => setInitialRect(null), 300)
  }

  return (
    <>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <ChartCard
          ref={(el) => { cardRefs.current['spending-trends'] = el }}
          title="Spending trends"
          description="Compare expenses and inflows over time"
          onFullscreen={handleFullscreen('spending-trends')}
          className="md:col-span-2"
        >
          <SpendingTrendChart data={trendData} compact />
        </ChartCard>

        <ChartCard
          ref={(el) => { cardRefs.current['category-distribution'] = el }}
          title="Category distribution"
          description="Breakdown by expense categories"
          onFullscreen={handleFullscreen('category-distribution')}
        >
          <CategoryPieChart data={categoryTotals} compact />
        </ChartCard>

        <ChartCard
          ref={(el) => { cardRefs.current['category-trends'] = el }}
          title="Category trends"
          description="Track spending by category over time"
          onFullscreen={handleFullscreen('category-trends')}
        >
          <CategoryTrendsChart 
            data={categoryTrendData} 
            categories={selectedCategories.length > 0 ? selectedCategories : availableCategories}
            compact
          />
        </ChartCard>

        <ChartCard
          ref={(el) => { cardRefs.current['platform-breakdown'] = el }}
          title="Platform breakdown"
          description="Spending by platform"
          onFullscreen={handleFullscreen('platform-breakdown')}
          className="md:col-span-2"
        >
          <PlatformBarChart data={platformStats} compact />
        </ChartCard>
      </div>

      {/* Fullscreen Modals */}
      <ChartFullscreen
        open={fullscreenChart === 'spending-trends'}
        onOpenChange={(open) => !open && handleCloseFullscreen()}
        title="Spending Trends"
        initialRect={initialRect}
        filters={
          <>
            {renderPeriodFilters()}
            {renderCategoryFilter()}
          </>
        }
      >
        <SpendingTrendChart data={trendData} />
      </ChartFullscreen>

      <ChartFullscreen
        open={fullscreenChart === 'category-trends'}
        onOpenChange={(open) => !open && handleCloseFullscreen()}
        title="Category Trends"
        initialRect={initialRect}
        filters={
          <>
            {renderPeriodFilters()}
            {renderCategoryFilter()}
          </>
        }
      >
        <CategoryTrendsChart 
          data={categoryTrendData} 
          categories={selectedCategories.length > 0 ? selectedCategories : availableCategories}
        />
      </ChartFullscreen>

      <ChartFullscreen
        open={fullscreenChart === 'category-distribution'}
        onOpenChange={(open) => !open && handleCloseFullscreen()}
        title="Category Distribution"
        initialRect={initialRect}
      >
        <CategoryPieChart data={categoryTotals} />
      </ChartFullscreen>

      <ChartFullscreen
        open={fullscreenChart === 'platform-breakdown'}
        onOpenChange={(open) => !open && handleCloseFullscreen()}
        title="Platform Breakdown"
        initialRect={initialRect}
      >
        <PlatformBarChart data={platformStats} />
      </ChartFullscreen>
    </>
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

