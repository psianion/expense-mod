import React, { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { z } from 'zod'
import { CalendarClock, Check, X } from 'lucide-react'

import { AppSidebar } from '../components/AppSidebar'
import { SiteHeader } from '../components/SiteHeader'
import { SidebarProvider, SidebarInset } from '../components/ui/sidebar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Checkbox } from '../components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Badge } from '../components/ui/badge'
import { Bill, BillInstance, BillType, BillFrequency } from '../types'

type TabValue = 'INCOME' | 'BILLS' | 'PENDING'

const billFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['BILL', 'EMI', 'CREDITCARD', 'SUBSCRIPTION', 'SALARY', 'INCOME']),
    frequency: z.enum(['MONTHLY', 'WEEKLY', 'YEARLY']),
    day_of_month: z.number().int().min(1).max(28).nullable().optional(),
    day_of_week: z.number().int().min(0).max(6).nullable().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    amount: z.number().nonnegative().nullable().optional(),
    is_variable: z.boolean(),
    auto_post: z.boolean(),
    notes: z.string().nullable().optional(),
  })
  .refine(
  (values) => values.frequency !== 'MONTHLY' || values.day_of_month !== null && values.day_of_month !== undefined,
  { message: 'Day of month is required for monthly bills', path: ['day_of_month'] }
  )
  .refine(
  (values) => values.frequency !== 'WEEKLY' || values.day_of_week !== null && values.day_of_week !== undefined,
  { message: 'Day of week is required for weekly bills', path: ['day_of_week'] }
  )

type BillFormValues = z.infer<typeof billFormSchema>

const defaultFormValues: BillFormValues = {
  name: '',
  type: 'BILL',
  frequency: 'MONTHLY',
  day_of_month: 1,
  day_of_week: null,
  start_date: null,
  end_date: null,
  amount: 0,
  is_variable: false,
  auto_post: false,
  notes: null,
}

const typeOptions: { value: BillType; label: string }[] = [
  { value: 'BILL', label: 'Bill' },
  { value: 'EMI', label: 'EMI / Loan' },
  { value: 'CREDITCARD', label: 'Credit Card' },
  { value: 'SUBSCRIPTION', label: 'Subscription' },
  { value: 'SALARY', label: 'Salary' },
  { value: 'INCOME', label: 'Other Income' },
]

const frequencyOptions: { value: BillFrequency; label: string }[] = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'YEARLY', label: 'Yearly' },
]

const formatDate = (value: string | null | undefined) => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString()
}

const computeEndDate = (start: string | null, frequency: BillFrequency): string | null => {
  if (!start) return null
  const date = new Date(start)
  if (Number.isNaN(date.getTime())) return null

  const end = new Date(date)
  if (frequency === 'WEEKLY') {
    end.setDate(end.getDate() + 6)
  } else if (frequency === 'MONTHLY') {
    end.setMonth(end.getMonth() + 1)
    end.setDate(end.getDate() - 1)
  } else if (frequency === 'YEARLY') {
    end.setFullYear(end.getFullYear() + 1)
    end.setDate(end.getDate() - 1)
  }

  return end.toISOString().slice(0, 10)
}

