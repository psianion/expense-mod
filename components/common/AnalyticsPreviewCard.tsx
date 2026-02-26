"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { analyticsApi } from '@/lib/api'
import { formatPrice } from '@/lib/formatPrice'
import { cn } from '@/lib/utils'

interface AnalyticsPreviewCardProps {
  className?: string
}

export function AnalyticsPreviewCard({ className }: AnalyticsPreviewCardProps) {
  const [analyticsData, setAnalyticsData] = useState<{
    summary: { expenseTotal: number; inflowTotal: number; net: number }
    topCategories: Array<{ name: string; value: number }>
    totalTransactions: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true)
      const data = await analyticsApi.getAnalyticsData()
      setAnalyticsData(data)
    } catch (error) {
      console.error('Unexpected error fetching analytics data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const summary = analyticsData?.summary || { expenseTotal: 0, inflowTotal: 0, net: 0 }
  const topCategories = analyticsData?.topCategories || []
  const totalTransactions = analyticsData?.totalTransactions || 0

  if (isLoading) {
    return (
      <Card className={cn('relative', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('relative', className)}>
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
          {totalTransactions} transaction{totalTransactions !== 1 ? 's' : ''} •           {summary.net >= 0 ? (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              +{formatPrice(summary.net)}
            </span>
          ) : (
            <span className="text-destructive flex items-center gap-1">
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
              <p className="font-medium tabular-nums text-destructive">{formatPrice(summary.expenseTotal)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Income</p>
              <p className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{formatPrice(summary.inflowTotal)}</p>
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
