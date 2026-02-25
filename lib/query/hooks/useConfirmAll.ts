// features/import/hooks/useConfirmAll.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/queryKeys'
import { importApi } from '@/lib/api/import'

export function useConfirmAll(sessionId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (scope: 'AUTO' | 'ALL') => importApi.confirmAll(sessionId, scope),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenses.all })
      qc.invalidateQueries({ queryKey: queryKeys.importSessions.detail(sessionId) })
    },
  })
}