function BillForm({
  title,
  description,
  presetType,
  onCreated,
}: {
  title: string
  description: string
  presetType: BillType[]
  onCreated: () => Promise<void>
}) {
  const [form, setForm] = useState<BillFormValues>({
    ...defaultFormValues,
    type: presetType[0],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (field: keyof BillFormValues, value: any) => {
    setForm((prev) => {
      const next = {
        ...prev,
        [field]: value,
      }

      if (field === 'start_date' || field === 'frequency') {
        const nextStart = field === 'start_date' ? (value || null) : prev.start_date
        const nextFrequency = field === 'frequency' ? (value as BillFrequency) : prev.frequency
        next.end_date = computeEndDate(nextStart, nextFrequency)
      }

      return next
    })
  }

  const handleSubmit = async () => {
    setError(null)
    const numericDayOfMonth = form.day_of_month === null || form.day_of_month === undefined ? null : Number(form.day_of_month)
    const numericDayOfWeek = form.day_of_week === null || form.day_of_week === undefined ? null : Number(form.day_of_week)
    const numericAmount = form.amount === null || Number.isNaN(form.amount) ? null : form.amount

    const payload: BillFormValues = {
      ...form,
      day_of_month: Number.isNaN(numericDayOfMonth) ? null : numericDayOfMonth,
      day_of_week: Number.isNaN(numericDayOfWeek) ? null : numericDayOfWeek,
      amount: Number.isNaN(numericAmount) ? null : numericAmount,
      notes: form.notes || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    }

    const parsed = billFormSchema.safeParse(payload)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })

      const body = await response.json()
      if (!response.ok) {
        setError(body.error || 'Failed to save bill')
        return
      }

      setForm({
        ...defaultFormValues,
        type: presetType[0],
        frequency: form.frequency,
      })
      await onCreated()
    } catch (err: any) {
      setError(err.message || 'Failed to save bill')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Rent, Netflix, Salary..." />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => handleChange('type', v as BillType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions
                  .filter((opt) => presetType.includes(opt.value))
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={form.frequency} onValueChange={(v) => handleChange('frequency', v as BillFrequency)}>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                {frequencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.frequency === 'MONTHLY' && (
            <div className="space-y-2">
              <Label>Day of month</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={form.day_of_month ?? ''}
                onChange={(e) => handleChange('day_of_month', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          )}
          {form.frequency === 'WEEKLY' && (
            <div className="space-y-2">
              <Label>Day of week (0=Sun, 6=Sat)</Label>
              <Input
                type="number"
                min={0}
                max={6}
                value={form.day_of_week ?? ''}
                onChange={(e) => handleChange('day_of_week', e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={form.amount ?? ''}
              onChange={(e) => handleChange('amount', e.target.value === '' ? null : Number(e.target.value))}
              placeholder="0.00 (leave blank if variable)"
            />
          </div>
          <div className="space-y-2">
            <Label>Start date</Label>
            <Input
              type="date"
              value={form.start_date ?? ''}
              onChange={(e) => handleChange('start_date', e.target.value || null)}
            />
          </div>
          <div className="space-y-2">
            <Label>End date</Label>
            <Input type="date" value={form.end_date ?? ''} disabled />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes ?? ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Optional description or tags"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_variable"
              checked={form.is_variable}
              onCheckedChange={(checked) => handleChange('is_variable', Boolean(checked))}
            />
            <Label htmlFor="is_variable">Variable amount</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto_post"
              checked={form.auto_post && !form.is_variable}
              disabled={form.is_variable}
              onCheckedChange={(checked) => handleChange('auto_post', Boolean(checked))}
            />
            <Label htmlFor="auto_post">Auto post to expenses</Label>
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function BillsTable({ bills }: { bills: Bill[] }) {
  if (!bills.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Saved items</CardTitle>
          <CardDescription>Recurring templates you have configured</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No items yet.</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved items</CardTitle>
        <CardDescription>Templates across income and bills</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Auto</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">{bill.name}</TableCell>
                  <TableCell>{bill.type}</TableCell>
                  <TableCell className="capitalize">{bill.frequency}</TableCell>
                  <TableCell>
                    {bill.frequency === 'MONTHLY' && bill.day_of_month ? `Day ${bill.day_of_month}` : null}
                    {bill.frequency === 'WEEKLY' && bill.day_of_week !== null && bill.day_of_week !== undefined
                      ? `D${bill.day_of_week}`
                      : null}
                    {bill.frequency === 'YEARLY' && bill.start_date ? formatDate(bill.start_date) : null}
                  </TableCell>
                  <TableCell>{bill.amount !== null && bill.amount !== undefined ? bill.amount.toFixed(2) : 'Variable'}</TableCell>
                  <TableCell>
                    {bill.auto_post && !bill.is_variable ? (
                      <Badge variant="secondary">Auto</Badge>
                    ) : (
                      <Badge variant="outline">Manual</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(bill.updated_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function PendingTable({
  instances,
  onRefresh,
}: {
  instances: BillInstance[]
  onRefresh: () => Promise<void>
}) {
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, number>>({})
  const [isUpdating, setIsUpdating] = useState(false)

  const handleConfirm = async (id: string) => {
    setIsUpdating(true)
    const amount = pendingUpdates[id]
    await fetch('/api/bill-instances', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm', id, amount }),
    })
    await onRefresh()
    setIsUpdating(false)
  }

  const handleSkip = async (id: string) => {
    setIsUpdating(true)
    await fetch('/api/bill-instances', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'skip', id }),
    })
    await onRefresh()
    setIsUpdating(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending charges</CardTitle>
        <CardDescription>Confirm, edit amount, or skip</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instances.map((instance) => (
                <TableRow key={instance.id}>
                  <TableCell className="font-medium">
                    {instance.bill?.name ?? 'Recurring item'}
                    {instance.bill?.type && (
                      <div className="text-xs text-muted-foreground capitalize">{instance.bill.type}</div>
                    )}
                  </TableCell>
                  <TableCell>{instance.due_date}</TableCell>
                  <TableCell>
                    <Badge variant={instance.status === 'PENDING' ? 'secondary' : 'outline'}>
                      {instance.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={instance.amount}
                      onChange={(e) =>
                        setPendingUpdates((prev) => ({ ...prev, [instance.id]: Number(e.target.value) }))
                      }
                    />
                  </TableCell>
                  <TableCell className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleConfirm(instance.id)}
                      disabled={isUpdating || instance.status !== 'PENDING'}
                    >
                      <Check className="mr-1 h-4 w-4" /> Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSkip(instance.id)}
                      disabled={isUpdating || instance.status !== 'PENDING'}
                    >
                      <X className="mr-1 h-4 w-4" /> Skip
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState<TabValue>('INCOME')
  const [bills, setBills] = useState<Bill[]>([])
  const [pendingInstances, setPendingInstances] = useState<BillInstance[]>([])

  const incomeBills = useMemo(() => bills.filter((b) => b.type === 'INCOME' || b.type === 'SALARY'), [bills])
  const expenseBills = useMemo(() => bills.filter((b) => !['INCOME', 'SALARY'].includes(b.type)), [bills])

  const fetchBills = async () => {
    const response = await fetch('/api/bills')
    const body = await response.json()
    const normalizedBills: Bill[] = (body.bills || []).map((bill: Bill) => ({
      ...bill,
      type: (bill.type?.toUpperCase?.() as Bill['type']) || 'BILL',
      frequency: (bill.frequency?.toUpperCase?.() as Bill['frequency']) || 'MONTHLY',
    }))
    setBills(normalizedBills)
  }

  const fetchInstances = async () => {
    const response = await fetch('/api/bill-instances?status=PENDING,POSTED')
    const body = await response.json()
    const normalizedInstances: BillInstance[] = (body.instances || []).map((instance: BillInstance) => ({
      ...instance,
      status: (instance.status?.toUpperCase?.() as BillInstance['status']) || 'PENDING',
      bill: instance.bill
        ? {
            ...instance.bill,
            type: instance.bill.type?.toUpperCase?.() as Bill['type'],
            frequency: instance.bill.frequency?.toUpperCase?.() as Bill['frequency'],
          }
        : instance.bill,
    }))
    setPendingInstances(normalizedInstances)
  }

  const refreshAll = async () => {
    await Promise.all([fetchBills(), fetchInstances()])
  }

  useEffect(() => {
    refreshAll()
  }, [])

  return (
    <>
      <Head>
        <title>Settings - Recurring bills</title>
      </Head>
      <SidebarProvider>
        <AppSidebar currentView="SETTINGS" />
        <SidebarInset>
          <SiteHeader currentView="SETTINGS" />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <CalendarClock className="h-5 w-5" /> Recurring settings
                </h2>
                <p className="text-sm text-muted-foreground">
                  Manage salaries, bills, and pending confirmations.
                </p>
              </div>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} defaultValue="INCOME" className="space-y-4">
              <TabsList>
                <TabsTrigger value="INCOME">Income</TabsTrigger>
                <TabsTrigger value="BILLS">Bills & Loans</TabsTrigger>
                <TabsTrigger value="PENDING">Pending charges</TabsTrigger>
              </TabsList>

              <TabsContent value="INCOME" className="space-y-4">
                <BillForm
                  title="Income / Salary"
                  description="Add recurring inflows like salary or reimbursements."
                  presetType={['SALARY', 'INCOME']}
                  onCreated={refreshAll}
                />
                <BillsTable bills={incomeBills} />
              </TabsContent>

              <TabsContent value="BILLS" className="space-y-4">
                <BillForm
                  title="Bills & subscriptions"
                  description="Add recurring outflows like rent, EMI, utilities, or subscriptions."
                  presetType={['BILL', 'EMI', 'CREDITCARD', 'SUBSCRIPTION']}
                  onCreated={refreshAll}
                />
                <BillsTable bills={expenseBills} />
              </TabsContent>

              <TabsContent value="PENDING" className="space-y-4">
                <PendingTable instances={pendingInstances} onRefresh={refreshAll} />
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}

