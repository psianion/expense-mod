'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'
import { ConfidenceIndicator } from './ConfidenceIndicator'
import { useConfirmRow } from '../hooks/useConfirmRow'
import type { ImportRow } from '@/types/import'
import { formatDistanceToNow } from 'date-fns'

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Utilities', 'Rent', 'Salary', 'EMI', 'Insurance', 'Education', 'Travel', 'Other']
const PAYMENT_METHODS = ['UPI', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'Other']

interface Props {
  row: ImportRow
  sessionId: string
}

export function ReviewRow({ row, sessionId }: Props) {
  const { mutate: confirmRow, isPending } = useConfirmRow(sessionId)
  const [edits, setEdits] = useState<Partial<ImportRow>>({})

  const val = <K extends keyof ImportRow>(field: K): ImportRow[K] =>
    (edits[field] ?? row[field]) as ImportRow[K]

  const set = <K extends keyof ImportRow>(field: K, value: ImportRow[K]) =>
    setEdits(e => ({ ...e, [field]: value }))

  const confirm = () => confirmRow({ rowId: row.id, input: { action: 'CONFIRM', fields: edits as Parameters<typeof confirmRow>[0]['input']['fields'] } })
  const skip = () => confirmRow({ rowId: row.id, input: { action: 'SKIP' } })

  const isDone = row.status === 'CONFIRMED' || row.status === 'SKIPPED'

  return (
    <tr className={`border-b transition-opacity ${isDone ? 'opacity-40' : ''}`}>
      <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
        {row.datetime ? formatDistanceToNow(new Date(row.datetime), { addSuffix: true }) : '—'}
      </td>
      <td className="py-2 px-3 font-mono text-sm">
        ₹{row.amount?.toLocaleString('en-IN') ?? '—'}
      </td>
      <td className="py-2 px-3 max-w-[180px] truncate text-xs text-muted-foreground">
        {(row.raw_data as Record<string, string>)?.Narration ?? Object.values(row.raw_data ?? {})[0] ?? '—'}
      </td>
      <td className="py-2 px-3">
        {isDone ? (
          <ConfidenceIndicator score={row.confidence.category} label={val('category') ?? '—'} />
        ) : (
          <Select value={val('category') ?? ''} onValueChange={v => set('category', v)}>
            <SelectTrigger className="h-7 text-xs w-32">
              <ConfidenceIndicator score={row.confidence.category} label={val('category') ?? 'Select'} />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </td>
      <td className="py-2 px-3">
        {isDone ? (
          <ConfidenceIndicator score={row.confidence.payment_method} label={val('payment_method') ?? '—'} />
        ) : (
          <Select value={val('payment_method') ?? ''} onValueChange={v => set('payment_method', v)}>
            <SelectTrigger className="h-7 text-xs w-32">
              <ConfidenceIndicator score={row.confidence.payment_method} label={val('payment_method') ?? 'Select'} />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </td>
      <td className="py-2 px-3">
        {row.recurring_flag && (
          <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded">↻ recurring?</span>
        )}
      </td>
      {!isDone && (
        <td className="py-2 px-3">
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={confirm} disabled={isPending}>
              <Check className="h-3 w-3 text-green-600" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={skip} disabled={isPending}>
              <X className="h-3 w-3 text-red-600" />
            </Button>
          </div>
        </td>
      )}
    </tr>
  )
}
