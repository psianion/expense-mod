// Feature-specific types for analytics
export interface AnalyticsFilters {
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  dateRange?: {
    start: string // ISO date string
    end: string // ISO date string
  }
  type?: 'EXPENSE' | 'INFLOW' | 'ALL'
  categories?: string[]
  platforms?: string[]
  paymentMethods?: string[]
  tags?: string[]
  source?: 'MANUAL' | 'AI' | 'RECURRING'
}

export interface DateRangePreset {
  label: string
  getValue: () => { start: Date; end: Date }
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

export interface MetricComparison {
  current: number
  previous?: number
  change?: number
  changePercent?: number
  trend: 'up' | 'down' | 'neutral'
}

export interface KPIMetric {
  label: string
  value: number
  formatted: string
  comparison?: MetricComparison
  icon?: string
}

export interface ComparisonPeriod {
  label: string
  dateRange: {
    start: string
    end: string
  }
}

export interface ExportFormat {
  type: 'CSV'
  filename: string
  includeCharts?: boolean
}


