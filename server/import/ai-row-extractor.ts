// server/import/ai-row-extractor.ts
import { openRouter } from '@server/ai/providers/openrouter'
import type { RawImportRow } from '@/types/import'

const SYSTEM_PROMPT = `You are a bank statement parser. Extract all financial transactions from the raw text of a bank statement PDF.

Return a JSON array where each element has:
- "date": string in "YYYY-MM-DD" format
- "amount": positive number (no sign)
- "type": "EXPENSE" (debit/withdrawal) or "INFLOW" (credit/deposit)
- "narration": transaction description exactly as shown

Rules:
- Skip: opening balance, closing balance, statement headers, account info, and any row without a clear date and amount
- Debits / withdrawals are EXPENSE; credits / deposits are INFLOW
- Return ONLY a valid JSON array — no markdown, no explanation`

interface AiTransaction {
  date: string | null
  amount: number | null
  type: 'EXPENSE' | 'INFLOW'
  narration: string
}

export async function extractRowsFromText(text: string): Promise<RawImportRow[]> {
  const response = await openRouter.chat.send({
    model: 'mistralai/devstral-2512:free',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    temperature: 0.0,
    maxTokens: 4000,
    stream: false,
  })

  const content = response.choices[0]?.message?.content ?? '[]'
  const raw = typeof content === 'string' ? content : '[]'

  // Strip markdown fences if model wraps with ```json
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  const parsed: AiTransaction[] = JSON.parse(cleaned)

  return parsed
    .filter(tx => tx.date && tx.amount != null && tx.amount > 0)
    .map(tx => ({
      raw_data: {
        date: tx.date!,
        narration: tx.narration,
        amount: String(tx.amount),
        type: tx.type,
      },
      amount: tx.amount!,
      datetime: `${tx.date}T00:00:00`,
      type: tx.type,
      narration: tx.narration,
    }))
}
