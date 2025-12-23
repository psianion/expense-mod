import apiClient from './client'
import type { BillInstance } from '@/types'

// Bill Instances API module
export const billInstancesApi = {
  // Get all bill instances with optional status filter
  async getBillInstances(status?: ('DUE' | 'PAID' | 'SKIPPED')[]): Promise<BillInstance[]> {
    const params = new URLSearchParams()

    if (status && status.length > 0) {
      status.forEach(s => params.append('status', s))
    }

    const response = await apiClient.get<{ instances: BillInstance[] }>(
      `/bill-instances${params.toString() ? `?${params.toString()}` : ''}`
    )

    return response.data.instances
  },

  // Get upcoming bills (due bills from today onwards)
  async getUpcomingBills(limit = 5): Promise<BillInstance[]> {
    try {
      const instances = await this.getBillInstances(['DUE'])
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

      if (!instances || !Array.isArray(instances)) {
        console.warn('getUpcomingBills: instances is not an array:', instances)
        return []
      }

      return instances
        .filter(instance => instance && instance.due_date >= today)
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .slice(0, limit)
    } catch (error) {
      console.error('Error fetching upcoming bills:', error)
      return []
    }
  },

  // Get bill instance by ID
  async getBillInstanceById(id: string): Promise<BillInstance> {
    // This would need a separate endpoint, for now we'll filter from getAll
    const instances = await this.getBillInstances()
    const instance = instances.find(inst => inst.id === id)
    if (!instance) {
      throw new Error('Bill instance not found')
    }
    return instance
  },

  // Create a new bill instance
  async createBillInstance(data: { billId: string; amount?: number; due_date?: string }): Promise<BillInstance> {
    const response = await apiClient.post<{ instance: BillInstance }>('/bill-instances', data)
    return response.data.instance
  },

  // Update bill instance (confirm, skip, update amount)
  async updateBillInstance(data: {
    action: 'confirm' | 'skip' | 'update'
    id: string
    amount?: number
  }): Promise<BillInstance> {
    const response = await apiClient.patch<{ instance: BillInstance }>('/bill-instances', data)
    return response.data.instance
  },
}
