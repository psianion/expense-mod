import React, { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { RefreshCw, Check, X, Plus } from 'lucide-react'
import dayjs from 'dayjs'

import { AppSidebar } from '../components/AppSidebar'
import { SiteHeader } from '../components/SiteHeader'
import { SidebarProvider, SidebarInset } from '../components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Drawer } from '../components/ui/drawer'
import { Label } from '../components/ui/label'
import { Bill, BillInstance } from '../types'

const statusOptions = ['ALL', 'DUE', 'PAID', 'SKIPPED'] as const
type StatusFilter = (typeof statusOptions)[number]
const viewOptions = ['ALL', 'OUTFLOW', 'INFLOW'] as const
type ViewFilter = (typeof viewOptions)[number]

const normalizeInstanceStatus = (status: string | undefined): BillInstance['status'] =>
  (status?.toString?.().toUpperCase() as BillInstance['status']) || 'DUE'

const computeDueDateForBill = (bill: Bill) => {
  const normalizedFrequency = (bill.frequency as string)?.toUpperCase?.() as Bill['frequency']
  const reference = dayjs()

  if (normalizedFrequency === 'MONTHLY') {
    const base = reference.startOf('month')
    const day = Math.min(Math.max(bill.day_of_month ?? reference.date(), 1), base.daysInMonth())
    return base.date(day).format('YYYY-MM-DD')
  }

  if (normalizedFrequency === 'WEEKLY') {
    const startOfWeek = reference.startOf('week')
    const day = Math.min(Math.max(bill.day_of_week ?? 0, 0), 6)
    return startOfWeek.add(day, 'day').format('YYYY-MM-DD')
  }

  const anchor = bill.start_date ? dayjs(bill.start_date) : reference
  return reference.startOf('year').month(anchor.month()).date(anchor.date()).format('YYYY-MM-DD')
}

const isInflow = (bill?: Bill | null) => bill && (bill.type === 'SALARY' || bill.type === 'INCOME')

const statusLabel = (instance: BillInstance) => {
  const inflow = isInflow(instance.bill)
  if (instance.status === 'PAID') return inflow ? 'Received' : 'Paid'
  if (instance.status === 'DUE') return inflow ? 'Expected' : 'Due'
  return 'Skipped'
}

export default function BillsPage() {
  const [instances, setInstances] = useState<BillInstance[]>([])
  const [status, setStatus] = useState<StatusFilter>('DUE')
  const [view, setView] = useState<ViewFilter>('OUTFLOW')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, number>>({})
  const [actionLoading, setActionLoading] = useState(false)
  const [bills, setBills] = useState<Bill[]>([])
  const [manualOpen, setManualOpen] = useState(false)
  const [selectedBillId, setSelectedBillId] = useState<string>('')
  const [manualAmount, setManualAmount] = useState<string>('')
  const [manualError, setManualError] = useState<string | null>(null)
  const [manualLoading, setManualLoading] = useState(false)

  const fetchInstances = async () => {
    setLoading(true)
    const queryStatus = status === 'ALL' ? '' : `?status=${status}`
    const response = await fetch(`/api/bill-instances${queryStatus}`)
    const body = await response.json()
    const normalizedInstances: BillInstance[] = (body.instances || []).map((instance: BillInstance) => ({
      ...instance,
      status: normalizeInstanceStatus(instance.status),
      bill: instance.bill
        ? {
            ...instance.bill,
            type: instance.bill.type?.toUpperCase?.() as Bill['type'],
            frequency: instance.bill.frequency?.toUpperCase?.() as Bill['frequency'],
          }
        : instance.bill,
    }))
    setInstances(normalizedInstances)
    setLoading(false)
  }

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

  useEffect(() => {
    fetchInstances()
  }, [status])

  useEffect(() => {
    fetchBills()
  }, [])

  const handleConfirm = async (id: string) => {
    setActionLoading(true)
    const amount = pendingUpdates[id]
    await fetch('/api/bill-instances', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm', id, amount }),
    })
    await fetchInstances()
    setActionLoading(false)
  }

  const handleSkip = async (id: string) => {
    setActionLoading(true)
    await fetch('/api/bill-instances', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'skip', id }),
    })
    await fetchInstances()
    setActionLoading(false)
  }

  const selectedBill = useMemo(() => bills.find((bill) => bill.id === selectedBillId), [bills, selectedBillId])
  const duePreview = useMemo(() => (selectedBill ? computeDueDateForBill(selectedBill) : null), [selectedBill])
  const selectableBills = useMemo(
    () =>
      view === 'ALL'
        ? bills
        : bills.filter((bill) => (view === 'INFLOW' ? isInflow(bill) : !isInflow(bill))),
    [bills, view]
  )

  const latestAmountForBill = (billId: string): number | null => {
    const matches = instances.filter((instance) => instance.bill_id === billId)
    if (!matches.length) return null
    const sorted = [...matches].sort((a, b) => (a.due_date > b.due_date ? -1 : 1))
    return sorted[0]?.amount ?? null
  }

  const handleBillSelect = (billId: string) => {
    setSelectedBillId(billId)
    const bill = bills.find((b) => b.id === billId)
    const lastAmount = latestAmountForBill(billId) ?? bill?.amount ?? null
    setManualAmount(lastAmount !== null && lastAmount !== undefined ? lastAmount.toString() : '')
    setManualError(null)
  }

  const handleManualSubmit = async () => {
    if (!selectedBill) {
      setManualError('Select a bill to create an instance')
      return
    }

    const amountValue = manualAmount ? Number(manualAmount) : selectedBill.amount ?? 0
    if (!amountValue || Number.isNaN(amountValue) || amountValue <= 0) {
      setManualError('Enter a valid amount')
      return
    }

    setManualLoading(true)
    setManualError(null)
    const response = await fetch('/api/bill-instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        billId: selectedBill.id,
        amount: amountValue,
      }),
    })

    const body = await response.json()
    if (!response.ok) {
      setManualError(body.error || 'Failed to create instance')
      setManualLoading(false)
      return
    }

    await fetchInstances()
    setManualLoading(false)
    setManualOpen(false)
    setSelectedBillId('')
    setManualAmount('')
  }

  const filtered = useMemo(() => {
    const text = search.toLowerCase()
    return instances.filter((instance) => {
      const matchesText =
        !text ||
        instance.bill?.name?.toLowerCase().includes(text) ||
        instance.bill?.type?.toLowerCase().includes(text)
      const inflow = isInflow(instance.bill)
      const matchesView = view === 'ALL' ? true : view === 'INFLOW' ? inflow : !inflow
      return matchesText && matchesView
    })
  }, [instances, search, view])

  return (
    <>
      <Head>
        <title>Bills & Instances</title>
      </Head>
      <SidebarProvider>
        <AppSidebar currentView="BILLS" />
        <SidebarInset>
          <SiteHeader currentView="BILLS" />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Bills & Instances</h2>
                <p className="text-sm text-muted-foreground">
                  Track due, paid, and skipped bill instances with filters.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search by name or type"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-48"
                />
                <Select value={view} onValueChange={(v) => setView(v as ViewFilter)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Flow" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="OUTFLOW">Bills</SelectItem>
                    <SelectItem value="INFLOW">Income</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt === 'ALL' ? 'All' : `${opt.charAt(0)}${opt.slice(1).toLowerCase()}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchInstances} disabled={loading}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
                <Button onClick={() => setManualOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add instance
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Bill instances</CardTitle>
                <CardDescription>Latest generated or pending instances</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bill</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Expense link</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((instance) => {
                        const inflow = isInflow(instance.bill)
                        const label = statusLabel(instance)
                        return (
                          <TableRow key={instance.id}>
                            <TableCell className="font-medium">
                              {instance.bill?.name ?? 'Recurring item'}
                              {instance.bill?.notes && (
                                <div className="text-xs text-muted-foreground">{instance.bill.notes}</div>
                              )}
                            </TableCell>
                            <TableCell>{instance.due_date}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                defaultValue={instance.amount}
                                disabled={instance.status !== 'DUE'}
                                onChange={(e) =>
                                  setPendingUpdates((prev) => ({ ...prev, [instance.id]: Number(e.target.value) }))
                                }
                                className="max-w-[120px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  instance.status === 'DUE'
                                    ? 'secondary'
                                    : instance.status === 'PAID'
                                    ? 'default'
                                    : 'outline'
                                }
                              >
                                {label}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize">{instance.bill?.type ?? '-'}</TableCell>
                            <TableCell>
                              {instance.posted_expense_id ? (
                                <Badge variant="outline">expense linked</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="space-x-2">
                              <Button
                                size="sm"
                                variant="default"
                                disabled={instance.status !== 'DUE' || actionLoading}
                                onClick={() => handleConfirm(instance.id)}
                              >
                                <Check className="mr-1 h-4 w-4" /> {inflow ? 'Mark received' : 'Mark paid'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={instance.status !== 'DUE' || actionLoading}
                                onClick={() => handleSkip(instance.id)}
                              >
                                <X className="mr-1 h-4 w-4" /> Skip
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  {!filtered.length && (
                    <div className="p-6 text-sm text-muted-foreground text-center">
                      {loading ? 'Loading...' : 'No bill instances yet.'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>

      <Drawer
        open={manualOpen}
        onOpenChange={setManualOpen}
        title="Add bill instance"
        description="Create a current-period instance from a saved template."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Bill</Label>
            <Select value={selectedBillId} onValueChange={(v) => handleBillSelect(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose bill template" />
              </SelectTrigger>
              <SelectContent>
                {selectableBills.map((bill) => (
                  <SelectItem key={bill.id} value={bill.id}>
                    {bill.name} ({bill.frequency.toLowerCase()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBill && (
            <div className="text-sm text-muted-foreground">
              Due date for this period: <span className="font-medium text-foreground">{duePreview}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              placeholder={selectedBill?.amount ? selectedBill.amount.toString() : '0.00'}
            />
          </div>

          {manualError && <p className="text-sm text-red-500">{manualError}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setManualOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleManualSubmit} disabled={manualLoading || !selectedBill}>
              {manualLoading ? 'Creating...' : 'Create instance'}
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  )
}

