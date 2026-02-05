import { NextRequest, NextResponse } from 'next/server'
import { successResponse, handleApiError } from '../middleware'
import { z } from 'zod'
import dayjs from 'dayjs'

import { supabase, DB_UNAVAILABLE_MESSAGE } from '@server/db/supabase'
import { BillInstance, Bill } from '@/types'
import { buildExpensePayload, computeDueDateForPeriod, createInstanceRecord, findInstanceForPeriod } from '@/lib/recurring'

export const dynamic = 'force-dynamic'

function throwOnSupabaseError(error: { message?: string; name?: string }): never {
  const msg = error.message ?? ''
  if (msg === 'fetch failed' || (error.name === 'TypeError' && msg.includes('fetch'))) {
    throw new Error(DB_UNAVAILABLE_MESSAGE)
  }
  throw new Error(msg)
}

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
    throwOnSupabaseError(error)
  }

  return normalizeInstance(data) as BillInstance & { bill: Bill }
}

export async function GET(request: NextRequest) {
  try {
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
    if (error) throwOnSupabaseError(error)

    const normalized = (data || []).map(normalizeInstance)
    return successResponse({ instances: normalized as BillInstance[] })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = createSchema.parse(await request.json())
    const { data: bill, error: billError } = await supabase.from('bills').select('*').eq('id', payload.billId).single()
    if (billError || !bill) {
      throw new Error(billError?.message || 'Bill not found')
    }

    const normalizedBill = normalizeBill(bill)
    const existing = await findInstanceForPeriod(normalizedBill, normalizedBill.frequency, dayjs())
    if (existing) {
      const error = new Error('Instance already exists for current period')
      ;(error as any).status = 409
      throw error
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
      throw new Error('Failed to create bill instance')
    }

    const { data: instanceWithBill } = await supabase
      .from('bill_instances')
      .select('*, bill:bills(*)')
      .eq('id', created.id)
      .single()

    const instance = normalizeInstance(instanceWithBill ?? created)
    return successResponse({ instance })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const parsed = updateSchema.parse(await request.json())
    const instance = await fetchInstanceWithBill(parsed.id)

    if (!instance?.bill) {
      throw new Error('Bill not found for instance')
    }

    if (parsed.action === 'skip') {
      const { data, error } = await supabase
        .from('bill_instances')
        .update({ status: 'SKIPPED' })
        .eq('id', parsed.id)
        .select()
        .single()

      if (error) throwOnSupabaseError(error)

      return successResponse({ instance: normalizeInstance(data) })
    }

    if (parsed.action === 'update') {
      const { data, error } = await supabase
        .from('bill_instances')
        .update({ amount: parsed.amount })
        .eq('id', parsed.id)
        .select()
        .single()

      if (error) throwOnSupabaseError(error)

      return successResponse({ instance: normalizeInstance(data) })
    }

    const amount = parsed.amount ?? instance.amount
    if (!amount || amount <= 0) {
      throw new Error('Amount is required to confirm')
    }

    const expensePayload = buildExpensePayload(instance.bill, instance, amount)
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert([expensePayload])
      .select()
      .single()

    if (expenseError) throwOnSupabaseError(expenseError)

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

    if (error) throwOnSupabaseError(error)

    return successResponse({ instance: normalizeInstance(data) })
  } catch (error) {
    return handleApiError(error)
  }
}

