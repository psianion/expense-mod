import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import dayjs from 'dayjs'

import { supabase } from '@/lib/supabaseClient'
import { Bill, BillMatchCandidate, BillType } from '@/types'
import { toUTC, getLocalISO } from '@/lib/datetime'
import { billToExpenseType, findInstanceForPeriod } from '@/lib/recurring'

export const dynamic = 'force-dynamic'

const billTypes: [BillType, ...BillType[]] = ['BILL', 'EMI', 'CREDITCARD', 'SUBSCRIPTION', 'SALARY', 'INCOME']

const normalizeBill = (bill: any): Bill => ({
  ...bill,
  type: (bill?.type?.toUpperCase?.() as Bill['type']) ?? bill?.type,
  frequency: (bill?.frequency?.toUpperCase?.() as Bill['frequency']) ?? bill?.frequency,
})

const expenseSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().min(1),
  datetime: z.string().optional(),
  category: z.string().nullable().optional(),
  platform: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
  type: z.enum(['EXPENSE', 'INFLOW']).default('EXPENSE'),
  event: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

const billMatchSchema = z
  .object({
    bill_id: z.string().uuid().optional(),
    bill_name: z.string().optional(),
    bill_type: z.enum(billTypes).optional(),
  })
  .optional()

const requestSchema = z.object({
  expense: expenseSchema,
  source: z.enum(['AI', 'MANUAL']).default('AI'),
  billMatch: billMatchSchema,
  raw_text: z.string().nullable().optional(),
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

const computeBillMatchScore = (bill: Bill, haystack: string): number => {
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
  return score
}

const findBestBill = (bills: Bill[], haystack: string, hint?: BillMatchCandidate | null): Bill | null => {
  if (hint?.bill_id) {
    const byId = bills.find((bill) => bill.id === hint.bill_id)
    if (byId) return byId
  }

  if (hint?.bill_name) {
    const byName = bills.find((bill) => bill.name.toLowerCase() === hint.bill_name?.toLowerCase())
    if (byName) return byName
  }

  let best: { bill: Bill; score: number } | null = null
  for (const bill of bills) {
    const score = computeBillMatchScore(bill, haystack)
    if (!best || score > best.score) {
      best = { bill, score }
    }
  }

  if (!best || best.score < 2) return null
  return best.bill
}

export async function POST(request: NextRequest) {
  try {
    const parsed = requestSchema.parse(await request.json())
    const expenseInput = parsed.expense
    const billHint: BillMatchCandidate | null = parsed.billMatch ?? null
    const source = parsed.source

    const datetimeLocal = expenseInput.datetime || getLocalISO()
    const utcDateTime = toUTC(datetimeLocal)

    const { data: billsData, error: billsError } = await supabase.from('bills').select('*')
    if (billsError) {
      return NextResponse.json({ error: billsError.message }, { status: 500 })
    }

    const normalizedBills = (billsData || []).map(normalizeBill)
    const haystack = `${expenseInput.event || ''} ${expenseInput.notes || ''} ${parsed.raw_text || ''}`.toLowerCase()
    const matchedBill = findBestBill(normalizedBills, haystack, billHint)

    let matchedInstanceId: string | null = null
    if (matchedBill) {
      const instance = await findInstanceForPeriod(matchedBill, matchedBill.frequency, dayjs())
      if (instance) {
        matchedInstanceId = instance.id
      }
    }

    const expenseType = matchedBill ? billToExpenseType(matchedBill.type) : (expenseInput.type as 'EXPENSE' | 'INFLOW')

    const expensePayload = {
      user_id: null,
      amount: expenseInput.amount,
      currency: expenseInput.currency || 'INR',
      datetime: utcDateTime,
      category: expenseInput.category,
      platform: expenseInput.platform,
      payment_method: expenseInput.payment_method,
      type: expenseType,
      event: expenseInput.event ?? matchedBill?.name ?? null,
      notes: expenseInput.notes,
      parsed_by_ai: source === 'AI',
      raw_text: parsed.raw_text ?? null,
      source,
      bill_instance_id: matchedInstanceId,
    }

    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert([expensePayload])
      .select()
      .single()

    if (expenseError) {
      return NextResponse.json({ error: expenseError.message }, { status: 500 })
    }

    if (matchedInstanceId) {
      await supabase
        .from('bill_instances')
        .update({
          status: 'PAID',
          posted_expense_id: expense.id,
          amount: expenseInput.amount,
        })
        .eq('id', matchedInstanceId)
    }

    return NextResponse.json({ expense, matchedInstanceId })
  } catch (err: any) {
    const message = err?.issues?.[0]?.message || err.message || 'Invalid payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

