import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FilePlus2, FolderPlus, NotebookPen, Pencil, Trash2 } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useFolders, useSubject } from '../api/hierarchy'
import { useSetDeleted, useSpaceRole } from '../api/spaces'
import { useNoteList } from '../api/notes'
import { useResourceList } from '../api/resources'
import { NoteCard, ResourceCard } from '../components/ItemCards'
import { FolderDialog, NewNoteDialog, SubjectDialog } from '../components/dialogs/EntityDialogs'
import UploadDialog from '../components/dialogs/UploadDialog'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import NotAvailable from '../components/ui/NotAvailable'
import PageHeader from '../components/ui/PageHeader'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import { PageSkeleton } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import SubjectIcon from '../components/ui/SubjectIcon'
import { useToast } from '../components/ui/Toast'
import { friendlyMessage } from '../lib/errors'

export default function SubjectPage() {
  const { subjectId } = useParams()
  const subject = useSubject(subjectId)
  const sem = subject.data?.semesters
  const space = sem?.academic_spaces
  const role = useSpaceRole(space?.id, space?.owner_id)
  const folders = useFolders(subjectId)
  const [folder, setFolder] = useState<string | null | 'all'>('all')
  const notes = useNoteList({ subjectId }, !!subjectId)
  const files = useResourceList({ subjectId }, !!subjectId)
  const del = useSetDeleted('subjects'); const delFolder = useSetDeleted('folders')
  const toast = useToast(); const navigate = useNavigate()
  const [dlg, setDlg] = useState<null | 'folder' | 'edit' | 'note' | 'upload' | 'delete' | 'deleteFolder'>(null)
  useDocumentTitle(subject.data?.title ?? 'Subject')

  if (subject.isLoading) return <PageSkeleton />
  if (!subject.data || !sem || !space) return <NotAvailable what="subject" />
  const s = subject.data
  const canEdit = role === 'owner' || role === 'editor'
  const shownNotes = (notes.data ?? []).filter((n) => folder === 'all' ? true : folder === null ? !n.folder_id : n.folder_id === folder)
  const shownFiles = (files.data ?? []).filter((r) => folder === 'all' ? true : folder === null ? !r.folder_id : r.folder_id === folder)
  const folderId = typeof folder === 'string' && folder !== 'all' ? folder : null
  const chip = (active: boolean) => `rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${active ? 'border-transparent bg-gradient-to-r from-brand-600 to-accent-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`

  return (
    <>
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: space.title, to: `/spaces/${space.id}` }, { label: sem.title, to: `/semesters/${sem.id}` }, { label: s.title }]} />
      <PageHeader eyebrow={s.code ?? 'Subject'} title={<span className="flex items-center gap-3"><SubjectIcon color={s.color} size="sm" />{s.title}</span>} description={s.description ? s.description.split('\n')[0] : undefined}
        actions={canEdit && <>
          <button type="button" className="btn-primary" onClick={() => setDlg('note')}><NotebookPen className="h-4 w-4" aria-hidden="true" />New note</button>
          <button type="button" className="btn-secondary" onClick={() => setDlg('upload')}><FilePlus2 className="h-4 w-4" aria-hidden="true" />Upload</button>
          <button type="button" className="btn-secondary" onClick={() => setDlg('folder')}><FolderPlus className="h-4 w-4" aria-hidden="true" />Topic folder</button>
          <button type="button" className="btn-ghost" onClick={() => setDlg('edit')} aria-label="Edit subject"><Pencil className="h-4 w-4" aria-hidden="true" /></button>
          {role === 'owner' && <button type="button" className="btn-ghost text-rose-600" onClick={() => setDlg('delete')} aria-label="Delete subject"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}
        </>} />

      <div role="group" aria-label="Topic folders" className="mb-6 flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={folder === 'all'} className={chip(folder === 'all')} onClick={() => setFolder('all')}>All</button>
        <button type="button" aria-pressed={folder === null} className={chip(folder === null)} onClick={() => setFolder(null)}>Unfiled</button>
        {folders.data?.map((f) => <button key={f.id} type="button" aria-pressed={folder === f.id} className={chip(folder === f.id)} onClick={() => setFolder(f.id)}>📁 {f.title}</button>)}
        {canEdit && folderId && <button type="button" className="btn-ghost text-xs text-rose-600" onClick={() => setDlg('deleteFolder')}>Delete folder</button>}
      </div>

      <section aria-labelledby="n-h"><h2 id="n-h" className="mb-3 text-lg">Notes <span className="text-sm font-normal text-slate-400">({shownNotes.length})</span></h2>
        {notes.isLoading ? <div className="skeleton h-20" /> : shownNotes.length ? <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">{shownNotes.map((n) => <li key={n.id}><NoteCard note={n} /></li>)}</ul>
          : <EmptyState icon={NotebookPen} title="No notes here" message="Create a note for this subject." action={canEdit ? <button type="button" className="btn-primary" onClick={() => setDlg('note')}>New note</button> : undefined} />}
      </section>
      <section aria-labelledby="f-h" className="mt-10"><h2 id="f-h" className="mb-3 text-lg">Files <span className="text-sm font-normal text-slate-400">({shownFiles.length})</span></h2>
        {files.isLoading ? <div className="skeleton h-20" /> : shownFiles.length ? <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">{shownFiles.map((r) => <li key={r.id}><ResourceCard resource={r} /></li>)}</ul>
          : <EmptyState icon={FilePlus2} title="No files here" message="Upload PDFs, slides, documents or code." action={canEdit ? <button type="button" className="btn-secondary" onClick={() => setDlg('upload')}>Upload files</button> : undefined} />}
      </section>

      <SubjectDialog open={dlg === 'edit'} onClose={() => setDlg(null)} spaceId={space.id} semesterId={sem.id} subject={s} />
      <FolderDialog open={dlg === 'folder'} onClose={() => setDlg(null)} spaceId={space.id} subjectId={s.id} />
      <NewNoteDialog open={dlg === 'note'} onClose={() => setDlg(null)} defaults={{ spaceId: space.id, semesterId: sem.id, subjectId: s.id, folderId }} />
      <UploadDialog open={dlg === 'upload'} onClose={() => setDlg(null)} destination={{ spaceId: space.id, semesterId: sem.id, subjectId: s.id, folderId }} />
      <ConfirmDialog open={dlg === 'delete'} danger title="Delete this subject?" message="Its folders, notes and files move to the trash (restorable from Settings)." confirmLabel="Move to trash" busy={del.isPending} onCancel={() => setDlg(null)}
        onConfirm={() => del.mutate({ id: s.id, deleted: true }, { onSuccess: () => { toast.success('Moved to trash'); navigate(`/semesters/${sem.id}`) }, onError: (e) => toast.error(friendlyMessage(e as Error)) })} />
      <ConfirmDialog open={dlg === 'deleteFolder'} danger title="Delete this folder?" message="Notes and files inside move to the trash with it." confirmLabel="Move to trash" busy={delFolder.isPending} onCancel={() => setDlg(null)}
        onConfirm={() => folderId && delFolder.mutate({ id: folderId, deleted: true }, { onSuccess: () => { setFolder('all'); setDlg(null); toast.success('Folder moved to trash') }, onError: (e) => toast.error(friendlyMessage(e as Error)) })} />
    </>
  )
}
