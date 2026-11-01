import { useCallback, useSyncExternalStore } from 'react'
import { createPersistedStore, isStringArray } from '../utils/storage'

export const BOOKMARKS_KEY = 'notenest:bookmarks:v1'
const store = createPersistedStore<string[]>(BOOKMARKS_KEY, [], isStringArray)

export function useBookmarks() {
  const ids = useSyncExternalStore(store.subscribe, store.get, store.get)

  const isBookmarked = useCallback((id: string) => ids.includes(id), [ids])

  const toggle = useCallback((id: string) => {
    store.set((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]))
  }, [])

  const clear = useCallback(() => store.set([]), [])

  return { ids, isBookmarked, toggle, clear }
}
