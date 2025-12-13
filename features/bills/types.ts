// Feature-specific types for bills
export interface BillFilters {
  type?: string
  status?: string
}

export interface BillFormData {
  name: string
  type: string
  frequency: string
  day_of_month?: number
  day_of_week?: number
  start_date?: string
  end_date?: string
  amount?: number
  auto_post: boolean
  notes?: string
}
