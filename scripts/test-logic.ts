// Pure-logic tests. Run: node scripts/test-logic.ts  (Node >= 22.18 strips types natively)
import assert from 'node:assert/strict'
import { sanitizeDoc, sanitizeDocDetailed, extractHeadings, isSafeHref, isSafeColor, wordCount } from '../src/editor/sanitize.ts'
import { makeAnchor, locateAnchor, normalizeRect, mergeLineRects } from '../src/lib/anchors.ts'
import { sniffMatches, extensionOf, formatBytes, FILE_TYPES } from '../src/lib/files.ts'
import { downloadName, ordinal } from '../src/utils/format.ts'

let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log('  ok -', name) }
const bytes = (s: string | number[]) => new Uint8Array(typeof s === 'string' ? [...s].map((c) => c.charCodeAt(0)) : s)

// ───────── sanitizer (stored-XSS defence) ─────────
t('keeps a normal document intact and assigns stable block ids', () => {
  const d = sanitizeDoc({ type: 'doc', content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Hello' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'World', marks: [{ type: 'bold' }] }] },
  ] })
  assert.equal(d.content!.length, 2)
  assert.equal(d.content![0].attrs!.level, 2)
  assert.ok(d.content![0].attrs!.blockId && d.content![1].attrs!.blockId)
  assert.notEqual(d.content![0].attrs!.blockId, d.content![1].attrs!.blockId)
  const again = sanitizeDoc({ type: 'doc', content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Hello' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'World', marks: [{ type: 'bold' }] }] },
  ] })
  assert.deepEqual(again, d, 'ids are deterministic across loads')
})
t('keeps existing block ids and de-duplicates repeated ones', () => {
  const d = sanitizeDoc({ type: 'doc', content: [
    { type: 'paragraph', attrs: { blockId: 'abc' }, content: [{ type: 'text', text: 'a' }] },
    { type: 'paragraph', attrs: { blockId: 'abc' }, content: [{ type: 'text', text: 'b' }] },
  ] })
  assert.equal(d.content![0].attrs!.blockId, 'abc')
  assert.notEqual(d.content![1].attrs!.blockId, 'abc')
})
t('drops javascript:/data: links but keeps safe ones', () => {
  const mk = (href: string) => sanitizeDoc({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { href } }] }] }] })
  for (const bad of ['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'java\tscript:alert(1)', 'data:text/html;base64,AAAA', 'vbscript:x', '//evil.com', '']) {
    assert.equal(mk(bad).content![0].content![0].marks, undefined, bad)
  }
  for (const ok of ['https://example.com/a?b=1', 'http://x.org', 'mailto:a@b.co', '#section', '/relative']) {
    assert.equal(mk(ok).content![0].content![0].marks![0].attrs!.href, ok)
  }
  assert.equal(isSafeHref('javascript:alert(1)'), false)
})
t('rejects CSS injection through colour attributes', () => {
  assert.equal(isSafeColor('red; background:url(http://evil)'), false)
  assert.equal(isSafeColor('#ff0'), true)
  assert.equal(isSafeColor('rgb(1, 2, 3)'), true)
  const d = sanitizeDoc({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'highlight', attrs: { color: 'red;position:fixed' } }] }] }] })
  assert.deepEqual(d.content![0].content![0].marks, [{ type: 'highlight' }])
})
t('removes unknown nodes/marks/attributes (scripts, iframes, event handlers, raw src)', () => {
  const r = sanitizeDocDetailed({ type: 'doc', content: [
    { type: 'script', content: [{ type: 'text', text: 'alert(1)' }] },
    { type: 'iframe', attrs: { src: 'http://evil' } },
    { type: 'paragraph', attrs: { onclick: 'alert(1)', style: 'x' }, content: [{ type: 'text', text: 'safe', marks: [{ type: 'evil' }] }] },
    { type: 'image', attrs: { src: 'http://tracker/p.gif', resourceId: 'not-a-uuid', path: '../../etc/passwd' } },
  ] })
  assert.equal(r.changed, true)
  const types = r.doc.content!.map((c) => c.type)
  assert.deepEqual(types, ['paragraph', 'image'])
  assert.equal(JSON.stringify(r.doc).includes('onclick'), false)
  assert.equal(JSON.stringify(r.doc).includes('tracker'), false)
  const img = r.doc.content![1]
  assert.equal(img.attrs!.resourceId, null)
  assert.equal(img.attrs!.path, null)
})
t('accepts well-formed image and attachment nodes', () => {
  const id = '123e4567-e89b-42d3-a456-426614174000'
  const d = sanitizeDoc({ type: 'doc', content: [
    { type: 'image', attrs: { resourceId: id, path: `${id}/${id}.png`, alt: 'diagram' } },
    { type: 'attachment', attrs: { resourceId: id, filename: 'a.pdf', size: 12, kind: 'pdf' } },
  ] })
  assert.equal(d.content![0].attrs!.path, `${id}/${id}.png`)
  assert.equal(d.content![1].attrs!.filename, 'a.pdf')
})
t('bounds depth/size and survives garbage input', () => {
  let deep: any = { type: 'text', text: 'x' }
  for (let i = 0; i < 60; i++) deep = { type: 'blockquote', content: [deep] }
  assert.doesNotThrow(() => sanitizeDoc({ type: 'doc', content: [deep] }))
  for (const g of [null, undefined, 5, 'str', [], { type: 'nope' }, { type: 'doc', content: 'x' }]) {
    const d = sanitizeDoc(g)
    assert.equal(d.type, 'doc'); assert.ok(d.content!.length >= 1)
  }
})
t('table cell attributes are clamped', () => {
  const d = sanitizeDoc({ type: 'doc', content: [{ type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 99999, rowspan: -3, colwidth: [100, 'x'] }, content: [{ type: 'paragraph' }] }] }] }] })
  const cell = d.content![0].content![0].content![0]
  assert.equal(cell.attrs!.colspan, 1); assert.equal(cell.attrs!.rowspan, 1); assert.equal(cell.attrs!.colwidth, null)
})
t('headings and word count are derived from the document', () => {
  const d = sanitizeDoc({ type: 'doc', content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Intro' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'one two three' }] },
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Deep' }] },
  ] })
  const hs = extractHeadings(d)
  assert.deepEqual(hs.map((h) => [h.level, h.text]), [[1, 'Intro'], [3, 'Deep']])
  assert.equal(wordCount(d), 5)
})

