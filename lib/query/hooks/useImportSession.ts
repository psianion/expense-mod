// features/import/hooks/useImportSession.ts
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/queryKeys'
import { importApi } from '@/lib/api/import'

export function useImportSession(sessionId: string | null) {
  return useQuery({
    queryKey: queryKeys.importSessions.detail(sessionId ?? ''),
    queryFn: () => importApi.getSession(sessionId!),
    enabled: !!sessionId,
    refetchInterval: (query) =>
      query.state.data?.status === 'PARSING' ? 1500 : false,
    staleTime: 0,
  })
}
