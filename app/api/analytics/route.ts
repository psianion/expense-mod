import { NextRequest, NextResponse } from 'next/server'
import { analyticsService } from '../../../server/services/analytics.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const data = await analyticsService.getAnalyticsData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Analytics service error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
