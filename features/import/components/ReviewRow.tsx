'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'
import { ConfidenceIndicator } from './ConfidenceIndicator'
import { useConfirmRow } from '@/lib/query/hooks/useConfirmRow'
import type { ImportRow } from '@/types/import'
import { format } from 'date-fns'

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Utilities', 'Rent', 'Salary', 'EMI', 'Insurance', 'Education', 'Travel', 'Other']

interface Props {
  row: ImportRow
  sessionId: string
}

function getRawNarration(row: ImportRow): string {
  const raw = row.raw_data as Record<string, string> | undefined
  if (!raw) return '—'
  return raw.narration || raw.Narration || raw.description || raw.Description || Object.values(raw)[0] || '—'
}

function getDescription(row: ImportRow): string {
  // Prefer AI-generated description (stored in notes), fall back to raw narration
  return row.notes || getRawNarration(row)
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
  const isInflow = row.type === 'INFLOW'

  return (
    <tr className={`border-b transition-opacity ${isDone ? 'opacity-40' : ''}`}>
      <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
        {row.datetime ? format(new Date(row.datetime), 'dd MMM') : '—'}
      </td>
      <td className={`py-2 px-3 font-mono text-xs text-right whitespace-nowrap ${isInflow ? 'text-green-600 dark:text-green-400' : ''}`}>
        {isInflow ? '+' : ''}₹{row.amount?.toLocaleString('en-IN') ?? '—'}
      </td>
      <td className="py-2 px-3 text-center">
        <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${
          isInflow
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {isInflow ? 'Credit' : 'Debit'}
        </span>
      </td>
      <td className="py-2 px-3 max-w-[200px]">
        <p className="truncate text-xs" title={getDescription(row)}>
          {getDescription(row)}
        </p>
        {row.notes && (
          <p className="truncate text-[10px] text-muted-foreground mt-0.5" title={getRawNarration(row)}>
            {getRawNarration(row)}
          </p>
        )}
        {(row.payment_method || row.recurring_flag) && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {row.payment_method && <span>{row.payment_method}</span>}
            {row.recurring_flag && <span className="text-orange-500 ml-1">&#x21bb; recurring</span>}
          </p>
        )}
      </td>
      <td className="py-2 px-3">
        {isDone ? (
          <ConfidenceIndicator score={row.confidence.category} label={val('category') ?? '—'} />
        ) : (
          <Select value={val('category') ?? ''} onValueChange={v => set('category', v)}>
            <SelectTrigger className="h-7 text-xs w-[110px]">
              <ConfidenceIndicator score={row.confidence.category} label={val('category') ?? 'Select'} />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </td>
      <td className="py-2 px-3">
        {!isDone ? (
          <div className="flex gap-0.5 justify-center">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={confirm} disabled={isPending}>
              <Check className="h-3 w-3 text-green-600" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={skip} disabled={isPending}>
              <X className="h-3 w-3 text-red-600" />
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground text-center block">
            {row.status === 'CONFIRMED' ? '✓' : '—'}
          </span>
        )}
      </td>
    </tr>
  )
}
