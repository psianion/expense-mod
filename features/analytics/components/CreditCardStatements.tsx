"use client"

import React, { useMemo } from 'react'
import { CreditCard as CreditCardIcon, Calendar, TrendingUp, DollarSign } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import type { Expense } from '@/types'
import { getUserPreferences, getDefaultPreferences } from '@/lib/userPreferences'
import { getCurrentStatementPeriod, formatStatementPeriod } from '@/lib/creditCardUtils'
import { getCreditCardPeriodExpenses } from '@/lib/analytics'
import { getCreditCardAnalytics } from '@/lib/analytics'
import { formatPrice } from '@/lib/formatPrice'

interface CreditCardStatementsProps {
  expenses: Expense[]
}

export function CreditCardStatements({ expenses }: CreditCardStatementsProps) {
  // Use empty defaults on first render (matches SSR), load real prefs after hydration
  const [creditCards, setCreditCards] = React.useState(getDefaultPreferences().creditCards)
  React.useEffect(() => {
    setCreditCards(getUserPreferences().creditCards)
  }, [])

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
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CreditCardIcon className="h-5 w-5" />
          Credit Card Statements
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Track spending across your billing cycles
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {creditCardData.map(({ card, analytics, currentPeriod, periodExpenses, periodAmount }) => (
          <Card key={card.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{card.name}</CardTitle>
                <Badge variant="secondary">
                  {analytics.transactionCount} txns
                </Badge>
              </div>
              <CardDescription>
                {formatStatementPeriod(currentPeriod)}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Current Period Summary */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current period</span>
                  <span className="font-medium tabular-nums">{formatPrice(periodAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Transactions</span>
                  <span className="font-medium tabular-nums">{periodExpenses}</span>
                </div>
              </div>

              <Separator />

              {/* Total Card Analytics */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total spent</span>
                  <span className="font-semibold text-base tabular-nums">{formatPrice(analytics.totalSpent)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg transaction</span>
                  <span className="font-medium tabular-nums">{formatPrice(analytics.averageTransaction)}</span>
                </div>
              </div>

              {/* Top Categories This Period */}
              {analytics.categories.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Top categories</p>
                  <div className="space-y-1">
                    {analytics.categories.slice(0, 3).map((category) => (
                      <div key={category.name} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate">{category.name}</span>
                        <span className="font-medium tabular-nums ml-2 shrink-0">{formatPrice(category.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Statement Due Date */}
              <div className="pt-2 border-t text-center">
                <p className="text-xs text-muted-foreground">
                  Payment due:{' '}
                  <span className="font-medium text-foreground">
                    {currentPeriod.dueDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      {creditCardData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Credit Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-xl font-bold text-primary tabular-nums">
                  {formatPrice(creditCardData.reduce((sum, card) => sum + card.periodAmount, 0))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Current period total</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-xl font-bold text-primary tabular-nums">
                  {creditCardData.reduce((sum, card) => sum + card.periodExpenses, 0)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Transactions this period</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-xl font-bold text-primary tabular-nums">
                  {formatPrice(creditCardData.reduce((sum, card) => sum + card.analytics.totalSpent, 0))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Total spent across cards</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <div className="text-xl font-bold text-primary tabular-nums">
                  {creditCards.length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Active cards</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
