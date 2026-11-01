import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toApiError } from '../lib/errors'
import { useUid } from './helpers'

export function useReport() {
  const uid = useUid()
  return useMutation({
    mutationFn: async (v: { type: 'note' | 'resource'; id: string; reason: 'spam' | 'copyright' | 'inappropriate' | 'other'; details?: string }) => {
      const { error } = await supabase.from('content_reports').insert({ reporter_id: uid, target_type: v.type, target_id: v.id, reason: v.reason, details: v.details ?? '' })
      if (error) throw toApiError(error)
    },
  })
}
