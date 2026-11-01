import { useCallback, useSyncExternalStore } from 'react'
import { createPersistedStore } from '../utils/storage'

export type Theme = 'light' | 'dark'
export const THEME_KEY = 'notenest:theme:v1'

const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark'

const systemTheme = (): Theme =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const store = createPersistedStore<Theme>(THEME_KEY, systemTheme(), isTheme)

function apply(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#020617' : '#f8fafc')
}

if (typeof document !== 'undefined') {
  apply(store.get())
  store.subscribe(() => apply(store.get()))
}

export function useTheme() {
  const theme = useSyncExternalStore(store.subscribe, store.get, store.get)
  const toggle = useCallback(() => store.set((t) => (t === 'dark' ? 'light' : 'dark')), [])
  return { theme, toggle }
}
