import React, { useState } from 'react'
import { Drawer } from '@components/ui/drawer'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import { Calendar } from '@components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover'
import { BillMatchCandidate, ParsedExpense } from '@/types'
import { Loader2, CalendarIcon, Clock } from 'lucide-react'
import dayjs from 'dayjs'
import { cn } from '@lib/utils'
import { getLocalISO, localISOToDate, dateToLocalISO } from '@lib/datetime'

interface PreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parsedExpense: ParsedExpense | null
  onSave: (expense: ParsedExpense) => Promise<void>
  isLoading: boolean
  billMatch?: BillMatchCandidate | null
}

export function PreviewModal({ 
  open, 
  onOpenChange, 
  parsedExpense, 
  onSave, 
  isLoading,
  billMatch,
}: PreviewModalProps) {
  const [editedExpense, setEditedExpense] = useState<ParsedExpense | null>(null)

  React.useEffect(() => {
    if (parsedExpense) {
      // Default to current date/time if no datetime provided
      const expenseWithDefaults = {
        ...parsedExpense,
        datetime: parsedExpense.datetime || getLocalISO(),
        type: (parsedExpense.type?.toUpperCase?.() as ParsedExpense['type']) || 'EXPENSE',
      }
      setEditedExpense(expenseWithDefaults)
    }
  }, [parsedExpense])


  const handleSave = async () => {
    if (!editedExpense) return
    await onSave(editedExpense)
    onOpenChange(false)
  }

  const updateField = (field: keyof ParsedExpense, value: string | number | null | Date | string[]) => {
    if (!editedExpense) return
    if (value instanceof Date) {
      setEditedExpense({ ...editedExpense, [field]: dateToLocalISO(value) })
    } else {
      setEditedExpense({ ...editedExpense, [field]: value })
    }
  }

  if (!editedExpense) return null

  if (!open) return null

  return (
    <Drawer 
      open={open} 
      onOpenChange={onOpenChange}
      title="Preview & Edit Expense"
      description="Review the parsed data and make any necessary changes before saving."
    >
      <div className="space-y-6">
        {billMatch && (
          <div className="rounded-md border p-3 text-sm">
            Potential {billMatch.bill_type === 'SALARY' || billMatch.bill_type === 'INCOME' ? 'income' : 'bill'} match:{' '}
            <span className="font-medium text-foreground">{billMatch.bill_name}</span>. Saving will mark this as{' '}
            {billMatch.bill_type === 'SALARY' || billMatch.bill_type === 'INCOME' ? 'received' : 'paid'} for the current
            period.
          </div>
        )}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount *</label>
            <Input
              type="number"
              step="0.01"
              value={editedExpense.amount || ''}
              onChange={(e) => updateField('amount', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Input
              value={editedExpense.category || ''}
              onChange={(e) => updateField('category', e.target.value || null)}
              placeholder="Food, Transport, etc."
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Platform</label>
            <Input
              value={editedExpense.platform || ''}
              onChange={(e) => updateField('platform', e.target.value || null)}
              placeholder="Swiggy, Amazon, etc."
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Method</label>
            <Input
              value={editedExpense.payment_method || ''}
              onChange={(e) => updateField('payment_method', e.target.value || null)}
              placeholder="Card, UPI, Cash, etc."
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <select
              value={editedExpense.type}
              onChange={(e) => updateField('type', e.target.value as 'EXPENSE' | 'INFLOW')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="EXPENSE">Expense</option>
              <option value="INFLOW">Inflow</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Tags</label>
            <Input
              value={editedExpense.tags?.join(', ') || ''}
              onChange={(e) => {
                const tagsString = e.target.value
                const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : []
                updateField('tags', tags)
              }}
              placeholder="Trip, Meeting, etc. (comma separated)"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Date & Time</label>
            <div className="flex space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editedExpense.datetime && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editedExpense.datetime 
                      ? localISOToDate(editedExpense.datetime).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                      : "Pick a date"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editedExpense.datetime ? localISOToDate(editedExpense.datetime) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        const currentTime = editedExpense.datetime ? localISOToDate(editedExpense.datetime) : new Date()
                        const newDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), currentTime.getHours(), currentTime.getMinutes())
                        updateField('datetime', newDateTime)
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={editedExpense.datetime ? dayjs(editedExpense.datetime).format('HH:mm') : dayjs().format('HH:mm')}
                onChange={(e) => {
                  if (editedExpense.datetime) {
                    const [hours, minutes] = e.target.value.split(":").map(Number)
                    const currentDate = localISOToDate(editedExpense.datetime)
                    const newDateTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), hours, minutes)
                    updateField('datetime', newDateTime)
                  }
                }}
                className="w-32"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!editedExpense.amount || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Expense'
            )}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
