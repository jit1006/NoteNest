import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/errors'
import type { Folder, Semester, Space, Subject, SubjectColor } from '../types/db'
import { invalidateAll, useUid } from './helpers'

export type SemesterCard = Semester & {
  academic_spaces: Pick<Space, 'id' | 'title' | 'icon' | 'owner_id'>
  notes: { count: number }[]
  subjects: { count: number }[]
  resources: { count: number }[]
}

export function useDashboardSemesters(spaceIds: string[]) {
  return useQuery({
    queryKey: ['semesters', 'cards', spaceIds],
    enabled: spaceIds.length > 0,
    queryFn: async () => unwrap(
      await supabase.from('semesters')
        .select('*, academic_spaces!inner(id,title,icon,owner_id), notes(count), subjects(count), resources(count)')
        .in('space_id', spaceIds).is('deleted_at', null).is('notes.deleted_at', null).is('subjects.deleted_at', null).is('resources.deleted_at', null).is('resources.attached_note_id', null)
        .order('number', { ascending: true, nullsFirst: false }),
    ) as unknown as SemesterCard[],
  })
}

export function useSemesters(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['semesters', 'space', spaceId],
    enabled: !!spaceId,
    queryFn: async () => unwrap(
      await supabase.from('semesters').select('*, notes(count), subjects(count), resources(count)').eq('space_id', spaceId!).is('deleted_at', null)
        .is('notes.deleted_at', null).is('subjects.deleted_at', null).is('resources.deleted_at', null).is('resources.attached_note_id', null)
        .order('number', { ascending: true, nullsFirst: false }).order('created_at'),
    ) as unknown as (Semester & { notes: { count: number }[]; subjects: { count: number }[]; resources: { count: number }[] })[],
  })
}

export function useSemester(id: string | undefined) {
  return useQuery({
    queryKey: ['semesters', 'one', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('semesters').select('*, academic_spaces(id,title,icon,owner_id,visibility)').eq('id', id!).maybeSingle()) as unknown as (Semester & { academic_spaces: Pick<Space, 'id' | 'title' | 'icon' | 'owner_id' | 'visibility'> | null }) | null,
  })
}

export function useSubjectsOfSemester(semesterId: string | undefined) {
  return useQuery({
    queryKey: ['subjects', 'semester', semesterId],
    enabled: !!semesterId,
    queryFn: async () => unwrap(
      await supabase.from('subjects').select('*, notes(count), resources(count)').eq('semester_id', semesterId!).is('deleted_at', null)
        .is('notes.deleted_at', null).is('resources.deleted_at', null).is('resources.attached_note_id', null).order('position').order('created_at'),
    ) as unknown as (Subject & { notes: { count: number }[]; resources: { count: number }[] })[],
  })
}

export function useSubjectsOfSpace(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['subjects', 'space', spaceId],
    enabled: !!spaceId,
    queryFn: async () => unwrap(await supabase.from('subjects').select('*').eq('space_id', spaceId!).is('deleted_at', null).order('title')) as Subject[],
  })
}

export function useSubject(id: string | undefined) {
  return useQuery({
    queryKey: ['subjects', 'one', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('subjects').select('*, semesters(id,number,title, academic_spaces(id,title,icon,owner_id,visibility))').eq('id', id!).maybeSingle()) as unknown as (Subject & { semesters: (Pick<Semester, 'id' | 'number' | 'title'> & { academic_spaces: Pick<Space, 'id' | 'title' | 'icon' | 'owner_id' | 'visibility'> | null }) | null }) | null,
  })
}

export function useFolders(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['folders', subjectId],
    enabled: !!subjectId,
    queryFn: async () => unwrap(await supabase.from('folders').select('*').eq('subject_id', subjectId!).is('deleted_at', null).order('position').order('title')) as Folder[],
  })
}

export function useCreateSemester() {
  const qc = useQueryClient(); const uid = useUid()
  return useMutation({
    mutationFn: async (v: { space_id: string; title: string; number?: number | null; description?: string }) =>
      unwrap(await supabase.from('semesters').insert({ ...v, owner_id: uid }).select().single()) as Semester,
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCreateSubject() {
  const qc = useQueryClient(); const uid = useUid()
  return useMutation({
    mutationFn: async (v: { space_id: string; semester_id: string; title: string; code?: string | null; description?: string; color?: SubjectColor }) =>
      unwrap(await supabase.from('subjects').insert({ ...v, owner_id: uid }).select().single()) as Subject,
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCreateFolder() {
  const qc = useQueryClient(); const uid = useUid()
  return useMutation({
    mutationFn: async (v: { space_id: string; subject_id: string; title: string; parent_id?: string | null }) =>
      unwrap(await supabase.from('folders').insert({ ...v, owner_id: uid }).select().single()) as Folder,
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateRow(table: 'semesters' | 'subjects' | 'folders') {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, unknown>) =>
      unwrap(await supabase.from(table).update(patch).eq('id', id).select().single()),
    onSuccess: () => invalidateAll(qc),
  })
}
