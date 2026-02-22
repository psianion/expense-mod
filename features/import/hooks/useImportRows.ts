// features/import/hooks/useImportRows.ts
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/queryKeys'
import { importApi } from '@/lib/api/import'
import type { ImportSession } from '@/types/import'

export function useImportRows(sessionId: string | null, session: ImportSession | undefined) {
  return useQuery({
    queryKey: queryKeys.importSessions.rows(sessionId ?? ''),
    queryFn: () => importApi.getRows(sessionId!),
    enabled: !!sessionId && session?.status === 'REVIEWING',
    staleTime: Infinity, // fetched once — user edits are optimistic
  })
}
