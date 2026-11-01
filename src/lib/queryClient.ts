import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => {
        // Do not hammer on authorization / not-found problems
        if (error instanceof ApiError && (error.code === '42501' || error.code === 'PGRST116' || error.status === 404)) return false
        return count < 2
      },
    },
  },
})
