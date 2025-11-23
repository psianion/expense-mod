'use client'

import * as React from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { SimpleDatum } from '../../lib/analytics'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart'

type CategoryPieChartProps = {
  data: SimpleDatum[]
  compact?: boolean
}

export function CategoryPieChart({ data, compact = false }: CategoryPieChartProps) {
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
    <ChartContainer config={chartConfig} className={compact ? "min-h-[200px] w-full" : "min-h-[260px] w-full"}>
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
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Legend />
      </PieChart>
    </ChartContainer>
  )
}

