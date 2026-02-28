// server/services/import.service.ts
import { importRepo } from '@server/db/repositories/import.repo'
import { extractPdfText, PdfPasswordError } from '@server/import/pdf-extractor'
import { extractRowsFromText } from '@server/import/ai-row-extractor'
import { classifyRows } from '@server/import/rule-classifier'
import { aiClassificationQueue } from '@server/queue/ai-classification-queue'
import type { UserContext } from '@server/auth/context'
import type { ClassifiedRow, ConfirmRowInput, ImportRow, ImportSession } from '@/types/import'
import { createServiceLogger } from '@/server/lib/logger'
import { AppError } from '@/server/lib/errors'
const log = createServiceLogger('ImportService')

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
    _fileMime: string,
    user: UserContext,
    password?: string,
  ): Promise<{ sessionId: string }> {
    log.info({ method: 'createSession', userId: user.userId, filename }, 'Creating import session')
    if (!filename.toLowerCase().endsWith('.pdf')) {
      log.warn({ method: 'createSession', filename }, 'Unsupported file type')
      throw new AppError('VALIDATION_ERROR', 'Only PDF files are supported.')
    }

    // Extract text — may throw PdfPasswordError
    let text: string
    try {
      text = await extractPdfText(buffer, password)
    } catch (err) {
      if (err instanceof PdfPasswordError) {
        log.warn({ method: 'createSession', code: err.code }, 'PDF password error')
        throw new AppError('VALIDATION_ERROR', err.code)
      }
      log.error({ method: 'createSession', err }, 'PDF extraction failed')
      throw err
    }

    // Create session record
    const session = await importRepo.createSession({
      user_id: user.userId,
      source_file: filename,
      bank_format: 'PDF',
      row_count: 0,
      progress_total: 0,
    })
    const sessionId = session.id
    log.info({ method: 'createSession', sessionId }, 'Import session created, starting pipeline')

    // Run pipeline async (do not await)
    this.runPipeline(sessionId, text, user).catch(async (err: unknown) => {
      log.error({ method: 'runPipeline', sessionId, userId: user.userId, err }, 'Pipeline failed')
      await importRepo.updateSession(sessionId, { status: 'FAILED' }).catch((updateErr: unknown) => {
        log.error({ method: 'runPipeline', sessionId, err: updateErr }, 'CRITICAL: Could not mark session FAILED')
      })
    })

    return { sessionId }
  }

  private async runPipeline(sessionId: string, text: string, _user: UserContext): Promise<void> {
    log.info({ method: 'runPipeline', sessionId }, 'Pipeline started')
    // 1. AI extracts raw rows from PDF text
    const rawRows = await extractRowsFromText(text)

    if (rawRows.length === 0) {
      await importRepo.updateSession(sessionId, {
        status: 'REVIEWING',
        row_count: 0,
        progress_total: 0,
        progress_done: 0,
        auto_count: 0,
        review_count: 0,
      })
      return
    }

    // 2. Update session with actual row count
    await importRepo.updateSession(sessionId, {
      row_count: rawRows.length,
      progress_total: rawRows.length,
    })

    // 3. Rule classify
    const classified = classifyRows(rawRows)
    const autoRows = classified.filter(isAutoImport)
    const fallbackRows = classified.filter(r => !isAutoImport(r))

    // 4. Persist rows
    const insertedRows = await importRepo.insertRows(
      classified.map(r => ({ ...r, session_id: sessionId }))
    )

    // 5. AI classify fallback rows
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
          notes: aiRow.notes,
          tags: aiRow.tags,
          type: aiRow.type,
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

    // 6. Mark REVIEWING
    await importRepo.updateSession(sessionId, {
      status: 'REVIEWING',
      auto_count: autoRows.length,
      review_count: fallbackRows.length,
      progress_done: rawRows.length,
    })
    log.info({ method: 'runPipeline', sessionId, rowCount: rawRows.length, autoCount: autoRows.length, reviewCount: fallbackRows.length }, 'Pipeline complete')
  }

  async getSession(sessionId: string, user: UserContext): Promise<ImportSession> {
    log.debug({ method: 'getSession', sessionId, userId: user.userId }, 'Fetching session')
    return importRepo.getSession(sessionId, user.userId)
  }

  async getRows(sessionId: string, user: UserContext): Promise<ImportRow[]> {
    log.debug({ method: 'getRows', sessionId }, 'Fetching rows')
    const session = await this.getSession(sessionId, user)
    if (session.status === 'PARSING') {
      throw new AppError('DUPLICATE_ENTRY', 'Session is still parsing')
    }
    return importRepo.getRowsBySession(sessionId)
  }

  async confirmRow(rowId: string, input: ConfirmRowInput, user: UserContext): Promise<ImportRow> {
    log.info({ method: 'confirmRow', rowId, action: input.action, userId: user.userId }, 'Confirming row')
    const row = await importRepo.getRow(rowId)
    if (!row) throw new AppError('NOT_FOUND', 'Row not found')
    await this.getSession(row.session_id, user)

    if (input.action === 'SKIP') {
      await importRepo.updateRow(rowId, { status: 'SKIPPED' })
      return { ...row, status: 'SKIPPED' } as ImportRow
    }

    const merged = { ...row, ...input.fields }
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

  async confirmAll(sessionId: string, scope: 'AUTO' | 'ALL', user: UserContext): Promise<{ imported: number }> {
    log.info({ method: 'confirmAll', sessionId, scope, userId: user.userId }, 'Confirming all rows')
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
    log.info({ method: 'confirmAll', sessionId, imported: rows.length }, 'All rows confirmed')
    return { imported: rows.length }
  }
}

export const importService = new ImportService()
