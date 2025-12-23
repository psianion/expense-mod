import apiClient from './client'
import type { TrendPeriod } from '@/types'

// Analytics API module
export const analyticsApi = {
  // Get all analytics data
  async getAnalyticsData(): Promise<any> {
    const response = await apiClient.get('/analytics')
    return response.data
  },

  // Get analytics data filtered by period
  async getAnalyticsDataByPeriod(period: TrendPeriod): Promise<any> {
    const response = await apiClient.get(`/analytics?period=${period}`)
    return response.data
  },
}
