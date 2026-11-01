import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Subject } from '../types'
import { resourcesForSubject, countByType } from '../data'
import { ACCENT } from '../utils/accent'
import SubjectIcon from './ui/SubjectIcon'

export default function SubjectCard({ subject }: { subject: Subject }) {
  const counts = countByType(resourcesForSubject(subject.id))
  const total = counts.notes + counts.pyq + counts.reference
  return (
    <Link to={`/subjects/${subject.id}`} className="card card-hover group flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <SubjectIcon subject={subject} />
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACCENT[subject.accent].soft}`}>
          Sem {subject.semester}
        </span>
      </div>
      <h3 className="mt-4 text-base">{subject.name}</h3>
      <p className="mt-1.5 line-clamp-3 flex-1 text-sm text-slate-500 dark:text-slate-400">{subject.description}</p>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>
          {counts.notes} notes · {counts.pyq} PYQ · {counts.reference} ref
          <span className="sr-only"> ({total} resources)</span>
        </span>
        <ArrowRight className="h-4 w-4 text-brand-500 transition group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  )
}