// ───────── annotation anchors ─────────
t('anchor survives when text is unchanged', () => {
  const text = 'Normalization removes redundancy from relational tables.'
  const a = makeAnchor('b1', text, 14, 32)
  assert.equal(a.quote, 'removes redundancy')
  assert.deepEqual(locateAnchor(text, a), { start: a.start, end: a.end, moved: false })
})
t('anchor re-finds the quote after edits before it', () => {
  const before = 'Normalization removes redundancy from relational tables.'
  const a = makeAnchor('b1', before, 14, 32)
  const after = 'In databases, Normalization removes redundancy from relational tables.'
  const loc = locateAnchor(after, a)!
  assert.equal(after.slice(loc.start, loc.end), 'removes redundancy')
  assert.equal(loc.moved, true)
})
t('anchor picks the occurrence with matching context and orphans when deleted', () => {
  const text = 'cat sat. the cat ran. a cat hid.'
  const a = makeAnchor('b', text, 13, 16)           // second "cat" (preceded by "the ")
  const edited = 'XX cat sat. the cat ran. a cat hid.'
  const loc = locateAnchor(edited, a)!
  assert.equal(edited.slice(loc.start - 4, loc.start), 'the ')
  assert.equal(locateAnchor('nothing here', a), null)
})
t('pdf rect helpers normalise and merge', () => {
  const r = normalizeRect({ left: 150, top: 120, width: 100, height: 20 }, { left: 100, top: 100, width: 500, height: 800 })
  assert.deepEqual([r.x, r.y, r.w, r.h].map((v) => +v.toFixed(3)), [0.1, 0.025, 0.2, 0.025])
  const merged = mergeLineRects([{ x: 0.1, y: 0.2, w: 0.1, h: 0.02 }, { x: 0.21, y: 0.2005, w: 0.1, h: 0.02 }, { x: 0.1, y: 0.4, w: 0.1, h: 0.02 }])
  assert.equal(merged.length, 2)
})

// ───────── file validation ─────────
t('magic bytes accept real files and reject disguised ones', () => {
  assert.equal(sniffMatches('pdf', bytes('%PDF-1.7 ...')), true)
  assert.equal(sniffMatches('pdf', bytes('MZ\x90\x00 evil exe')), false)
  assert.equal(sniffMatches('png', bytes([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10])), true)
  assert.equal(sniffMatches('png', bytes('<svg onload=alert(1)>')), false)
  assert.equal(sniffMatches('zip', bytes([0x50, 0x4b, 3, 4])), true)
  assert.equal(sniffMatches('zip', bytes('%PDF-')), false)
  assert.equal(sniffMatches('text', bytes('def f():\n    return 1\n')), true)
  assert.equal(sniffMatches('text', bytes([0x7f, 0x45, 0x4c, 0x46, 0, 1, 2])), false)
  assert.equal(sniffMatches('webp', bytes('RIFF\0\0\0\0WEBPVP8 ')), true)
})
t('allow-list excludes dangerous types and maps kinds', () => {
  for (const bad of ['exe', 'html', 'htm', 'svg', 'js.map', 'bat', 'dll', 'jar', 'apk', 'zip', 'docm', 'xlsm']) assert.equal(FILE_TYPES[bad], undefined, bad)
  assert.equal(FILE_TYPES.pdf.kind, 'pdf'); assert.equal(FILE_TYPES.py.kind, 'code'); assert.equal(FILE_TYPES.md.mime, 'text/markdown')
  assert.equal(extensionOf('Lecture.Notes.PDF'), 'pdf'); assert.equal(extensionOf('noext'), '')
  assert.equal(formatBytes(1536), '1.5 KB')
})
t('format helpers', () => {
  assert.equal(ordinal(1), '1st'); assert.equal(ordinal(12), '12th'); assert.equal(ordinal(23), '23rd')
  assert.equal(downloadName('SQL: Essentials & More!', 'x'), 'notenest-sql-essentials-more.pdf')
})

console.log(`\n${n} logic checks passed`)
