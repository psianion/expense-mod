// features/import/hooks/useImportSession.ts
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/queryKeys'
import type { ImportSession } from '@/types/import'

async function fetchImportSession(id: string): Promise<ImportSession> {
  const res = await fetch(`/api/import/sessions/${id}`)
  if (!res.ok) throw new Error('Failed to fetch session')
  const { data } = await res.json()
  return data.session
}

export function useImportSession(sessionId: string | null) {
  return useQuery({
    queryKey: queryKeys.importSessions.detail(sessionId ?? ''),
    queryFn: () => fetchImportSession(sessionId!),
    enabled: !!sessionId,
    refetchInterval: (query) =>
      query.state.data?.status === 'PARSING' ? 1500 : false,
    staleTime: 0,
  })
}
