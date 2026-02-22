// server/db/repositories/import.repo.ts
import { supabase } from '../supabase'
import type { ImportSession, ImportRow, ClassifiedRow, BankFormatId } from '@/types/import'

export const importRepo = {
  async createSession(data: {
    user_id: string
    source_file: string
    bank_format: BankFormatId
    row_count: number
    progress_total: number
  }): Promise<{ id: string }> {
    const { data: session, error } = await supabase
      .from('import_sessions')
      .insert({ ...data, status: 'PARSING' })
      .select('id')
      .single()
    if (error || !session) throw new Error('Failed to create import session')
    return session as { id: string }
  },

  async updateSession(id: string, patch: Partial<{
    status: string
    auto_count: number
    review_count: number
    progress_done: number
  }>): Promise<void> {
    await supabase.from('import_sessions').update(patch).eq('id', id)
  },

  async getSession(id: string, userId: string): Promise<ImportSession> {
    const { data, error } = await supabase
      .from('import_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()
    if (error || !data) throw Object.assign(new Error('Session not found'), { status: 404 })
    return data as ImportSession
  },

  async insertRows(rows: Array<ClassifiedRow & { session_id: string }>): Promise<Array<{ id: string; classified_by: string; amount: number | null }>> {
    const { data } = await supabase.from('import_rows').insert(
      rows.map(r => ({
        session_id: r.session_id,
        status: 'PENDING',
        raw_data: r.raw_data,
        amount: r.amount,
        datetime: r.datetime,
        type: r.type,
        category: r.category,
        platform: r.platform,
        payment_method: r.payment_method,
        notes: r.notes,
        tags: r.tags,
        recurring_flag: r.recurring_flag,
        confidence: r.confidence,
        classified_by: r.classified_by,
      }))
    ).select('id, classified_by, amount, status')
    return (data ?? []) as Array<{ id: string; classified_by: string; amount: number | null }>
  },

  async updateRow(id: string, patch: Record<string, unknown>): Promise<void> {
    await supabase.from('import_rows').update(patch).eq('id', id)
  },

  async getRow(id: string): Promise<ImportRow | null> {
    const { data, error } = await supabase
      .from('import_rows')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return null
    return data as ImportRow
  },

  async getRowsBySession(sessionId: string): Promise<ImportRow[]> {
    const { data, error } = await supabase
      .from('import_rows')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
    if (error) throw new Error('Failed to fetch import rows')
    return (data ?? []) as ImportRow[]
  },

  async getPendingRows(sessionId: string, scope: 'AUTO' | 'ALL'): Promise<ImportRow[]> {
    const query = supabase
      .from('import_rows')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'PENDING')

    if (scope === 'AUTO') {
      query.eq('classified_by', 'RULE')
    }

    const { data } = await query
    return (data ?? []) as ImportRow[]
  },

  async insertExpense(expense: Record<string, unknown>): Promise<{ id: string } | null> {
    const { data } = await supabase.from('expenses').insert(expense).select('id').single()
    return data as { id: string } | null
  },

  async insertExpenses(expenses: Record<string, unknown>[]): Promise<Array<{ id: string }>> {
    const { data } = await supabase.from('expenses').insert(expenses).select('id')
    return (data ?? []) as Array<{ id: string }>
  },
}
