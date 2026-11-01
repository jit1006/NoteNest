import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, CalendarCheck, FilePlus2, FolderPlus, GraduationCap, NotebookPen, Plus } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../auth/AuthProvider'
import { useMySpaces } from '../api/spaces'
import { useDashboardSemesters } from '../api/hierarchy'
import { useRecentNotes } from '../api/notes'
import { useBookmarks } from '../api/bookmarks'
import { usePopularNotes, useRecentUploads } from '../api/search'
import { useTasks } from '../api/tasks'
import { useProfile } from '../api/profile'
import { NoteCard, SpaceCard } from '../components/ItemCards'
import { CategoryBadge, KindBadge } from '../components/ui/Badge'
import { NewNoteDialog, SpaceDialog } from '../components/dialogs/EntityDialogs'
import PageHeader from '../components/ui/PageHeader'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import type { ResourceCategory, ResourceKind } from '../types/db'

function Section({ title, action, children, id }: { title: string; action?: React.ReactNode; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <div className="mb-4 flex items-center justify-between gap-2"><h2 id={id} className="text-lg">{title}</h2>{action}</div>
      {children}
    </section>
  )
}

export default function Dashboard() {
  useDocumentTitle('Dashboard')
  const { user } = useAuth()
  const profile = useProfile()
  const spaces = useMySpaces()
  const spaceIds = [...(spaces.data?.owned ?? []).map((s) => s.id), ...(spaces.data?.shared ?? []).map((s) => s.space.id)]
  const semesters = useDashboardSemesters(spaceIds)
  const recent = useRecentNotes(6)
  const bookmarks = useBookmarks()
  const popular = usePopularNotes(5)
  const uploads = useRecentUploads(5)
  const tasks = useTasks()
  const [newNote, setNewNote] = useState(false)
  const [newSpace, setNewSpace] = useState(false)

  const open = tasks.data?.filter((t) => !t.done) ?? []
  const name = profile.data?.display_name || user?.email?.split('@')[0] || 'there'

  return (
    <>
      <PageHeader title={`Welcome back, ${name}`} description="Pick up where you left off or start something new."
        actions={<>
          <button type="button" className="btn-primary" onClick={() => setNewNote(true)}><NotebookPen className="h-4 w-4" aria-hidden="true" />New note</button>
          <Link to="/files" className="btn-secondary"><FilePlus2 className="h-4 w-4" aria-hidden="true" />Upload files</Link>
          <button type="button" className="btn-secondary" onClick={() => setNewSpace(true)}><FolderPlus className="h-4 w-4" aria-hidden="true" />New space</button>
        </>} />

      <Section id="sem-h" title="Your semesters">
        {semesters.isLoading || spaces.isLoading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-32" />)}</div>
          : semesters.error ? <ErrorState error={semesters.error} onRetry={() => void semesters.refetch()} />
          : semesters.data?.length ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {semesters.data.map((s) => (
                <li key={s.id}>
                  <Link to={`/semesters/${s.id}`} className="card card-hover block h-full p-5">
                    <p className="flex items-center justify-between text-xs font-semibold text-slate-500"><span className="truncate">{s.academic_spaces.icon ?? '📚'} {s.academic_spaces.title}</span><GraduationCap className="h-4 w-4" aria-hidden="true" /></p>
                    <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{s.title}</p>
                    <p className="mt-3 flex gap-4 text-xs text-slate-500"><span>{s.subjects[0]?.count ?? 0} subjects</span><span>{s.notes[0]?.count ?? 0} notes</span><span>{s.resources[0]?.count ?? 0} files</span></p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={GraduationCap} title="No semesters yet" message="Create a space to start organising your semesters." action={<button type="button" className="btn-primary" onClick={() => setNewSpace(true)}><Plus className="h-4 w-4" aria-hidden="true" />New space</button>} />}
      </Section>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section aria-labelledby="recent-h" className="lg:col-span-2">
          <h2 id="recent-h" className="mb-4 text-lg">Recent notes</h2>
          {recent.isLoading ? <div className="skeleton h-24" /> : recent.data?.length ? (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">{recent.data.map((n) => <li key={n.id}><NoteCard note={n} /></li>)}</ul>
          ) : <EmptyState icon={NotebookPen} title="No notes yet" message="Write your first note — it autosaves as you type." action={<button type="button" className="btn-primary" onClick={() => setNewNote(true)}>Create a note</button>} />}
        </section>
        <section aria-labelledby="fav-h">
          <div className="mb-4 flex items-center justify-between"><h2 id="fav-h" className="text-lg">Favourites</h2><Link to="/bookmarks" className="text-xs font-semibold text-brand-600 hover:underline">All bookmarks</Link></div>
          {bookmarks.data?.length ? (
            <ul className="space-y-2">{bookmarks.data.filter((b) => b.notes || b.resources).slice(0, 5).map((b) => (
              <li key={b.id}><Link to={b.notes ? `/notes/${b.notes.id}${b.block_id ? `?block=${encodeURIComponent(b.block_id)}` : ''}` : `/resources/${b.resources!.id}${b.pdf_page ? `?page=${b.pdf_page}` : ''}`} className="card card-hover flex items-center gap-2 p-3 text-sm"><Bookmark className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" /><span className="truncate font-medium">{b.notes?.title ?? b.resources?.title}</span>{b.pdf_page && <span className="text-xs text-slate-400">p.{b.pdf_page}</span>}</Link></li>
            ))}</ul>
          ) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">Bookmark notes, paragraphs and PDF pages to find them here.</p>}
          <div className="card mt-6 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><CalendarCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />Study planner</p>
            <p className="mt-1 text-sm text-slate-500">{open.length ? `${open.length} open task${open.length === 1 ? '' : 's'}` : 'No open tasks.'}</p>
            <Link to="/planner" className="mt-2 inline-block text-xs font-semibold text-brand-600 hover:underline">Open planner</Link>
          </div>
        </section>
      </div>

      <Section id="my-spaces" title="Spaces" action={<button type="button" className="btn-ghost text-xs" onClick={() => setNewSpace(true)}><Plus className="h-3.5 w-3.5" aria-hidden="true" />New</button>}>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.data?.owned.map((s) => <li key={s.id}><SpaceCard space={s} /></li>)}
          {spaces.data?.shared.map(({ space, role }) => <li key={space.id}><SpaceCard space={space} role={`shared · ${role}`} /></li>)}
        </ul>
      </Section>

      <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
        <section aria-labelledby="pop-h">
          <h2 id="pop-h" className="mb-4 text-lg">Popular public notes</h2>
          {popular.data?.length ? <ul className="space-y-2">{popular.data.map((n) => <li key={n.id}><Link to={`/notes/${n.id}`} className="card card-hover flex items-center gap-3 p-3"><span aria-hidden="true" className="text-xl">{n.icon ?? '📝'}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{n.title}</span><span className="text-xs text-slate-400">{n.saves} saves</span></Link></li>)}</ul>
            : <p className="text-sm text-slate-500">Nothing public yet.</p>}
        </section>
        <section aria-labelledby="up-h">
          <h2 id="up-h" className="mb-4 text-lg">Recent public uploads</h2>
          {uploads.data?.length ? <ul className="space-y-2">{uploads.data.map((u) => <li key={u.id}><Link to={`/resources/${u.id}`} className="card card-hover flex items-center gap-3 p-3"><span className="min-w-0 flex-1 truncate text-sm font-semibold">{u.title}</span><KindBadge kind={u.kind as ResourceKind} />{u.category !== 'notes' && <CategoryBadge category={u.category as ResourceCategory} />}</Link></li>)}</ul>
            : <p className="text-sm text-slate-500">No public uploads yet.</p>}
        </section>
      </div>

      <NewNoteDialog open={newNote} onClose={() => setNewNote(false)} />
      <SpaceDialog open={newSpace} onClose={() => setNewSpace(false)} />
    </>
  )
}
