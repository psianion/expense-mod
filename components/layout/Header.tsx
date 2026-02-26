import React from 'react'
import dayjs from 'dayjs'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { View } from '@/types'
import { formatPrice } from '@/lib/formatPrice'

interface HeaderProps {
  monthlyTotal: number
  currency: string
  view: View
  onViewChange: (view: View) => void
}

export function Header({ monthlyTotal, currency, view, onViewChange }: HeaderProps) {
  const currentMonth = dayjs().format('MMMM YYYY')
  const viewOptions: View[] = ['EXPENSES', 'ANALYTICS']
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Expense Tracker</CardTitle>
        <p className="text-muted-foreground">Track your expenses with AI-powered parsing</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Monthly Total ({currentMonth})</p>
            <p className={`text-3xl font-bold tabular-nums ${monthlyTotal < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {monthlyTotal < 0 ? '-' : ''}{formatPrice(Math.abs(monthlyTotal))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Net Balance</p>
            <p className={`text-lg font-semibold ${monthlyTotal < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {monthlyTotal < 0 ? 'Expenses' : 'Surplus'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {viewOptions.map((option) => (
              <Button
                key={option}
                variant={view === option ? 'default' : 'outline'}
                size="sm"
                onClick={() => onViewChange(option)}
              >
                {option === 'EXPENSES' ? 'Expenses' : 'Analytics'}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
