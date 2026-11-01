/**
 * Tiny persisted store used with React's useSyncExternalStore.
 * - Safe against missing/blocked localStorage and corrupted JSON.
 * - Syncs across components (listeners) and across tabs (`storage` event).
 */
export interface PersistedStore<T> {
  get: () => T
  set: (next: T | ((prev: T) => T)) => void
  subscribe: (cb: () => void) => () => void
}

export function readJSON<T>(key: string, fallback: T, validate: (v: unknown) => v is T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw == null) return fallback
    const parsed: unknown = JSON.parse(raw)
    return validate(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked: keep in-memory state only */
  }
}

export function createPersistedStore<T>(
  key: string,
  fallback: T,
  validate: (v: unknown) => v is T,
): PersistedStore<T> {
  let cache: T | undefined
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((l) => l())

  const get = (): T => {
    if (cache === undefined) cache = readJSON(key, fallback, validate)
    return cache
  }

  const set: PersistedStore<T>['set'] = (next) => {
    const value = typeof next === 'function' ? (next as (p: T) => T)(get()) : next
    cache = value
    writeJSON(key, value)
    notify()
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === key || e.key === null) {
        cache = undefined // re-read on next get()
        notify()
      }
    })
  }

  const subscribe = (cb: () => void) => {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  }

  return { get, set, subscribe }
}

export const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')
