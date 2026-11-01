import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Activity, Pencil, Plus, Trash2 } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSetDeleted, useSpace, useSpaceActivity, useSpaceRole } from '../api/spaces'
import { useSemesters } from '../api/hierarchy'
import { SemesterDialog, SpaceDialog } from '../components/dialogs/EntityDialogs'
import MembersPanel from '../components/MembersPanel'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import NotAvailable from '../components/ui/NotAvailable'
import PageHeader from '../components/ui/PageHeader'
import { VisibilityBadge } from '../components/ui/Badge'
import { PageSkeleton } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import { useToast } from '../components/ui/Toast'
import { friendlyMessage } from '../lib/errors'
import { formatDate } from '../utils/format'

export default function SpacePage() {
  const { spaceId } = useParams()
  const space = useSpace(spaceId)
  const role = useSpaceRole(spaceId, space.data?.owner_id)
  const sems = useSemesters(spaceId)
  const activity = useSpaceActivity(spaceId, role !== null)
  const del = useSetDeleted('academic_spaces')
  const toast = useToast(); const navigate = useNavigate()
  const [edit, setEdit] = useState(false); const [addSem, setAddSem] = useState(false); const [confirm, setConfirm] = useState(false)
  useDocumentTitle(space.data?.title ?? 'Space')

  if (space.isLoading) return <PageSkeleton />
  if (!space.data) return <NotAvailable what="space" />
  const s = space.data
  const canEdit = role === 'owner' || role === 'editor'

  return (
    <>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: s.title }]} />
      <PageHeader eyebrow={<span className="inline-flex items-center gap-2">Academic space <VisibilityBadge value={s.visibility} /></span>}
        title={<><span aria-hidden="true">{s.icon ?? '📚'}</span> {s.title}</>}
        description={<>{s.description || 'No description yet.'}{s.profiles && <span className="mt-1 block text-xs">Created by {s.profiles.display_name || s.profiles.username}</span>}</>}
        actions={<>
          {canEdit && <button type="button" className="btn-primary" onClick={() => setAddSem(true)}><Plus className="h-4 w-4" aria-hidden="true" />Add semester</button>}
          {role === 'owner' && <button type="button" className="btn-secondary" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit &amp; visibility</button>}
          {role === 'owner' && !s.is_default && <button type="button" className="btn-ghost text-rose-600" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button>}
        </>} />

      <section aria-labelledby="sems-h">
        <h2 id="sems-h" className="mb-4 text-lg">Semesters</h2>
        {sems.isLoading ? <div className="skeleton h-28" /> : sems.data?.length ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sems.data.map((sem) => (
              <li key={sem.id}><Link to={`/semesters/${sem.id}`} className="card card-hover block h-full p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{sem.number != null ? `Semester ${sem.number}` : 'Semester'}</p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{sem.title}</p>
                <p className="mt-3 flex gap-4 text-xs text-slate-500"><span>{sem.subjects[0]?.count ?? 0} subjects</span><span>{sem.notes[0]?.count ?? 0} notes</span><span>{sem.resources[0]?.count ?? 0} files</span></p>
              </Link></li>
            ))}
          </ul>
        ) : <EmptyState icon={Plus} title="No semesters" message="Add the first semester of this space." action={canEdit ? <button type="button" className="btn-primary" onClick={() => setAddSem(true)}>Add semester</button> : undefined} />}
      </section>

      {role === 'owner' && <div className="mt-10"><MembersPanel spaceId={s.id} /></div>}

      {role !== null && (
        <section aria-labelledby="act-h" className="mt-10">
          <h2 id="act-h" className="mb-3 flex items-center gap-2 text-lg"><Activity className="h-4 w-4 text-brand-600" aria-hidden="true" />Recent activity</h2>
          {activity.data?.length ? (
            <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
              {activity.data.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate"><strong>{a.profiles?.display_name || a.profiles?.username || 'Someone'}</strong> {a.event_type.includes('created') ? 'created' : 'viewed'} {a.entity_type} {a.metadata?.title && <>“{a.metadata.title}”</>}</span>
                  <time className="shrink-0 text-xs text-slate-400" dateTime={a.created_at}>{formatDate(a.created_at.slice(0, 10))}</time>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">No activity yet.</p>}
        </section>
      )}

      <SpaceDialog open={edit} onClose={() => setEdit(false)} space={s} />
      <SemesterDialog open={addSem} onClose={() => setAddSem(false)} spaceId={s.id} />
      <ConfirmDialog open={confirm} danger title="Delete this space?" message="The space and everything in it moves to the trash. You can restore it from Settings → Trash." confirmLabel="Move to trash" busy={del.isPending} onCancel={() => setConfirm(false)}
        onConfirm={() => del.mutate({ id: s.id, deleted: true }, { onSuccess: () => { toast.success('Moved to trash'); navigate('/dashboard') }, onError: (e) => toast.error(friendlyMessage(e as Error)) })} />
    </>
  )
}
