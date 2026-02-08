"use client"

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'
import type { Expense } from '@/types'
import { cn } from '@lib/utils'
import { format, getHours, getDay } from 'date-fns'

interface SpendingHeatmapProps {
  expenses: Expense[]
  currency?: string
  className?: string
}

interface HeatmapCell {
  day: number
  hour: number
  amount: number
  count: number
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function SpendingHeatmap({ expenses, currency = '₹', className }: SpendingHeatmapProps) {
  const heatmapData = useMemo(() => {
    // Initialize grid
    const grid: Record<string, HeatmapCell> = {}

    expenses.forEach((expense) => {
      if (expense.type !== 'EXPENSE' || !expense.datetime) return

      const date = new Date(expense.datetime)
      const day = getDay(date)
      const hour = getHours(date)
      const key = `${day}-${hour}`

      if (!grid[key]) {
        grid[key] = { day, hour, amount: 0, count: 0 }
      }

      grid[key].amount += expense.amount
      grid[key].count += 1
    })

    return Object.values(grid)
  }, [expenses])

  const maxAmount = useMemo(() => {
    return Math.max(...heatmapData.map((cell) => cell.amount), 1)
  }, [heatmapData])

  const getIntensity = (amount: number) => {
    const intensity = amount / maxAmount
    if (intensity === 0) return 'bg-muted/30'
    if (intensity < 0.25) return 'bg-primary/20'
    if (intensity < 0.5) return 'bg-primary/40'
    if (intensity < 0.75) return 'bg-primary/60'
    return 'bg-primary/80'
  }

  const getCellData = (day: number, hour: number): HeatmapCell | null => {
    return heatmapData.find((cell) => cell.day === day && cell.hour === hour) || null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Spending Patterns (Day × Hour)</CardTitle>
      </CardHeader>
      <CardContent className="@container">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Hours header */}
            <div className="mb-2 flex gap-1 pl-12">
              {[0, 4, 8, 12, 16, 20].map((hour) => (
                <div key={hour} className="flex-1 text-center text-xs text-muted-foreground">
                  {hour}h
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="space-y-1">
              {DAYS.map((dayLabel, dayIndex) => (
                <div key={dayLabel} className="flex items-center gap-1">
                  <div className="w-10 text-xs font-medium text-muted-foreground">{dayLabel}</div>
                  <div className="flex flex-1 gap-1">
                    {HOURS.map((hour) => {
                      const cellData = getCellData(dayIndex, hour)
                      return (
                        <div
                          key={hour}
                          className={cn(
                            'group relative flex-1 cursor-pointer rounded transition-all hover:ring-2 hover:ring-primary',
                            'aspect-square min-h-[20px] min-w-[20px]',
                            getIntensity(cellData?.amount || 0)
                          )}
                          title={
                            cellData
                              ? `${dayLabel} ${hour}:00 - ${currency}${cellData.amount.toFixed(2)} (${cellData.count} transactions)`
                              : `${dayLabel} ${hour}:00 - No transactions`
                          }
                        >
                          {/* Tooltip */}
                          {cellData && (
                            <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block">
                              <div className="font-medium">
                                {dayLabel} {hour}:00
                              </div>
                              <div>
                                {currency}
                                {cellData.amount.toFixed(2)}
                              </div>
                              <div className="text-muted-foreground">
                                {cellData.count} transaction{cellData.count !== 1 ? 's' : ''}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="h-4 w-4 rounded bg-muted/30" />
                <div className="h-4 w-4 rounded bg-primary/20" />
                <div className="h-4 w-4 rounded bg-primary/40" />
                <div className="h-4 w-4 rounded bg-primary/60" />
                <div className="h-4 w-4 rounded bg-primary/80" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>

        {heatmapData.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            No spending data available for heatmap
          </div>
        )}
      </CardContent>
    </Card>
  )
}
