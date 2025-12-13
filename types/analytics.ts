export type TrendPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export type TrendPoint = {
  label: string
  expense: number
  inflow: number
}

export type SimpleDatum = {
  name: string
  value: number
}

export type ComparisonDatum = {
  name: string
  expense: number
}

export type SummaryTotals = {
  expenseTotal: number
  inflowTotal: number
  net: number
}

export type CategoryTrendPoint = {
  label: string
  [category: string]: string | number
}


