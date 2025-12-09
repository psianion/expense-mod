import { NextRequest, NextResponse } from 'next/server'
import dayjs from 'dayjs'

import { supabase } from '@/lib/supabaseClient'
import { ensureInstanceForCurrentPeriod } from '@/lib/recurring'
import { Bill } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const headerSecret = request.headers.get('x-cron-secret')
  const querySecret = request.nextUrl.searchParams.get('secret')
  const secret = headerSecret || querySecret

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: bills, error } = await supabase.from('bills').select('*')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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

  return NextResponse.json({ results })
}

