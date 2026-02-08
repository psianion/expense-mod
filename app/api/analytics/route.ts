import { NextRequest } from 'next/server'
import { analyticsService } from '@server/services/analytics.service'
import { requireAuth } from '@server/auth/context'
import { successResponse, handleApiError } from '../middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    const data = await analyticsService.getAnalyticsData(user)
    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}
