import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toApiError, unwrap } from '../lib/errors'
import type { Bookmark } from '../types/db'
import { useUid } from './helpers'

export interface BookmarkRow extends Bookmark {
  notes: { id: string; title: string; icon: string | null } | null
  resources: { id: string; title: string; kind: string } | null
}

export function useBookmarks() {
  const uid = useUid()
  return useQuery({
    queryKey: ['bookmarks', uid],
    enabled: !!uid,
    queryFn: async () => unwrap(await supabase.from('bookmarks').select('*, notes(id,title,icon), resources(id,title,kind)').eq('user_id', uid!).order('created_at', { ascending: false })) as unknown as BookmarkRow[],
  })
}

export interface BookmarkTarget { noteId?: string; resourceId?: string; blockId?: string | null; pdfPage?: number | null }

const same = (b: Bookmark, t: BookmarkTarget) =>
  (b.note_id ?? undefined) === t.noteId && (b.resource_id ?? undefined) === t.resourceId &&
  (b.block_id ?? null) === (t.blockId ?? null) && (b.pdf_page ?? null) === (t.pdfPage ?? null)

/** Toggle state for one target (note, a block inside a note, a resource, or a PDF page). */
export function useBookmarkToggle(target: BookmarkTarget, label = '') {
  const qc = useQueryClient()
  const uid = useUid()
  const list = useBookmarks()
  const existing = list.data?.find((b) => same(b, target))
  const mutation = useMutation({
    mutationFn: async () => {
      if (existing) {
        const { error } = await supabase.from('bookmarks').delete().eq('id', existing.id)
        if (error) throw toApiError(error)
        return
      }
      const { error } = await supabase.from('bookmarks').insert({
        user_id: uid, note_id: target.noteId ?? null, resource_id: target.resourceId ?? null,
        block_id: target.blockId ?? null, pdf_page: target.pdfPage ?? null, label: label.slice(0, 200),
      })
      if (error) throw toApiError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookmarks'] }),
  })
  return { saved: Boolean(existing), toggle: mutation.mutate, toggleAsync: mutation.mutateAsync, pending: mutation.isPending, loading: list.isLoading, enabled: !!uid }
}

export function useDeleteBookmark() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('bookmarks').delete().eq('id', id); if (error) throw toApiError(error) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookmarks'] }),
  })
}
