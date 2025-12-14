'use client'

import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { ComparisonDatum } from '@lib/analytics'
import { ChartConfig, ChartContainer, ChartTooltip } from '@components/ui/chart'
import { formatPrice } from '@/lib/formatPrice'

type PlatformBarChartProps = {
  data: ComparisonDatum[]
  title?: string
}

const chartConfig = {
  expense: {
    label: "Expense",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-1 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {label}
            </span>
            <span className="font-bold">
              {payload[0].name}: {formatPrice(payload[0].value)}
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export function PlatformBarChart({ data, title = 'Platform spend' }: PlatformBarChartProps) {
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
    <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
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
        <ChartTooltip content={<CustomTooltip />} />
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

