"use client"

import { useMemo } from 'react'
import { CreditCard as CreditCardIcon, Calendar, TrendingUp, DollarSign } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import type { Expense } from '@/types'
import { getUserPreferences } from '@/lib/userPreferences'
import { getCurrentStatementPeriod, formatStatementPeriod } from '@/lib/creditCardUtils'
import { getCreditCardPeriodExpenses } from '@/lib/analytics'
import { getCreditCardAnalytics } from '@/lib/analytics'
import { formatPrice } from '@/lib/formatPrice'

interface CreditCardStatementsProps {
  expenses: Expense[]
}

export function CreditCardStatements({ expenses }: CreditCardStatementsProps) {
  const creditCards = getUserPreferences().creditCards

  const creditCardData = useMemo(() => {
    if (creditCards.length === 0) return []

    return creditCards.map(card => {
      const analytics = getCreditCardAnalytics(expenses, card.name)
      const currentPeriod = getCurrentStatementPeriod(card)
      const periodExpenses = getCreditCardPeriodExpenses(expenses, card.name, currentPeriod.periodStart, currentPeriod.periodEnd)

      return {
        card,
        analytics,
        currentPeriod,
        periodExpenses: periodExpenses.length,
        periodAmount: periodExpenses.reduce((sum, exp) => sum + exp.amount, 0),
      }
    })
  }, [creditCards, expenses])

  if (creditCards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" />
            Credit Card Statements
          </CardTitle>
          <CardDescription>
            Add credit cards in settings to see your billing period insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <CreditCardIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground text-center">
              No credit cards configured yet. Add them in Settings to see statement previews here.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <CreditCardIcon className="h-6 w-6" />
          Credit Card Statements
        </h2>
        <p className="text-muted-foreground">
          Track spending across your billing cycles
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {creditCardData.map(({ card, analytics, currentPeriod, periodExpenses, periodAmount }) => (
          <Card key={card.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{card.name}</CardTitle>
                <Badge variant="secondary">
                  {analytics.transactionCount} transactions
                </Badge>
              </div>
              <CardDescription>
                Statement period: {formatStatementPeriod(currentPeriod)}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Current Period Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current period</span>
                  <span className="font-medium">{formatPrice(periodAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Transactions</span>
                  <span className="font-medium">{periodExpenses}</span>
                </div>
              </div>

              <Separator />

              {/* Total Card Analytics */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total spent</span>
                  <span className="font-semibold text-lg">{formatPrice(analytics.totalSpent)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg transaction</span>
                  <span className="font-medium">{formatPrice(analytics.averageTransaction)}</span>
                </div>
              </div>

              {/* Top Categories This Period */}
              {analytics.categories.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Top categories</h4>
                  <div className="space-y-1">
                    {analytics.categories.slice(0, 3).map((category, index) => (
                      <div key={category.name} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{category.name}</span>
                        <span className="font-medium">{formatPrice(category.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Statement Due Date */}
              <div className="text-center pt-2 border-t">
                <div className="text-xs text-muted-foreground">
                  Payment due: {currentPeriod.dueDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      {creditCardData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Credit Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {creditCardData.reduce((sum, card) => sum + card.periodAmount, 0).toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">Current period total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {creditCardData.reduce((sum, card) => sum + card.periodExpenses, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Transactions this period</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {creditCardData.reduce((sum, card) => sum + card.analytics.totalSpent, 0).toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground">Total spent across cards</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {creditCards.length}
                </div>
                <div className="text-xs text-muted-foreground">Active cards</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
