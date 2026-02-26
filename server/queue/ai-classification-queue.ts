// server/queue/ai-classification-queue.ts
import { openRouter } from '@server/ai/providers/openrouter'
import { BatchQueue } from './batch-queue'
import type { RawImportRow, ClassifiedRow } from '@/types/import'

const BATCH_SYSTEM_PROMPT = `You are a financial transaction classifier. Given a JSON array of bank transactions, return a JSON array of classifications in the same order.

For each transaction, return:
{
  "category": string | null,   // Food, Transport, Shopping, Entertainment, Health, Utilities, Rent, Salary, EMI, Insurance, Education, Other, or null
  "platform": string | null,   // merchant name, normalized (e.g. "Swiggy", "Netflix")
  "payment_method": string | null, // UPI, Credit Card, Debit Card, Bank Transfer, Cash, or null
  "tags": string[],            // 1-3 short meaningful tags (e.g. ["food delivery", "dinner"], ["cab", "commute"])
  "type": "EXPENSE" | "INFLOW",
  "description": string | null // Short human-readable description of the transaction (e.g. "Swiggy food delivery", "Uber ride", "Netflix subscription", "Salary credit"). Clean up the raw bank narration into something a human would write.
}

Important classification notes:
- BBPS payments received (credits) are usually credit card bill payments, NOT salary. Classify as category "EMI", type "EXPENSE" if the narration suggests bill payment.
- Large credits with narration containing "BBPS" should be flagged as EMI/bill payment, not Salary.

Return ONLY a valid JSON array. No markdown, no explanation.`

async function aiHandler(batch: RawImportRow[]): Promise<ClassifiedRow[]> {
  // AI_MOCK=true: skip real API calls and return deterministic canned responses (used in E2E tests)
  if (process.env.AI_MOCK === 'true') {
    return batch.map(row => ({
      ...row,
      category: 'Other',
      platform: null,
      payment_method: 'UPI',
      notes: null,
      tags: [],
      recurring_flag: false,
      confidence: { category: 0.75, platform: 0, payment_method: 0.75 },
      classified_by: 'AI' as const,
    }))
  }

  const input = batch.map((row, i) => ({
    index: i,
    narration: row.narration,
    amount: row.amount,
    type: row.type,
  }))

  try {
    const response = await openRouter.chat.send({
      model: 'arcee-ai/trinity-large-preview:free',
      messages: [
        { role: 'system', content: BATCH_SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(input) },
      ],
      temperature: 0.0,
      maxTokens: 2000,
      stream: false,
    })

    const content = response.choices[0]?.message?.content ?? '[]'
    const parsed = JSON.parse(typeof content === 'string' ? content : '[]') as Array<{
      category: string | null
      platform: string | null
      payment_method: string | null
      tags: string[]
      type: 'EXPENSE' | 'INFLOW'
      description: string | null
    }>

    return batch.map((row, i) => {
      const ai = parsed[i]
      if (!ai) return fallbackRow(row)
      return {
        ...row,
        category: ai.category ?? null,
        platform: ai.platform ?? null,
        payment_method: ai.payment_method ?? null,
        notes: ai.description ?? null,
        tags: ai.tags ?? [],
        type: ai.type ?? row.type,
        recurring_flag: false,
        confidence: { category: 0.75, platform: 0.7, payment_method: 0.7 },
        classified_by: 'AI' as const,
      }
    })
  } catch (err: unknown) {
    // Rethrow so BatchQueue.runWithRetry can retry the batch.
    // The service's .catch handler will mark the session FAILED and surface the error.
    // Do NOT silently fall back here — the user must know if AI classification failed.
    console.error('[AIClassificationQueue] AI classification error', {
      batchSize: batch.length,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}

function fallbackRow(row: RawImportRow): ClassifiedRow {
  return {
    ...row,
    category: null,
    platform: null,
    payment_method: null,
    notes: null,
    tags: [],
    recurring_flag: false,
    confidence: {},
    classified_by: 'RULE' as const,
  }
}

export const aiClassificationQueue = new BatchQueue<RawImportRow, ClassifiedRow>({
  batchSize: 25,
  concurrency: 2,
  retries: 2,
  backoffMs: 1000,
  timeoutMs: 20000,
  handler: aiHandler,
})

// Named export for direct use in tests / service
export { aiHandler as classifyWithAI }
