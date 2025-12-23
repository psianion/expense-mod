import { useState, useEffect, useCallback } from 'react'
import { Bill, BillFilters } from '@/types'
import { billsApi } from '@/lib/api'

interface UseBillsReturn {
  bills: Bill[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  getBills: (filters?: BillFilters) => Promise<Bill[]>
  createBill: (data: {
    name: string
    type: 'BILL' | 'EMI' | 'CREDITCARD' | 'SUBSCRIPTION' | 'SALARY' | 'INCOME'
    frequency: 'MONTHLY' | 'WEEKLY' | 'YEARLY'
    day_of_month?: number
    day_of_week?: number
    start_date?: string
    end_date?: string
    amount?: number
    auto_post: boolean
    notes?: string
  }) => Promise<Bill>
  updateBill: (data: {
    id: string
    name?: string
    type?: 'BILL' | 'EMI' | 'CREDITCARD' | 'SUBSCRIPTION' | 'SALARY' | 'INCOME'
    frequency?: 'MONTHLY' | 'WEEKLY' | 'YEARLY'
    day_of_month?: number
    day_of_week?: number
    start_date?: string
    end_date?: string
    amount?: number
    auto_post?: boolean
    notes?: string
  }) => Promise<Bill>
  deleteBill: (id: string) => Promise<void>
}

export function useBills(initialFilters?: BillFilters): UseBillsReturn {
  const [bills, setBills] = useState<Bill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBills = useCallback(async (filters?: BillFilters) => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await billsApi.getBills(filters)

      // Normalize bill data
      const normalizedBills = data.map((bill) => ({
        ...bill,
        type: (bill.type?.toUpperCase?.() as Bill['type']) || 'BILL',
        frequency: (bill.frequency?.toUpperCase?.() as Bill['frequency']) || 'MONTHLY',
      }))

      setBills(normalizedBills)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bills'
      setError(errorMessage)
      console.error('Error fetching bills:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    await fetchBills(initialFilters)
  }, [fetchBills, initialFilters])

  const createBill = useCallback(async (data: Parameters<UseBillsReturn['createBill']>[0]) => {
    try {
      setError(null)
      const newBill = await billsApi.createBill(data)
      await refetch() // Refresh the list
      return newBill
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create bill'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [refetch])

  const updateBill = useCallback(async (data: Parameters<UseBillsReturn['updateBill']>[0]) => {
    try {
      setError(null)
      const updatedBill = await billsApi.updateBill(data)
      await refetch() // Refresh the list
      return updatedBill
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update bill'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [refetch])

  const deleteBill = useCallback(async (id: string) => {
    try {
      setError(null)
      await billsApi.deleteBill(id)
      await refetch() // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete bill'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [refetch])

  useEffect(() => {
    fetchBills(initialFilters)
  }, [fetchBills, initialFilters])

  return {
    bills,
    isLoading,
    error,
    refetch,
    getBills: fetchBills,
    createBill,
    updateBill,
    deleteBill,
  }
}
