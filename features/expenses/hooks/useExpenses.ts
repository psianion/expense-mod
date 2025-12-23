import { useState, useEffect, useCallback } from 'react'
import { Expense, ExpenseFilters } from '@/types'
import { expensesApi } from '@/lib/api'
import { fromUTC } from '@/lib/datetime'

interface UseExpensesReturn {
  expenses: Expense[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  getExpenses: (filters?: ExpenseFilters) => Promise<Expense[]>
}

export function useExpenses(initialFilters?: ExpenseFilters): UseExpensesReturn {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExpenses = useCallback(async (filters?: ExpenseFilters) => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await expensesApi.getExpenses(filters)

      // Convert UTC times to local times
      const expensesWithLocalTime = data.map((expense) => ({
        ...expense,
        datetime: fromUTC(expense.datetime),
        type: expense.type?.toUpperCase?.() as 'EXPENSE' | 'INFLOW' || 'EXPENSE',
        source: expense.source?.toUpperCase?.() as 'MANUAL' | 'AI' | 'RECURRING' || 'MANUAL',
        bill_instance_id: expense.bill_instance_id ?? null,
      }))

      setExpenses(expensesWithLocalTime)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch expenses'
      setError(errorMessage)
      console.error('Error fetching expenses:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refetch = useCallback(async () => {
    await fetchExpenses(initialFilters)
  }, [fetchExpenses, initialFilters])

  useEffect(() => {
    fetchExpenses(initialFilters)
  }, [fetchExpenses, initialFilters])

  return {
    expenses,
    isLoading,
    error,
    refetch,
    getExpenses: fetchExpenses,
  }
}
