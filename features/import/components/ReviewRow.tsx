'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Check, X, RefreshCw } from 'lucide-react'
import { ConfidenceIndicator } from './ConfidenceIndicator'
import { useConfirmRow } from '@/lib/query/hooks/useConfirmRow'
import type { ImportRow } from '@/types/import'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

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
    <tr className={cn('border-b transition-opacity', isDone && 'opacity-40')}>
      <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
        {row.datetime ? format(new Date(row.datetime), 'dd MMM') : '—'}
      </td>
      <td className={cn(
        'py-2 px-3 font-mono text-xs text-right whitespace-nowrap',
        isInflow ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
      )}>
        {isInflow ? '+' : ''}₹{row.amount?.toLocaleString('en-IN') ?? '—'}
      </td>
      <td className="py-2 px-3 text-center">
        <span className={cn(
          'inline-block text-[10px] font-medium px-1.5 py-0.5 rounded',
          isInflow
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-destructive/10 text-destructive'
        )}>
          {isInflow ? 'Credit' : 'Debit'}
        </span>
      </td>
      <td className="py-2 px-3 max-w-[200px]">
        <p className="truncate text-xs text-foreground" title={getDescription(row)}>
          {getDescription(row)}
        </p>
        {row.notes && (
          <p className="truncate text-[10px] text-muted-foreground mt-0.5" title={getRawNarration(row)}>
            {getRawNarration(row)}
          </p>
        )}
        {(row.payment_method || row.recurring_flag) && (
          <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
            {row.payment_method && <span>{row.payment_method}</span>}
            {row.recurring_flag && (
              <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                <RefreshCw className="h-2.5 w-2.5" />
                recurring
              </span>
            )}
          </p>
        )}
      </td>
      <td className="py-2 px-3">
        {isDone ? (
          <ConfidenceIndicator score={row.confidence.category} label={val('category') ?? '—'} />
        ) : (
          <Select value={val('category') ?? ''} onValueChange={v => set('category', v)}>
            <SelectTrigger className="h-7 text-xs w-[120px]">
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
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              onClick={confirm}
              disabled={isPending}
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={skip}
              disabled={isPending}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            {row.status === 'CONFIRMED' ? (
              <Check className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}
