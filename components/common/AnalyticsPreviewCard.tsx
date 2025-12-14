"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/server/db/supabase'
import { Expense } from '@/types'
import { getSummaryTotals, getCategoryTotals } from '@/lib/analytics'
import { fromUTC } from '@/lib/datetime'
import { formatPrice } from '@/lib/formatPrice'

export function AnalyticsPreviewCard() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchRecentExpenses()
  }, [])

  const fetchRecentExpenses = async () => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100) // Get more data for analytics

      if (error) {
        console.error('Error fetching expenses for analytics:', error)
        return
      }

      const expensesWithLocalTime = (data || []).map((expense) => ({
        ...expense,
        datetime: fromUTC(expense.datetime),
        type: expense.type?.toUpperCase?.() as 'EXPENSE' | 'INFLOW' || 'EXPENSE',
        source: expense.source?.toUpperCase?.() as 'MANUAL' | 'AI' | 'RECURRING' || 'MANUAL',
        bill_instance_id: expense.bill_instance_id ?? null,
      }))

      setExpenses(expensesWithLocalTime)
    } catch (error) {
      console.error('Unexpected error fetching expenses for analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const summary = getSummaryTotals(expenses)
  const categoryTotals = getCategoryTotals(expenses)
  const topCategories = categoryTotals
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)

  if (isLoading) {
    return (
      <Card className="relative">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="relative">
      <Link
        href="/analytics"
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
        aria-label="View analytics"
      >
        <ExternalLink className="h-4 w-4" />
      </Link>

      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Analytics</CardTitle>
        <CardDescription>
          {expenses.length} transaction{expenses.length !== 1 ? 's' : ''} •           {summary.net >= 0 ? (
            <span className="text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{formatPrice(summary.net)}
            </span>
          ) : (
            <span className="text-red-600 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              -{formatPrice(Math.abs(summary.net))}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Expenses</p>
              <p className="font-medium text-red-600">{formatPrice(summary.expenseTotal)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Income</p>
              <p className="font-medium text-green-600">{formatPrice(summary.inflowTotal)}</p>
            </div>
          </div>

          {topCategories.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Top Categories</p>
              <div className="space-y-1">
                {topCategories.map((category) => (
                  <div key={category.name} className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-[120px]" title={category.name}>
                      {category.name}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {formatPrice(category.value)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
