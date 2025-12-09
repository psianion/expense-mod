import { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'

import { supabase } from '../../lib/supabaseClient'
import { Bill, BillType, BillFrequency } from '../../types'

const billTypes: [BillType, ...BillType[]] = ['BILL', 'EMI', 'CREDITCARD', 'SUBSCRIPTION', 'SALARY', 'INCOME']
const billFrequencies: [BillFrequency, ...BillFrequency[]] = ['MONTHLY', 'WEEKLY', 'YEARLY']

const normalizeBill = (bill: any): Bill => ({
  ...bill,
  type: (bill?.type?.toUpperCase?.() as BillType) ?? bill?.type,
  frequency: (bill?.frequency?.toUpperCase?.() as BillFrequency) ?? bill?.frequency,
})

const billSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  type: z.enum(billTypes),
  frequency: z.enum(billFrequencies),
  day_of_month: z.number().int().min(1).max(28).nullable().optional(),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  amount: z.number().nonnegative().nullable().optional(),
  auto_post: z.boolean().default(false),
  notes: z.string().nullable().optional(),
})
  .refine(
    (value) => value.frequency !== 'MONTHLY' || value.day_of_month !== undefined && value.day_of_month !== null,
    { message: 'day_of_month is required for monthly frequency', path: ['day_of_month'] }
  )
  .refine(
    (value) => value.frequency !== 'WEEKLY' || value.day_of_week !== undefined && value.day_of_week !== null,
    { message: 'day_of_week is required for weekly frequency', path: ['day_of_week'] }
  )

const parseBillPayload = (input: any) => {
  const parsed = billSchema.parse({
    ...input,
    type: typeof input.type === 'string' ? input.type.toUpperCase() : input.type,
    frequency: typeof input.frequency === 'string' ? input.frequency.toUpperCase() : input.frequency,
  })

  return {
    ...parsed,
    day_of_month: parsed.day_of_month ?? null,
    day_of_week: parsed.day_of_week ?? null,
    start_date: parsed.start_date || null,
    end_date: parsed.end_date || null,
    amount: parsed.amount ?? null,
    notes: parsed.notes ?? null,
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ error: string } | { bills: Bill[] } | { bill: Bill }>
) {
  if (req.method === 'GET') {
    const typeFilter = (req.query.type as string | undefined)
      ?.split(',')
      .filter(Boolean)
      .map((value) => value.toUpperCase())
    let query = supabase.from('bills').select('*').order('created_at', { ascending: false })
    if (typeFilter && typeFilter.length > 0) {
      query = query.in('type', typeFilter)
    }

    const { data, error } = await query
    if (error) {
      return res.status(500).json({ error: error.message })
    }

    const normalized = (data || []).map(normalizeBill)
    return res.status(200).json({ bills: normalized as Bill[] })
  }

  if (req.method === 'POST') {
    try {
      const payload = parseBillPayload(req.body)
      const { data, error } = await supabase
        .from('bills')
        .insert([
          {
            ...payload,
            user_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ bill: normalizeBill(data) as Bill })
    } catch (err: any) {
      const message = err?.issues?.[0]?.message || err.message || 'Invalid payload'
      return res.status(400).json({ error: message })
    }
  }

  if (req.method === 'PUT') {
    try {
      const payload = parseBillPayload(req.body)
      if (!payload.id) {
        return res.status(400).json({ error: 'Bill id is required for update' })
      }

      const { data, error } = await supabase
        .from('bills')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.id)
        .select()
        .single()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json({ bill: normalizeBill(data) as Bill })
    } catch (err: any) {
      const message = err?.issues?.[0]?.message || err.message || 'Invalid payload'
      return res.status(400).json({ error: message })
    }
  }

  if (req.method === 'DELETE') {
    const id = req.query.id as string | undefined
    if (!id) {
      return res.status(400).json({ error: 'Bill id is required' })
    }

    const { error } = await supabase.from('bills').delete().eq('id', id)
    if (error) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ bill: { id } as Bill })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

