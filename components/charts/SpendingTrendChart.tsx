'use client'

import * as React from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { TrendPoint } from '../../lib/analytics'

type SpendingTrendChartProps = {
  data: TrendPoint[]
}

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
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="expense" name="Expenses" stroke="#f97316" strokeWidth={2} />
        <Line type="monotone" dataKey="inflow" name="Inflows" stroke="#22c55e" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}

