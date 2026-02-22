// server/services/import.service.ts
import { importRepo } from '@server/db/repositories/import.repo'
import { parseFile } from '@server/import/file-parser'
import { classifyRows } from '@server/import/rule-classifier'
import { aiClassificationQueue } from '@server/queue/ai-classification-queue'
import type { AuthContext } from '@server/auth/context'
import type { ClassifiedRow, ImportRow, ImportSession } from '@/types/import'
import type { ConfirmRowInput } from '@server/validators/import.schema'

const AUTO_THRESHOLD = 0.80
const SUPPORTED_EXTENSIONS = /\.(csv|xlsx|xls)$/i
const SUPPORTED_MIME = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']

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
    fileMime: string,
    user: AuthContext,
  ): Promise<{ sessionId: string }> {
    // Validate file type (domain rule — belongs in service)
    if (!SUPPORTED_MIME.includes(fileMime) && !SUPPORTED_EXTENSIONS.test(filename)) {
      throw Object.assign(new Error('Unsupported file type. Upload CSV or XLSX.'), { status: 422 })
    }

    // 1. Parse file
    const { format, rows: rawRows } = await parseFile(buffer, filename)

    // 2. Create session record immediately
    const session = await importRepo.createSession({
      user_id: user.userId,
      source_file: filename,
      bank_format: format,
      row_count: rawRows.length,
      progress_total: rawRows.length,
    })
    const sessionId = session.id

    // 3. Run pipeline async (do not await)
    this.runPipeline(sessionId, rawRows, user).catch(async (err: unknown) => {
      console.error('[ImportService] Pipeline failed', {
        sessionId,
        userId: user.userId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
      await importRepo.updateSession(sessionId, { status: 'FAILED' })
    })

    return { sessionId }
  }

  private async runPipeline(
    sessionId: string,
    rawRows: Awaited<ReturnType<typeof parseFile>>['rows'],
    _user: AuthContext,
  ): Promise<void> {
    // 4. Rule classify all rows
    const classified = classifyRows(rawRows)

    // 5. Split into auto and fallback queues
    const autoRows = classified.filter(isAutoImport)
    const fallbackRows = classified.filter(r => !isAutoImport(r))

    // 6. Persist rule-classified rows
    const insertedRows = await importRepo.insertRows(
      classified.map(r => ({ ...r, session_id: sessionId }))
    )

    // 7. AI classify fallback rows
    if (fallbackRows.length > 0) {
      const dbFallbackRows = insertedRows
        .filter(r => r.classified_by === 'RULE')
        .slice(autoRows.length)

      let done = autoRows.length
      const aiResults = await aiClassificationQueue.enqueue(fallbackRows)

      for (let i = 0; i < aiResults.length; i++) {
        const aiRow = aiResults[i]
        const dbRow = dbFallbackRows[i]
        if (!dbRow) continue
        await importRepo.updateRow(dbRow.id, {
          category: aiRow.category,
          platform: aiRow.platform,
          payment_method: aiRow.payment_method,
          tags: aiRow.tags,
          confidence: aiRow.confidence,
          classified_by: 'AI',
        })
        done++
        await importRepo.updateSession(sessionId, {
          progress_done: done,
          auto_count: autoRows.length,
          review_count: fallbackRows.length,
        })
      }
    }

    // 8. Mark session as REVIEWING
    await importRepo.updateSession(sessionId, {
      status: 'REVIEWING',
      auto_count: autoRows.length,
      review_count: fallbackRows.length,
      progress_done: rawRows.length,
    })
  }

  async getSession(sessionId: string, user: AuthContext): Promise<ImportSession> {
    return importRepo.getSession(sessionId, user.userId)
  }

  async getRows(sessionId: string, user: AuthContext): Promise<ImportRow[]> {
    // V7 fix: domain rule belongs in service, not route
    const session = await this.getSession(sessionId, user)
    if (session.status === 'PARSING') {
      throw Object.assign(new Error('Session is still parsing'), { status: 409 })
    }
    return importRepo.getRowsBySession(sessionId)
  }

  async confirmRow(rowId: string, input: ConfirmRowInput, user: AuthContext): Promise<ImportRow> {
    const row = await importRepo.getRow(rowId)
    if (!row) throw new Error('Row not found')

    if (input.action === 'SKIP') {
      await importRepo.updateRow(rowId, { status: 'SKIPPED' })
      return { ...row, status: 'SKIPPED' } as ImportRow
    }

    // Merge field overrides
    const merged = { ...row, ...input.fields }

    // Write to expenses
    const expense = await importRepo.insertExpense({
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
    })

    await importRepo.updateRow(rowId, {
      status: 'CONFIRMED',
      posted_expense_id: expense?.id ?? null,
      ...input.fields,
    })

    return { ...merged, status: 'CONFIRMED' } as ImportRow
  }

  async confirmAll(sessionId: string, scope: 'AUTO' | 'ALL', user: AuthContext): Promise<{ imported: number }> {
    await this.getSession(sessionId, user)

    const rows = await importRepo.getPendingRows(sessionId, scope)
    if (!rows.length) return { imported: 0 }

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

    const inserted = await importRepo.insertExpenses(expenses)

    for (let i = 0; i < rows.length; i++) {
      await importRepo.updateRow(rows[i].id, {
        status: 'CONFIRMED',
        posted_expense_id: inserted[i]?.id ?? null,
      })
    }

    await importRepo.updateSession(sessionId, { status: 'COMPLETE' })

    return { imported: rows.length }
  }
}

export const importService = new ImportService()
