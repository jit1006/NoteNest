import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileQuestion, Info } from 'lucide-react'
import FilterPanel from '../components/FilterPanel'
import EmptyState from '../components/ui/EmptyState'
import ResourceGrid from '../components/ui/ResourceGrid'
import { pyqYears, resources } from '../data'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { ResourceFilters } from '../types'
import { filterResources, filtersFromParams, hasActiveFilters, paramsFromFilters } from '../utils/filterResources'
import { pluralize } from '../utils/format'

const years = pyqYears()

export default function PYQLibrary() {
  useDocumentTitle('PYQ library')
  const [params, setParams] = useSearchParams()
  const filters = useMemo<ResourceFilters>(() => ({ ...filtersFromParams(params), type: 'pyq', q: '' }), [params])

  const results = useMemo(
    () =>
      filterResources(resources, filters).sort(
        (a, b) => (b.year ?? 0) - (a.year ?? 0) || a.subjectName.localeCompare(b.subjectName),
      ),
    [filters],
  )

  // `type` is locked to PYQ, so it is never written to the URL.
  const update = (next: ResourceFilters) => setParams(paramsFromFilters({ ...next, type: null, q: '' }), { replace: true })
  const reset = () => setParams(new URLSearchParams(), { replace: true })
  const filtered = hasActiveFilters({ ...filters, type: null })

  return (
    <div className="container-page py-10">
      <header className="mb-6">
        <h1 className="text-3xl sm:text-4xl">PYQ library</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Practise with question papers filtered by subject, semester and year.
        </p>
      </header>

      <p className="mb-8 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          <strong>Demo content.</strong> These are self-created model practice papers that mimic the exam format. They are not official or university-specific past papers.
        </span>
      </p>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <FilterPanel filters={{ ...filters, type: null }} onChange={update} onReset={reset} years={years} hideType />
        </div>
        <section aria-label="Question papers">
          <p role="status" aria-live="polite" className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            {pluralize(results.length, 'paper')} found
          </p>
          {results.length > 0 ? (
            <ResourceGrid items={results} label="Question papers" />
          ) : (
            <EmptyState
              icon={FileQuestion}
              title="No papers match these filters"
              message="Try a different subject, semester or year."
              action={
                filtered && (
                  <button type="button" className="btn-primary" onClick={reset}>
                    Clear filters
                  </button>
                )
              }
            />
          )}
        </section>
      </div>
    </div>
  )
}
