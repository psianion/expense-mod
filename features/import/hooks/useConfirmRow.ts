// features/import/hooks/useConfirmRow.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/queryKeys'
import type { ImportRow } from '@/types/import'
import type { ConfirmRowInput } from '@server/validators/import.schema'

export function useConfirmRow(sessionId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ rowId, input }: { rowId: string; input: ConfirmRowInput }) => {
      const res = await fetch(`/api/import/sessions/${sessionId}/rows/${rowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error('Failed to update row')
      const { data } = await res.json()
      return data.row as ImportRow
    },
    onMutate: async ({ rowId, input }) => {
      const key = queryKeys.importSessions.rows(sessionId)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<ImportRow[]>(key)
      qc.setQueryData<ImportRow[]>(key, rows =>
        rows?.map(r => r.id === rowId
          ? { ...r, status: input.action === 'CONFIRM' ? 'CONFIRMED' : 'SKIPPED', ...input.fields }
          : r
        ) ?? []
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.importSessions.rows(sessionId), ctx.previous)
      }
    },
  })
}
