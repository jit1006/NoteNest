import { useId, useState } from 'react'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import type { ResourceFilters, ResourceType, SortKey } from '../types'
import { SEMESTERS, TYPE_LABEL, subjects } from '../data'
import { RESOURCE_TYPES, hasActiveFilters } from '../utils/filterResources'

interface Props {
  filters: ResourceFilters
  onChange: (next: ResourceFilters) => void
  onReset: () => void
  /** Provide to show the sort control */
  sort?: SortKey
  onSortChange?: (s: SortKey) => void
  /** Provide to show the year control (PYQ library) */
  years?: number[]
  /** Hide the resource-type control (e.g. PYQ library is type-locked) */
  hideType?: boolean
}

const SORT_LABEL: Record<SortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  title: 'Title (A–Z)',
  subject: 'Subject (A–Z)',
}

export default function FilterPanel({ filters, onChange, onReset, sort, onSortChange, years, hideType }: Props) {
  const uid = useId()
  const [open, setOpen] = useState(false)
  const active = hasActiveFilters(filters)

  const subjectOptions = subjects.filter((s) => filters.semester == null || s.semester === filters.semester)

  const setSemester = (v: string) => {
    const semester = v ? Number(v) : null
    // Drop a stale subject selection that does not belong to the new semester.
    const current = subjects.find((s) => s.id === filters.subjectId)
    const subjectId = current && semester != null && current.semester !== semester ? null : filters.subjectId
    onChange({ ...filters, semester, subjectId })
  }

  return (
    <aside aria-label="Filters" className="card p-4 lg:p-5">
      <button
        type="button"
        className="flex w-full items-center justify-between lg:hidden"
        aria-expanded={open}
        aria-controls={`${uid}-panel`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Filters &amp; sort
          {active && <span className="h-2 w-2 rounded-full bg-brand-500" aria-label="filters active" />}
        </span>
        <span className="text-xs text-brand-600 dark:text-brand-300">{open ? 'Hide' : 'Show'}</span>
      </button>

      <div id={`${uid}-panel`} className={`${open ? 'mt-4 block' : 'hidden'} space-y-4 lg:mt-0 lg:block`}>
        <h2 className="hidden items-center gap-2 text-sm lg:flex">
          <SlidersHorizontal className="h-4 w-4 text-brand-600" aria-hidden="true" />
          Filters
        </h2>

        <div>
          <label htmlFor={`${uid}-sem`} className="label">Semester</label>
          <select id={`${uid}-sem`} className="input" value={filters.semester ?? ''} onChange={(e) => setSemester(e.target.value)}>
            <option value="">All semesters</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${uid}-sub`} className="label">Subject</label>
          <select
            id={`${uid}-sub`}
            className="input"
            value={filters.subjectId ?? ''}
            onChange={(e) => onChange({ ...filters, subjectId: e.target.value || null })}
          >
            <option value="">All subjects</option>
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {!hideType && (
          <fieldset>
            <legend className="label">Resource type</legend>
            <div className="flex flex-wrap gap-2">
              {([null, ...RESOURCE_TYPES] as (ResourceType | null)[]).map((t) => {
                const on = filters.type === t
                return (
                  <button
                    key={t ?? 'all'}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange({ ...filters, type: t })}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      on
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                        : 'border-slate-200 text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {t ? TYPE_LABEL[t] : 'All'}
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}

        {years && (
          <div>
            <label htmlFor={`${uid}-year`} className="label">Year</label>
            <select
              id={`${uid}-year`}
              className="input"
              value={filters.year ?? ''}
              onChange={(e) => onChange({ ...filters, year: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        {sort && onSortChange && (
          <div>
            <label htmlFor={`${uid}-sort`} className="label">Sort by</label>
            <select id={`${uid}-sort`} className="input" value={sort} onChange={(e) => onSortChange(e.target.value as SortKey)}>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k}>{SORT_LABEL[k]}</option>
              ))}
            </select>
          </div>
        )}

        <button type="button" onClick={onReset} disabled={!active && (!sort || sort === 'newest')} className="btn-ghost w-full">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Reset filters
        </button>
      </div>
    </aside>
  )
}
