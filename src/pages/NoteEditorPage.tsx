import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { BookOpen, History, ImagePlus, Save, Share2, X } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../auth/AuthProvider'
import { saveNoteContent, useNote, useNoteVersions, useUpdateNoteMeta } from '../api/notes'
import { useSpace, useSpaceRole } from '../api/spaces'
import { uploadResource } from '../api/files'
import NoteEditor, { SaveIndicator } from '../editor/NoteEditor'
import type { SaveState } from '../editor/useAutosave'
import { sanitizeDoc, wordCount } from '../editor/sanitize'
import ConnectionsPanel from '../components/ConnectionsPanel'
import IconPicker from '../components/IconPicker'
import ResourceImage from '../components/ResourceImage'
import ShareDialog from '../components/dialogs/ShareDialog'
import Modal from '../components/ui/Modal'
import NotAvailable from '../components/ui/NotAvailable'
import EmptyState from '../components/ui/EmptyState'
import { VisibilityBadge } from '../components/ui/Badge'
import { PageSkeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { friendlyMessage } from '../lib/errors'
import { supabase } from '../lib/supabase'
import { IMAGE_ACCEPT } from '../lib/files'
import type { Note, TiptapDoc } from '../types/db'
import { Lock } from 'lucide-react'

interface SaveInfo { state: SaveState; error: string | null; savedAt: Date | null; retry: () => void; saveNow: () => void }

function VersionHistory({ open, onClose, note, onRestored, flush }: { open: boolean; onClose: () => void; note: Note; onRestored: () => void; flush: () => void }) {
  const toast = useToast(); const qc = useQueryClient()
  const versions = useNoteVersions(note.id, open)
  const [busy, setBusy] = useState<string | null>(null)
  const restore = async (v: { id: string; title: string; content: TiptapDoc }) => {
    setBusy(v.id)
    try {
      flush()
      await new Promise((r) => setTimeout(r, 400))
      const { data: current, error } = await supabase.from('notes').select('version').eq('id', note.id).single()
      if (error || !current) throw error ?? new Error('Note not found')
      await saveNoteContent({ id: note.id, version: (current as { version: number }).version, title: v.title, content: sanitizeDoc(v.content) as TiptapDoc })
      await qc.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Version restored'); onRestored(); onClose()
    } catch (e) { toast.error(friendlyMessage(e as Error)) } finally { setBusy(null) }
  }
  return (
    <Modal open={open} onClose={onClose} title="Version history" description="Earlier states are captured automatically (at most one every 5 minutes). Restoring creates a new version — nothing is lost." size="lg">
      {versions.isLoading ? <div className="skeleton h-24" /> : versions.data?.length ? (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {versions.data.map((v) => (
            <li key={v.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{v.title}</p><p className="text-xs text-slate-500">v{v.version} · {new Date(v.created_at).toLocaleString()} · {wordCount(sanitizeDoc(v.content))} words</p></div>
              <button type="button" className="btn-secondary px-3 py-1.5 text-xs" disabled={busy !== null} onClick={() => void restore(v)}>{busy === v.id ? 'Restoring…' : 'Restore'}</button>
            </li>
          ))}
        </ul>
      ) : <p className="py-6 text-center text-sm text-slate-500">No earlier versions yet — they appear after you keep editing.</p>}
    </Modal>
  )
}

export default function NoteEditorPage() {
  const { noteId } = useParams()
  const { user } = useAuth()
  const noteQ = useNote(noteId)
  const note = noteQ.data
  const space = useSpace(note?.space_id)
  const role = useSpaceRole(note?.space_id, space.data?.owner_id)
  const meta = useUpdateNoteMeta()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [ready, setReady] = useState(false)
  const [save, setSave] = useState<SaveInfo>({ state: 'idle', error: null, savedAt: null, retry: () => {}, saveNow: () => {} })
  const [dlg, setDlg] = useState<null | 'share' | 'history'>(null)
  const [editorKey, setEditorKey] = useState(0)
  const [coverBusy, setCoverBusy] = useState(false)
  useDocumentTitle(title ? `Editing: ${title}` : 'Editor')

  useEffect(() => { if (note && !ready) { setTitle(note.title); setReady(true) } }, [note, ready])
  const onSaveState = useCallback((s: SaveInfo) => setSave(s), [])

  if (noteQ.isLoading || (note && !ready)) return <PageSkeleton />
  if (!note) return <NotAvailable what="note" />
  const canEdit = role === 'owner' || role === 'editor'
  if (!canEdit) {
    return (
      <div className="py-12"><EmptyState icon={Lock} title="You can read this note, but not edit it" message="Only the owner and editors of this space can change it."
        action={<Link to={`/notes/${note.id}`} className="btn-primary"><BookOpen className="h-4 w-4" aria-hidden="true" />Open reading view</Link>} /></div>
    )
  }
  const manage = note.owner_id === user?.id || role === 'owner'

  const setCover = async (file: File | null) => {
    if (!user) return
    setCoverBusy(true)
    try {
      if (!file) await meta.mutateAsync({ id: note.id, cover_resource_id: null })
      else {
        const r = await uploadResource({ file, ownerId: user.id, space_id: note.space_id, semester_id: note.semester_id, subject_id: note.subject_id, attached_note_id: note.id, category: 'other', allowedKinds: ['image'] })
        await meta.mutateAsync({ id: note.id, cover_resource_id: r.id })
      }
    } catch (e) { toast.error(friendlyMessage(e as Error)) } finally { setCoverBusy(false) }
  }

  return (
    <div>
      <div className="sticky top-16 z-30 -mx-4 -mt-8 mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur lg:-mx-8 lg:px-8 dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex items-center gap-3"><Link to={`/notes/${note.id}`} className="btn-ghost px-2 text-sm"><BookOpen className="h-4 w-4" aria-hidden="true" />Reading view</Link><VisibilityBadge value={note.visibility} /></div>
        <div className="flex items-center gap-3">
          <SaveIndicator state={save.state} error={save.error} savedAt={save.savedAt} onRetry={save.retry} />
          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => save.saveNow()} disabled={save.state === 'saving'}><Save className="h-3.5 w-3.5" aria-hidden="true" />Save</button>
          <button type="button" className="btn-ghost px-2 text-xs" onClick={() => setDlg('history')}><History className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">History</span></button>
          {manage && <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setDlg('share')}><Share2 className="h-3.5 w-3.5" aria-hidden="true" />Share</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {note.cover_resource_id && (
            <div className="group relative -mx-4 mb-4 overflow-hidden sm:mx-0 sm:rounded-2xl [&_img]:max-h-60 [&_img]:w-full [&_img]:rounded-none [&_img]:object-cover">
              <ResourceImage resourceId={note.cover_resource_id} alt="" />
              <button type="button" onClick={() => void setCover(null)} className="absolute right-3 top-3 rounded-lg bg-white/90 p-1.5 shadow dark:bg-slate-900/90" aria-label="Remove cover"><X className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          )}
          <div className="mb-4 flex items-start gap-3">
            <IconPicker value={note.icon} onChange={(icon) => meta.mutate({ id: note.id, icon }, { onError: (e) => toast.error(friendlyMessage(e as Error)) })} />
            <div className="min-w-0 flex-1">
              <label htmlFor="note-title" className="sr-only">Note title</label>
              <input id="note-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled"
                className="w-full bg-transparent text-3xl font-extrabold tracking-tight text-slate-900 outline-none placeholder:text-slate-300 sm:text-4xl dark:text-white" />
              {!note.cover_resource_id && (
                <label className="mt-1 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600">
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />{coverBusy ? 'Uploading cover…' : 'Add cover'}
                  <input type="file" accept={IMAGE_ACCEPT} hidden aria-label="Choose cover image" disabled={coverBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void setCover(f); e.target.value = '' }} />
                </label>
              )}
            </div>
          </div>
          <NoteEditor key={editorKey} note={note} title={title} onTitleChange={setTitle} onSaveState={onSaveState} />
        </div>
        <aside aria-label="Connections" className="xl:sticky xl:top-36 xl:h-fit">
          <ConnectionsPanel noteId={note.id} semesterId={note.semester_id} canEdit />
        </aside>
      </div>

      <ShareDialog open={dlg === 'share'} onClose={() => setDlg(null)} kind="note" id={note.id} title={note.title} visibility={note.visibility} shareToken={note.share_token} canChange={manage} />
      <VersionHistory open={dlg === 'history'} onClose={() => setDlg(null)} note={note} flush={save.saveNow} onRestored={() => { setReady(false); setEditorKey((k) => k + 1) }} />
    </div>
  )
}
