// features/import/hooks/useConfirmAll.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/queryKeys'

export function useConfirmAll(sessionId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (scope: 'AUTO' | 'ALL') => {
      const res = await fetch(`/api/import/sessions/${sessionId}/confirm-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      })
      if (!res.ok) throw new Error('Failed to confirm all')
      const { data } = await res.json()
      return data as { imported: number }
    },
    onSuccess: () => {
      // Refresh expenses table
      qc.invalidateQueries({ queryKey: queryKeys.expenses.all })
      // Refresh session status
      qc.invalidateQueries({ queryKey: queryKeys.importSessions.detail(sessionId) })
    },
  })
}
