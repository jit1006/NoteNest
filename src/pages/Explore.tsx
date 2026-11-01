import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, RotateCcw, SearchX, SlidersHorizontal, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useAuth } from '../auth/AuthProvider'
import { PAGE_SIZE, useSearch } from '../api/search'
import { useProfile } from '../api/profile'
import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/errors'
import SearchBar from '../components/SearchBar'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import PageHeader from '../components/ui/PageHeader'
import { HitCard } from '../components/ItemCards'
import { CardSkeleton } from '../components/ui/Skeleton'
import type { ResourceCategory, SearchParams } from '../types/db'

const KINDS = [['', 'Everything'], ['note', 'Notes'], ['pdf', 'PDF'], ['markdown', 'Markdown'], ['text', 'Text'], ['code', 'Source code'], ['docx', 'Word'], ['pptx', 'PowerPoint'], ['image', 'Images']] as const
const CATEGORIES = [['', 'Any category'], ['notes', 'Notes'], ['pyq', 'Practice papers'], ['reference', 'Quick references'], ['assignment', 'Assignments'], ['other', 'Other']] as const
const SINCE = [['', 'Any time'], ['7', 'Past week'], ['30', 'Past month'], ['365', 'Past year']] as const

function useSubjectTitles() {
  return useQuery({
    queryKey: ['subject-titles'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const rows = unwrap(await supabase.from('subjects').select('title').is('deleted_at', null).limit(500)) as { title: string }[]
      return [...new Set(rows.map((r) => r.title))].sort((a, b) => a.localeCompare(b))
    },
  })
}

