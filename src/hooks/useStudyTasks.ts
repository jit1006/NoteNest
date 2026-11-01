import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { StudyTask } from '../types'
import { createPersistedStore } from '../utils/storage'

export const TASKS_KEY = 'notenest:tasks:v1'

const isTaskList = (v: unknown): v is StudyTask[] =>
  Array.isArray(v) &&
  v.every(
    (t) =>
      typeof t === 'object' &&
      t !== null &&
      typeof (t as StudyTask).id === 'string' &&
      typeof (t as StudyTask).title === 'string' &&
      typeof (t as StudyTask).done === 'boolean',
  )

const store = createPersistedStore<StudyTask[]>(TASKS_KEY, [], isTaskList)

export interface NewTask {
  title: string
  subjectId?: string
  dueDate?: string
}

export function useStudyTasks() {
  const tasks = useSyncExternalStore(store.subscribe, store.get, store.get)

  const addTask = useCallback((input: NewTask) => {
    const title = input.title.trim()
    if (!title) return false
    const task: StudyTask = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      subjectId: input.subjectId || undefined,
      dueDate: input.dueDate || undefined,
      done: false,
      createdAt: Date.now(),
    }
    store.set((prev) => [task, ...prev])
    return true
  }, [])

  const toggleTask = useCallback((id: string) => {
    store.set((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }, [])

  const removeTask = useCallback((id: string) => {
    store.set((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const clearCompleted = useCallback(() => {
    store.set((prev) => prev.filter((t) => !t.done))
  }, [])

  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.done).length
    return {
      total,
      completed,
      remaining: total - completed,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    }
  }, [tasks])

  return { tasks, stats, addTask, toggleTask, removeTask, clearCompleted }
}
