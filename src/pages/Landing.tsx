import { Link } from 'react-router-dom'
import { BookmarkCheck, FileText, Highlighter, Network, ShieldCheck, Sparkles, Users, Layers, PenLine } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { usePopularNotes, useRecentUploads } from '../api/search'
import SectionHeading from '../components/ui/SectionHeading'
import { CategoryBadge, KindBadge } from '../components/ui/Badge'
import type { ResourceCategory, ResourceKind } from '../types/db'

const FEATURES = [
  { icon: Layers, title: 'Spaces, semesters, subjects', text: 'Model a course exactly how you study it — folders and all — with every item tied to its creator.' },
  { icon: PenLine, title: 'A real note editor', text: 'Notion-style pages with code, tables, checklists and images. Autosaved to the cloud with conflict protection.' },
  { icon: FileText, title: 'Files that preview', text: 'PDF, Markdown, code, Word, PowerPoint outlines and images — securely stored and previewed in the browser.' },
  { icon: Network, title: 'Cross-semester links', text: 'Connect a Semester 5 note to its Semester 2 prerequisite. See backlinks and a graph of how ideas relate.' },
  { icon: Highlighter, title: 'Private highlights', text: 'Bookmark pages and paragraphs, highlight passages and add comments — only you ever see them.' },
  { icon: Users, title: 'Share with control', text: 'Keep it private, share an unlisted link, publish publicly, or invite classmates as viewers or editors.' },
  { icon: ShieldCheck, title: 'Secure by design', text: 'Row-level security in PostgreSQL, signed file URLs and server-side upload validation protect your work.' },
  { icon: BookmarkCheck, title: 'Study planner', text: 'Turn notes into tasks with due dates and track your progress across devices.' },
]

export default function Landing() {
  useDocumentTitle()
  const popular = usePopularNotes(4)
  const uploads = useRecentUploads(4)
  return (
    <>
      <section className="hero-mesh relative overflow-hidden" aria-labelledby="hero-title">
        <div className="container-page py-16 text-center sm:py-24">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-xs font-semibold text-brand-700 backdrop-blur dark:border-brand-500/30 dark:bg-slate-900/60 dark:text-brand-200"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />Collaborative academic knowledge library</p>
          <h1 id="hero-title" className="mx-auto mt-5 max-w-4xl text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-6xl">Your Semester. Your Notes. <span className="gradient-text">One Place.</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-400">Write rich notes, upload study material, connect topics across semesters and share what you know — all synced to your account on every device.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn-primary px-6 py-3">Create free account</Link>
            <Link to="/explore" className="btn-secondary px-6 py-3">Explore the public library</Link>
          </div>
        </div>
      </section>

      <section className="container-page py-14" aria-labelledby="feat-title">
        <SectionHeading id="feat-title" eyebrow="What you get" title="Everything for a semester of studying" />
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="card p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <h3 className="mt-4 text-base">{title}</h3><p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page py-8" aria-labelledby="pub-title">
        <SectionHeading id="pub-title" eyebrow="Public library" title="Recently shared by students" linkTo="/explore" linkLabel="Browse everything" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Popular notes</h3>
            {popular.isLoading ? <div className="skeleton h-24" /> : popular.data?.length ? (
              <ul className="space-y-3">{popular.data.map((n) => (
                <li key={n.id}><Link to={`/notes/${n.id}`} className="card card-hover flex items-center gap-3 p-3"><span aria-hidden="true" className="text-2xl">{n.icon ?? '📝'}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{n.title}</span><span className="text-xs text-slate-500">by {n.owner_display_name || n.owner_username} · {n.saves} saves</span></span></Link></li>
              ))}</ul>
            ) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">No public notes yet — be the first to publish one.</p>}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Recent uploads</h3>
            {uploads.isLoading ? <div className="skeleton h-24" /> : uploads.data?.length ? (
              <ul className="space-y-3">{uploads.data.map((u) => (
                <li key={u.id}><Link to={`/resources/${u.id}`} className="card card-hover flex items-center gap-3 p-3"><FileText className="h-6 w-6 shrink-0 text-indigo-500" aria-hidden="true" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{u.title}</span><span className="mt-1 flex gap-2"><KindBadge kind={u.kind as ResourceKind} />{u.category !== 'notes' && <CategoryBadge category={u.category as ResourceCategory} />}</span></span></Link></li>
              ))}</ul>
            ) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">No public uploads yet.</p>}
          </div>
        </div>
      </section>
    </>
  )
}
