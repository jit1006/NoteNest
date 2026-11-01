import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Flag, Pencil, Share2, Trash2 } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../auth/AuthProvider'
import { useResource, useUpdateResource } from '../api/resources'
import { useSetDeleted, useSpace, useSpaceRole } from '../api/spaces'
import { useProfile } from '../api/profile'
import FileViewer from '../viewers/FileViewer'
import DownloadButton from '../viewers/DownloadButton'
import BookmarkToggle from '../components/BookmarkToggle'
import ShareDialog from '../components/dialogs/ShareDialog'
import ReportDialog from '../components/dialogs/ReportDialog'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import NotAvailable from '../components/ui/NotAvailable'
import { CategoryBadge, KindBadge, Pill, VisibilityBadge } from '../components/ui/Badge'
import { PageSkeleton } from '../components/ui/Skeleton'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import { useToast } from '../components/ui/Toast'
import { friendlyMessage } from '../lib/errors'
import { formatBytes } from '../lib/files'
import { formatDate } from '../utils/format'
import type { ResourceCategory } from '../types/db'

export default function ResourcePage() {
  const { resourceId } = useParams()
  const [sp] = useSearchParams()
  const { user } = useAuth()
  const res = useResource(resourceId)
  const r = res.data
  const space = useSpace(r?.space_id)
  const role = useSpaceRole(r?.space_id, space.data?.owner_id)
  const owner = useProfile(r?.owner_id)
  const update = useUpdateResource(); const del = useSetDeleted('resources')
  const toast = useToast(); const navigate = useNavigate()
  const [dlg, setDlg] = useState<null | 'share' | 'edit' | 'report' | 'delete'>(null)
  const [form, setForm] = useState({ title: '', description: '', category: 'notes' as ResourceCategory, year: '' })
  useDocumentTitle(r?.title ?? 'File')

  if (res.isLoading) return <PageSkeleton />
  if (!r) return <NotAvailable what="file" />
  const mine = !!user && (r.owner_id === user.id || role === 'owner')
  const canEdit = mine || role === 'editor'
  const file = r.resource_files?.[0]
  const page = Number(sp.get('page')) || 1

  const openEdit = () => { setForm({ title: r.title, description: r.description, category: r.category, year: r.academic_year ? String(r.academic_year) : '' }); setDlg('edit') }
  const save = async () => {
    try { await update.mutateAsync({ id: r.id, title: form.title.trim() || r.title, description: form.description, category: form.category, academic_year: form.category === 'pyq' && form.year ? Number(form.year) : null }); toast.success('Saved'); setDlg(null) }
    catch (e) { toast.error(friendlyMessage(e as Error)) }
  }

  return (
    <div className={user ? '' : 'container-page py-10'}>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Library', to: '/explore' }, ...(r.attached_note_id ? [{ label: 'Note attachment', to: `/notes/${r.attached_note_id}` }] : []), { label: r.title }]} />
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <div className="mb-2 flex flex-wrap items-center gap-2"><KindBadge kind={r.kind} />{r.category !== 'notes' && <CategoryBadge category={r.category} />}<VisibilityBadge value={r.visibility} />{r.academic_year && <Pill>{r.academic_year}</Pill>}</div>
          <h1 className="break-words text-2xl sm:text-3xl">{r.title}</h1>
          {r.description && <p className="mt-2 whitespace-pre-line text-slate-600 dark:text-slate-400">{r.description}</p>}
          <p className="mt-2 text-xs text-slate-500">Uploaded {formatDate(r.created_at.slice(0, 10))} by {owner.data?.display_name || owner.data?.username || '…'}{file && <> · {file.original_filename} · {formatBytes(file.size_bytes)}</>}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BookmarkToggle target={{ resourceId: r.id }} label={r.title} />
          {file && <DownloadButton file={file} variant="primary" />}
          {mine && <button type="button" className="btn-secondary" onClick={() => setDlg('share')}><Share2 className="h-4 w-4" aria-hidden="true" />Share</button>}
          {canEdit && <button type="button" className="btn-ghost" aria-label="Edit details" onClick={openEdit}><Pencil className="h-4 w-4" aria-hidden="true" /></button>}
          {canEdit && <button type="button" className="btn-ghost text-rose-600" aria-label="Move to trash" onClick={() => setDlg('delete')}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}
          {user && !mine && <button type="button" className="btn-ghost" aria-label="Report" onClick={() => setDlg('report')}><Flag className="h-4 w-4" aria-hidden="true" /></button>}
        </div>
      </header>

      <section aria-label="Preview" className="card overflow-hidden">
        {file ? <FileViewer resource={r} file={file} canAnnotate={!!user} initialPage={page} />
          : <p className="p-10 text-center text-sm text-slate-500">This item has no file attached.</p>}
      </section>
      {!user && <p className="mt-4 text-center text-sm text-slate-500"><Link to="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link> to bookmark pages and keep private highlights.</p>}

      <ShareDialog open={dlg === 'share'} onClose={() => setDlg(null)} kind="resource" id={r.id} title={r.title} visibility={r.visibility} shareToken={r.share_token} canChange={mine} />
      <ReportDialog open={dlg === 'report'} onClose={() => setDlg(null)} type="resource" id={r.id} />
      <Modal open={dlg === 'edit'} onClose={() => setDlg(null)} title="Edit details" footer={<><button type="button" className="btn-secondary" onClick={() => setDlg(null)}>Cancel</button><button type="button" className="btn-primary" disabled={update.isPending} onClick={() => void save()}>Save</button></>}>
        <div className="space-y-4">
          <div><label className="label" htmlFor="re-title">Title</label><input id="re-title" className="input" value={form.title} maxLength={200} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="label" htmlFor="re-desc">Description</label><textarea id="re-desc" rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label" htmlFor="re-cat">Category</label><select id="re-cat" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ResourceCategory })}><option value="notes">Notes</option><option value="pyq">Practice / past paper</option><option value="reference">Quick reference</option><option value="assignment">Assignment</option><option value="other">Other</option></select></div>
            {form.category === 'pyq' && <div><label className="label" htmlFor="re-year">Exam year</label><input id="re-year" className="input" inputMode="numeric" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></div>}
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={dlg === 'delete'} danger title="Move to trash?" message="You can restore it from Settings → Trash." confirmLabel="Move to trash" busy={del.isPending} onCancel={() => setDlg(null)}
        onConfirm={() => del.mutate({ id: r.id, deleted: true }, { onSuccess: () => { toast.success('Moved to trash'); navigate(-1) }, onError: (e) => toast.error(friendlyMessage(e as Error)) })} />
    </div>
  )
}
