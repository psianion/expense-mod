import { ParsedExpense, BillMatchCandidate, Bill } from '@/types'
import { supabase } from '../../db/supabase'
import { openRouter, expenseSchema, getExpenseParsingSystemPrompt, expenseParsingExamples } from '../providers/openrouter'
import { postProcessParsedExpense } from './postProcessor'

const keywordBuckets: Record<string, string[]> = {
  rent: ['rent', 'rental', 'house', 'flat', 'apartment'],
  electricity: ['electricity', 'power', 'eb bill'],
  wifi: ['wifi', 'internet', 'broadband'],
  salary: ['salary', 'payroll', 'pay cheque', 'paycheck', 'paycheque'],
  emi: ['emi', 'loan', 'installment', 'instalment'],
  card: ['card', 'credit card'],
  maid: ['maid', 'househelp', 'house help', 'helper'],
}

const computeMatchScore = (bill: Bill, haystack: string, parsedType?: ParsedExpense['type']): number => {
  const name = bill.name?.toLowerCase?.() || ''
  const billType = bill.type?.toString?.().toUpperCase()
  let score = 0
  if (name && haystack.includes(name)) score += 3

  const bucketKeys = Object.keys(keywordBuckets)
  for (const key of bucketKeys) {
    const keywords = keywordBuckets[key]
    if (keywords.some((kw) => name.includes(kw) || haystack.includes(kw))) {
      score += 2
    }
  }

  if (billType === 'SALARY' && haystack.includes('salary')) score += 2
  if (billType === 'INCOME' && haystack.includes('income')) score += 1
  if (parsedType === 'INFLOW' && (billType === 'SALARY' || billType === 'INCOME')) score += 2
  return score
}

const detectBillMatch = async (text: string, parsed: ParsedExpense): Promise<BillMatchCandidate | null> => {
  const haystack = `${text} ${parsed.tags.join(' ')}`.toLowerCase()
  const { data: bills, error } = await supabase.from('bills').select('id,name,type')
  if (error || !bills) {
    return null
  }

  let best: { bill: Bill; score: number } | null = null
  for (const bill of bills as Bill[]) {
    const score = computeMatchScore(bill, haystack, parsed.type)
    if (!best || score > best.score) {
      best = { bill, score }
    }
  }

  if (!best || best.score < 2) {
    return null
  }

  return { bill_id: best.bill.id, bill_name: best.bill.name, bill_type: best.bill.type }
}

export interface ParseExpenseResult {
  parsed: ParsedExpense
  raw_model_output: string
  bill_match?: BillMatchCandidate | null
}

export async function parseExpense(text: string): Promise<ParseExpenseResult> {
  // Import datetime function here to avoid circular imports
  const { getCurrentDateTimeContext } = await import('@/lib/datetime')

  const currentDateTime = getCurrentDateTimeContext()
  const systemPrompt = getExpenseParsingSystemPrompt(currentDateTime)

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...expenseParsingExamples,
    { role: 'user' as const, content: text },
  ]

  const response = await openRouter.chat.send({
    model: 'mistralai/devstral-2512:free',
    messages,
    temperature: 0.0,
    maxTokens: 500,
    responseFormat: {
      type: 'json_schema',
      jsonSchema: {
        name: 'expense',
        strict: true,
        schema: expenseSchema,
      },
    },
    stream: false,
  })

  const rawModelOutput = typeof response.choices[0]?.message?.content === 'string'
    ? response.choices[0]?.message?.content
    : ''

  const parsed = postProcessParsedExpense(text, rawModelOutput)

  const billMatch = await detectBillMatch(text, parsed)

  return {
    parsed,
    raw_model_output: rawModelOutput,
    bill_match: billMatch,
  }
}
