'use client'

import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { ComparisonDatum } from '../../lib/analytics'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart'

type PlatformBarChartProps = {
  data: ComparisonDatum[]
  title?: string
  compact?: boolean
}

const chartConfig = {
  expense: {
    label: "Expense",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function PlatformBarChart({ data, title = 'Platform spend', compact = false }: PlatformBarChartProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Preparing chart...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No data yet.</div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className={compact ? "min-h-[200px] w-full" : "min-h-[260px] w-full"}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 50 }}>
        <CartesianGrid vertical={false} />
        <XAxis 
          dataKey="name" 
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          angle={-20} 
          textAnchor="end" 
          height={60} 
        />
        <YAxis 
          tickLine={false}
          axisLine={false}
          tickMargin={10}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar 
          dataKey="expense" 
          name={title} 
          fill="var(--color-expense)" 
          radius={[4, 4, 0, 0]} 
        />
      </BarChart>
    </ChartContainer>
  )
}

