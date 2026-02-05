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
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.billInstances.all })

      // Snapshot the previous value
      const previousInstances = queryClient.getQueryData(queryKeys.billInstances.list(['DUE', 'PAID']))

      // Optimistically update the bill instance status
      queryClient.setQueryData(queryKeys.billInstances.list(['DUE', 'PAID']), (old: any) => {
        if (!old) return old
        return old.map((instance: any) => {
          if (instance.id === variables.id) {
            return {
              ...instance,
              status: variables.action === 'confirm' ? 'PAID' : variables.action === 'skip' ? 'SKIPPED' : instance.status,
            }
          }
          return instance
        })
      })

      return { previousInstances }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousInstances) {
        queryClient.setQueryData(queryKeys.billInstances.list(['DUE', 'PAID']), context.previousInstances)
      }
    },
    onSettled: () => {
      // Always refetch after error or success
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
