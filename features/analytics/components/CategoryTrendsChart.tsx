'use client'

import * as React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'

import { CategoryTrendPoint } from '@lib/analytics'
import { ChartConfig, ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent } from '@components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart3 } from 'lucide-react'
import { formatPrice } from '@/lib/formatPrice'

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {label}
              </span>
              {payload.map((entry: any, index: number) => (
                <span key={index} className="font-bold" style={{ color: entry.color }}>
                  {entry.name}: {formatPrice(entry.value)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  if (!mounted) {
    return <Skeleton className="h-80 w-full rounded-md" />
  }

  if (data.length === 0 || categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 h-80">
        <div className="rounded-full bg-muted p-3">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Not enough data to show category trends yet</p>
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
        <ChartTooltip content={<CustomTooltip />} />
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

