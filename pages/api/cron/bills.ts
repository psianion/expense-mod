import { NextApiRequest, NextApiResponse } from 'next'
import dayjs from 'dayjs'

import { supabase } from '../../../lib/supabaseClient'
import { ensureInstanceForCurrentPeriod } from '../../../lib/recurring'
import { Bill } from '../../../types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ error?: string; results?: any[] }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const headerSecret = req.headers['x-cron-secret']
  const querySecret = req.query.secret
  const secret = headerSecret || querySecret

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { data: bills, error } = await supabase.from('bills').select('*')

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const now = dayjs()
  const results: any[] = []

  for (const bill of bills || []) {
    const normalizedBill = {
      ...(bill as Bill),
      type: (bill as Bill).type?.toUpperCase?.() as Bill['type'],
      frequency: (bill as Bill).frequency?.toUpperCase?.() as Bill['frequency'],
    }
    const outcome = await ensureInstanceForCurrentPeriod(normalizedBill as Bill, now)
    results.push({
      bill_id: bill.id,
      skipped: outcome.skippedReason,
      created_instance_id: outcome.created?.id,
      expense_id: outcome.expense?.id,
    })
  }

  return res.status(200).json({ results })
}

