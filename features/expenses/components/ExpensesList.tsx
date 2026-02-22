"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card'
import { Badge } from '@components/ui/badge'
import { Expense } from '@/types'
import dayjs from 'dayjs'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatPrice } from '@/lib/formatPrice'
import { cn } from '@/lib/utils'
import { StaggerContainer, StaggerItem } from '@/components/animations'

interface ExpensesListProps {
  expenses: Expense[]
  isLoading: boolean
  className?: string
}

export function ExpensesList({ expenses, isLoading, className }: ExpensesListProps) {
  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground mt-2">Loading expenses...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (expenses.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No expenses yet. Add your first expense above!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Recent Expenses</CardTitle>
        <p className="text-sm text-muted-foreground">
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''} found
        </p>
      </CardHeader>
      <CardContent>
        <StaggerContainer className="space-y-4">
          {expenses.map((expense) => (
            <StaggerItem key={expense.id}>
              <div
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    'p-2 rounded-full',
                    expense.type === 'EXPENSE'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  )}>
                    {expense.type === 'EXPENSE' ? (
                      <ArrowDownRight className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {formatPrice(expense.amount)}
                      </span>
                      {expense.category && (
                        <Badge variant="secondary">{expense.category}</Badge>
                      )}
                    {expense.source === 'RECURRING' && (
                      <Badge variant="secondary">Recurring</Badge>
                    )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {expense.platform && `${expense.platform} • `}
                      {expense.payment_method && `${expense.payment_method} • `}
                      {dayjs(expense.datetime).isValid() ? dayjs(expense.datetime).format('MMM DD, YYYY HH:mm') : expense.datetime}
                    </div>
                    {expense.tags && expense.tags.length > 0 && (
                      <div className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">{expense.tags.join(' • ')}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    'text-sm font-medium',
                    expense.type === 'EXPENSE'
                      ? 'text-destructive'
                      : 'text-emerald-600 dark:text-emerald-400'
                  )}>
                    {expense.type === 'EXPENSE' ? '-' : '+'}{formatPrice(expense.amount)}
                  </div>
                  {expense.parsed_by_ai && (
                    <div className="text-xs text-muted-foreground">AI Parsed</div>
                  )}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </CardContent>
    </Card>
  )
}
