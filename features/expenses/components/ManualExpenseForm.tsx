import React, { useState, useEffect } from 'react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Textarea } from '@components/ui/textarea'
import { Calendar } from '@components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select'
import { Label } from '@components/ui/label'
import { Loader2, CalendarIcon } from 'lucide-react'
import dayjs from 'dayjs'
import { cn } from '@lib/utils'
import { getLocalISO, localISOToDate, dateToLocalISO } from '@lib/datetime'
import { getCombinedCategories, getCombinedPlatforms, getCombinedPaymentMethods } from '@lib/userPreferences'
import { DEFAULT_CATEGORIES, DEFAULT_PLATFORMS, DEFAULT_PAYMENT_METHODS } from '@lib/constants'

interface ManualExpenseFormProps {
  onSave: (expense: {
    amount: number
    datetime: string
    category: string
    platform: string
    payment_method: string
    type: 'EXPENSE' | 'INFLOW'
    tags: string[]
  }) => Promise<void>
  isLoading: boolean
}

export function ManualExpenseForm({ onSave, isLoading }: ManualExpenseFormProps) {
  // Use static defaults on first render (matches SSR), load localStorage prefs after hydration
  const [categories, setCategories] = useState<string[]>([...DEFAULT_CATEGORIES])
  const [platforms, setPlatforms] = useState<string[]>([...DEFAULT_PLATFORMS])
  const [paymentMethods, setPaymentMethods] = useState<string[]>([...DEFAULT_PAYMENT_METHODS])
  useEffect(() => {
    setCategories(getCombinedCategories())
    setPlatforms(getCombinedPlatforms())
    setPaymentMethods(getCombinedPaymentMethods())
  }, [])

  const [formData, setFormData] = useState({
    amount: '',
    datetime: getLocalISO(),
    category: 'Other',
    platform: 'Other',
    payment_method: 'Other',
    type: 'EXPENSE' as 'EXPENSE' | 'INFLOW',
    tags: [] as string[]
  })

  const updateField = (field: string, value: string | Date | null | string[]) => {
    if (value instanceof Date) {
      setFormData(prev => ({ ...prev, [field]: dateToLocalISO(value) }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleSave = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount.')
      return
    }

    await onSave({
      amount: parseFloat(formData.amount),
      datetime: formData.datetime,
      category: formData.category,
      platform: formData.platform,
      payment_method: formData.payment_method,
      type: formData.type,
      tags: formData.tags
    })

    // Reset form
    setFormData({
      amount: '',
      datetime: getLocalISO(),
      category: 'Other',
      platform: 'Other',
      payment_method: 'Other',
      type: 'EXPENSE',
      tags: []
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label>Amount *</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => updateField('amount', e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(value) => updateField('category', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Platform</Label>
          <Select value={formData.platform} onValueChange={(value) => updateField('platform', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((platform) => (
                <SelectItem key={platform} value={platform}>
                  {platform}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select value={formData.payment_method} onValueChange={(value) => updateField('payment_method', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={formData.type} onValueChange={(v) => updateField('type', v as 'EXPENSE' | 'INFLOW')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EXPENSE">Expense</SelectItem>
              <SelectItem value="INFLOW">Inflow</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <Input
            value={formData.tags.join(', ')}
            onChange={(e) => updateField('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
            placeholder="Trip to Goa, Office lunch, etc. (comma separated)"
          />
        </div>

        <div className="space-y-2">
          <Label>Date &amp; Time</Label>
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
                    ? dayjs(formData.datetime).format("MMM DD, YYYY")
                    : "Pick a date"
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.datetime ? localISOToDate(formData.datetime) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const currentTime = formData.datetime ? localISOToDate(formData.datetime) : new Date()
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
              value={formData.datetime ? dayjs(formData.datetime).format("HH:mm") : dayjs().format("HH:mm")}
              onChange={(e) => {
                if (formData.datetime) {
                  const [hours, minutes] = e.target.value.split(":").map(Number)
                  const currentDate = localISOToDate(formData.datetime)
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
