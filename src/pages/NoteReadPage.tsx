import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Bookmark, BookmarkCheck, BookOpen, Flag, Highlighter, Maximize2, Minimize2, Pencil, Share2, Trash2 } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../auth/AuthProvider'
import { useNote } from '../api/notes'
import { useSetDeleted, useSpace, useSpaceRole } from '../api/spaces'
import { useNoteAnnotations, useDeleteAnnotation } from '../api/annotations'
import { useBookmarkToggle } from '../api/bookmarks'
import { useContainerLabels } from '../api/context'
import { useProfile } from '../api/profile'
import NoteRenderer from '../editor/NoteRenderer'
import { extractHeadings, sanitizeDoc, wordCount } from '../editor/sanitize'
import ConnectionsPanel from '../components/ConnectionsPanel'
import BookmarkToggle from '../components/BookmarkToggle'
import ResourceImage from '../components/ResourceImage'
import ShareDialog from '../components/dialogs/ShareDialog'
import ReportDialog from '../components/dialogs/ReportDialog'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import NotAvailable from '../components/ui/NotAvailable'
import { VisibilityBadge } from '../components/ui/Badge'
import { PageSkeleton } from '../components/ui/Skeleton'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import { useToast } from '../components/ui/Toast'
import { friendlyMessage } from '../lib/errors'
import { formatDate } from '../utils/format'
import type { TiptapDoc } from '../types/db'

function TocItem({ noteId, h, signedIn, onJump }: { noteId: string; h: { blockId: string; level: number; text: string }; signedIn: boolean; onJump: () => void }) {
  const { saved, toggle, pending } = useBookmarkToggle({ noteId, blockId: h.blockId }, h.text)
  const Icon = saved ? BookmarkCheck : Bookmark
  return (
    <li className="group flex items-center gap-1" style={{ paddingLeft: `${(h.level - 1) * 0.75}rem` }}>
      <button type="button" onClick={onJump} className="min-w-0 flex-1 truncate rounded px-1 py-1 text-left text-sm text-slate-600 hover:text-brand-600 dark:text-slate-300">{h.text}</button>
      {signedIn && <button type="button" disabled={pending} onClick={() => toggle()} aria-pressed={saved} aria-label={saved ? `Remove bookmark for ${h.text}` : `Bookmark ${h.text}`} className={`rounded p-1 ${saved ? 'text-brand-600' : 'text-slate-300 hover:text-brand-500'}`}><Icon className="h-3.5 w-3.5" aria-hidden="true" /></button>}
    </li>
  )
}

