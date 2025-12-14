'use client'

import * as React from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { SimpleDatum } from '@lib/analytics'
import { ChartConfig, ChartContainer, ChartTooltip } from '@components/ui/chart'
import { formatPrice } from '@/lib/formatPrice'

type CategoryPieChartProps = {
  data: SimpleDatum[]
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      value: {
        label: "Amount",
      },
    }
    data.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
      }
    })
    return config
  }, [data])

  const COLORS = React.useMemo(() => {
    return data.map((_, index) => `hsl(var(--chart-${(index % 5) + 1}))`)
  }, [data])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {data.name}
              </span>
              <span className="font-bold">
                {formatPrice(data.value)}
              </span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Preparing chart...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No category data available yet.
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
      <PieChart>
        <Pie 
          data={data} 
          dataKey="value" 
          nameKey="name" 
          innerRadius={60} 
          strokeWidth={5}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${entry.name}`} fill={COLORS[index]} />
          ))}
        </Pie>
        <ChartTooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ChartContainer>
  )
}

