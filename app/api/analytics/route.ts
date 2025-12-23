import { NextRequest } from 'next/server'
import { analyticsService } from '@server/services/analytics.service'
import { successResponse, handleApiError } from '../middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const data = await analyticsService.getAnalyticsData()
    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}
