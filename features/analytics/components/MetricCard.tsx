import { Card, CardContent } from '@components/ui/card'
import { cn } from '@lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { KPIMetric } from '@features/analytics/types'

interface MetricCardProps {
  metric: KPIMetric
  className?: string
}

export function MetricCard({ metric, className }: MetricCardProps) {
  const { label, formatted, comparison } = metric

  const getTrendColor = () => {
    if (!comparison) return ''
    if (comparison.trend === 'up') return 'text-emerald-600 dark:text-emerald-400'
    if (comparison.trend === 'down') return 'text-destructive'
    return 'text-muted-foreground'
  }

  const getTrendIcon = () => {
    if (!comparison) return null
    if (comparison.trend === 'up') return <TrendingUp className="h-3 w-3" />
    if (comparison.trend === 'down') return <TrendingDown className="h-3 w-3" />
    return <Minus className="h-3 w-3" />
  }

  return (
    <Card className={cn('transition-colors hover:bg-accent/50', className)}>
      <CardContent className="p-4 @container">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>

          <div className="flex items-baseline justify-between gap-2">
            <p className="text-2xl font-bold @xs:text-3xl">{formatted}</p>

            {comparison && (
              <div className={cn('flex items-center gap-1 text-xs font-medium', getTrendColor())}>
                {getTrendIcon()}
                <span>
                  {comparison.changePercent !== undefined
                    ? `${Math.abs(comparison.changePercent).toFixed(1)}%`
                    : comparison.change !== undefined
                    ? `${comparison.change > 0 ? '+' : ''}${comparison.change.toFixed(2)}`
                    : ''}
                </span>
              </div>
            )}
          </div>

          {comparison?.previous !== undefined && (
            <p className="text-xs text-muted-foreground">
              vs previous period: {comparison.previous.toFixed(2)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface MetricsGridProps {
  metrics: KPIMetric[]
  className?: string
}

export function MetricsGrid({ metrics, className }: MetricsGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 @sm:grid-cols-2 @lg:grid-cols-3 @2xl:grid-cols-6',
        className
      )}
    >
      {metrics.map((metric, index) => (
        <MetricCard key={index} metric={metric} />
      ))}
    </div>
  )
}
