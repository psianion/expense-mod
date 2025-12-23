import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billInstancesApi } from '@/lib/api'
import { queryKeys } from '../queryKeys'
import type { BillInstance } from '@/types'

export function useBillInstancesQuery(status?: string[]) {
  return useQuery({
    queryKey: queryKeys.billInstances.list(status),
    queryFn: () => billInstancesApi.getBillInstances(status as ('DUE' | 'PAID' | 'SKIPPED')[]),
  })
}

export function useUpcomingBillInstancesQuery(limit = 5) {
  return useQuery({
    queryKey: queryKeys.billInstances.upcoming(limit),
    queryFn: () => billInstancesApi.getUpcomingBills(limit),
  })
}

export function useUpdateBillInstanceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: billInstancesApi.updateBillInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billInstances.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
    },
  })
}

export function useCreateBillInstanceMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: billInstancesApi.createBillInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billInstances.all })
    },
  })
}
