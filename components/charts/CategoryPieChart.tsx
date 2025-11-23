'use client'

import * as React from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { SimpleDatum } from '../../lib/analytics'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../ui/chart'

type CategoryPieChartProps = {
  data: SimpleDatum[]
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const chartData = React.useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      fill: `var(--chart-${(index % 5) + 1})`,
    }))
  }, [data])

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      amount: {
        label: "Amount",
      },
    }
    data.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: `var(--chart-${(index % 5) + 1})`,
      }
    })
    return config
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
    <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
      <PieChart>
        <Pie 
          data={chartData} 
          dataKey="value" 
          nameKey="name" 
          innerRadius={60} 
          strokeWidth={5}
        >
        </Pie>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Legend />
      </PieChart>
    </ChartContainer>
  )
}

