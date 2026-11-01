import { useEffect, useState } from 'react'
import { Link2, Search } from 'lucide-react'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import { useToast } from '../ui/Toast'
import { RELATION_HINT, RELATION_LABEL, RELATION_TYPES, useAddReference, useLinkSearch, type NoteBrief } from '../../api/references'
import { friendlyMessage } from '../../lib/errors'
import type { RelationType } from '../../types/db'

export const semLabel = (n: NoteBrief) => `${n.semesters?.number != null ? `Sem ${n.semesters.number}` : (n.semesters?.title ?? 'Unfiled')}${n.subjects?.title ? ` · ${n.subjects.title}` : ''}`

export default function LinkNoteDialog({ open, onClose, sourceId }: { open: boolean; onClose: () => void; sourceId: string }) {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [type, setType] = useState<RelationType>('related')
  const [picked, setPicked] = useState<NoteBrief | null>(null)
  const [description, setDescription] = useState('')
  const search = useLinkSearch(debounced, open ? sourceId : undefined)
  const add = useAddReference()

  useEffect(() => { const t = window.setTimeout(() => setDebounced(q), 250); return () => window.clearTimeout(t) }, [q])
  useEffect(() => { if (!open) { setQ(''); setPicked(null); setDescription(''); setType('related') } }, [open])

  const submit = async () => {
    if (!picked) return
    try {
      await add.mutateAsync({ source: sourceId, target: picked.id, type, description })
      toast.success(`Linked to “${picked.title}”`)
      onClose()
    } catch (e) { toast.error(friendlyMessage(e as Error)) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Link a note" description="Connect this note to any note you can access — in any semester or space." size="lg"
      footer={<><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn-primary" disabled={!picked || add.isPending} onClick={() => void submit()}><Link2 className="h-4 w-4" aria-hidden="true" />{add.isPending ? 'Linking…' : 'Add link'}</button></>}>
      <label htmlFor="link-search" className="label">Search notes</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input id="link-search" className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title contains…" autoFocus />
      </div>

      <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700" role="listbox" aria-label="Matching notes">
        {search.isLoading && <div className="p-3"><Spinner label="Searching" /></div>}
        {search.data?.length === 0 && <p className="p-4 text-center text-sm text-slate-500">No accessible notes match “{debounced}”.</p>}
        {search.data?.map((n) => (
          <button key={n.id} type="button" role="option" aria-selected={picked?.id === n.id} onClick={() => setPicked(n)}
            className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60 ${picked?.id === n.id ? 'bg-brand-50 dark:bg-brand-500/10' : ''}`}>
            <span aria-hidden="true" className="text-lg">{n.icon ?? '📝'}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{n.title}</span><span className="text-xs text-slate-500">{semLabel(n)}</span></span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rel-type" className="label">Relationship</label>
          <select id="rel-type" className="input" value={type} onChange={(e) => setType(e.target.value as RelationType)}>
            {RELATION_TYPES.map((r) => <option key={r} value={r}>{RELATION_LABEL[r]} — {RELATION_HINT[r]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rel-desc" className="label">Note (optional)</label>
          <input id="rel-desc" className="input" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why are these connected?" />
        </div>
      </div>
    </Modal>
  )
}
