import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toApiError, unwrap } from '../lib/errors'
import type { Annotation, AnnotationColor, NoteAnchor, PdfAnchor } from '../types/db'
import { useUid } from './helpers'

export function useNoteAnnotations(noteId: string | undefined) {
  const uid = useUid()
  return useQuery({
    queryKey: ['annotations', 'note', noteId, uid],
    enabled: !!noteId && !!uid,
    queryFn: async () => unwrap(await supabase.from('annotations').select('*').eq('note_id', noteId!).eq('user_id', uid!).order('created_at')) as Annotation[],
  })
}

export function useResourceAnnotations(resourceId: string | undefined) {
  const uid = useUid()
  return useQuery({
    queryKey: ['annotations', 'resource', resourceId, uid],
    enabled: !!resourceId && !!uid,
    queryFn: async () => unwrap(await supabase.from('annotations').select('*').eq('resource_id', resourceId!).eq('user_id', uid!).order('created_at')) as Annotation[],
  })
}

export interface NewAnnotation {
  noteId?: string
  resourceId?: string
  anchor: NoteAnchor | PdfAnchor
  quote: string
  color: AnnotationColor
  comment?: string
}

export function useCreateAnnotation() {
  const qc = useQueryClient(); const uid = useUid()
  return useMutation({
    mutationFn: async (a: NewAnnotation) => unwrap(await supabase.from('annotations').insert({
      user_id: uid, note_id: a.noteId ?? null, resource_id: a.resourceId ?? null,
      kind: a.comment ? 'comment' : 'highlight', color: a.color, comment: a.comment ?? '', quote: a.quote.slice(0, 1000), anchor: a.anchor,
    }).select().single()) as Annotation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['annotations'] }),
  })
}

export function useUpdateAnnotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; comment?: string; color?: AnnotationColor }) =>
      unwrap(await supabase.from('annotations').update(patch).eq('id', id).select().single()) as Annotation,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['annotations'] }),
  })
}

export function useDeleteAnnotation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('annotations').delete().eq('id', id); if (error) throw toApiError(error) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['annotations'] }),
  })
}
