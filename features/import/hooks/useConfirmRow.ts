// features/import/hooks/useConfirmRow.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/queryKeys'
import { importApi } from '@/lib/api/import'
import type { ImportRow, ConfirmRowInput } from '@/types/import'

export function useConfirmRow(sessionId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ rowId, input }: { rowId: string; input: ConfirmRowInput }) =>
      importApi.confirmRow(sessionId, rowId, input),
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
