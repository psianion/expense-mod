// server/import/ai-row-extractor.ts
import { openRouter } from '@server/ai/providers/openrouter'
import type { RawImportRow } from '@/types/import'

const SYSTEM_PROMPT = `You are a bank statement parser. Extract all financial transactions from the raw text of a bank statement PDF.

Return a JSON array where each element has:
- "date": string in "YYYY-MM-DD" format
- "amount": positive number (no sign, no commas)
- "type": "EXPENSE" (debit/withdrawal) or "INFLOW" (credit/deposit)
- "narration": transaction description exactly as shown

Rules:
- Skip: opening balance, closing balance, statement headers, account info, interest/GST/amortization charges, and any row without a clear date and amount
- Determining debit vs credit:
  - If the amount has a "CR" suffix → INFLOW (credit/deposit)
  - If the amount has a "DR" suffix or no suffix → EXPENSE (debit/withdrawal)
  - If there are separate Debit and Credit columns, use the column the amount appears in
  - "BBPS Payment received" with CR suffix is a bill payment credit → INFLOW
  - Salary, refund, cashback credits → INFLOW
  - All purchases, charges, fees → EXPENSE
- Return ONLY a valid JSON array — no markdown, no explanation`

interface AiTransaction {
  date: string | null
  amount: number | null
  type: 'EXPENSE' | 'INFLOW'
  narration: string
}

/**
 * Scan the raw PDF text for an amount followed by "CR" or "DR" suffix.
 * Indian bank/credit card statements use these suffixes to mark credits and debits.
 * Returns null if no suffix found (let AI decide).
 */
function detectTypeFromText(text: string, amount: number, _narration: string): 'EXPENSE' | 'INFLOW' | null {
  // Format amount variants: "32,459.10", "32459.10", "32459.1"
  const amtStr = amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })
  const amtPlain = String(amount)

  for (const variant of [amtStr, amtPlain]) {
    // Look for amount followed by optional whitespace and CR/DR
    const crPattern = new RegExp(variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*CR\\b', 'i')
    const drPattern = new RegExp(variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*DR\\b', 'i')
    if (crPattern.test(text)) return 'INFLOW'
    if (drPattern.test(text)) return 'EXPENSE'
  }
  return null
}

export async function extractRowsFromText(text: string): Promise<RawImportRow[]> {
  const response = await openRouter.chat.send({
    model: 'arcee-ai/trinity-large-preview:free',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    temperature: 0.0,
    maxTokens: 8000,
    stream: false,
  })

  const content = response.choices[0]?.message?.content ?? '[]'
  const raw = typeof content === 'string' ? content : '[]'

  // Strip markdown fences if model wraps with ```json
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  const parsed: AiTransaction[] = JSON.parse(cleaned)

  return parsed
    .filter(tx => tx.date && tx.amount != null && tx.amount > 0)
    .map(tx => {
      // Deterministic override: check if the original text has "CR" near this amount.
      // The AI model sometimes misses CR/DR suffixes. We look in the raw PDF text
      // for the amount followed by "CR" to reliably detect credits/inflows.
      const type = detectTypeFromText(text, tx.amount!, tx.narration) ?? tx.type
      return {
        raw_data: {
          date: tx.date!,
          narration: tx.narration,
          amount: String(tx.amount),
          type,
        },
        amount: tx.amount!,
        datetime: `${tx.date}T00:00:00`,
        type,
        narration: tx.narration,
      }
    })
}
