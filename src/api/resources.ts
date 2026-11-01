import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/errors'
import type { Resource, ResourceCategory, Visibility } from '../types/db'
import { invalidateAll, useUid } from './helpers'
import { purgeResource } from './files'

const WITH_FILES = '*, resource_files(*)'

export function useResource(id: string | undefined) {
  return useQuery({
    queryKey: ['resources', 'one', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('resources').select(WITH_FILES).eq('id', id!).maybeSingle()) as Resource | null,
  })
}

export interface ResourceFilter { semesterId?: string; subjectId?: string; ownerId?: string; category?: ResourceCategory; limit?: number }

export function useResourceList(f: ResourceFilter, enabled = true) {
  return useQuery({
    queryKey: ['resources', 'list', f],
    enabled,
    queryFn: async () => {
      let q = supabase.from('resources').select(WITH_FILES).is('deleted_at', null).is('attached_note_id', null)
      if (f.semesterId) q = q.eq('semester_id', f.semesterId)
      if (f.subjectId) q = q.eq('subject_id', f.subjectId)
      if (f.ownerId) q = q.eq('owner_id', f.ownerId)
      if (f.category) q = q.eq('category', f.category)
      return unwrap(await q.order('created_at', { ascending: false }).limit(f.limit ?? 200)) as Resource[]
    },
  })
}

export function useMyUploads(limit = 100) {
  const uid = useUid()
  return useQuery({
    queryKey: ['resources', 'mine', uid, limit],
    enabled: !!uid,
    queryFn: async () => unwrap(await supabase.from('resources').select(WITH_FILES).eq('owner_id', uid!).is('deleted_at', null).is('attached_note_id', null).order('created_at', { ascending: false }).limit(limit)) as Resource[],
  })
}

export function useUpdateResource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Pick<Resource, 'title' | 'description' | 'visibility' | 'category' | 'academic_year' | 'subject_id' | 'folder_id' | 'semester_id'>>) =>
      unwrap(await supabase.from('resources').update(patch).eq('id', id).select('*').single()) as Resource,
    onSuccess: () => invalidateAll(qc),
  })
}

export function usePurgeResource() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: purgeResource, onSuccess: () => invalidateAll(qc) })
}

export const VISIBILITY_LABEL: Record<Visibility, string> = { private: 'Private', unlisted: 'Unlisted', public: 'Public' }
