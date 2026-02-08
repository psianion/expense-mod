import { NextRequest, NextResponse } from 'next/server'
import { billService } from '@server/services/bill.service'
import { getCronUserContext } from '@server/auth/context'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const headerSecret = request.headers.get('x-cron-secret')
  const querySecret = request.nextUrl.searchParams.get('secret')
  const secret = headerSecret || querySecret

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cronUser = getCronUserContext()
  const results = await billService.processBillInstances(cronUser)
  return NextResponse.json({ results })
}

