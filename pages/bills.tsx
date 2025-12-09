import React, { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { RefreshCw, Check, X } from 'lucide-react'

import { AppSidebar } from '../components/AppSidebar'
import { SiteHeader } from '../components/SiteHeader'
import { SidebarProvider, SidebarInset } from '../components/ui/sidebar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Bill, BillInstance } from '../types'

const statusOptions = ['ALL', 'PENDING', 'POSTED', 'SKIPPED'] as const
type StatusFilter = (typeof statusOptions)[number]

export default function BillsPage() {
  const [instances, setInstances] = useState<BillInstance[]>([])
  const [status, setStatus] = useState<StatusFilter>('PENDING')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, number>>({})
  const [actionLoading, setActionLoading] = useState(false)

  const fetchInstances = async () => {
    setLoading(true)
    const queryStatus = status === 'ALL' ? '' : `?status=${status}`
    const response = await fetch(`/api/bill-instances${queryStatus}`)
    const body = await response.json()
    const normalizedInstances: BillInstance[] = (body.instances || []).map((instance: BillInstance) => ({
      ...instance,
      status: (instance.status?.toUpperCase?.() as BillInstance['status']) || 'PENDING',
      bill: instance.bill
        ? { ...instance.bill, type: instance.bill.type?.toUpperCase?.() as Bill['type'] }
        : instance.bill,
    }))
    setInstances(normalizedInstances)
    setLoading(false)
  }

  useEffect(() => {
    fetchInstances()
  }, [status])

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

  const filtered = useMemo(() => {
    const text = search.toLowerCase()
    return instances.filter((instance) => {
      const matchesText =
        !text ||
        instance.bill?.name?.toLowerCase().includes(text) ||
        instance.bill?.type?.toLowerCase().includes(text)
      return matchesText
    })
  }, [instances, search])

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
                  Track pending and posted bill instances with filters.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search by name or type"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-48"
                />
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
                      {filtered.map((instance) => (
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
                              disabled={instance.status !== 'PENDING'}
                              onChange={(e) =>
                                setPendingUpdates((prev) => ({ ...prev, [instance.id]: Number(e.target.value) }))
                              }
                              className="max-w-[120px]"
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant={instance.status === 'PENDING' ? 'secondary' : 'outline'}>
                              {instance.status}
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
                              disabled={instance.status !== 'PENDING' || actionLoading}
                              onClick={() => handleConfirm(instance.id)}
                            >
                              <Check className="mr-1 h-4 w-4" /> Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={instance.status !== 'PENDING' || actionLoading}
                              onClick={() => handleSkip(instance.id)}
                            >
                              <X className="mr-1 h-4 w-4" /> Skip
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
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
    </>
  )
}

