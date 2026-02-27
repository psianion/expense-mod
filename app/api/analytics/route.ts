import { NextRequest } from 'next/server'
import { analyticsService } from '@server/services/analytics.service'
import { requireAuth } from '@server/auth/context'
import { successResponse, withApiHandler } from '../middleware'

export const dynamic = 'force-dynamic'

export const GET = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request)
  const data = await analyticsService.getAnalyticsData(user)
  return successResponse(data)
})