export default function NoteReadPage() {
  const { noteId } = useParams()
  const [sp, setSp] = useSearchParams()
  const { user } = useAuth()
  const noteQ = useNote(noteId)
  const note = noteQ.data
  const space = useSpace(note?.space_id)
  const role = useSpaceRole(note?.space_id, space.data?.owner_id)
  const labels = useContainerLabels(note?.semester_id, note?.subject_id)
  const owner = useProfile(note?.owner_id)
  const annotations = useNoteAnnotations(noteId)
  const delAnn = useDeleteAnnotation()
  const del = useSetDeleted('notes')
  const toast = useToast(); const navigate = useNavigate()
  const [dlg, setDlg] = useState<null | 'share' | 'report' | 'delete'>(null)
  const [fontScale, setFontScale] = useState(() => Number(localStorage.getItem('notenest:read-scale')) || 1)
  const focus = sp.get('focus') === '1'
  useDocumentTitle(note?.title ?? 'Note')

  const doc = useMemo(() => (note ? sanitizeDoc(note.content) : null), [note])
  const headings = useMemo(() => (doc ? extractHeadings(doc) : []), [doc])
  const words = doc ? wordCount(doc) : 0

  if (noteQ.isLoading) return <PageSkeleton />
  if (!note || !doc) return <NotAvailable what="note" />
  const canEdit = role === 'owner' || role === 'editor'
  const manage = !!user && (note.owner_id === user.id || role === 'owner')
  const toggleFocus = () => { const n = new URLSearchParams(sp); focus ? n.delete('focus') : n.set('focus', '1'); setSp(n, { replace: true }) }
  const scale = (d: number) => { const v = Math.min(1.5, Math.max(0.85, +(fontScale + d).toFixed(2))); setFontScale(v); localStorage.setItem('notenest:read-scale', String(v)) }
  const jump = (id: string) => { document.querySelector(`[data-block-id="${CSS.escape(id)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  const semLabel = labels.data ? (labels.data.semester_number != null ? `Semester ${labels.data.semester_number}` : labels.data.semester_title) : null

  const body = (
    <article style={{ fontSize: `${fontScale}rem` }} className="min-w-0">
      {note.cover_resource_id && <div className="-mx-4 mb-6 overflow-hidden sm:mx-0 sm:rounded-2xl [&_img]:max-h-72 [&_img]:w-full [&_img]:rounded-none [&_img]:object-cover"><ResourceImage resourceId={note.cover_resource_id} alt="" /></div>}
      <div className="mb-6 flex items-start gap-3">
        <span aria-hidden="true" className="text-5xl">{note.icon ?? '📝'}</span>
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-extrabold sm:text-4xl">{note.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <VisibilityBadge value={note.visibility} />
            <span>by {owner.data?.display_name || owner.data?.username || '…'}</span>
            <span>Updated {formatDate(note.updated_at.slice(0, 10))}</span>
            <span>{words} words · {Math.max(1, Math.round(words / 200))} min read</span>
            {semLabel && <span>{semLabel}{labels.data?.subject_title ? ` · ${labels.data.subject_title}` : ''}</span>}
          </p>
        </div>
      </div>
      <NoteRenderer noteId={note.id} doc={doc as TiptapDoc} annotations={annotations.data ?? []} canAnnotate={!!user} scrollToBlock={sp.get('block')} />
    </article>
  )

  if (focus) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
        <div className="sticky top-3 z-20 mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-soft backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <button type="button" className="btn-ghost" onClick={toggleFocus}><Minimize2 className="h-4 w-4" aria-hidden="true" />Exit reading mode</button>
          <div className="flex items-center gap-1" role="group" aria-label="Text size"><button type="button" className="btn-ghost h-9 w-9 p-0 text-xs" aria-label="Smaller text" onClick={() => scale(-0.1)}>A−</button><button type="button" className="btn-ghost h-9 w-9 p-0" aria-label="Larger text" onClick={() => scale(0.1)}>A+</button></div>
        </div>
        {body}
      </div>
    )
  }

  return (
    <div className={user ? '' : 'container-page py-10'}>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, ...(space.data ? [{ label: space.data.title, to: `/spaces/${space.data.id}` }] : [{ label: 'Library', to: '/explore' }]), ...(semLabel ? [{ label: semLabel }] : []), { label: note.title }]} />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {canEdit && <Link to={`/notes/${note.id}/edit`} className="btn-primary"><Pencil className="h-4 w-4" aria-hidden="true" />Edit</Link>}
        <BookmarkToggle target={{ noteId: note.id }} label={note.title} />
        <button type="button" className="btn-secondary" onClick={toggleFocus}><Maximize2 className="h-4 w-4" aria-hidden="true" />Reading mode</button>
        {manage && <button type="button" className="btn-secondary" onClick={() => setDlg('share')}><Share2 className="h-4 w-4" aria-hidden="true" />Share</button>}
        {canEdit && role === 'owner' && <button type="button" className="btn-ghost text-rose-600" aria-label="Move to trash" onClick={() => setDlg('delete')}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}
        {user && !manage && <button type="button" className="btn-ghost" aria-label="Report" onClick={() => setDlg('report')}><Flag className="h-4 w-4" aria-hidden="true" /></button>}
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[14rem_minmax(0,1fr)_20rem]">
        <nav aria-label="Table of contents" className="hidden xl:block"><div className="sticky top-24">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400"><BookOpen className="h-3.5 w-3.5" aria-hidden="true" />Contents</h2>
          {headings.length ? <ul className="space-y-0.5">{headings.map((h) => <TocItem key={h.blockId} noteId={note.id} h={h} signedIn={!!user} onJump={() => jump(h.blockId)} />)}</ul> : <p className="text-xs text-slate-400">No headings.</p>}
        </div></nav>

        <div className="min-w-0 xl:pl-8">
          {body}
          {!user && <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700"><Link to="/login" state={{ from: `/notes/${note.id}` }} className="font-semibold text-brand-600 hover:underline">Sign in</Link> to bookmark this note, highlight passages and add private comments.</p>}
        </div>

        <aside aria-label="Connections and highlights" className="space-y-8">
          <ConnectionsPanel noteId={note.id} semesterId={note.semester_id} canEdit={canEdit} />
          {user && (
            <section aria-labelledby="hl-h">
              <h2 id="hl-h" className="mb-3 flex items-center gap-2 text-base"><Highlighter className="h-4 w-4 text-brand-600" aria-hidden="true" />My highlights</h2>
              {annotations.data?.length ? (
                <ul className="space-y-2">{annotations.data.map((a) => (
                  <li key={a.id} className="card p-3 text-sm">
                    <button type="button" className="block w-full text-left" onClick={() => a.anchor.type === 'block' && jump(a.anchor.blockId)}><span className="line-clamp-2 italic">“{a.quote}”</span></button>
                    {a.comment && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{a.comment}</p>}
                    <button type="button" className="mt-1 text-xs text-rose-600 hover:underline" onClick={() => delAnn.mutate(a.id)}>Remove</button>
                  </li>
                ))}</ul>
              ) : <p className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700">Select text in the note to highlight it. Highlights are private to you.</p>}
            </section>
          )}
        </aside>
      </div>

      <ShareDialog open={dlg === 'share'} onClose={() => setDlg(null)} kind="note" id={note.id} title={note.title} visibility={note.visibility} shareToken={note.share_token} canChange={manage} />
      <ReportDialog open={dlg === 'report'} onClose={() => setDlg(null)} type="note" id={note.id} />
      <ConfirmDialog open={dlg === 'delete'} danger title="Move this note to the trash?" message="You can restore it from Settings → Trash." confirmLabel="Move to trash" busy={del.isPending} onCancel={() => setDlg(null)}
        onConfirm={() => del.mutate({ id: note.id, deleted: true }, { onSuccess: () => { toast.success('Moved to trash'); navigate('/dashboard') }, onError: (e) => toast.error(friendlyMessage(e as Error)) })} />
    </div>
  )
}
