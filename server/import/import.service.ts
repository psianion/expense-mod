// server/import/import.service.ts
import { supabase } from '@server/db/supabase'
import { parseFile } from './file-parser'
import { classifyRows } from './rule-classifier'
import { aiClassificationQueue } from '@server/queue/ai-classification-queue'
import type { AuthContext } from '@server/auth/context'
import type { ClassifiedRow, ImportRow, ImportSession } from '@/types/import'
import type { ConfirmRowInput } from '@server/validators/import.schema'

const AUTO_THRESHOLD = 0.80

function isAutoImport(row: ClassifiedRow): boolean {
  const c = row.confidence
  return (
    (c.amount ?? 0) >= AUTO_THRESHOLD &&
    (c.datetime ?? 0) >= AUTO_THRESHOLD &&
    (c.type ?? 0) >= AUTO_THRESHOLD &&
    (c.category ?? 0) >= AUTO_THRESHOLD &&
    (c.platform ?? 0) >= AUTO_THRESHOLD &&
    (c.payment_method ?? 0) >= AUTO_THRESHOLD
  )
}

class ImportService {
  async createSession(
    buffer: Buffer,
    filename: string,
    user: AuthContext,
  ): Promise<{ sessionId: string }> {
    // 1. Parse file
    const { format, rows: rawRows } = await parseFile(buffer, filename)

    // 2. Create session record immediately
    const { data: session, error: sessErr } = await supabase
      .from('import_sessions')
      .insert({
        user_id: user.userId,
        status: 'PARSING',
        source_file: filename,
        bank_format: format,
        row_count: rawRows.length,
        progress_total: rawRows.length,
      })
      .select('id')
      .single()

    if (sessErr || !session) throw new Error('Failed to create import session')
    const sessionId = (session as { id: string }).id

    // 3. Run pipeline async (do not await)
    this.runPipeline(sessionId, rawRows, user).catch(async () => {
      await supabase.from('import_sessions').update({ status: 'FAILED' }).eq('id', sessionId)
    })

    return { sessionId }
  }

  private async runPipeline(
    sessionId: string,
    rawRows: Awaited<ReturnType<typeof parseFile>>['rows'],
    user: AuthContext,
  ): Promise<void> {
    // 4. Rule classify all rows
    const classified = classifyRows(rawRows)

    // 5. Split into auto and fallback queues
    const autoRows = classified.filter(isAutoImport)
    const fallbackRows = classified.filter(r => !isAutoImport(r))

    // 6. Persist rule-classified rows and capture their IDs
    const { data: insertedRows } = await supabase.from('import_rows').insert(
      classified.map(r => ({
        session_id: sessionId,
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
    ).select('id, classified_by, amount')

    // 7. AI classify fallback rows with progress updates
    if (fallbackRows.length > 0) {
      const dbFallbackRows = ((insertedRows as Array<{ id: string; classified_by: string; amount: number | null }>) ?? [])
        .filter(r => r.classified_by === 'RULE')
        .slice(autoRows.length)

      let done = autoRows.length
      const aiResults = await aiClassificationQueue.enqueue(fallbackRows)

      for (let i = 0; i < aiResults.length; i++) {
        const aiRow = aiResults[i]
        const dbRow = dbFallbackRows[i]
        if (!dbRow) continue
        await supabase.from('import_rows').update({
          category: aiRow.category,
          platform: aiRow.platform,
          payment_method: aiRow.payment_method,
          tags: aiRow.tags,
          confidence: aiRow.confidence,
          classified_by: 'AI',
        }).eq('id', dbRow.id)

        done++
        await supabase.from('import_sessions').update({
          progress_done: done,
          auto_count: autoRows.length,
          review_count: fallbackRows.length,
        }).eq('id', sessionId)
      }
    }

    // 8. Mark session as REVIEWING
    await supabase.from('import_sessions').update({
      status: 'REVIEWING',
      auto_count: autoRows.length,
      review_count: fallbackRows.length,
      progress_done: rawRows.length,
    }).eq('id', sessionId)
  }

  async getSession(sessionId: string, user: AuthContext): Promise<ImportSession> {
    const { data, error } = await supabase
      .from('import_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.userId)
      .single()

    if (error || !data) throw new Error('Session not found')
    return data as ImportSession
  }

  async getRows(sessionId: string, user: AuthContext): Promise<ImportRow[]> {
    // Verify session belongs to user
    await this.getSession(sessionId, user)

    const { data, error } = await supabase
      .from('import_rows')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) throw new Error('Failed to fetch import rows')
    return (data ?? []) as ImportRow[]
  }

  async confirmRow(rowId: string, input: ConfirmRowInput, user: AuthContext): Promise<ImportRow> {
    const { data: row, error } = await supabase
      .from('import_rows')
      .select('*')
      .eq('id', rowId)
      .single()

    if (error || !row) throw new Error('Row not found')

    if (input.action === 'SKIP') {
      await supabase.from('import_rows').update({ status: 'SKIPPED' }).eq('id', rowId)
      return { ...row, status: 'SKIPPED' } as ImportRow
    }

    // Merge field overrides
    const merged = { ...row, ...input.fields }

    // Write to expenses
    const { data: expense } = await supabase.from('expenses').insert({
      user_id: user.userId,
      amount: merged.amount,
      datetime: merged.datetime,
      type: merged.type,
      category: merged.category ?? 'Other',
      platform: merged.platform ?? 'Other',
      payment_method: merged.payment_method ?? 'Other',
      notes: merged.notes,
      tags: merged.tags,
      source: 'AI',
      raw_text: JSON.stringify(merged.raw_data),
    }).select('id').single()

    await supabase.from('import_rows').update({
      status: 'CONFIRMED',
      posted_expense_id: (expense as { id: string } | null)?.id ?? null,
      ...input.fields,
    }).eq('id', rowId)

    return { ...merged, status: 'CONFIRMED' } as ImportRow
  }

  async confirmAll(sessionId: string, scope: 'AUTO' | 'ALL', user: AuthContext): Promise<{ imported: number }> {
    await this.getSession(sessionId, user)

    const query = supabase
      .from('import_rows')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'PENDING')

    if (scope === 'AUTO') {
      query.eq('classified_by', 'RULE')
    }

    const { data: rows } = await query
    if (!rows?.length) return { imported: 0 }

    const expenses = rows.map(row => ({
      user_id: user.userId,
      amount: row.amount,
      datetime: row.datetime,
      type: row.type,
      category: row.category ?? 'Other',
      platform: row.platform ?? 'Other',
      payment_method: row.payment_method ?? 'Other',
      notes: row.notes,
      tags: row.tags,
      source: 'AI',
      raw_text: JSON.stringify(row.raw_data),
    }))

    const { data: inserted } = await supabase.from('expenses').insert(expenses).select('id')

    for (let i = 0; i < rows.length; i++) {
      await supabase.from('import_rows').update({
        status: 'CONFIRMED',
        posted_expense_id: (inserted as Array<{ id: string }> | null)?.[i]?.id ?? null,
      }).eq('id', rows[i].id)
    }

    await supabase.from('import_sessions').update({ status: 'COMPLETE' }).eq('id', sessionId)

    return { imported: rows.length }
  }
}

export const importService = new ImportService()
