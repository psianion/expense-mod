import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Loader2, CalendarIcon } from 'lucide-react'
import dayjs from 'dayjs'
import { cn } from '../lib/utils'

interface ManualExpenseFormProps {
  onSave: (expense: {
    amount: number
    currency: string
    datetime: string
    category: string | null
    platform: string | null
    payment_method: string | null
    type: 'expense' | 'inflow'
    event: string | null
    notes: string | null
  }) => Promise<void>
  isLoading: boolean
}

export function ManualExpenseForm({ onSave, isLoading }: ManualExpenseFormProps) {
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'INR',
    datetime: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    category: '',
    platform: '',
    payment_method: '',
    type: 'expense' as 'expense' | 'inflow',
    event: '',
    notes: ''
  })

  // Helper to get local time from stored datetime (treat as local time)
  const getLocalTime = (storedDateTime: string) => {
    return dayjs(storedDateTime)
  }

  // Helper to store datetime as local time string
  const storeLocalTime = (localDayjs: dayjs.Dayjs) => {
    return localDayjs.format('YYYY-MM-DDTHH:mm:ss')
  }


  const updateField = (field: string, value: string | Date | null) => {
    const updatedValue = value instanceof Date ? storeLocalTime(dayjs(value)) : value
    setFormData(prev => ({ ...prev, [field]: updatedValue }))
  }

  const handleSave = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount.')
      return
    }

    await onSave({
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      datetime: formData.datetime,
      category: formData.category || null,
      platform: formData.platform || null,
      payment_method: formData.payment_method || null,
      type: formData.type,
      event: formData.event || null,
      notes: formData.notes || null
    })

    // Reset form
    setFormData({
      amount: '',
      currency: 'INR',
      datetime: new Date().toISOString(),
      category: '',
      platform: '',
      payment_method: '',
      type: 'expense',
      event: '',
      notes: ''
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount *</label>
          <Input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => updateField('amount', e.target.value)}
            placeholder="0.00"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Currency</label>
          <Input
            value={formData.currency}
            onChange={(e) => updateField('currency', e.target.value)}
            placeholder="INR"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Input
            value={formData.category}
            onChange={(e) => updateField('category', e.target.value)}
            placeholder="Food, Transport, etc."
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Platform</label>
          <Input
            value={formData.platform}
            onChange={(e) => updateField('platform', e.target.value)}
            placeholder="Swiggy, Amazon, etc."
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Method</label>
          <Input
            value={formData.payment_method}
            onChange={(e) => updateField('payment_method', e.target.value)}
            placeholder="Card, UPI, Cash, etc."
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Type</label>
          <select
            value={formData.type}
            onChange={(e) => updateField('type', e.target.value as 'expense' | 'inflow')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="expense">Expense</option>
            <option value="inflow">Inflow</option>
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Event</label>
          <Input
            value={formData.event}
            onChange={(e) => updateField('event', e.target.value)}
            placeholder="Trip, Meeting, etc."
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
                    !formData.datetime && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.datetime 
                    ? getLocalTime(formData.datetime).format("MMM DD, YYYY")
                    : "Pick a date"
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.datetime ? getLocalTime(formData.datetime).toDate() : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const currentTime = formData.datetime ? getLocalTime(formData.datetime) : dayjs()
                      const newDateTime = dayjs(date)
                        .hour(currentTime.hour())
                        .minute(currentTime.minute())
                      updateField('datetime', storeLocalTime(newDateTime))
                    }
                  }}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={formData.datetime ? getLocalTime(formData.datetime).format("HH:mm") : dayjs().format("HH:mm")}
              onChange={(e) => {
                if (formData.datetime) {
                  const [hours, minutes] = e.target.value.split(":").map(Number)
                  const currentDate = getLocalTime(formData.datetime)
                  const newDateTime = currentDate.hour(hours).minute(minutes)
                  updateField('datetime', storeLocalTime(newDateTime))
                }
              }}
              className="w-32"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Notes</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Additional notes..."
            rows={3}
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button 
          onClick={handleSave} 
          disabled={!formData.amount || isLoading}
          className="w-full"
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
  )
}
