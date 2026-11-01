import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Network, Search } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { RELATION_LABEL, useLinkSearch, useReferenceGraph, type Graph } from '../api/references'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import Spinner from '../components/ui/Spinner'
import { semLabel } from '../components/dialogs/LinkNoteDialog'

const NONE = '00000000-0000-0000-0000-000000000000'
const W = 640, H = 540, CX = W / 2, CY = H / 2

function layout(graph: Graph, root: string) {
  const adj = new Map<string, Set<string>>()
  for (const e of graph.edges) {
    ;(adj.get(e.source_note_id) ?? adj.set(e.source_note_id, new Set()).get(e.source_note_id)!).add(e.target_note_id)
    ;(adj.get(e.target_note_id) ?? adj.set(e.target_note_id, new Set()).get(e.target_note_id)!).add(e.source_note_id)
  }
  const dist = new Map<string, number>([[root, 0]])
  const queue = [root]
  while (queue.length) {
    const u = queue.shift()!
    for (const v of adj.get(u) ?? []) if (!dist.has(v)) { dist.set(v, dist.get(u)! + 1); queue.push(v) } // visited set => cycles cannot loop
  }
  const rings = new Map<number, string[]>()
  for (const [id, d] of dist) if (d > 0) rings.set(d, [...(rings.get(d) ?? []), id])
  const pos = new Map<string, { x: number; y: number }>([[root, { x: CX, y: CY }]])
  for (const [d, ids] of rings) ids.forEach((id, i) => {
    const a = (2 * Math.PI * i) / ids.length - Math.PI / 2 + d * 0.35
    pos.set(id, { x: CX + Math.cos(a) * d * 125, y: CY + Math.sin(a) * d * 100 })
  })
  return pos
}

export default function ReferencesPage() {
  useDocumentTitle('Reference explorer')
  const [sp, setSp] = useSearchParams()
  const navigate = useNavigate()
  const root = sp.get('note') ?? undefined
  const depth = Math.min(3, Math.max(1, Number(sp.get('depth')) || 2))
  const graph = useReferenceGraph(root, depth)
  const [q, setQ] = useState('')
  const picks = useLinkSearch(q, NONE)
  const pos = useMemo(() => (graph.data && root ? layout(graph.data, root) : new Map()), [graph.data, root])
  const setRoot = (id: string) => { const n = new URLSearchParams(sp); n.set('note', id); setSp(n) }

  return (
    <>
      <PageHeader title="Reference explorer" description="See how a note connects to others across semesters — prerequisites, continuations, revisions and sources. Only notes you can read are shown." />

      <div className="card mb-6 p-4">
        <label htmlFor="ref-search" className="label">{root ? 'Centre on another note' : 'Choose a note to explore'}</label>
        <div className="relative max-w-xl"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input id="ref-search" className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search note titles…" /></div>
        {(q || !root) && picks.data && (
          <ul className="mt-3 max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700" aria-label="Matching notes">
            {picks.data.map((n) => <li key={n.id}><button type="button" className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60" onClick={() => { setRoot(n.id); setQ('') }}><span aria-hidden="true">{n.icon ?? '📝'}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{n.title}</span><span className="text-xs text-slate-500">{semLabel(n)}</span></span></button></li>)}
            {picks.data.length === 0 && <li className="p-3 text-sm text-slate-500">No accessible notes match.</li>}
          </ul>
        )}
        {root && (
          <div className="mt-3 flex items-center gap-2 text-sm"><label htmlFor="depth" className="font-semibold">Depth</label>
            <select id="depth" className="input w-24 py-1.5" value={depth} onChange={(e) => { const n = new URLSearchParams(sp); n.set('depth', e.target.value); setSp(n) }}><option value={1}>1 hop</option><option value={2}>2 hops</option><option value={3}>3 hops</option></select>
            <span className="text-xs text-slate-500">(capped at 3; cycles are handled)</span></div>
        )}
      </div>

      {!root ? <EmptyState icon={Network} title="Pick a note to begin" message="Search above, or open any note and choose “Explore graph”." />
        : graph.isLoading ? <Spinner label="Tracing references" />
        : graph.error ? <ErrorState error={graph.error} onRetry={() => void graph.refetch()} />
        : !graph.data?.nodes[root] ? <EmptyState icon={Network} title="That note isn’t available" message="It may not exist or you may not have access to it." />
        : (
          <>
            <figure className="card overflow-hidden p-2">
              <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Reference graph around ${graph.data.nodes[root].title}`} className="h-auto w-full">
                <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" className="fill-slate-400" /></marker></defs>
                {graph.data.edges.map((e, i) => {
                  const a = pos.get(e.source_note_id), b = pos.get(e.target_note_id)
                  if (!a || !b) return null
                  return <g key={i}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-slate-300 dark:stroke-slate-600" strokeWidth={1.5} markerEnd="url(#arrow)" />
                    <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 4} textAnchor="middle" className="fill-slate-500 text-[9px]">{RELATION_LABEL[e.relation_type]}</text></g>
                })}
                {[...pos.entries()].map(([id, p]) => {
                  const n = graph.data!.nodes[id]
                  if (!n) return null
                  const isRoot = id === root
                  const label = n.title.length > 22 ? `${n.title.slice(0, 21)}…` : n.title
                  return (
                    <g key={id} transform={`translate(${p.x},${p.y})`} role="link" tabIndex={0} aria-label={`${n.title}. ${isRoot ? 'Centre note.' : 'Press Enter to centre the graph on this note.'}`}
                      className="cursor-pointer outline-none focus-visible:[&>circle]:stroke-brand-500" onClick={() => !isRoot && setRoot(id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!isRoot) setRoot(id) } }}>
                      <circle r={isRoot ? 34 : 26} className={isRoot ? 'fill-brand-600 stroke-brand-300' : 'fill-white stroke-brand-400 dark:fill-slate-800'} strokeWidth={3} />
                      <text textAnchor="middle" dy="6" className="text-[18px]">{n.icon ?? '📝'}</text>
                      <text textAnchor="middle" y={isRoot ? 52 : 44} className="fill-slate-700 text-[10px] font-semibold dark:fill-slate-200">{label}</text>
                    </g>
                  )
                })}
              </svg>
            </figure>

            <section aria-labelledby="edges-h" className="mt-6">
              <h2 id="edges-h" className="mb-3 text-base">All connections ({graph.data.edges.length})</h2>
              {graph.data.edges.length ? (
                <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
                  {graph.data.edges.map((e, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                      <Link to={`/notes/${e.source_note_id}`} className="font-semibold hover:text-brand-600">{graph.data!.nodes[e.source_note_id].title}</Link>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">{RELATION_LABEL[e.relation_type]}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                      <Link to={`/notes/${e.target_note_id}`} className="font-semibold hover:text-brand-600">{graph.data!.nodes[e.target_note_id].title}</Link>
                      <span className="text-xs text-slate-400">{e.depth} hop{e.depth === 1 ? '' : 's'} away</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">This note has no visible connections yet. <button type="button" className="font-semibold text-brand-600 hover:underline" onClick={() => navigate(`/notes/${root}`)}>Open it</button> to link another note.</p>}
            </section>
          </>
        )}
    </>
  )
}
