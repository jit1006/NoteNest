import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import FilterPanel from '../components/FilterPanel'
import SearchBar from '../components/SearchBar'
import EmptyState from '../components/ui/EmptyState'
import ResourceGrid from '../components/ui/ResourceGrid'
import { resources } from '../data'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { ResourceFilters, SortKey } from '../types'
import {
  EMPTY_FILTERS,
  filtersFromParams,
  hasActiveFilters,
  paramsFromFilters,
  queryResources,
  sortFromParams,
} from '../utils/filterResources'
import { pluralize } from '../utils/format'

export default function Explore() {
  useDocumentTitle('Explore notes')
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(params), [params])
  const sort = useMemo(() => sortFromParams(params), [params])

  const results = useMemo(() => queryResources(resources, filters, sort), [filters, sort])

  const update = (next: ResourceFilters, nextSort: SortKey = sort) =>
    setParams(paramsFromFilters(next, nextSort), { replace: true })

  const reset = () => setParams(new URLSearchParams(), { replace: true })

  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl">Explore notes</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Search and filter every note, practice paper and quick reference in the library.
        </p>
        <div className="mt-6 max-w-2xl">
          <SearchBar value={filters.q} onChange={(q) => update({ ...filters, q })} placeholder="Search by title, topic, unit or tag…" label="Search notes" />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <FilterPanel
            filters={filters}
            onChange={(f) => update(f)}
            onReset={reset}
            sort={sort}
            onSortChange={(s) => update(filters, s)}
          />
        </div>

        <section aria-label="Results">
          <p role="status" aria-live="polite" className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Showing <strong className="text-slate-900 dark:text-white">{results.length}</strong> of {pluralize(resources.length, 'resource')}
            {filters.q.trim() && (
              <>
                {' '}for “<span className="font-medium text-slate-700 dark:text-slate-200">{filters.q.trim()}</span>”
              </>
            )}
          </p>
          {results.length > 0 ? (
            <ResourceGrid items={results} label="Search results" />
          ) : (
            <EmptyState
              icon={SearchX}
              title="No resources match your search"
              message="Try a different keyword, or loosen the semester, subject and type filters."
              action={
                hasActiveFilters(filters) && (
                  <button type="button" className="btn-primary" onClick={() => update(EMPTY_FILTERS)}>
                    Clear all filters
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
