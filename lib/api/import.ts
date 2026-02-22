// lib/api/import.ts
import type { ImportSession, ImportRow, ConfirmRowInput, ConfirmAllInput } from '@/types/import'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `Request failed: ${res.status}`)
  }
  const { data } = await res.json()
  return data as T
}

export const importApi = {
  async uploadFile(file: File): Promise<{ sessionId: string }> {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/import/sessions', { method: 'POST', body: form })
    return handleResponse<{ sessionId: string }>(res)
  },

  async getSession(sessionId: string): Promise<ImportSession> {
    const res = await fetch(`/api/import/sessions/${sessionId}`)
    const data = await handleResponse<{ session: ImportSession }>(res)
    return data.session
  },

  async getRows(sessionId: string): Promise<ImportRow[]> {
    const res = await fetch(`/api/import/sessions/${sessionId}/rows`)
    const data = await handleResponse<{ rows: ImportRow[] }>(res)
    return data.rows
  },

  async confirmRow(sessionId: string, rowId: string, input: ConfirmRowInput): Promise<ImportRow> {
    const res = await fetch(`/api/import/sessions/${sessionId}/rows/${rowId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const data = await handleResponse<{ row: ImportRow }>(res)
    return data.row
  },

  async confirmAll(sessionId: string, scope: ConfirmAllInput['scope']): Promise<{ imported: number }> {
    const res = await fetch(`/api/import/sessions/${sessionId}/confirm-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope }),
    })
    return handleResponse<{ imported: number }>(res)
  },
}
