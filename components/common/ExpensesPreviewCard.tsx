"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { expensesApi } from '@/lib/api'
import { Expense } from '@/types'
import { fromUTC } from '@/lib/datetime'
import { formatPrice } from '@/lib/formatPrice'

export function ExpensesPreviewCard() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchRecentExpenses()
  }, [])

  const fetchRecentExpenses = async () => {
    try {
      setIsLoading(true)

      const expenses = await expensesApi.getRecentExpenses(5)

      const expensesWithLocalTime = expenses.map((expense) => ({
        ...expense,
        datetime: fromUTC(expense.datetime),
        type: expense.type?.toUpperCase?.() as 'EXPENSE' | 'INFLOW' || 'EXPENSE',
        source: expense.source?.toUpperCase?.() as 'MANUAL' | 'AI' | 'RECURRING' || 'MANUAL',
        bill_instance_id: expense.bill_instance_id ?? null,
      }))

      setExpenses(expensesWithLocalTime)
    } catch (error) {
      console.error('Unexpected error fetching recent expenses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  if (isLoading) {
    return (
      <Card className="relative">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="relative">
      <Link
        href="/expenses"
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
        aria-label="View all expenses"
      >
        <ExternalLink className="h-4 w-4" />
      </Link>

      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Recent Expenses</CardTitle>
        <CardDescription>
          {expenses.length} transaction{expenses.length !== 1 ? 's' : ''} • {formatPrice(totalAmount)}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses yet</p>
        ) : (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-[120px]" title={expense.event || 'Unknown'}>
                    {expense.event || 'Unknown'}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {expense.type}
                  </Badge>
                </div>
                <span className="font-medium">{formatPrice(expense.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
