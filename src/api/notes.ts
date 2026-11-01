import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { ApiError, toApiError, unwrap } from '../lib/errors'
import type { Note, NoteListItem, TiptapDoc, Visibility } from '../types/db'
import { invalidateAll, useUid } from './helpers'

export const EMPTY_DOC: TiptapDoc = { type: 'doc', content: [{ type: 'paragraph' }] }
const LIST_COLS = 'id,title,icon,space_id,semester_id,subject_id,folder_id,owner_id,visibility,updated_at,created_at,deleted_at'

/** `null` = missing OR not permitted (the API deliberately does not distinguish, to avoid leaking existence). */
export function useNote(id: string | undefined) {
  return useQuery({
    queryKey: ['notes', 'one', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('notes').select('*').eq('id', id!).maybeSingle()) as Note | null,
  })
}

export interface NoteListFilter { semesterId?: string; subjectId?: string; folderId?: string | null; ownerId?: string; limit?: number }

export function useNoteList(f: NoteListFilter, enabled = true) {
  return useQuery({
    queryKey: ['notes', 'list', f],
    enabled,
    queryFn: async () => {
      let q = supabase.from('notes').select(LIST_COLS).is('deleted_at', null)
      if (f.semesterId) q = q.eq('semester_id', f.semesterId)
      if (f.subjectId) q = q.eq('subject_id', f.subjectId)
      if (f.folderId === null) q = q.is('folder_id', null)
      else if (f.folderId) q = q.eq('folder_id', f.folderId)
      if (f.ownerId) q = q.eq('owner_id', f.ownerId)
      return unwrap(await q.order('updated_at', { ascending: false }).limit(f.limit ?? 200)) as NoteListItem[]
    },
  })
}

export function useRecentNotes(limit = 6) {
  const uid = useUid()
  return useQuery({
    queryKey: ['notes', 'recent', uid, limit],
    enabled: !!uid,
    queryFn: async () => unwrap(await supabase.from('notes').select(LIST_COLS).eq('owner_id', uid!).is('deleted_at', null).order('updated_at', { ascending: false }).limit(limit)) as NoteListItem[],
  })
}

export function useCreateNote() {
  const qc = useQueryClient(); const uid = useUid()
  return useMutation({
    mutationFn: async (v: { space_id: string; semester_id: string; subject_id?: string | null; folder_id?: string | null; title?: string; visibility?: Visibility; content?: TiptapDoc }) =>
      unwrap(await supabase.from('notes').insert({ title: 'Untitled', content: EMPTY_DOC, ...v, owner_id: uid }).select().single()) as Note,
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateNoteMeta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Pick<Note, 'title' | 'icon' | 'visibility' | 'semester_id' | 'subject_id' | 'folder_id' | 'cover_resource_id'>>) =>
      unwrap(await supabase.from('notes').update(patch).eq('id', id).select().single()) as Note,
    onSuccess: (n) => { qc.setQueryData(['notes', 'one', n.id], n); invalidateAll(qc) },
  })
}

export class ConflictError extends ApiError {
  constructor() { super('This note was changed somewhere else since you opened it.', 'CONFLICT', 409) }
}

/** Optimistic-concurrency save: only succeeds if nobody saved a newer version in the meantime. */
export async function saveNoteContent(args: { id: string; version: number; title: string; content: TiptapDoc }): Promise<Note> {
  const { data, error } = await supabase.from('notes').update({ title: args.title, content: args.content }).eq('id', args.id).eq('version', args.version).select().maybeSingle()
  if (error) throw toApiError(error)
  if (!data) {
    // Either someone else saved (conflict) or permission was lost. Distinguish by reading back.
    const { data: now } = await supabase.from('notes').select('version').eq('id', args.id).maybeSingle()
    if (now) throw new ConflictError()
    throw toApiError({ message: "You don't have permission to edit this note." })
  }
  return data as Note
}

export function useNoteVersions(noteId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['notes', 'versions', noteId],
    enabled: !!noteId && enabled,
    queryFn: async () => unwrap(await supabase.from('note_versions').select('id,version,title,content,created_at,created_by').eq('note_id', noteId!).order('version', { ascending: false }).limit(50)) as { id: string; version: number; title: string; content: TiptapDoc; created_at: string; created_by: string | null }[],
  })
}

export function useTrash() {
  const uid = useUid()
  return useQuery({
    queryKey: ['trash', uid],
    enabled: !!uid,
    queryFn: async () => {
      const [notes, resources, spaces] = await Promise.all([
        supabase.from('notes').select('id,title,deleted_at').eq('owner_id', uid!).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).limit(100),
        supabase.from('resources').select('id,title,deleted_at').eq('owner_id', uid!).is('attached_note_id', null).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).limit(100),
        supabase.from('academic_spaces').select('id,title,deleted_at').eq('owner_id', uid!).not('deleted_at', 'is', null).limit(50),
      ])
      return {
        notes: unwrap(notes) as { id: string; title: string; deleted_at: string }[],
        resources: unwrap(resources) as { id: string; title: string; deleted_at: string }[],
        spaces: unwrap(spaces) as { id: string; title: string; deleted_at: string }[],
      }
    },
  })
}
