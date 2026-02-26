"use client"

import Link from 'next/link'
import { ExternalLink, Receipt } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecentExpensesQuery } from '@/lib/query/hooks'
import { formatPrice } from '@/lib/formatPrice'
import { cn } from '@/lib/utils'
import type { Expense } from '@/types'

function expenseLabel(expense: Expense): string {
  if (expense.tags?.length) return expense.tags[0]
  if (expense.platform) return expense.platform
  if (expense.category) return expense.category
  return 'Expense'
}

interface ExpensesPreviewCardProps {
  className?: string
}

export function ExpensesPreviewCard({ className }: ExpensesPreviewCardProps) {
  const { data: expenses = [], isLoading } = useRecentExpensesQuery(5)

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  if (isLoading) {
    return (
      <Card className={cn('relative', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('relative', className)}>
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
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="rounded-full bg-muted p-3">
              <Receipt className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No expenses yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="truncate max-w-[120px]" title={expenseLabel(expense)}>
                    {expenseLabel(expense)}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {expense.type}
                  </Badge>
                </div>
                <span className="font-medium tabular-nums">{formatPrice(expense.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
