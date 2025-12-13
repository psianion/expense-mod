import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Expense } from '../../../types'
import dayjs from 'dayjs'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface ExpensesListProps {
  expenses: Expense[]
  isLoading: boolean
}

export function ExpensesList({ expenses, isLoading }: ExpensesListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading expenses...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (expenses.length === 0) {
    return (
      <Card>
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
    <Card>
      <CardHeader>
        <CardTitle>Recent Expenses</CardTitle>
        <p className="text-sm text-muted-foreground">
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''} found
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${
                  expense.type === 'EXPENSE' 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-green-100 text-green-600'
                }`}>
                  {expense.type === 'EXPENSE' ? (
                    <ArrowDownRight className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {expense.currency} {expense.amount.toLocaleString()}
                    </span>
                    {expense.category && (
                      <span className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-full">
                        {expense.category}
                      </span>
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
                  {(expense.event || expense.notes) && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {expense.event && <span className="font-medium">{expense.event}</span>}
                      {expense.event && expense.notes && ' • '}
                      {expense.notes}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${
                  expense.type === 'EXPENSE' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {expense.type === 'EXPENSE' ? '-' : '+'}{expense.currency} {expense.amount.toLocaleString()}
                </div>
                {expense.parsed_by_ai && (
                  <div className="text-xs text-muted-foreground">AI Parsed</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
