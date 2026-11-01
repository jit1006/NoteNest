import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, FileUp, Loader2, RefreshCw, UploadCloud, X } from 'lucide-react'
import { uploadResource } from '../api/files'
import { useMySpaces } from '../api/spaces'
import { useSemesters, useSubjectsOfSemester } from '../api/hierarchy'
import { invalidateAll, useUid } from '../api/helpers'
import { ACCEPT_ATTR, formatBytes } from '../lib/files'
import { friendlyMessage } from '../lib/errors'
import type { ResourceCategory, Visibility } from '../types/db'

export interface Destination { spaceId: string; semesterId: string; subjectId?: string | null; folderId?: string | null }

interface Item { id: string; file: File; status: 'queued' | 'uploading' | 'done' | 'error'; progress: number; error?: string; resourceId?: string }

export default function UploadPanel({ fixed, onDone }: { fixed?: Destination; onDone?: () => void }) {
  const uid = useUid()
  const qc = useQueryClient()
  const spaces = useMySpaces()
  const editable = [...(spaces.data?.owned ?? []), ...(spaces.data?.shared.filter((s) => s.role === 'editor').map((s) => s.space) ?? [])]
  const [spaceId, setSpaceId] = useState(fixed?.spaceId ?? '')
  const [semesterId, setSemesterId] = useState(fixed?.semesterId ?? '')
  const [subjectId, setSubjectId] = useState(fixed?.subjectId ?? '')
  const [visibility, setVisibility] = useState<Visibility>('private')
  const [category, setCategory] = useState<ResourceCategory>('notes')
  const [year, setYear] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [drag, setDrag] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const busy = useRef(false)

  const sems = useSemesters(fixed ? undefined : spaceId || undefined)
  const subs = useSubjectsOfSemester(fixed ? undefined : semesterId || undefined)

  useEffect(() => { if (!fixed && !spaceId && editable.length) setSpaceId(editable[0].id) }, [fixed, spaceId, editable])
  useEffect(() => { if (!fixed && sems.data?.length && !sems.data.some((s) => s.id === semesterId)) setSemesterId(sems.data[0].id) }, [fixed, sems.data, semesterId])

  const dest: Destination | null = fixed ?? (spaceId && semesterId ? { spaceId, semesterId, subjectId: subjectId || null } : null)

  const patch = (id: string, p: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)))

  const runQueue = useCallback(async (queue: Item[], d: Destination) => {
    if (busy.current || !uid) return
    busy.current = true
    for (const it of queue) {
      patch(it.id, { status: 'uploading', progress: 0, error: undefined })
      try {
        const r = await uploadResource({
          file: it.file, ownerId: uid, space_id: d.spaceId, semester_id: d.semesterId, subject_id: d.subjectId ?? null, folder_id: d.folderId ?? null,
          visibility, category, academic_year: category === 'pyq' && year ? Number(year) : null,
          onProgress: (p) => patch(it.id, { progress: p }),
        })
        patch(it.id, { status: 'done', progress: 1, resourceId: r.id })
      } catch (e) { patch(it.id, { status: 'error', error: friendlyMessage(e as Error) }) }
    }
    busy.current = false
    await invalidateAll(qc)
    onDone?.()
  }, [uid, visibility, category, year, qc, onDone])

  const add = (files: FileList | File[]) => {
    if (!dest) return
    const fresh: Item[] = Array.from(files).map((file) => ({ id: crypto.randomUUID(), file, status: 'queued', progress: 0 }))
    setItems((l) => [...fresh, ...l])
    void runQueue(fresh, dest)
  }
  const retry = (it: Item) => { if (dest) void runQueue([it], dest) }

  return (
    <div className="space-y-5">
      {!fixed && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div><label className="label" htmlFor="up-space">Space</label><select id="up-space" className="input" value={spaceId} onChange={(e) => { setSpaceId(e.target.value); setSemesterId(''); setSubjectId('') }}>{editable.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></div>
          <div><label className="label" htmlFor="up-sem">Semester</label><select id="up-sem" className="input" value={semesterId} onChange={(e) => { setSemesterId(e.target.value); setSubjectId('') }}>{sems.data?.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></div>
          <div><label className="label" htmlFor="up-sub">Subject</label><select id="up-sub" className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}><option value="">No subject</option>{subs.data?.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div><label className="label" htmlFor="up-vis">Visibility</label><select id="up-vis" className="input" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}><option value="private">Private</option><option value="unlisted">Unlisted (secret link)</option><option value="public">Public</option></select></div>
        <div><label className="label" htmlFor="up-cat">Category</label><select id="up-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value as ResourceCategory)}><option value="notes">Notes</option><option value="pyq">Practice / past paper</option><option value="reference">Quick reference</option><option value="assignment">Assignment</option><option value="other">Other</option></select></div>
        {category === 'pyq' && <div><label className="label" htmlFor="up-year">Exam year</label><input id="up-year" inputMode="numeric" className="input" placeholder="2025" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} /></div>}
      </div>

      <div
        role="button" tabIndex={0} aria-label="Choose files to upload, or drop them here" aria-disabled={!dest}
        onClick={() => dest && input.current?.click()}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && dest) { e.preventDefault(); input.current?.click() } }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) add(e.dataTransfer.files) }}
        className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${drag ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-300 hover:border-brand-400 dark:border-slate-700'} ${!dest ? 'opacity-50' : ''}`}>
        <UploadCloud className="mb-3 h-9 w-9 text-brand-500" aria-hidden="true" />
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Drag &amp; drop files here, or click to browse</p>
        <p className="mt-1 text-xs text-slate-500">PDF, Markdown, TXT, DOCX, PPTX, images and source code · up to 50 MB each</p>
        <input ref={input} type="file" multiple hidden accept={ACCEPT_ATTR} aria-label="Select files" onChange={(e) => { if (e.target.files?.length) add(e.target.files); e.target.value = '' }} />
      </div>
      {!dest && <p role="alert" className="text-sm text-amber-700">Choose a space and semester first.</p>}

      {items.length > 0 && (
        <ul className="space-y-2" aria-label="Upload queue">
          {items.map((it) => (
            <li key={it.id} className="card flex items-center gap-3 p-3">
              <span aria-hidden="true">{it.status === 'done' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : it.status === 'error' ? <AlertCircle className="h-5 w-5 text-rose-500" /> : it.status === 'uploading' ? <Loader2 className="h-5 w-5 animate-spin text-brand-500" /> : <FileUp className="h-5 w-5 text-slate-400" />}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{it.file.name} <span className="text-xs text-slate-400">{formatBytes(it.file.size)}</span></p>
                {it.status === 'uploading' && <div role="progressbar" aria-label={`Uploading ${it.file.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(it.progress * 100)} className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all" style={{ width: `${it.progress * 100}%` }} /></div>}
                {it.status === 'error' && <p role="alert" className="text-xs text-rose-600">{it.error}</p>}
                {it.status === 'done' && it.resourceId && <Link to={`/resources/${it.resourceId}`} className="text-xs font-semibold text-brand-600 hover:underline">Open</Link>}
              </div>
              {it.status === 'error' && <button type="button" className="btn-ghost h-8 px-2 text-xs" onClick={() => retry(it)}><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Retry</button>}
              {it.status !== 'uploading' && <button type="button" aria-label={`Remove ${it.file.name} from the list`} className="btn-ghost h-8 w-8 p-0" onClick={() => setItems((l) => l.filter((x) => x.id !== it.id))}><X className="h-4 w-4" aria-hidden="true" /></button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
