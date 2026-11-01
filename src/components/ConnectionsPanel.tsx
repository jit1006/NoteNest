import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, Link2, Network, Trash2 } from 'lucide-react'
import { RELATION_HINT, RELATION_LABEL, useBacklinks, useOutgoingRefs, useRemoveReference, type RefRow } from '../api/references'
import LinkNoteDialog, { semLabel } from './dialogs/LinkNoteDialog'
import { useToast } from './ui/Toast'
import { friendlyMessage } from '../lib/errors'

function RefCard({ r, currentSemesterId, canRemove, direction }: { r: RefRow; currentSemesterId: string; canRemove: boolean; direction: 'out' | 'in' }) {
  const remove = useRemoveReference()
  const toast = useToast()
  if (!r.note) return null
  const cross = r.note.semester_id !== currentSemesterId
  return (
    <li className="card flex items-start gap-3 p-3">
      <span aria-hidden="true" className="text-xl">{r.note.icon ?? '📝'}</span>
      <div className="min-w-0 flex-1">
        <Link to={`/notes/${r.note.id}`} className="block truncate text-sm font-semibold text-slate-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-300">{r.note.title}</Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="rounded-full bg-brand-100 px-2 py-0.5 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
            {direction === 'out' ? RELATION_LABEL[r.relation_type] : `${RELATION_HINT[r.relation_type]} this`}
          </span>
          <span>{semLabel(r.note)}</span>
          {cross && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">Cross-semester</span>}
        </p>
        {r.description && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{r.description}</p>}
      </div>
      {canRemove && (
        <button type="button" aria-label={`Remove link to ${r.note.title}`} className="btn-ghost h-8 w-8 p-0 text-slate-400 hover:text-rose-600"
          onClick={() => remove.mutate(r.id, { onError: (e) => toast.error(friendlyMessage(e as Error)) })}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </li>
  )
}

/** Outgoing references + incoming backlinks. Rows pointing at notes the viewer cannot read never arrive (RLS). */
export default function ConnectionsPanel({ noteId, semesterId, canEdit }: { noteId: string; semesterId: string; canEdit: boolean }) {
  const out = useOutgoingRefs(noteId)
  const back = useBacklinks(noteId)
  const [open, setOpen] = useState(false)

  return (
    <section aria-labelledby="conn-title" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="conn-title" className="flex items-center gap-2 text-base"><Network className="h-4 w-4 text-brand-600" aria-hidden="true" />Connections</h2>
        <div className="flex gap-2">
          <Link to={`/references?note=${noteId}`} className="btn-ghost px-2 text-xs">Explore graph</Link>
          {canEdit && <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setOpen(true)}><Link2 className="h-3.5 w-3.5" aria-hidden="true" />Link a note</button>}
        </div>
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />This note links to</h3>
        {out.isLoading ? <div className="skeleton h-14" /> : out.data?.some((r) => r.note) ? (
          <ul className="space-y-2">{out.data.map((r) => <RefCard key={r.id} r={r} currentSemesterId={semesterId} canRemove={canEdit} direction="out" />)}</ul>
        ) : <p className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700">No outgoing links yet.</p>}
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><ArrowDownLeft className="h-3.5 w-3.5" aria-hidden="true" />Linked from (backlinks)</h3>
        {back.isLoading ? <div className="skeleton h-14" /> : back.data?.some((r) => r.note) ? (
          <ul className="space-y-2">{back.data.map((r) => <RefCard key={r.id} r={r} currentSemesterId={semesterId} canRemove={false} direction="in" />)}</ul>
        ) : <p className="rounded-xl border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700">No other notes link here yet.</p>}
      </div>

      {canEdit && <LinkNoteDialog open={open} onClose={() => setOpen(false)} sourceId={noteId} />}
    </section>
  )
}
