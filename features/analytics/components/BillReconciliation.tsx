"use client"

import { useState, useMemo } from 'react'
import { z } from 'zod'
import { Calculator, CheckCircle, AlertTriangle, Receipt, Plus, Minus } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

import type { Expense } from '@/types'
import { cn } from '@/lib/utils'
import { getUserPreferences } from '@/lib/userPreferences'
import { getCurrentStatementPeriod, formatStatementPeriod } from '@/lib/creditCardUtils'
import { getCreditCardPeriodExpenses } from '@/lib/analytics'
import { formatPrice } from '@/lib/formatPrice'

const reconciliationSchema = z.object({
  actualAmount: z.number().positive('Amount must be positive'),
  interest: z.number().min(0).default(0),
  fees: z.number().min(0).default(0),
  untracked: z.number().min(0).default(0),
  refunds: z.number().min(0).default(0),
  notes: z.string().optional(),
})

type ReconciliationData = z.infer<typeof reconciliationSchema>

interface BillReconciliationProps {
  expenses: Expense[]
  onReconciliationComplete?: (cardName: string, data: ReconciliationData) => void
}

export function BillReconciliation({ expenses, onReconciliationComplete }: BillReconciliationProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>('')
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData>({
    actualAmount: 0,
    interest: 0,
    fees: 0,
    untracked: 0,
    refunds: 0,
    notes: '',
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const creditCards = getUserPreferences().creditCards

  const selectedCard = creditCards.find(card => card.id === selectedCardId)

  const reconciliation = useMemo(() => {
    if (!selectedCard) return null

    const currentPeriod = getCurrentStatementPeriod(selectedCard)
    const periodExpenses = getCreditCardPeriodExpenses(
      expenses,
      selectedCard.name,
      currentPeriod.periodStart,
      currentPeriod.periodEnd
    )

    const trackedAmount = periodExpenses.reduce((sum, exp) => sum + exp.amount, 0)
    const adjustments = reconciliationData.interest + reconciliationData.fees + reconciliationData.untracked - reconciliationData.refunds
    const calculatedTotal = trackedAmount + adjustments
    const difference = reconciliationData.actualAmount - calculatedTotal

    return {
      card: selectedCard,
      period: currentPeriod,
      trackedAmount,
      transactionCount: periodExpenses.length,
      calculatedTotal,
      difference: Math.abs(difference),
      isBalanced: Math.abs(difference) < 1, // Within 1 unit tolerance
      adjustments,
    }
  }, [selectedCard, expenses, reconciliationData])

  const handleReconcile = () => {
    if (!selectedCard || !reconciliation) return

    // Here we would typically save the reconciliation data
    // For now, we'll just call the callback
    onReconciliationComplete?.(selectedCard.name, reconciliationData)

    // Reset form
    setReconciliationData({
      actualAmount: 0,
      interest: 0,
      fees: 0,
      untracked: 0,
      refunds: 0,
      notes: '',
    })
    setSelectedCardId('')
    setIsDialogOpen(false)
  }

  const updateAdjustment = (field: keyof ReconciliationData, value: number | string) => {
    if (typeof value === 'string') {
      const numValue = parseFloat(value) || 0
      setReconciliationData(prev => ({ ...prev, [field]: numValue }))
    } else {
      setReconciliationData(prev => ({ ...prev, [field]: value }))
    }
  }

  if (creditCards.length === 0) {
    return null // Don't show reconciliation if no cards configured
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Bill Reconciliation
        </CardTitle>
        <CardDescription>
          Compare your actual credit card bills with tracked expenses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Receipt className="mr-2 h-4 w-4" />
              Reconcile a Bill
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reconcile Credit Card Bill</DialogTitle>
              <DialogDescription>
                Enter your actual bill amount and account for any differences from tracked expenses.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Card Selection */}
              <div className="space-y-2">
                <Label>Select Credit Card</Label>
                <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a card to reconcile" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditCards.map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCard && reconciliation && (
                <>
                  {/* Period Info */}
                  <div className="rounded-md bg-muted/60 p-3">
                    <div className="text-sm font-medium mb-1">
                      {formatStatementPeriod(reconciliation.period)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {reconciliation.transactionCount} transactions • {formatPrice(reconciliation.trackedAmount)} tracked
                    </div>
                  </div>

                  {/* Bill Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="actualAmount">Actual Bill Amount</Label>
                    <Input
                      id="actualAmount"
                      type="number"
                      step="0.01"
                      value={reconciliationData.actualAmount || ''}
                      onChange={(e) => updateAdjustment('actualAmount', e.target.value)}
                      placeholder="Enter the amount from your bill"
                    />
                  </div>

                  {/* Adjustments */}
                  <div className="space-y-3">
                    <Label>Adjustments</Label>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="interest" className="text-xs">Interest</Label>
                        <Input
                          id="interest"
                          type="number"
                          step="0.01"
                          value={reconciliationData.interest || ''}
                          onChange={(e) => updateAdjustment('interest', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="fees" className="text-xs">Fees</Label>
                        <Input
                          id="fees"
                          type="number"
                          step="0.01"
                          value={reconciliationData.fees || ''}
                          onChange={(e) => updateAdjustment('fees', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="untracked" className="text-xs">Untracked Expenses</Label>
                        <Input
                          id="untracked"
                          type="number"
                          step="0.01"
                          value={reconciliationData.untracked || ''}
                          onChange={(e) => updateAdjustment('untracked', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="refunds" className="text-xs">Refunds/Credits</Label>
                        <Input
                          id="refunds"
                          type="number"
                          step="0.01"
                          value={reconciliationData.refunds || ''}
                          onChange={(e) => updateAdjustment('refunds', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reconciliation Summary */}
                  <div className="rounded-md bg-muted/60 p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Tracked Expenses:</span>
                      <span>{formatPrice(reconciliation.trackedAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Adjustments:</span>
                      <span className={cn(reconciliation.adjustments >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                        {reconciliation.adjustments >= 0 ? '+' : ''}{formatPrice(reconciliation.adjustments)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Calculated Total:</span>
                      <span>{formatPrice(reconciliation.calculatedTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Difference:</span>
                      <Badge variant={reconciliation.isBalanced ? "default" : "destructive"}>
                        {reconciliation.isBalanced ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        )}
                        {formatPrice(reconciliation.difference)}
                      </Badge>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={reconciliationData.notes}
                      onChange={(e) => updateAdjustment('notes', e.target.value)}
                      placeholder="Any additional notes about this reconciliation..."
                      rows={2}
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReconcile}
                disabled={!selectedCard || !reconciliationData.actualAmount}
              >
                {reconciliation?.isBalanced ? 'Mark as Reconciled' : 'Save with Difference'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-primary">
              {creditCards.length}
            </div>
            <div className="text-xs text-muted-foreground">Cards to reconcile</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-primary">
              {creditCards.filter(card => {
                const period = getCurrentStatementPeriod(card)
                const periodExpenses = getCreditCardPeriodExpenses(expenses, card.name, period.periodStart, period.periodEnd)
                return periodExpenses.length > 0
              }).length}
            </div>
            <div className="text-xs text-muted-foreground">Have transactions</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-primary">0</div>
            <div className="text-xs text-muted-foreground">Reconciled this month</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-primary">0</div>
            <div className="text-xs text-muted-foreground">Pending reconciliations</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
