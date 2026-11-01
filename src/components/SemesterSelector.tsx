import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { SEMESTERS, resources, subjects } from '../data'
import { pluralize } from '../utils/format'

interface Props {
  /** When provided, renders toggle buttons (filter mode). Otherwise renders links to Explore. */
  value?: number | null
  onSelect?: (semester: number | null) => void
}

export default function SemesterSelector({ value, onSelect }: Props) {
  if (onSelect) {
    return (
      <div role="group" aria-label="Semester" className="flex flex-wrap gap-2">
        {[null, ...SEMESTERS].map((s) => {
          const active = (value ?? null) === s
          return (
            <button
              key={s ?? 'all'}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(s)}
              className={`rounded-xl border px-3.5 py-1.5 text-sm font-semibold transition ${
                active
                  ? 'border-transparent bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-500'
              }`}
            >
              {s === null ? 'All' : `Sem ${s}`}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {SEMESTERS.map((s) => {
        const subjectCount = subjects.filter((x) => x.semester === s).length
        const resourceCount = resources.filter((r) => r.semester === s).length
        return (
          <li key={s}>
            <Link
              to={`/explore?semester=${s}`}
              className="card card-hover group block p-4"
              aria-label={`Semester ${s}: ${pluralize(subjectCount, 'subject')}, ${pluralize(resourceCount, 'resource')}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Semester</span>
                <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-brand-500" aria-hidden="true" />
              </div>
              <p className="gradient-text mt-1 text-4xl font-extrabold">{s}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {pluralize(subjectCount, 'subject')} · {pluralize(resourceCount, 'file')}
              </p>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
