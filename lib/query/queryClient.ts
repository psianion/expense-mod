import { QueryClient } from '@tanstack/react-query'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 1, // 1 minute - data becomes stale after 1 minute
        gcTime: 1000 * 60 * 30, // 30 minutes cache retention
        retry: 2,
        refetchOnWindowFocus: false, // Reduce unnecessary API calls
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
      },
    },
  })
}
