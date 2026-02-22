// features/import/hooks/useImportRows.ts
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/queryKeys'
import type { ImportRow, ImportSession } from '@/types/import'

async function fetchImportRows(sessionId: string): Promise<ImportRow[]> {
  const res = await fetch(`/api/import/sessions/${sessionId}/rows`)
  if (!res.ok) throw new Error('Failed to fetch rows')
  const { data } = await res.json()
  return data.rows
}

export function useImportRows(sessionId: string | null, session: ImportSession | undefined) {
  return useQuery({
    queryKey: queryKeys.importSessions.rows(sessionId ?? ''),
    queryFn: () => fetchImportRows(sessionId!),
    enabled: !!sessionId && session?.status === 'REVIEWING',
    staleTime: Infinity, // fetched once — user edits are optimistic
  })
}
