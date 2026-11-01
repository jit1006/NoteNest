// Text-anchor logic for personal highlights inside rich notes. Pure and dependency-free.
import type { NoteAnchor } from '../types/db'

const CONTEXT = 24

export function makeAnchor(blockId: string, blockText: string, start: number, end: number): NoteAnchor {
  return {
    type: 'block', blockId, start, end,
    quote: blockText.slice(start, end),
    prefix: blockText.slice(Math.max(0, start - CONTEXT), start),
    suffix: blockText.slice(end, end + CONTEXT),
  }
}

export interface Located { start: number; end: number; moved: boolean }

/**
 * Re-find an annotation inside the CURRENT text of its block.
 * 1. exact offsets still hold the quoted text → use them;
 * 2. otherwise search for the quote, preferring the occurrence whose surrounding text matches best;
 * 3. otherwise null (orphaned — the annotation is kept but not drawn).
 */
export function locateAnchor(blockText: string, a: Pick<NoteAnchor, 'start' | 'end' | 'quote' | 'prefix' | 'suffix'>): Located | null {
  if (a.quote && blockText.slice(a.start, a.end) === a.quote) return { start: a.start, end: a.end, moved: false }
  if (!a.quote) return null
  let best: { idx: number; score: number } | null = null
  let from = 0
  for (;;) {
    const idx = blockText.indexOf(a.quote, from)
    if (idx < 0) break
    const before = blockText.slice(Math.max(0, idx - a.prefix.length), idx)
    const after = blockText.slice(idx + a.quote.length, idx + a.quote.length + a.suffix.length)
    const score = common(before, a.prefix, true) + common(after, a.suffix, false) - Math.abs(idx - a.start) / 1e6
    if (!best || score > best.score) best = { idx, score }
    from = idx + 1
  }
  return best ? { start: best.idx, end: best.idx + a.quote.length, moved: true } : null
}

/** Length of the shared run at the boundary (suffix of `a` vs `b` when atEnd, else prefix). */
function common(a: string, b: string, atEnd: boolean): number {
  let n = 0
  const max = Math.min(a.length, b.length)
  while (n < max && (atEnd ? a[a.length - 1 - n] === b[b.length - 1 - n] : a[n] === b[n])) n++
  return n
}

/** Normalised PDF rectangles are independent of zoom: convert pixel boxes relative to a page element. */
export function normalizeRect(box: { left: number; top: number; width: number; height: number }, page: { left: number; top: number; width: number; height: number }) {
  return {
    x: clamp01((box.left - page.left) / page.width),
    y: clamp01((box.top - page.top) / page.height),
    w: clamp01(box.width / page.width),
    h: clamp01(box.height / page.height),
  }
}
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** Merge rects on (nearly) the same line to keep stored anchors small. */
export function mergeLineRects<T extends { x: number; y: number; w: number; h: number }>(rects: T[]): T[] {
  const sorted = [...rects].filter((r) => r.w > 0.0005 && r.h > 0.0005).sort((a, b) => a.y - b.y || a.x - b.x)
  const out: T[] = []
  for (const r of sorted) {
    const last = out[out.length - 1]
    if (last && Math.abs(last.y - r.y) < 0.006 && r.x <= last.x + last.w + 0.01) {
      const right = Math.max(last.x + last.w, r.x + r.w)
      out[out.length - 1] = { ...last, w: right - last.x, h: Math.max(last.h, r.h) }
    } else out.push({ ...r })
  }
  return out.slice(0, 150)
}
