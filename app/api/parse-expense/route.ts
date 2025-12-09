import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { ParseExpenseRequest, ParseExpenseResponse, ParsedExpense, BillMatchCandidate, Bill } from '@/types'
import { getCurrentDateTimeContext, parseAIDateTime } from '@/lib/datetime'
import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

const getSystemPrompt = (currentDateTime: string) => `You are an assistant that extracts structured expense data from short free-text lines. 
Respond ONLY with valid JSON and nothing else.

IMPORTANT: ${currentDateTime}

When parsing dates:
- Relative dates like "yesterday", "today", "last week" should be calculated based on the current date/time above
- Return dates in ISO8601 format (YYYY-MM-DDTHH:mm:ss) representing the LOCAL time (not UTC)
- For relative dates, calculate from the current date/time provided above
- If no date is mentioned, return null for datetime

Keys:
- amount (number or null)
- currency (string, default "INR" if ambiguous)
- datetime (ISO8601 string in local time format YYYY-MM-DDTHH:mm:ss, or null)
- category (string or null)
- platform (string or null)
- payment_method (string or null)
- type ("EXPENSE" or "INFLOW")
- event (string or null)
- notes (string or null)
If value unknown, return null. Normalize merchant/platform names (e.g., "swiggy" -> "Swiggy").`

const examples = [
  {
    role: 'user' as const,
    content: '20 rupees chips Swiggy Kerala trip by card',
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 20,
      currency: 'INR',
      datetime: null,
      category: 'Food',
      platform: 'Swiggy',
      payment_method: 'Card',
      type: 'EXPENSE',
      event: 'Kerala trip',
      notes: 'chips',
    }),
  },
  {
    role: 'user' as const,
    content: 'Hotel booking 2500 INR Mumbai 15th Dec',
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 2500,
      currency: 'INR',
      datetime: '2024-12-15T00:00:00',
      category: 'Accommodation',
      platform: null,
      payment_method: null,
      type: 'EXPENSE',
      event: null,
      notes: 'Hotel booking Mumbai',
    }),
  },
  {
    role: 'user' as const,
    content: 'Coffee 50 yesterday morning',
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 50,
      currency: 'INR',
      datetime: null, // Will be calculated based on current date
      category: 'Food',
      platform: null,
      payment_method: null,
      type: 'EXPENSE',
      event: null,
      notes: 'Coffee yesterday morning',
    }),
  },
  {
    role: 'user' as const,
    content: 'Got salary 50000 UPI transfer',
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 50000,
      currency: 'INR',
      datetime: null,
      category: 'Income',
      platform: null,
      payment_method: 'UPI',
      type: 'INFLOW',
      event: null,
      notes: 'salary',
    }),
  },
  {
    role: 'user' as const,
    content: 'Refund 1500 Amazon order cancelled',
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 1500,
      currency: 'INR',
      datetime: null,
      category: 'Refund',
      platform: 'Amazon',
      payment_method: null,
      type: 'INFLOW',
      event: null,
      notes: 'order cancelled',
    }),
  },
  {
    role: 'user' as const,
    content: 'Coffee 120 cash Starbucks',
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 120,
      currency: 'INR',
      datetime: null,
      category: 'Food',
      platform: 'Starbucks',
      payment_method: 'Cash',
      type: 'EXPENSE',
      event: null,
      notes: 'Coffee',
    }),
  },
  {
    role: 'user' as const,
    content: 'Metro card recharge 500',
  },
  {
    role: 'assistant' as const,
    content: JSON.stringify({
      amount: 500,
      currency: 'INR',
      datetime: null,
      category: 'Transport',
      platform: null,
      payment_method: null,
      type: 'EXPENSE',
      event: null,
      notes: 'Metro card recharge',
    }),
  },
]

export async function POST(request: NextRequest) {
  try {
    const { text }: ParseExpenseRequest = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    const currentDateTime = getCurrentDateTimeContext()
    const systemPrompt = getSystemPrompt(currentDateTime)

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...examples,
      { role: 'user' as const, content: text },
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.0,
      max_tokens: 500,
    })

    const rawModelOutput = completion.choices[0]?.message?.content || ''

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

    return NextResponse.json({
      parsed,
      raw_model_output: rawModelOutput,
      bill_match: billMatch,
    } as ParseExpenseResponse)
  } catch (error) {
    console.error('OpenAI API error:', error)
    return NextResponse.json({ error: 'Failed to parse expense' }, { status: 500 })
  }
}

