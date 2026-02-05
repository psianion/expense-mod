"use client"

import { useState, useEffect } from 'react'
import { z } from 'zod'
import { CreditCard as CreditCardIcon, Plus, Edit, Trash2, Calendar } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

import type { CreditCard } from '@/lib/constants'
import { getUserPreferences, addCreditCard, updateCreditCard, removeCreditCard, getCombinedPaymentMethods } from '@/lib/userPreferences'
import { getCurrentStatementPeriod, getNextStatementPeriod, formatStatementPeriod } from '@/lib/creditCardUtils'

const creditCardSchema = z.object({
  name: z.string().min(1, 'Card name is required'),
  statement_day: z.number().int().min(1).max(31),
  payment_due_day: z.number().int().min(1).max(31),
})

type CreditCardFormData = z.infer<typeof creditCardSchema>

interface CreditCardManagerProps {
  onCreditCardsChange?: () => void
}

export function CreditCardManager({ onCreditCardsChange }: CreditCardManagerProps) {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null)
  const [formData, setFormData] = useState<CreditCardFormData>({
    name: '',
    statement_day: 5,
    payment_due_day: 25,
  })

  // Load credit cards on mount
  useEffect(() => {
    const prefs = getUserPreferences()
    setCreditCards(prefs.creditCards)
  }, [])

  const resetForm = () => {
    setFormData({
      name: '',
      statement_day: 5,
      payment_due_day: 25,
    })
    setEditingCard(null)
  }

  const handleAddCard = () => {
    const validation = creditCardSchema.safeParse(formData)
    if (!validation.success) {
      alert('Please fill in all required fields correctly.')
      return
    }

    try {
      addCreditCard({
        name: formData.name,
        statement_day: formData.statement_day,
        payment_due_day: formData.payment_due_day,
      })

      // Refresh the list
      const prefs = getUserPreferences()
      setCreditCards(prefs.creditCards)

      setIsAddDialogOpen(false)
      resetForm()
      onCreditCardsChange?.()
    } catch (error) {
      alert('Failed to add credit card.')
    }
  }

  const handleEditCard = (card: CreditCard) => {
    setEditingCard(card)
    setFormData({
      name: card.name,
      statement_day: card.statement_day,
      payment_due_day: card.payment_due_day,
    })
    setIsAddDialogOpen(true)
  }

  const handleUpdateCard = () => {
    if (!editingCard) return

    const validation = creditCardSchema.safeParse(formData)
    if (!validation.success) {
      alert('Please fill in all required fields correctly.')
      return
    }

    try {
      updateCreditCard(editingCard.id, {
        name: formData.name,
        statement_day: formData.statement_day,
        payment_due_day: formData.payment_due_day,
      })

      // Refresh the list
      const prefs = getUserPreferences()
      setCreditCards(prefs.creditCards)

      setIsAddDialogOpen(false)
      resetForm()
      onCreditCardsChange?.()
    } catch (error) {
      alert('Failed to update credit card.')
    }
  }

  const handleDeleteCard = (cardId: string) => {
    try {
      removeCreditCard(cardId)

      // Refresh the list
      const prefs = getUserPreferences()
      setCreditCards(prefs.creditCards)

      onCreditCardsChange?.()
    } catch (error) {
      alert('Failed to delete credit card.')
    }
  }

  const handleSubmit = () => {
    if (editingCard) {
      handleUpdateCard()
    } else {
      handleAddCard()
    }
  }

  return (
    <div className="space-y-6">
      {/* Add Card Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Your Credit Cards</h3>
          <p className="text-sm text-muted-foreground">
            Configure billing cycles for automatic expense attribution
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsAddDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Card
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingCard ? 'Edit Credit Card' : 'Add Credit Card'}
              </DialogTitle>
              <DialogDescription>
                Configure your credit card's billing cycle for automatic expense tracking.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Card Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., ICICI Credit Card"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="statement_day" className="text-right">
                  Statement Day
                </Label>
                <Select
                  value={formData.statement_day.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, statement_day: parseInt(value) }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="due_day" className="text-right">
                  Due On
                </Label>
                <Select
                  value={formData.payment_due_day.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_due_day: parseInt(value) }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingCard ? 'Update Card' : 'Add Card'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Credit Cards List */}
      {creditCards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCardIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No credit cards added</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Add your credit cards to automatically track expenses by billing period.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card Name</TableHead>
                <TableHead>Billing Cycle</TableHead>
                <TableHead>Current Period</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditCards.map((card) => {
                const currentPeriod = getCurrentStatementPeriod(card)
                const nextPeriod = getNextStatementPeriod(card)

                return (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                        {card.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Statement: {card.statement_day}{card.statement_day === 1 ? 'st' : card.statement_day === 2 ? 'nd' : card.statement_day === 3 ? 'rd' : 'th'}</div>
                        <div>Due: {card.payment_due_day}{card.payment_due_day === 1 ? 'st' : card.payment_due_day === 2 ? 'nd' : card.payment_due_day === 3 ? 'rd' : 'th'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <Badge variant="outline" className="mb-1">
                          Current: {formatStatementPeriod(currentPeriod)}
                        </Badge>
                        <div className="text-muted-foreground">
                          Next: {formatStatementPeriod(nextPeriod)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCard(card)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Credit Card</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{card.name}"? This will stop automatic attribution for this card.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCard(card.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Usage Instructions */}
      {creditCards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• When you add expenses, they'll automatically be attributed to the correct billing period</p>
            <p>• Use the exact card name as your payment method for best results</p>
            <p>• Billing periods are calculated dynamically - no need to manually track cycles</p>
            <p>• Future: View statement previews and reconcile bills easily</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
