import apiClient from './client'
import type { Bill } from '@/types'
import type {
  CreateBillRequest,
  UpdateBillRequest,
  BillsResponse,
  BillFilters
} from './types'

// Bills API module
export const billsApi = {
  // Get all bills with optional filters
  async getBills(filters?: BillFilters): Promise<Bill[]> {
    const params = new URLSearchParams()

    if (filters?.type && filters.type.length > 0) {
      filters.type.forEach(type => params.append('type', type))
    }

    const response = await apiClient.get<BillsResponse>(
      `/bills${params.toString() ? `?${params.toString()}` : ''}`
    )

    return response.data.bills
  },

  // Get bill by ID
  async getBillById(id: string): Promise<Bill> {
    const response = await apiClient.get<{ bill: Bill }>(`/bills/${id}`)
    return response.data.bill
  },

  // Create a new bill
  async createBill(data: CreateBillRequest): Promise<Bill> {
    const response = await apiClient.post<{ bill: Bill }>('/bills', data)
    return response.data.bill
  },

  // Update a bill
  async updateBill(data: UpdateBillRequest): Promise<Bill> {
    const response = await apiClient.put<{ bill: Bill }>('/bills', data)
    return response.data.bill
  },

  // Delete a bill
  async deleteBill(id: string): Promise<Bill> {
    const response = await apiClient.delete<{ bill: Bill }>(`/bills?id=${id}`)
    return response.data.bill
  },
}
