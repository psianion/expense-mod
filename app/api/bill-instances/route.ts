import { NextRequest } from 'next/server'
import { successResponse, withApiHandler } from '../middleware'
import { createServiceLogger } from '@/server/lib/logger'
import { z } from 'zod'
import dayjs from 'dayjs'
import { getServiceRoleClientIfAvailable, supabase, DB_UNAVAILABLE_MESSAGE } from '@server/db/supabase'
import { requireAuth } from '@server/auth/context'
import type { SupabaseClient } from '@supabase/supabase-js'
import { BillInstance, Bill } from '@/types'
import { buildExpensePayload, computeDueDateForPeriod, createInstanceRecord, findInstanceForPeriod } from '@/lib/recurring'

export const dynamic = 'force-dynamic'

const log = createServiceLogger('BillInstancesRoute')

function getClient(user: { userId: string; isMaster: boolean }): { client: SupabaseClient; userId: string | undefined } {
  const client = getServiceRoleClientIfAvailable() ?? supabase
  return { client, userId: user.isMaster ? undefined : user.userId }
}

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

const fetchLastInstanceAmount = async (
  client: SupabaseClient,
  billId: string,
  userId?: string
): Promise<number | null> => {
  let q = client.from('bill_instances').select('amount').eq('bill_id', billId).order('due_date', { ascending: false }).limit(1)
  if (userId) q = q.eq('user_id', userId)
  const { data, error } = await q.single()

  if (error && error.code !== 'PGRST116') {
    log.error({ method: 'fetchLastInstanceAmount', billId, err: error }, 'Error fetching last bill instance')
  }

  return data?.amount ?? null
}

const fetchInstanceWithBill = async (client: SupabaseClient, id: string, userId?: string) => {
  let q = client.from('bill_instances').select('*, bill:bills(*)').eq('id', id)
  if (userId) q = q.eq('user_id', userId)
  const { data, error } = await q.single()

  if (error) {
    throwOnSupabaseError(error)
  }

  return normalizeInstance(data) as BillInstance & { bill: Bill }
}

export const GET = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request)
  const { client, userId } = getClient(user)
  const statusFilterInput = request.nextUrl.searchParams
    .get('status')
    ?.split(',')
    .map((value) => value?.toString?.().toUpperCase())
    .filter((value) => value && value !== 'ALL')
  const statusFilter = statusFilterInput as BillInstance['status'][] | undefined
  let query = client.from('bill_instances').select('*, bill:bills(*)').order('due_date', { ascending: true })
  if (userId) query = query.eq('user_id', userId)
  if (statusFilter && statusFilter.length > 0) {
    query = query.in('status', statusFilter)
  }

  const { data, error } = await query
  if (error) throwOnSupabaseError(error)

  const normalized = (data || []).map(normalizeInstance)
  return successResponse({ instances: normalized as BillInstance[] })
})

export const POST = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request)
  const { client, userId } = getClient(user)
  const payload = createSchema.parse(await request.json())
  let billQ = client.from('bills').select('*').eq('id', payload.billId)
  if (userId) billQ = billQ.eq('user_id', userId)
  const { data: bill, error: billError } = await billQ.single()
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
  const lastAmount = await fetchLastInstanceAmount(client, normalizedBill.id, userId ?? undefined)
  const amount = payload.amount ?? normalizedBill.amount ?? lastAmount ?? 0

  const created = await createInstanceRecord(normalizedBill, dueDate, {
    amount,
    status: 'DUE',
    user_id: userId ?? null,
  })

  if (!created) {
    throw new Error('Failed to create bill instance')
  }

  let instanceQ = client.from('bill_instances').select('*, bill:bills(*)').eq('id', created.id)
  if (userId) instanceQ = instanceQ.eq('user_id', userId)
  const { data: instanceWithBill } = await instanceQ.single()

  const instance = normalizeInstance(instanceWithBill ?? created)
  return successResponse({ instance })
})

export const PATCH = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request)
  const { client, userId } = getClient(user)
  const parsed = updateSchema.parse(await request.json())
  const instance = await fetchInstanceWithBill(client, parsed.id, userId ?? undefined)

  if (!instance?.bill) {
    throw new Error('Bill not found for instance')
  }

  if (parsed.action === 'skip') {
    let q = client.from('bill_instances').update({ status: 'SKIPPED' }).eq('id', parsed.id)
    if (userId) q = q.eq('user_id', userId)
    const { data, error } = await q.select().single()

    if (error) throwOnSupabaseError(error)

    return successResponse({ instance: normalizeInstance(data) })
  }

  if (parsed.action === 'update') {
    let q = client.from('bill_instances').update({ amount: parsed.amount }).eq('id', parsed.id)
    if (userId) q = q.eq('user_id', userId)
    const { data, error } = await q.select().single()

    if (error) throwOnSupabaseError(error)

    return successResponse({ instance: normalizeInstance(data) })
  }

  const amount = parsed.amount ?? instance.amount
  if (!amount || amount <= 0) {
    throw new Error('Amount is required to confirm')
  }

  const expensePayload = { ...buildExpensePayload(instance.bill, instance, amount), user_id: user.userId }
  const { data: expense, error: expenseError } = await client
    .from('expenses')
    .insert([expensePayload])
    .select()
    .single()

  if (expenseError) throwOnSupabaseError(expenseError)

  let updateQ = client
    .from('bill_instances')
    .update({
      amount,
      status: 'PAID',
      posted_expense_id: expense?.id,
    })
    .eq('id', parsed.id)
  if (userId) updateQ = updateQ.eq('user_id', userId)
  const { data, error } = await updateQ.select().single()

  if (error) throwOnSupabaseError(error)

  return successResponse({ instance: normalizeInstance(data) })
})
