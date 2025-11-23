'use client'

import * as React from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'

import { TrendPoint } from '../../lib/analytics'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../ui/chart'

type SpendingTrendChartProps = {
  data: TrendPoint[]
}

const chartConfig = {
  expense: {
    label: "Expenses",
    color: "hsl(var(--chart-1))",
  },
  inflow: {
    label: "Inflows",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function SpendingTrendChart({ data }: SpendingTrendChartProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
        Preparing chart...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
        Not enough data to show a trend yet.
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[320px] w-full">
      <LineChart 
        data={data} 
        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis 
          dataKey="label" 
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis 
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={60}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line 
          type="monotone" 
          dataKey="expense" 
          stroke="var(--color-expense)" 
          strokeWidth={2} 
          dot={false}
        />
        <Line 
          type="monotone" 
          dataKey="inflow" 
          stroke="var(--color-inflow)" 
          strokeWidth={2} 
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}

