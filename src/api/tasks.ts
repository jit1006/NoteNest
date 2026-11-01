import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { toApiError, unwrap } from '../lib/errors'
import type { StudyTask } from '../types/db'
import { useUid } from './helpers'

export function useTasks() {
  const uid = useUid()
  return useQuery({
    queryKey: ['tasks', uid],
    enabled: !!uid,
    queryFn: async () => unwrap(await supabase.from('study_tasks').select('*').eq('user_id', uid!).order('done').order('due_date', { nullsFirst: false }).order('created_at', { ascending: false })) as StudyTask[],
  })
}

export function useAddTask() {
  const qc = useQueryClient(); const uid = useUid()
  return useMutation({
    mutationFn: async (v: { title: string; due_date?: string | null; subject_id?: string | null; note_id?: string | null }) =>
      unwrap(await supabase.from('study_tasks').insert({ ...v, user_id: uid }).select().single()) as StudyTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useToggleTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (t: StudyTask) => unwrap(await supabase.from('study_tasks').update({ done: !t.done }).eq('id', t.id).select().single()),
    // optimistic: tick the box immediately, roll back if the server refuses
    onMutate: async (t) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const prev = qc.getQueriesData<StudyTask[]>({ queryKey: ['tasks'] })
      qc.setQueriesData<StudyTask[]>({ queryKey: ['tasks'] }, (old) => old?.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))
      return { prev }
    },
    onError: (_e, _t, ctx) => ctx?.prev.forEach(([key, data]) => qc.setQueryData(key, data)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => { const { error } = await supabase.from('study_tasks').delete().in('id', ids); if (error) throw toApiError(error) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

/** One-time migration of V1 localStorage tasks into the account. */
export const LEGACY_TASKS_KEY = 'notenest:tasks:v1'
export function readLegacyTasks(): { title: string; done: boolean; dueDate?: string }[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LEGACY_TASKS_KEY) ?? '[]')
    return Array.isArray(raw) ? raw.filter((t) => t && typeof t.title === 'string') : []
  } catch { return [] }
}

export function useImportLegacyTasks() {
  const qc = useQueryClient(); const uid = useUid()
  return useMutation({
    mutationFn: async () => {
      const legacy = readLegacyTasks()
      if (!legacy.length) return 0
      const rows = legacy.slice(0, 200).map((t) => ({ user_id: uid, title: t.title.slice(0, 200), done: !!t.done, due_date: t.dueDate || null }))
      const { error } = await supabase.from('study_tasks').insert(rows)
      if (error) throw toApiError(error)
      localStorage.removeItem(LEGACY_TASKS_KEY)
      return rows.length
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
