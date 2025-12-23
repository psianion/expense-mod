import { useState, useEffect, useCallback } from 'react'
import { BillInstance } from '@/types'
import { billInstancesApi } from '@/lib/api'

interface UseBillInstancesReturn {
  billInstances: BillInstance[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  getBillInstances: (status?: ('DUE' | 'PAID' | 'SKIPPED')[]) => Promise<BillInstance[]>
  getUpcomingBills: (limit?: number) => Promise<BillInstance[]>
  createBillInstance: (data: { billId: string; amount?: number; due_date?: string }) => Promise<BillInstance>
  updateBillInstance: (data: {
    action: 'confirm' | 'skip' | 'update'
    id: string
    amount?: number
  }) => Promise<BillInstance>
}

export function useBillInstances(initialStatus?: ('DUE' | 'PAID' | 'SKIPPED')[]): UseBillInstancesReturn {
  const [billInstances, setBillInstances] = useState<BillInstance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBillInstances = useCallback(async (status?: ('DUE' | 'PAID' | 'SKIPPED')[]) => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await billInstancesApi.getBillInstances(status)

      // Normalize bill instance data
      const normalizedInstances = data.map((instance) => ({
        ...instance,
        status: (instance.status?.toUpperCase?.() as BillInstance['status']) || 'DUE',
        bill: instance.bill
          ? {
              ...instance.bill,
              type: instance.bill.type?.toUpperCase?.() as any,
              frequency: instance.bill.frequency?.toUpperCase?.() as any,
            }
          : instance.bill,
      }))

      setBillInstances(normalizedInstances)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch bill instances'
      setError(errorMessage)
      console.error('Error fetching bill instances:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    await fetchBillInstances(initialStatus)
  }, [fetchBillInstances, initialStatus])

  const getUpcomingBills = useCallback(async (limit = 5) => {
    try {
      setError(null)
      return await billInstancesApi.getUpcomingBills(limit)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch upcoming bills'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  const createBillInstance = useCallback(async (data: Parameters<UseBillInstancesReturn['createBillInstance']>[0]) => {
    try {
      setError(null)
      const newInstance = await billInstancesApi.createBillInstance(data)
      await refetch() // Refresh the list
      return newInstance
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create bill instance'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [refetch])

  const updateBillInstance = useCallback(async (data: Parameters<UseBillInstancesReturn['updateBillInstance']>[0]) => {
    try {
      setError(null)
      const updatedInstance = await billInstancesApi.updateBillInstance(data)
      await refetch() // Refresh the list
      return updatedInstance
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update bill instance'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [refetch])

  useEffect(() => {
    fetchBillInstances(initialStatus)
  }, [fetchBillInstances, initialStatus])

  return {
    billInstances,
    isLoading,
    error,
    refetch,
    getBillInstances: fetchBillInstances,
    getUpcomingBills,
    createBillInstance,
    updateBillInstance,
  }
}
