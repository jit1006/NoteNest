import { Link } from 'react-router-dom'
import { Calendar, GraduationCap } from 'lucide-react'
import type { Resource } from '../types'
import { getSubject } from '../data'
import { ACCENT } from '../utils/accent'
import BookmarkButton from './BookmarkButton'
import DownloadButton from './DownloadButton'
import { Pill, TypeBadge } from './ui/Badge'

export default function NotesCard({ resource }: { resource: Resource }) {
  const subject = getSubject(resource.subjectId)
  const accent = subject ? ACCENT[subject.accent].text : 'text-brand-600'
  return (
    <article className="card card-hover flex h-full flex-col p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <TypeBadge type={resource.resourceType} />
        <Pill>
          <GraduationCap className="h-3 w-3" aria-hidden="true" />
          Sem {resource.semester}
        </Pill>
        {resource.year && (
          <Pill>
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {resource.year}
          </Pill>
        )}
      </div>

      <h3 className="text-base leading-snug">
        <Link to={`/resources/${resource.id}`} className="rounded hover:text-brand-600 dark:hover:text-brand-300">
          {resource.title}
        </Link>
      </h3>
      <p className={`mt-1 text-xs font-semibold ${accent}`}>
        {resource.subjectName} · {resource.unit}
      </p>
      <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-500 dark:text-slate-400">{resource.description}</p>

      <div className="mt-4 flex items-center gap-2">
        <DownloadButton resource={resource} />
        <Link to={`/resources/${resource.id}`} className="btn-ghost px-3">
          Open
          <span className="sr-only">: {resource.title}</span>
        </Link>
        <span className="ml-auto">
          <BookmarkButton resourceId={resource.id} resourceTitle={resource.title} />
        </span>
      </div>
    </article>
  )
}
