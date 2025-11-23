'use client'

import * as React from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { SimpleDatum } from '../../lib/analytics'

const COLORS = ['#2563eb', '#f97316', '#10b981', '#a855f7', '#f43f5e', '#14b8a6', '#facc15']

type CategoryPieChartProps = {
  data: SimpleDatum[]
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
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
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No category data available yet.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={100} paddingAngle={4}>
          {data.map((entry, index) => (
            <Cell key={`category-${entry.name}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

