import React from 'react'
import dayjs from 'dayjs'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface HeaderProps {
  monthlyTotal: number
  currency: string
}

export function Header({ monthlyTotal, currency }: HeaderProps) {
  const currentMonth = dayjs().format('MMMM YYYY')
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Expense Tracker</CardTitle>
        <p className="text-muted-foreground">Track your expenses with AI-powered parsing</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Monthly Total ({currentMonth})</p>
            <p className={`text-3xl font-bold ${monthlyTotal < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {monthlyTotal < 0 ? '-' : ''}{currency} {Math.abs(monthlyTotal).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Net Balance</p>
            <p className={`text-lg font-semibold ${monthlyTotal < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {monthlyTotal < 0 ? 'Expenses' : 'Surplus'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
