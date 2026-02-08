"use client"

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs'
import { Badge } from '@components/ui/badge'
import type { Expense } from '@/types'
import type { AnalyticsFilters, MetricComparison } from '@features/analytics/types'
import { getSummaryTotals, getCategoryTotals } from '@/lib/analytics'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@lib/utils'
import { format } from 'date-fns'

interface ComparisonViewProps {
  currentExpenses: Expense[]
  previousExpenses: Expense[]
  currentFilters: AnalyticsFilters
  previousFilters: AnalyticsFilters
  currency?: string
  className?: string
}

function calculateComparison(current: number, previous: number): MetricComparison {
  const change = current - previous
  const changePercent = previous !== 0 ? (change / previous) * 100 : 0

  return {
    current,
    previous,
    change,
    changePercent,
    trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
  }
}

export function ComparisonView({
  currentExpenses,
  previousExpenses,
  currentFilters,
  previousFilters,
  currency = '₹',
  className,
}: ComparisonViewProps) {
  const currentSummary = useMemo(() => getSummaryTotals(currentExpenses), [currentExpenses])
  const previousSummary = useMemo(() => getSummaryTotals(previousExpenses), [previousExpenses])

  const expenseComparison = calculateComparison(
    currentSummary.expenseTotal,
    previousSummary.expenseTotal
  )
  const inflowComparison = calculateComparison(
    currentSummary.inflowTotal,
    previousSummary.inflowTotal
  )
  const netComparison = calculateComparison(currentSummary.net, previousSummary.net)

  const currentCategories = useMemo(() => getCategoryTotals(currentExpenses), [currentExpenses])
  const previousCategories = useMemo(() => getCategoryTotals(previousExpenses), [previousExpenses])

  const categoryComparisons = useMemo(() => {
    const allCategories = new Set([
      ...currentCategories.map((c) => c.name),
      ...previousCategories.map((c) => c.name),
    ])

    return Array.from(allCategories)
      .map((name) => {
        const current = currentCategories.find((c) => c.name === name)?.value || 0
        const previous = previousCategories.find((c) => c.name === name)?.value || 0
        return {
          name,
          ...calculateComparison(current, previous),
        }
      })
      .sort((a, b) => b.current - a.current)
  }, [currentCategories, previousCategories])

  const ComparisonMetric = ({
    label,
    comparison,
    inverted = false,
  }: {
    label: string
    comparison: MetricComparison
    inverted?: boolean
  }) => {
    const getTrendColor = () => {
      if (inverted) {
        if (comparison.trend === 'up') return 'text-destructive'
        if (comparison.trend === 'down') return 'text-emerald-600 dark:text-emerald-400'
      } else {
        if (comparison.trend === 'up') return 'text-emerald-600 dark:text-emerald-400'
        if (comparison.trend === 'down') return 'text-destructive'
      }
      return 'text-muted-foreground'
    }

    const getTrendIcon = () => {
      if (comparison.trend === 'up') return <TrendingUp className="h-4 w-4" />
      if (comparison.trend === 'down') return <TrendingDown className="h-4 w-4" />
      return <Minus className="h-4 w-4" />
    }

    return (
      <div className="space-y-2 rounded-lg border p-4">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">
              {currency}
              {comparison.current.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              was {currency}
              {comparison.previous?.toFixed(2)}
            </div>
          </div>
          <div className={cn('flex items-center gap-1 text-sm font-medium', getTrendColor())}>
            {getTrendIcon()}
            <span>{Math.abs(comparison.changePercent || 0).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Period Comparison</CardTitle>
        <div className="flex gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">
            Current:{' '}
            {currentFilters.dateRange
              ? `${format(new Date(currentFilters.dateRange.start), 'MMM dd')} - ${format(new Date(currentFilters.dateRange.end), 'MMM dd')}`
              : 'All time'}
          </Badge>
          <Badge variant="outline">
            Previous:{' '}
            {previousFilters.dateRange
              ? `${format(new Date(previousFilters.dateRange.start), 'MMM dd')} - ${format(new Date(previousFilters.dateRange.end), 'MMM dd')}`
              : 'All time'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
              <ComparisonMetric label="Total Expenses" comparison={expenseComparison} inverted />
              <ComparisonMetric label="Total Inflows" comparison={inflowComparison} />
              <ComparisonMetric label="Net Balance" comparison={netComparison} />
            </div>

            <div className="grid gap-4 @sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border p-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Transaction Count
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold">{currentExpenses.length}</div>
                    <div className="text-xs text-muted-foreground">
                      was {previousExpenses.length}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {currentExpenses.length > previousExpenses.length ? '+' : ''}
                    {currentExpenses.length - previousExpenses.length}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border p-4">
                <div className="text-sm font-medium text-muted-foreground">Average Transaction</div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {currency}
                      {currentExpenses.length > 0
                        ? (currentSummary.expenseTotal / currentExpenses.length).toFixed(2)
                        : '0.00'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      was {currency}
                      {previousExpenses.length > 0
                        ? (previousSummary.expenseTotal / previousExpenses.length).toFixed(2)
                        : '0.00'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-2">
            <div className="space-y-2">
              {categoryComparisons.slice(0, 10).map((category) => (
                <div
                  key={category.name}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <div className="font-medium">{category.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {currency}
                      {category.current.toFixed(2)} (was {currency}
                      {category.previous?.toFixed(2)})
                    </div>
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1 text-sm font-medium',
                      category.trend === 'up'
                        ? 'text-destructive'
                        : category.trend === 'down'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground'
                    )}
                  >
                    {category.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                    {category.trend === 'down' && <TrendingDown className="h-3 w-3" />}
                    {category.trend === 'neutral' && <Minus className="h-3 w-3" />}
                    <span>{Math.abs(category.changePercent || 0).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>

            {categoryComparisons.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                No category data available for comparison
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
