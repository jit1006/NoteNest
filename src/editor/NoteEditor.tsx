import { useCallback, useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, CloudOff, Loader2, RefreshCw, Save } from 'lucide-react'
import type { Note } from '../types/db'
import { buildExtensions } from './extensions'
import { sanitizeDoc } from './sanitize'
import { useAutosave, type SaveState } from './useAutosave'
import Toolbar from './Toolbar'
import { uploadResource } from '../api/files'
import { useUid } from '../api/helpers'
import { useToast } from '../components/ui/Toast'
import { friendlyMessage } from '../lib/errors'
import { supabase } from '../lib/supabase'

export function SaveIndicator({ state, error, savedAt, onRetry }: { state: SaveState; error: string | null; savedAt: Date | null; onRetry: () => void }) {
  const base = 'inline-flex items-center gap-1.5 text-xs font-medium'
  if (state === 'saving') return <span role="status" className={`${base} text-slate-500`}><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Saving…</span>
  if (state === 'dirty') return <span role="status" className={`${base} text-slate-500`}><Save className="h-3.5 w-3.5" aria-hidden="true" />Unsaved changes</span>
  if (state === 'error') return (
    <span role="alert" className={`${base} text-rose-600 dark:text-rose-400`}>
      <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />Save failed{error ? ` — ${error}` : ''}
      <button type="button" onClick={onRetry} className="ml-1 inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-0.5 hover:bg-rose-50 dark:border-rose-500/40"><RefreshCw className="h-3 w-3" aria-hidden="true" />Retry</button>
    </span>
  )
  if (state === 'conflict') return <span role="alert" className={`${base} text-amber-600`}><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />Edit conflict</span>
  if (state === 'saved') return <span role="status" className={`${base} text-emerald-600 dark:text-emerald-400`}><Check className="h-3.5 w-3.5" aria-hidden="true" />Saved{savedAt ? ` ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
  return <span className={`${base} text-slate-400`}>All changes saved</span>
}

interface Props {
  note: Note
  title: string
  onTitleChange: (t: string) => void
  /** surfaced to the page header */
  onSaveState: (s: { state: SaveState; error: string | null; savedAt: Date | null; retry: () => void; saveNow: () => void }) => void
}

export default function NoteEditor({ note, title, onTitleChange, onSaveState }: Props) {
  const uid = useUid()
  const toast = useToast()
  const qc = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const titleRef = useRef(title)
  titleRef.current = title
  const editorRef = useRef<ReturnType<typeof useEditor>>(null)

  const autosave = useAutosave({
    noteId: note.id,
    initialVersion: note.version,
    getPayload: () => ({
      title: titleRef.current.trim().slice(0, 200) || 'Untitled',
      content: sanitizeDoc(editorRef.current?.getJSON() ?? note.content) as Note['content'],
    }),
  })

  const insert = useCallback(async (file: File, as: 'image' | 'attachment') => {
    const ed = editorRef.current
    if (!ed || !uid) return
    setUploading(true)
    try {
      const r = await uploadResource({
        file, ownerId: uid, space_id: note.space_id, semester_id: note.semester_id, subject_id: note.subject_id,
        attached_note_id: note.id, category: 'other', allowedKinds: as === 'image' ? ['image'] : undefined,
      })
      if (as === 'image') ed.chain().focus().insertContent({ type: 'image', attrs: { resourceId: r.id, path: r.storage_path, alt: file.name } }).run()
      else ed.chain().focus().insertContent({ type: 'attachment', attrs: { resourceId: r.id, filename: file.name, size: file.size, kind: r.kind } }).run()
      toast.success(as === 'image' ? 'Image added' : 'File attached')
    } catch (e) {
      toast.error(friendlyMessage(e as Error))
    } finally {
      setUploading(false)
    }
  }, [uid, note.id, note.space_id, note.semester_id, note.subject_id, toast])

  const insertRef = useRef(insert)
  insertRef.current = insert

  const editor = useEditor({
    extensions: buildExtensions({ editable: true, placeholder: 'Start writing… use the toolbar for headings, lists, code, tables and more.' }),
    content: sanitizeDoc(note.content),
    editorProps: {
      attributes: { class: 'note-prose min-h-[50vh] focus:outline-none', 'aria-label': 'Note content', role: 'textbox', 'aria-multiline': 'true' },
      handlePaste: (_v, event) => {
        const f = Array.from(event.clipboardData?.files ?? []).find((x) => x.type.startsWith('image/'))
        if (!f) return false
        void insertRef.current(f, 'image'); return true
      },
      handleDrop: (_v, event) => {
        const f = Array.from((event as DragEvent).dataTransfer?.files ?? [])[0]
        if (!f) return false
        void insertRef.current(f, f.type.startsWith('image/') ? 'image' : 'attachment'); return true
      },
    },
    onUpdate: () => autosave.markDirty(),
  })
  editorRef.current = editor

  // publish save state to the page header
  useEffect(() => {
    onSaveState({ state: autosave.state, error: autosave.error, savedAt: autosave.savedAt, retry: autosave.retry, saveNow: () => void autosave.saveNow() })
  }, [autosave.state, autosave.error, autosave.savedAt, autosave.retry, autosave.saveNow, onSaveState])

  // title edits are part of the autosaved payload
  const firstTitle = useRef(true)
  useEffect(() => {
    if (firstTitle.current) { firstTitle.current = false; return }
    autosave.markDirty()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title])

  const loadLatest = async () => {
    const { data } = await supabase.from('notes').select('*').eq('id', note.id).maybeSingle()
    if (!data || !editor) return
    editor.commands.setContent(sanitizeDoc((data as Note).content))
    onTitleChange((data as Note).title)
    qc.setQueryData(['notes', 'one', note.id], data)
    await autosave.adoptServerVersion()
    toast.info('Loaded the latest version')
  }
  const overwrite = async () => { await autosave.adoptServerVersion(); autosave.markDirty() }

  if (!editor) return <div className="skeleton h-64 w-full" aria-label="Loading editor" />

  return (
    <div onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void autosave.saveNow() } }}>
      {autosave.state === 'conflict' && (
        <div role="alert" className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
          <p className="font-semibold">This note was changed somewhere else.</p>
          <p className="mt-1">Your edits were not saved yet. Choose how to continue:</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => void loadLatest()}>Load latest (discard my changes)</button>
            <button type="button" className="btn-primary" onClick={() => void overwrite()}>Keep mine and overwrite</button>
          </div>
        </div>
      )}
      <Toolbar editor={editor} uploading={uploading} onPickImage={(f) => void insert(f, 'image')} onPickAttachment={(f) => void insert(f, 'attachment')} />
      <EditorContent editor={editor} className="mt-4" />
    </div>
  )
}
