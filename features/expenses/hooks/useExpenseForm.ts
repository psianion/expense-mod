import { useState, useCallback } from 'react'
import { Expense, ExpenseSource, ExpenseType, BillMatchCandidate, ParsedExpense } from '@/types'
import { expensesApi, aiApi } from '@/lib/api'
import { getLocalISO } from '@/lib/datetime'

interface UseExpenseFormReturn {
  // AI parsing
  parseExpense: (text: string) => Promise<{ parsed: ParsedExpense; billMatch?: BillMatchCandidate | null }>
  isParsing: boolean

  // Manual creation
  createExpense: (data: {
    expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'parsed_by_ai'>
    source?: ExpenseSource
    billMatch?: BillMatchCandidate | null
    raw_text?: string
  }) => Promise<Expense>
  isCreating: boolean

  // Error handling
  error: string | null
  clearError: () => void
}

export function useExpenseForm(): UseExpenseFormReturn {
  const [isParsing, setIsParsing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const parseExpense = useCallback(async (text: string) => {
    try {
      setIsParsing(true)
      setError(null)

      const result = await aiApi.parseExpense({ text })
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse expense'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsParsing(false)
    }
  }, [])

  const createExpense = useCallback(async (data: {
    expense: Omit<Expense, 'id' | 'user_id' | 'created_at' | 'parsed_by_ai'>
    source?: ExpenseSource
    billMatch?: BillMatchCandidate | null
    raw_text?: string
  }) => {
    try {
      setIsCreating(true)
      setError(null)

      // Ensure datetime is in local format (currency not stored in DB)
      const expenseData = {
        ...data.expense,
        datetime: data.expense.datetime || getLocalISO(),
        type: (data.expense.type?.toUpperCase?.() as ExpenseType) || 'EXPENSE',
      }

      const payload = {
        expense: {
          amount: expenseData.amount,
          datetime: expenseData.datetime,
          type: expenseData.type,
          category: expenseData.category || undefined,
          platform: expenseData.platform || undefined,
          payment_method: expenseData.payment_method || undefined,
          tags: (data.expense as { tags?: string[] }).tags || [],
        },
        source: data.source || 'MANUAL' as ExpenseSource,
        billMatch: data.billMatch,
        raw_text: data.raw_text || undefined,
      }

      const result = await expensesApi.createExpense(payload)
      return result.expense
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create expense'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }, [])

  return {
    parseExpense,
    isParsing,
    createExpense,
    isCreating,
    error,
    clearError,
  }
}
