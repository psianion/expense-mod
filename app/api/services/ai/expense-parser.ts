import { ParsedExpense, BillMatchCandidate, Bill } from '@/types'
import { parseAIDateTime } from '@/lib/datetime'
import { supabase } from '@/lib/supabaseClient'
import { openRouter, expenseSchema, getExpenseParsingSystemPrompt, expenseParsingExamples } from './client'

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
  const haystack = `${text} ${parsed.event || ''} ${parsed.notes || ''}`.toLowerCase()
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

  let parsed: ParsedExpense
  try {
    parsed = JSON.parse(rawModelOutput)
  } catch (parseError) {
    const amountMatch = text.match(/(\d+(?:\.\d+)?)/)
    parsed = {
      amount: amountMatch ? parseFloat(amountMatch[1]) : null,
      currency: 'INR',
      datetime: null,
      category: null,
      platform: null,
      payment_method: null,
      type: 'EXPENSE',
      event: null,
      notes: text,
    }
  }

  if (!parsed.amount) {
    const amountMatch = text.match(/(\d+(?:\.\d+)?)/)
    if (amountMatch) {
      parsed.amount = parseFloat(amountMatch[1])
    }
  }

  if (!parsed.currency) {
    parsed.currency = 'INR'
  }

  parsed.type = (parsed.type || 'EXPENSE').toString().toUpperCase() as ParsedExpense['type']

  if (!parsed.datetime) {
    const lowerText = text.toLowerCase()
    const now = new Date()

    if (lowerText.includes('yesterday')) {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      parsed.datetime = parseAIDateTime(null, yesterday)
    } else if (lowerText.includes('today') || lowerText.includes('this morning') || lowerText.includes('this afternoon')) {
      parsed.datetime = parseAIDateTime(null, now)
    } else if (lowerText.includes('last week')) {
      const lastWeek = new Date(now)
      lastWeek.setDate(lastWeek.getDate() - 7)
      parsed.datetime = parseAIDateTime(null, lastWeek)
    }
  } else {
    parsed.datetime = parseAIDateTime(parsed.datetime, new Date())
  }

  const billMatch = await detectBillMatch(text, parsed)

  return {
    parsed,
    raw_model_output: rawModelOutput,
    bill_match: billMatch,
  }
}
