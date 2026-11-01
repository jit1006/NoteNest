import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Download, FileText, Library, Sparkles } from 'lucide-react'
import { recentResources, resources, subjects } from '../data'
import { paramsFromFilters } from '../utils/filterResources'
import { pluralize } from '../utils/format'
import SearchBar from './SearchBar'
import { TypeBadge } from './ui/Badge'

const SUGGESTIONS = ['normalization', 'scheduling', 'subnetting', 'A*', 'closures']

export default function HeroSection() {
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  const go = (query: string) => {
    const p = paramsFromFilters({ q: query })
    navigate(`/explore${p.toString() ? `?${p}` : ''}`)
  }

  const preview = recentResources(3)

  return (
    <section className="hero-mesh relative overflow-hidden" aria-labelledby="hero-title">
      <div className="container-page grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-xs font-semibold text-brand-700 backdrop-blur dark:border-brand-500/30 dark:bg-slate-900/60 dark:text-brand-200">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Smart class notes library for CS &amp; MCA
          </p>
          <h1 id="hero-title" className="mt-5 text-4xl font-extrabold leading-[1.08] sm:text-5xl lg:text-6xl">
            Your Semester.
            <br />
            Your Notes.
            <br />
            <span className="gradient-text">One Place.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600 dark:text-slate-400">
            Find semester-wise notes, practise with model papers and keep quick references one tap away — then plan your study and track your progress.
          </p>

          <div className="mt-8 max-w-xl">
            <SearchBar size="lg" value={q} onChange={setQ} onSubmit={go} placeholder="Try “normalization”, “scheduling”, “A*”…" label="Search all notes" />
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>Popular:</span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => go(s)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-500"
                >
                  {s}
                </button>
              ))}
            </p>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
            {[
              [String(subjects.length), 'Subjects'],
              [String(resources.length), 'PDF resources'],
              ['6', 'Semesters'],
            ].map(([n, l]) => (
              <div key={l} className="flex flex-col-reverse">
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{l}</dt>
                <dd className="gradient-text text-3xl font-extrabold">{n}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Live preview built from real catalog entries */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div aria-hidden="true" className="absolute -inset-4 rounded-4xl bg-gradient-to-br from-brand-500/20 to-accent-500/20 blur-2xl" />
          <div className="card relative space-y-3 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Library className="h-4 w-4 text-brand-600" aria-hidden="true" />
                Recently added
              </p>
              <Link to="/explore" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">
                See all
              </Link>
            </div>
            {preview.map((r) => (
              <Link
                key={r.id}
                to={`/resources/${r.id}`}
                className="group flex items-start gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-800 dark:hover:border-brand-500/50 dark:hover:bg-brand-500/5"
              >
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{r.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                    {r.subjectName} · Sem {r.semester}
                  </span>
                  <span className="mt-1.5 inline-block"><TypeBadge type={r.resourceType} /></span>
                </span>
                <ArrowRight className="mt-2 h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" aria-hidden="true" />
              </Link>
            ))}
            <p className="flex items-center gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Every file is a real PDF — {pluralize(resources.length, 'document')} ready to read or download.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
