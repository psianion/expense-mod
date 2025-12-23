import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '@/lib/api'
import { queryKeys } from '../queryKeys'
import { fromUTC } from '@/lib/datetime'
import type { ExpenseFilters, CreateExpenseRequest } from '@/lib/api/types'
import type { Expense, ExpenseType, ExpenseSource } from '@/types'

const normalizeExpense = (expense: Expense): Expense => ({
  ...expense,
  datetime: fromUTC(expense.datetime),
  type: (expense.type?.toUpperCase?.() as ExpenseType) || 'EXPENSE',
  source: (expense.source?.toUpperCase?.() as ExpenseSource) || 'MANUAL',
  bill_instance_id: expense.bill_instance_id ?? null,
})

export function useExpensesQuery(filters?: ExpenseFilters) {
  return useQuery({
    queryKey: queryKeys.expenses.list(filters),
    queryFn: async () => {
      const data = await expensesApi.getExpenses(filters)
      return data.map(normalizeExpense)
    },
  })
}

export function useRecentExpensesQuery(limit = 5) {
  return useQuery({
    queryKey: queryKeys.expenses.recent(limit),
    queryFn: async () => {
      const data = await expensesApi.getRecentExpenses(limit)
      return data.map(normalizeExpense)
    },
  })
}

export function useCreateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: expensesApi.createExpense,
    onSuccess: () => {
      // Invalidate all expense queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      // Also invalidate bill instances as they may be linked
      queryClient.invalidateQueries({ queryKey: queryKeys.billInstances.all })
    },
  })
}

export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<CreateExpenseRequest> }) =>
      expensesApi.updateExpense(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    },
  })
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => expensesApi.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    },
  })
}
