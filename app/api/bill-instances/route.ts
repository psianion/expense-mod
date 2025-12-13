import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import dayjs from 'dayjs'

import { supabase } from '@server/db/supabase'
import { BillInstance, Bill } from '../../../types'
import { buildExpensePayload, computeDueDateForPeriod, createInstanceRecord, findInstanceForPeriod } from '@/lib/recurring'

export const dynamic = 'force-dynamic'

const normalizeBill = (bill: any): Bill => ({
  ...bill,
  type: (bill?.type?.toUpperCase?.() as Bill['type']) ?? bill?.type,
  frequency: (bill?.frequency?.toUpperCase?.() as Bill['frequency']) ?? bill?.frequency,
})

const normalizeInstance = (instance: any): BillInstance => {
  const status = (instance?.status?.toUpperCase?.() as BillInstance['status']) || 'DUE'
  return {
    ...instance,
    status,
    bill: instance?.bill ? normalizeBill(instance.bill) : instance?.bill,
  }
}

const updateSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('confirm'),
    id: z.string().uuid(),
    amount: z.number().positive().optional(),
  }),
  z.object({
    action: z.literal('skip'),
    id: z.string().uuid(),
  }),
  z.object({
    action: z.literal('update'),
    id: z.string().uuid(),
    amount: z.number().positive(),
  }),
])

const createSchema = z.object({
  billId: z.string().uuid(),
  amount: z.number().positive().optional(),
  due_date: z.string().optional(),
})

const fetchLastInstanceAmount = async (billId: string): Promise<number | null> => {
  const { data, error } = await supabase
    .from('bill_instances')
    .select('amount')
    .eq('bill_id', billId)
    .order('due_date', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching last bill instance', error)
  }

  return data?.amount ?? null
}

const fetchInstanceWithBill = async (id: string) => {
  const { data, error } = await supabase.from('bill_instances').select('*, bill:bills(*)').eq('id', id).single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeInstance(data) as BillInstance & { bill: Bill }
}

export async function GET(request: NextRequest) {
  const statusFilterInput = request.nextUrl.searchParams
    .get('status')
    ?.split(',')
    .map((value) => value?.toString?.().toUpperCase())
    .filter((value) => value && value !== 'ALL')
  const statusFilter = statusFilterInput as BillInstance['status'][] | undefined
  let query = supabase.from('bill_instances').select('*, bill:bills(*)').order('due_date', { ascending: true })
  if (statusFilter && statusFilter.length > 0) {
    query = query.in('status', statusFilter)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const normalized = (data || []).map(normalizeInstance)
  return NextResponse.json({ instances: normalized as BillInstance[] })
}

export async function POST(request: NextRequest) {
  try {
    const payload = createSchema.parse(await request.json())
    const { data: bill, error: billError } = await supabase.from('bills').select('*').eq('id', payload.billId).single()
    if (billError || !bill) {
      return NextResponse.json({ error: billError?.message || 'Bill not found' }, { status: 404 })
    }

    const normalizedBill = normalizeBill(bill)
    const existing = await findInstanceForPeriod(normalizedBill, normalizedBill.frequency, dayjs())
    if (existing) {
      return NextResponse.json({ error: 'Instance already exists for current period' }, { status: 409 })
    }

    const dueDate =
      payload.due_date && dayjs(payload.due_date).isValid()
        ? dayjs(payload.due_date)
        : computeDueDateForPeriod(normalizedBill, dayjs())
    const lastAmount = await fetchLastInstanceAmount(normalizedBill.id)
    const amount = payload.amount ?? normalizedBill.amount ?? lastAmount ?? 0

    const created = await createInstanceRecord(normalizedBill, dueDate, {
      amount,
      status: 'DUE',
    })

    if (!created) {
      return NextResponse.json({ error: 'Failed to create bill instance' }, { status: 500 })
    }

    const { data: instanceWithBill } = await supabase
      .from('bill_instances')
      .select('*, bill:bills(*)')
      .eq('id', created.id)
      .single()

    const instance = normalizeInstance(instanceWithBill ?? created)
    return NextResponse.json({ instance })
  } catch (err: any) {
    const message = err?.issues?.[0]?.message || err.message || 'Invalid payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const parsed = updateSchema.parse(await request.json())
    const instance = await fetchInstanceWithBill(parsed.id)

    if (!instance?.bill) {
      return NextResponse.json({ error: 'Bill not found for instance' }, { status: 404 })
    }

    if (parsed.action === 'skip') {
      const { data, error } = await supabase
        .from('bill_instances')
        .update({ status: 'SKIPPED' })
        .eq('id', parsed.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ instance: normalizeInstance(data) })
    }

    if (parsed.action === 'update') {
      const { data, error } = await supabase
        .from('bill_instances')
        .update({ amount: parsed.amount })
        .eq('id', parsed.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ instance: normalizeInstance(data) })
    }

    const amount = parsed.amount ?? instance.amount
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Amount is required to confirm' }, { status: 400 })
    }

    const expensePayload = buildExpensePayload(instance.bill, instance, amount)
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert([expensePayload])
      .select()
      .single()

    if (expenseError) {
      return NextResponse.json({ error: expenseError.message }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('bill_instances')
      .update({
        amount,
        status: 'PAID',
        posted_expense_id: expense?.id,
      })
      .eq('id', parsed.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ instance: normalizeInstance(data) })
  } catch (err: any) {
    const message = err?.issues?.[0]?.message || err.message || 'Invalid payload'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

