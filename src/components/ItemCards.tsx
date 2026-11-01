import { Link } from 'react-router-dom'
import { ArrowRight, Calendar, FileText, GraduationCap, NotebookText } from 'lucide-react'
import type { NoteListItem, Resource, SearchHit, Space, Subject } from '../types/db'
import { CategoryBadge, KindBadge, Pill, VisibilityBadge } from './ui/Badge'
import { ACCENT } from '../utils/accent'
import SubjectIcon from './ui/SubjectIcon'
import { formatBytes } from '../lib/files'
import { formatDate } from '../utils/format'

const ago = (iso: string) => formatDate(iso.slice(0, 10))

export function NoteCard({ note, showVisibility = true }: { note: NoteListItem; showVisibility?: boolean }) {
  return (
    <Link to={`/notes/${note.id}`} className="card card-hover flex h-full gap-3 p-4">
      <span aria-hidden="true" className="text-2xl">{note.icon ?? '📝'}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{note.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500"><KindBadge kind="note" />{showVisibility && <VisibilityBadge value={note.visibility} />}<span>Updated {ago(note.updated_at)}</span></span>
      </span>
    </Link>
  )
}

export function ResourceCard({ resource }: { resource: Resource }) {
  const f = resource.resource_files?.[0]
  return (
    <Link to={`/resources/${resource.id}`} className="card card-hover flex h-full gap-3 p-4">
      <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><FileText className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{resource.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <KindBadge kind={resource.kind} />
          {resource.category !== 'notes' && <CategoryBadge category={resource.category} />}
          <VisibilityBadge value={resource.visibility} />
          {resource.academic_year && <Pill><Calendar className="h-3 w-3" aria-hidden="true" />{resource.academic_year}</Pill>}
          {f && <span>{formatBytes(f.size_bytes)}</span>}
        </span>
      </span>
    </Link>
  )
}

/** Renders ts_headline output safely: ⟦match⟧ markers become <mark>, everything else stays plain text. */
export function Snippet({ text }: { text: string }) {
  const parts = text.split(/(⟦[^⟧]*⟧)/g)
  return <>{parts.map((p, i) => p.startsWith('⟦') ? <mark key={i} className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-500/40 dark:text-white">{p.slice(1, -1)}</mark> : <span key={i}>{p}</span>)}</>
}

export function HitCard({ hit }: { hit: SearchHit }) {
  const to = hit.entity_type === 'note' ? `/notes/${hit.id}` : `/resources/${hit.id}`
  return (
    <article className="card card-hover p-4">
      <div className="flex gap-3">
        <span aria-hidden="true" className="text-2xl">{hit.entity_type === 'note' ? (hit.icon ?? '📝') : <FileText className="h-6 w-6 text-indigo-500" />}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base"><Link to={to} className="hover:text-brand-600 dark:hover:text-brand-300">{hit.title}</Link></h3>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <KindBadge kind={hit.entity_type === 'note' ? 'note' : (hit.kind as Resource['kind'])} />
            {hit.category && hit.category !== 'notes' && <CategoryBadge category={hit.category} />}
            {hit.semester_number != null && <Pill><GraduationCap className="h-3 w-3" aria-hidden="true" />Sem {hit.semester_number}</Pill>}
            {hit.subject_title && <Pill>{hit.subject_title}</Pill>}
            {hit.academic_year && <Pill><Calendar className="h-3 w-3" aria-hidden="true" />{hit.academic_year}</Pill>}
            <VisibilityBadge value={hit.visibility} />
          </p>
          {hit.snippet && <p className="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-400"><Snippet text={hit.snippet} /></p>}
          <p className="mt-2 text-xs text-slate-500">by {hit.owner_display_name || hit.owner_username || 'unknown'} · {ago(hit.updated_at)}</p>
        </div>
      </div>
    </article>
  )
}

export function SpaceCard({ space, role }: { space: Space; role?: string }) {
  return (
    <Link to={`/spaces/${space.id}`} className="card card-hover flex h-full flex-col p-5">
      <span className="flex items-start justify-between"><span aria-hidden="true" className="text-3xl">{space.icon ?? '📚'}</span><span className="flex gap-1">{role && <Pill>{role}</Pill>}<VisibilityBadge value={space.visibility} /></span></span>
      <h3 className="mt-3 text-base">{space.title}</h3>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">{space.description || 'No description yet.'}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600">Open <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
    </Link>
  )
}

export function SubjectCard({ subject, notes, resources }: { subject: Subject; notes: number; resources: number }) {
  return (
    <Link to={`/subjects/${subject.id}`} className="card card-hover flex h-full flex-col p-5">
      <span className="flex items-start justify-between"><SubjectIcon color={subject.color} />{subject.code && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACCENT[subject.color].soft}`}>{subject.code}</span>}</span>
      <h3 className="mt-3 text-base">{subject.title}</h3>
      <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">{subject.description.split('\n')[0] || 'No description yet.'}</p>
      <p className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800"><span className="inline-flex items-center gap-1"><NotebookText className="h-3.5 w-3.5" aria-hidden="true" />{notes} notes</span><span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" aria-hidden="true" />{resources} files</span></p>
    </Link>
  )
}
