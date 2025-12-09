import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

import { supabase } from '../../lib/supabaseClient'
import { BillInstance, Bill } from '../../types'
import { buildExpensePayload, computeDueDateForPeriod, createInstanceRecord, findInstanceForPeriod } from '../../lib/recurring'
import dayjs from 'dayjs'

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
  const { data, error } = await supabase
    .from('bill_instances')
    .select('*, bill:bills(*)')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeInstance(data) as BillInstance & { bill: Bill }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ error: string } | { instances: BillInstance[] } | { instance: BillInstance }>
) {
  if (req.method === 'GET') {
    const statusFilterInput = (req.query.status as string | undefined)
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
      return res.status(500).json({ error: error.message })
    }

    const normalized = (data || []).map(normalizeInstance)
    return res.status(200).json({ instances: normalized as BillInstance[] })
  }

  if (req.method === 'POST') {
    try {
      const payload = createSchema.parse(req.body)
      const { data: bill, error: billError } = await supabase.from('bills').select('*').eq('id', payload.billId).single()
      if (billError || !bill) {
        return res.status(404).json({ error: billError?.message || 'Bill not found' })
      }

      const normalizedBill = normalizeBill(bill)
      const existing = await findInstanceForPeriod(normalizedBill, normalizedBill.frequency, dayjs())
      if (existing) {
        return res.status(409).json({ error: 'Instance already exists for current period' })
      }

      const dueDate = payload.due_date && dayjs(payload.due_date).isValid()
        ? dayjs(payload.due_date)
        : computeDueDateForPeriod(normalizedBill, dayjs())
      const lastAmount = await fetchLastInstanceAmount(normalizedBill.id)
      const amount = payload.amount ?? normalizedBill.amount ?? lastAmount ?? 0

      const created = await createInstanceRecord(normalizedBill, dueDate, {
        amount,
        status: 'DUE',
      })

      if (!created) {
        return res.status(500).json({ error: 'Failed to create bill instance' })
      }

      const { data: instanceWithBill } = await supabase
        .from('bill_instances')
        .select('*, bill:bills(*)')
        .eq('id', created.id)
        .single()

      const instance = normalizeInstance(instanceWithBill ?? created)
      return res.status(200).json({ instance })
    } catch (err: any) {
      const message = err?.issues?.[0]?.message || err.message || 'Invalid payload'
      return res.status(400).json({ error: message })
    }
  }

  if (req.method === 'PATCH') {
    try {
      const parsed = updateSchema.parse(req.body)
      const instance = await fetchInstanceWithBill(parsed.id)

      if (!instance?.bill) {
        return res.status(404).json({ error: 'Bill not found for instance' })
      }

      if (parsed.action === 'skip') {
        const { data, error } = await supabase
          .from('bill_instances')
          .update({ status: 'SKIPPED' })
          .eq('id', parsed.id)
          .select()
          .single()

        if (error) {
          return res.status(500).json({ error: error.message })
        }

        return res.status(200).json({ instance: normalizeInstance(data) })
      }

      if (parsed.action === 'update') {
        const { data, error } = await supabase
          .from('bill_instances')
          .update({ amount: parsed.amount })
          .eq('id', parsed.id)
          .select()
          .single()

        if (error) {
          return res.status(500).json({ error: error.message })
        }

        return res.status(200).json({ instance: normalizeInstance(data) })
      }

      // confirm
      const amount = parsed.amount ?? instance.amount
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Amount is required to confirm' })
      }

      const expensePayload = buildExpensePayload(instance.bill, instance, amount)
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert([expensePayload])
        .select()
        .single()

      if (expenseError) {
        return res.status(500).json({ error: expenseError.message })
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
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ instance: normalizeInstance(data) })
    } catch (err: any) {
      const message = err?.issues?.[0]?.message || err.message || 'Invalid payload'
      return res.status(400).json({ error: message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

