import type { QueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'

/** Mutations can change data shown by many queries (counts, lists, search). Refresh everything except cached signed URLs. */
export const invalidateAll = (qc: QueryClient) =>
  qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'signed-url' })

export function useUid(): string | undefined {
  return useAuth().user?.id
}

export const nowIso = () => new Date().toISOString()
