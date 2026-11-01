import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Note, TiptapDoc } from '../types/db'
import { saveNoteContent, ConflictError } from '../api/notes'
import { ApiError } from '../lib/errors'
import { supabase } from '../lib/supabase'

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict'

interface Options {
  noteId: string
  initialVersion: number
  getPayload: () => { title: string; content: TiptapDoc }
  delay?: number
}

const RETRY_MS = [2000, 5000, 12000]

/**
 * Debounced autosave with optimistic concurrency.
 * - edits mark the document dirty; a save runs `delay` ms after the last edit
 * - only one request is in flight; edits made meanwhile trigger one follow-up save
 * - transient failures retry with back-off, then surface a manual Retry
 * - a version mismatch is reported as `conflict` (never silently overwrites)
 */
export function useAutosave({ noteId, initialVersion, getPayload, delay = 1200 }: Options) {
  const qc = useQueryClient()
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  const versionRef = useRef(initialVersion)
  const timer = useRef<number | undefined>(undefined)
  const inFlight = useRef(false)
  const pending = useRef(false)
  const attempts = useRef(0)
  const getPayloadRef = useRef(getPayload)
  getPayloadRef.current = getPayload
  const stateRef = useRef<SaveState>('idle')
  const set = (s: SaveState) => { stateRef.current = s; setState(s) }

  const flush = useCallback(async (): Promise<void> => {
    window.clearTimeout(timer.current)
    if (inFlight.current) { pending.current = true; return }
    inFlight.current = true
    pending.current = false
    set('saving')
    try {
      const payload = getPayloadRef.current()
      const saved: Note = await saveNoteContent({ id: noteId, version: versionRef.current, ...payload })
      versionRef.current = saved.version
      attempts.current = 0
      setError(null)
      setSavedAt(new Date())
      qc.setQueryData(['notes', 'one', noteId], saved) // cache the FULL saved row (content included) so reading views never show stale text
      if (pending.current) { inFlight.current = false; set('dirty'); void flush(); return }
      set('saved')
    } catch (e) {
      if (e instanceof ConflictError) { set('conflict'); setError(e.message) }
      else {
        const transient = !(e instanceof ApiError && (e.code === '42501' || e.status === 403))
        setError(e instanceof Error ? e.message : 'Save failed')
        set('error')
        if (transient && attempts.current < RETRY_MS.length) {
          timer.current = window.setTimeout(() => void flush(), RETRY_MS[attempts.current++])
        }
      }
    } finally {
      inFlight.current = false
    }
  }, [noteId, qc])

  const markDirty = useCallback(() => {
    if (stateRef.current === 'conflict') return
    set('dirty')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void flush(), delay)
  }, [delay, flush])

  const retry = useCallback(() => { attempts.current = 0; void flush() }, [flush])

  /** After resolving a conflict (reload or overwrite) adopt the server's current version. */
  const adoptServerVersion = useCallback(async () => {
    const { data } = await supabase.from('notes').select('version').eq('id', noteId).maybeSingle()
    if (data) versionRef.current = (data as { version: number }).version
    set('idle'); setError(null)
  }, [noteId])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (['dirty', 'saving', 'error'].includes(stateRef.current)) { e.preventDefault(); e.returnValue = '' }
    }
    const hidden = () => { if (document.visibilityState === 'hidden' && stateRef.current === 'dirty') void flush() }
    window.addEventListener('beforeunload', warn)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('beforeunload', warn)
      document.removeEventListener('visibilitychange', hidden)
      window.clearTimeout(timer.current)
      if (stateRef.current === 'dirty') void flush() // best effort on route change
    }
  }, [flush])

  return { state, error, savedAt, markDirty, saveNow: flush, retry, adoptServerVersion, versionRef }
}