export default function Explore() {
  useDocumentTitle('Explore library')
  const { user } = useAuth()
  const [sp, setSp] = useSearchParams()
  const [open, setOpen] = useState(false)
  const get = (k: string) => sp.get(k) ?? ''
  const [qDraft, setQDraft] = useState(get('q'))
  useEffect(() => setQDraft(get('q')), [sp.get('q')]) // eslint-disable-line react-hooks/exhaustive-deps

  const page = Math.max(0, Number(get('page')) || 0)
  const params: SearchParams = useMemo(() => ({
    q: get('q'),
    scope: (get('scope') as SearchParams['scope']) || 'all',
    types: get('type') ? [get('type')] : undefined,
    category: (get('cat') as ResourceCategory) || null,
    year: get('year') ? Number(get('year')) : null,
    semesterNumber: get('sem') ? Number(get('sem')) : null,
    subjectTitle: get('subject') || null,
    ownerId: get('owner') || null,
    since: get('since') ? new Date(Date.now() - Number(get('since')) * 86_400_000).toISOString() : null,
    page,
  }), [sp]) // eslint-disable-line react-hooks/exhaustive-deps

  const result = useSearch(params)
  const subjects = useSubjectTitles()
  const owner = useProfile(get('owner') || undefined)

  const set = (patch: Record<string, string>, keepPage = false) => {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k)
    if (!keepPage) next.delete('page')
    setSp(next, { replace: true })
  }
  const clear = () => setSp(new URLSearchParams(), { replace: true })
  const hasFilters = ['q', 'scope', 'type', 'cat', 'year', 'sem', 'subject', 'owner', 'since'].some((k) => get(k))
  const pages = result.data ? Math.max(1, Math.ceil(result.data.total / PAGE_SIZE)) : 1

  useEffect(() => { const t = window.setTimeout(() => { if (qDraft !== get('q')) set({ q: qDraft }) }, 350); return () => window.clearTimeout(t) }, [qDraft]) // eslint-disable-line react-hooks/exhaustive-deps

  const filters = (
    <div className="space-y-4">
      <div><label className="label" htmlFor="f-scope">Show</label>
        <select id="f-scope" className="input" value={get('scope')} onChange={(e) => set({ scope: e.target.value })}>
          <option value="">Everything I can access</option><option value="public">Public only</option>{user && <option value="mine">Only my content</option>}
        </select></div>
      <div><label className="label" htmlFor="f-type">Type</label><select id="f-type" className="input" value={get('type')} onChange={(e) => set({ type: e.target.value })}>{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      <div><label className="label" htmlFor="f-cat">Category</label><select id="f-cat" className="input" value={get('cat')} onChange={(e) => set({ cat: e.target.value })}>{CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="f-sem">Semester</label><select id="f-sem" className="input" value={get('sem')} onChange={(e) => set({ sem: e.target.value })}><option value="">Any</option>{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>Sem {n}</option>)}</select></div>
        <div><label className="label" htmlFor="f-year">Exam year</label><input id="f-year" inputMode="numeric" className="input" placeholder="Any" value={get('year')} onChange={(e) => set({ year: e.target.value.replace(/\D/g, '').slice(0, 4) })} /></div>
      </div>
      <div><label className="label" htmlFor="f-subj">Subject</label><select id="f-subj" className="input" value={get('subject')} onChange={(e) => set({ subject: e.target.value })}><option value="">Any subject</option>{subjects.data?.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
      <div><label className="label" htmlFor="f-since">Updated</label><select id="f-since" className="input" value={get('since')} onChange={(e) => set({ since: e.target.value })}>{SINCE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
      {get('owner') && <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2 text-sm dark:bg-brand-500/10"><span>By <strong>{owner.data?.display_name || owner.data?.username || '…'}</strong></span><button type="button" aria-label="Remove owner filter" onClick={() => set({ owner: '' })}><X className="h-4 w-4" aria-hidden="true" /></button></div>}
      <button type="button" className="btn-ghost w-full" disabled={!hasFilters} onClick={clear}><RotateCcw className="h-4 w-4" aria-hidden="true" />Reset filters</button>
    </div>
  )

  return (
    <div className={user ? '' : 'container-page py-10'}>
      <PageHeader title="Explore the library" description="Full-text search across notes and files you are allowed to see. Private and unlisted content never appears for other people." />
      <div className="mb-6 max-w-2xl"><SearchBar value={qDraft} onChange={setQDraft} placeholder="Search titles, topics and note text…" label="Search the library" /></div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside aria-label="Filters" className="card h-fit p-4 lg:sticky lg:top-24">
          <button type="button" className="flex w-full items-center justify-between lg:hidden" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <span className="inline-flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="h-4 w-4" aria-hidden="true" />Filters</span><span className="text-xs text-brand-600">{open ? 'Hide' : 'Show'}</span>
          </button>
          <div className={`${open ? 'mt-4 block' : 'hidden'} lg:mt-0 lg:block`}>{filters}</div>
        </aside>

        <section aria-label="Results" aria-busy={result.isFetching}>
          <p role="status" aria-live="polite" className="mb-4 text-sm text-slate-500">
            {result.isLoading ? 'Searching…' : result.data ? <>Showing <strong className="text-slate-900 dark:text-white">{result.data.total}</strong> result{result.data.total === 1 ? '' : 's'}{get('q') && <> for “{get('q')}”</>}</> : ''}
          </p>
          {result.error ? <ErrorState error={result.error} onRetry={() => void result.refetch()} />
            : result.isLoading ? <div className="grid grid-cols-1 gap-4">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</div>
            : result.data && result.data.hits.length > 0 ? (
              <>
                <ul className={`grid grid-cols-1 gap-4 transition-opacity ${result.isFetching ? 'opacity-60' : ''}`}>{result.data.hits.map((h) => <li key={`${h.entity_type}-${h.id}`}><HitCard hit={h} /></li>)}</ul>
                {pages > 1 && (
                  <nav aria-label="Pagination" className="mt-6 flex items-center justify-between">
                    <button type="button" className="btn-secondary" disabled={page <= 0} onClick={() => set({ page: String(page - 1) || '' }, true)}><ChevronLeft className="h-4 w-4" aria-hidden="true" />Previous</button>
                    <span className="text-sm text-slate-500">Page {page + 1} of {pages}</span>
                    <button type="button" className="btn-secondary" disabled={page + 1 >= pages} onClick={() => set({ page: String(page + 1) }, true)}>Next<ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
                  </nav>
                )}
              </>
            ) : (
              <EmptyState icon={SearchX} title="No results" message="Try different words or remove some filters. Content that is private to someone else is never shown."
                action={<>{hasFilters && <button type="button" className="btn-primary" onClick={clear}>Clear filters</button>}{!user && <Link to="/register" className="btn-secondary">Create an account</Link>}</>} />
            )}
        </section>
      </div>
    </div>
  )
}
