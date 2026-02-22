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
  "tags": string[],
  "type": "EXPENSE" | "INFLOW"
}

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
      model: 'mistralai/devstral-2512:free',
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
    }>

    return batch.map((row, i) => {
      const ai = parsed[i]
      if (!ai) return fallbackRow(row)
      return {
        ...row,
        category: ai.category ?? null,
        platform: ai.platform ?? null,
        payment_method: ai.payment_method ?? null,
        notes: null,
        tags: ai.tags ?? [],
        recurring_flag: false,
        confidence: { category: 0.75, platform: 0.7, payment_method: 0.7 },
        classified_by: 'AI' as const,
      }
    })
  } catch {
    return batch.map(fallbackRow)
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
    classified_by: 'AI' as const,
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
