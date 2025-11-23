'use client'

import * as React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'

import { CategoryTrendPoint } from '../../lib/analytics'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../ui/chart'

type CategoryTrendsChartProps = {
  data: CategoryTrendPoint[]
  categories: string[]
}

export function CategoryTrendsChart({ data, categories }: CategoryTrendsChartProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {}
    categories.forEach((category, index) => {
      config[category] = {
        label: category,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      }
    })
    return config
  }, [categories])

  const COLORS = React.useMemo(() => {
    return categories.map((_, index) => `hsl(var(--chart-${(index % 5) + 1}))`)
  }, [categories])

  if (!mounted) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
        Preparing chart...
      </div>
    )
  }

  if (data.length === 0 || categories.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
        Not enough data to show category trends yet.
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[320px] w-full">
      <AreaChart 
        data={data} 
        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
      >
        <defs>
          {categories.map((category, index) => (
            <linearGradient key={category} id={`color${category}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS[index]} stopOpacity={0.8} />
              <stop offset="95%" stopColor={COLORS[index]} stopOpacity={0.1} />
            </linearGradient>
          ))}
        </defs>
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
        {categories.map((category, index) => (
          <Area
            key={category}
            type="monotone"
            dataKey={category}
            stackId="1"
            stroke={COLORS[index]}
            fill={`url(#color${category})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  )
}

