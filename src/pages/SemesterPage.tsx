import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FilePlus2, NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSemester, useSubjectsOfSemester } from '../api/hierarchy'
import { useSetDeleted, useSpaceRole } from '../api/spaces'
import { useNoteList } from '../api/notes'
import { useResourceList } from '../api/resources'
import { NoteCard, ResourceCard, SubjectCard } from '../components/ItemCards'
import { NewNoteDialog, SemesterDialog, SubjectDialog } from '../components/dialogs/EntityDialogs'
import UploadDialog from '../components/dialogs/UploadDialog'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import NotAvailable from '../components/ui/NotAvailable'
import PageHeader from '../components/ui/PageHeader'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import { PageSkeleton } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { friendlyMessage } from '../lib/errors'

export default function SemesterPage() {
  const { semesterId } = useParams()
  const sem = useSemester(semesterId)
  const space = sem.data?.academic_spaces
  const role = useSpaceRole(space?.id, space?.owner_id)
  const subjects = useSubjectsOfSemester(semesterId)
  const notes = useNoteList({ semesterId }, !!semesterId)
  const files = useResourceList({ semesterId }, !!semesterId)
  const del = useSetDeleted('semesters')
  const toast = useToast(); const navigate = useNavigate()
  const [dlg, setDlg] = useState<null | 'subject' | 'edit' | 'note' | 'upload' | 'delete'>(null)
  useDocumentTitle(sem.data?.title ?? 'Semester')

  if (sem.isLoading) return <PageSkeleton />
  if (!sem.data || !space) return <NotAvailable what="semester" />
  const s = sem.data
  const canEdit = role === 'owner' || role === 'editor'
  const loose = notes.data?.filter((n) => !n.subject_id) ?? []
  const looseFiles = files.data?.filter((r) => !r.subject_id) ?? []

  return (
    <>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: space.title, to: `/spaces/${space.id}` }, { label: s.title }]} />
      <PageHeader eyebrow={s.number != null ? `Semester ${s.number}` : 'Semester'} title={s.title} description={s.description || undefined}
        actions={canEdit && <>
          <button type="button" className="btn-primary" onClick={() => setDlg('note')}><NotebookPen className="h-4 w-4" aria-hidden="true" />New note</button>
          <button type="button" className="btn-secondary" onClick={() => setDlg('upload')}><FilePlus2 className="h-4 w-4" aria-hidden="true" />Upload</button>
          <button type="button" className="btn-secondary" onClick={() => setDlg('subject')}><Plus className="h-4 w-4" aria-hidden="true" />Subject</button>
          <button type="button" className="btn-ghost" onClick={() => setDlg('edit')} aria-label="Edit semester"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
          {role === 'owner' && <button type="button" className="btn-ghost text-rose-600" onClick={() => setDlg('delete')} aria-label="Delete semester"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}
        </>} />

      <section aria-labelledby="subj-h">
        <h2 id="subj-h" className="mb-4 text-lg">Subjects</h2>
        {subjects.isLoading ? <div className="skeleton h-28" /> : subjects.data?.length ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{subjects.data.map((sub) => <li key={sub.id}><SubjectCard subject={sub} notes={sub.notes[0]?.count ?? 0} resources={sub.resources[0]?.count ?? 0} /></li>)}</ul>
        ) : <EmptyState icon={Plus} title="No subjects yet" message="Add subjects like “Database Management Systems” to organise this semester." action={canEdit ? <button type="button" className="btn-primary" onClick={() => setDlg('subject')}>Add subject</button> : undefined} />}
      </section>

      {(loose.length > 0 || looseFiles.length > 0) && (
        <section aria-labelledby="loose-h" className="mt-10">
          <h2 id="loose-h" className="mb-4 text-lg">Not in a subject</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {loose.map((n) => <li key={n.id}><NoteCard note={n} /></li>)}
            {looseFiles.map((r) => <li key={r.id}><ResourceCard resource={r} /></li>)}
          </ul>
        </section>
      )}

      <SubjectDialog open={dlg === 'subject'} onClose={() => setDlg(null)} spaceId={space.id} semesterId={s.id} />
      <SemesterDialog open={dlg === 'edit'} onClose={() => setDlg(null)} spaceId={space.id} semester={s} />
      <NewNoteDialog open={dlg === 'note'} onClose={() => setDlg(null)} defaults={{ spaceId: space.id, semesterId: s.id }} />
      <UploadDialog open={dlg === 'upload'} onClose={() => setDlg(null)} destination={{ spaceId: space.id, semesterId: s.id }} />
      <ConfirmDialog open={dlg === 'delete'} danger title="Delete this semester?" message="Its subjects, notes and files move to the trash (restorable from Settings)." confirmLabel="Move to trash" busy={del.isPending} onCancel={() => setDlg(null)}
        onConfirm={() => del.mutate({ id: s.id, deleted: true }, { onSuccess: () => { toast.success('Moved to trash'); navigate(`/spaces/${space.id}`) }, onError: (e) => toast.error(friendlyMessage(e as Error)) })} />
    </>
  )
}
