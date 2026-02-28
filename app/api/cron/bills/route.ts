import { NextRequest } from 'next/server'
import { billService } from '@server/services/bill.service'
import { getCronUserContext } from '@server/auth/context'
import { withApiHandler, successResponse, errorResponse } from '../../middleware'

export const dynamic = 'force-dynamic'

export const POST = withApiHandler(async (request: NextRequest) => {
  const headerSecret = request.headers.get('x-cron-secret')
  const querySecret = request.nextUrl.searchParams.get('secret')
  const secret = headerSecret || querySecret

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return errorResponse('Unauthorized', 401, 'UNAUTHORIZED')
  }

  const cronUser = getCronUserContext()
  const results = await billService.processBillInstances(cronUser)
  return successResponse({ results })
})
