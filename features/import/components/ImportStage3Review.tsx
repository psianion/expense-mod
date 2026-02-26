'use client'

import { Button } from '@/components/ui/button'
import { ReviewRow } from './ReviewRow'
import { useConfirmAll } from '@/lib/query/hooks/useConfirmAll'
import type { ImportRow, ImportSession } from '@/types/import'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  session: ImportSession
  rows: ImportRow[]
  onDone: () => void
}

export function ImportStage3Review({ session, rows, onDone }: Props) {
  const { mutate: confirmAll, isPending } = useConfirmAll(session.id)

  const pending = rows.filter(r => r.status === 'PENDING').length
  const needsAttention = rows.filter(r =>
    r.status === 'PENDING' &&
    (Object.values(r.confidence).some(v => (v ?? 0) < 0.6))
  ).length

  const handleConfirmAll = () => {
    confirmAll('ALL', {
      onSuccess: ({ imported }) => {
        toast.success(`${imported} transactions imported`)
        onDone()
      },
      onError: () => toast.error('Failed to import transactions'),
    })
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-card">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Review Transactions</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {session.auto_count} auto · {session.review_count} review
            {needsAttention > 0 && (
              <span className={cn('ml-1 text-destructive')}>
                ({needsAttention} low confidence)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => confirmAll('AUTO', {
              onError: () => toast.error('Failed to confirm auto-classified transactions'),
            })}
            disabled={isPending}
          >
            Confirm Auto
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleConfirmAll}
            disabled={isPending || pending === 0}
          >
            Import ({pending})
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card z-10 border-b">
            <tr className="text-xs text-muted-foreground">
              <th className="py-2.5 px-3 text-left font-medium w-[72px]">Date</th>
              <th className="py-2.5 px-3 text-right font-medium w-[90px]">Amount</th>
              <th className="py-2.5 px-3 text-center font-medium w-[52px]">Type</th>
              <th className="py-2.5 px-3 text-left font-medium">Description</th>
              <th className="py-2.5 px-3 text-left font-medium w-[140px]">Category</th>
              <th className="py-2.5 px-3 text-center font-medium w-[64px]"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <ReviewRow key={row.id} row={row} sessionId={session.id} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
