'use client'

import * as React from 'react'
import { Bar, BarChart, XAxis, YAxis } from 'recharts'

import { ComparisonDatum } from '../../../lib/analytics'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../../../components/ui/chart'

type PaymentMethodChartProps = {
  data: ComparisonDatum[]
}

const chartConfig = {
  expense: {
    label: "Expense",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
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
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No payment data yet.</div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
      <BarChart 
        data={data} 
        layout="vertical" 
        margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
      >
        <XAxis type="number" hide />
        <YAxis 
          dataKey="name" 
          type="category" 
          width={100}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar 
          dataKey="expense" 
          name="Expenses" 
          fill="var(--color-expense)" 
          radius={[0, 4, 4, 0]} 
        />
      </BarChart>
    </ChartContainer>
  )
}

