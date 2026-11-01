import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Highlighter, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import type { Annotation, AnnotationColor, PdfAnchor } from '../types/db'
import { useBookmarkToggle, useBookmarks } from '../api/bookmarks'
import { useCreateAnnotation, useDeleteAnnotation, useResourceAnnotations } from '../api/annotations'
import { mergeLineRects, normalizeRect } from '../lib/anchors'
import { useToast } from '../components/ui/Toast'
import { friendlyMessage } from '../lib/errors'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const COLOR_HEX: Record<AnnotationColor, string> = { yellow: '#fde047', green: '#86efac', blue: '#93c5fd', pink: '#f9a8d4', purple: '#c4b5fd' }

interface Props { url: string; resourceId: string; canAnnotate: boolean; initialPage?: number }

export default function PdfViewer({ url, resourceId, canAnnotate, initialPage = 1 }: Props) {
  const toast = useToast()
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(Math.max(1, initialPage))
  const [zoom, setZoom] = useState(1)
  const [width, setWidth] = useState(720)
  const [pending, setPending] = useState<{ rects: PdfAnchor['rects']; quote: string; x: number; y: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const pageWrapRef = useRef<HTMLDivElement>(null)

  const { saved, toggle, pending: bmPending } = useBookmarkToggle({ resourceId, pdfPage: page }, `Page ${page}`)
  const bookmarks = useBookmarks()
  const annotations = useResourceAnnotations(resourceId)
  const create = useCreateAnnotation()
  const del = useDeleteAnnotation()

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(Math.max(280, Math.min(el.clientWidth - 2, 1000))))
    ro.observe(el); setWidth(Math.max(280, Math.min(el.clientWidth - 2, 1000)))
    return () => ro.disconnect()
  }, [])

  const options = useMemo(() => ({ cMapUrl: undefined, isEvalSupported: false }), []) // pdf.js: never eval embedded scripts
  const onLoaded = useCallback(({ numPages: n }: { numPages: number }) => { setNumPages(n); setPage((p) => Math.min(Math.max(1, p), n)) }, [])
  const go = (p: number) => { setPage(Math.min(Math.max(1, p), numPages || 1)); setPending(null) }

  const pageAnns = (annotations.data ?? []).filter((a) => a.anchor.type === 'pdf' && a.anchor.page === page)
  const savedPages = new Set((bookmarks.data ?? []).filter((b) => b.resource_id === resourceId && b.pdf_page).map((b) => b.pdf_page as number))

  const onMouseUp = () => {
    if (!canAnnotate) return
    const sel = window.getSelection()
    const host = pageWrapRef.current?.querySelector<HTMLElement>('.react-pdf__Page')
    if (!sel || sel.isCollapsed || !host || !sel.rangeCount) { return }
    const range = sel.getRangeAt(0)
    if (!host.contains(range.commonAncestorContainer)) return
    const quote = sel.toString().replace(/\s+/g, ' ').trim()
    if (!quote) return
    const pageBox = host.getBoundingClientRect()
    const rects = mergeLineRects(Array.from(range.getClientRects()).map((r) => normalizeRect(r, pageBox)))
    if (!rects.length) return
    const last = range.getBoundingClientRect()
    setPending({ rects, quote: quote.slice(0, 1000), x: Math.min(Math.max(last.left - pageBox.left + last.width / 2, 100), pageBox.width - 100), y: last.top - pageBox.top - 46 })
  }

  const highlight = async (color: AnnotationColor) => {
    if (!pending) return
    try {
      await create.mutateAsync({ resourceId, color, quote: pending.quote, anchor: { type: 'pdf', page, rects: pending.rects, quote: pending.quote } })
      window.getSelection()?.removeAllRanges(); setPending(null); toast.success('Highlight saved')
    } catch (e) { toast.error(friendlyMessage(e as Error)) }
  }

  const BM = saved ? BookmarkCheck : Bookmark

  return (
    <div className="flex flex-col">
      <div role="toolbar" aria-label="PDF controls" className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
        <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
        <label className="flex items-center gap-1.5 text-sm"><span className="sr-only">Page number</span>
          <input type="number" min={1} max={numPages || 1} value={page} onChange={(e) => go(Number(e.target.value) || 1)} className="input h-9 w-16 px-2 py-1 text-center" aria-label="Page number" />
          <span className="text-slate-500">/ {numPages || '…'}</span>
        </label>
        <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={() => go(page + 1)} disabled={page >= numPages} aria-label="Next page"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
        <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))} aria-label="Zoom out"><ZoomOut className="h-4 w-4" aria-hidden="true" /></button>
        <span className="w-12 text-center text-xs tabular-nums text-slate-500">{Math.round(zoom * 100)}%</span>
        <button type="button" className="btn-ghost h-9 w-9 p-0" onClick={() => setZoom((z) => Math.min(2.4, +(z + 0.2).toFixed(1)))} aria-label="Zoom in"><ZoomIn className="h-4 w-4" aria-hidden="true" /></button>
        <span className="flex-1" />
        {canAnnotate && (
          <button type="button" onClick={() => toggle()} disabled={bmPending} aria-pressed={saved} className={saved ? 'btn border border-brand-300 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200' : 'btn-secondary'}>
            <BM className="h-4 w-4" aria-hidden="true" />{saved ? `Page ${page} bookmarked` : `Bookmark page ${page}`}
          </button>
        )}
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_16rem]">
        <div ref={boxRef} className="min-w-0 overflow-auto bg-slate-100 p-3 dark:bg-slate-950" style={{ maxHeight: '78vh' }}>
          <Document file={url} onLoadSuccess={onLoaded} options={options}
            loading={<div className="p-8"><Spinner label="Loading PDF" /></div>}
            error={<ErrorState error="The PDF could not be loaded. It may be corrupted or you may have lost access." title="Can’t display this PDF" />}>
            <div ref={pageWrapRef} className="relative mx-auto w-fit" onMouseUp={onMouseUp}>
              <Page pageNumber={page} width={width * zoom} renderAnnotationLayer={false} renderTextLayer loading={<div className="skeleton" style={{ width: width * zoom, height: width * zoom * 1.3 }} />} />
              {/* personal highlights, positioned in page-relative units so they survive zoom/resize */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                {pageAnns.flatMap((a) => (a.anchor as PdfAnchor).rects.map((r, i) => (
                  <span key={`${a.id}-${i}`} className="absolute rounded-sm mix-blend-multiply" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%`, background: COLOR_HEX[a.color], opacity: 0.45 }} />
                )))}
              </div>
              {pending && (
                <div role="toolbar" aria-label="Highlight selection" style={{ left: pending.x, top: Math.max(pending.y, 4) }} onMouseDown={(e) => e.preventDefault()}
                  className="absolute z-30 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lift dark:border-slate-700 dark:bg-slate-900">
                  <Highlighter className="mx-1 h-4 w-4 text-slate-400" aria-hidden="true" />
                  {(Object.keys(COLOR_HEX) as AnnotationColor[]).map((c) => (
                    <button key={c} type="button" aria-label={`Highlight ${c}`} onClick={() => void highlight(c)} className="h-6 w-6 rounded-full border border-black/10" style={{ background: COLOR_HEX[c] }} />
                  ))}
                </div>
              )}
            </div>
          </Document>
        </div>

        <aside aria-label="Page highlights and bookmarks" className="border-t border-slate-200 bg-white p-3 text-sm lg:border-l lg:border-t-0 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Bookmarked pages</h3>
          {savedPages.size ? (
            <div className="mb-4 flex flex-wrap gap-1.5">{[...savedPages].sort((a, b) => a - b).map((p) => (
              <button key={p} type="button" onClick={() => go(p)} className={`rounded-lg border px-2 py-1 text-xs font-semibold ${p === page ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15' : 'border-slate-200 dark:border-slate-700'}`}>p. {p}</button>
            ))}</div>
          ) : <p className="mb-4 text-xs text-slate-500">{canAnnotate ? 'None yet.' : 'Sign in to bookmark pages.'}</p>}
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Highlights on this page</h3>
          {!canAnnotate ? <p className="text-xs text-slate-500">Sign in to highlight text. Highlights are private to you.</p>
            : pageAnns.length === 0 ? <p className="text-xs text-slate-500">Select text on the page to highlight it.</p>
            : <ul className="space-y-2">{pageAnns.map((a: Annotation) => (
              <li key={a.id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                <p className="line-clamp-3 border-l-4 pl-2 text-xs italic" style={{ borderColor: COLOR_HEX[a.color] }}>{a.quote}</p>
                <button type="button" className="mt-1 inline-flex items-center gap-1 text-xs text-rose-600" onClick={() => del.mutate(a.id)}><Trash2 className="h-3 w-3" aria-hidden="true" />Remove</button>
              </li>
            ))}</ul>}
        </aside>
      </div>
    </div>
  )
}
