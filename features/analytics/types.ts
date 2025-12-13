// Feature-specific types for analytics
export interface AnalyticsFilters {
  period: 'daily' | 'weekly' | 'monthly'
  dateRange?: {
    start: string
    end: string
  }
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string
    fill?: boolean
  }[]
}
