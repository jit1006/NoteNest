// Whitelist sanitizer for stored Tiptap/ProseMirror JSON.
// The database stores whatever a (possibly malicious) client sends, so every document is passed through
// this function before it is rendered or saved: unknown node/mark types and attributes are dropped,
// URLs are restricted to safe protocols and CSS-bearing attributes are validated. Pure & dependency-free.

export interface JsonNode {
  type: string
  attrs?: Record<string, unknown>
  marks?: { type: string; attrs?: Record<string, unknown> }[]
  content?: JsonNode[]
  text?: string
}

export const BLOCK_ID_TYPES = ['paragraph', 'heading', 'codeBlock', 'blockquote', 'bulletList', 'orderedList', 'taskList', 'table', 'horizontalRule']

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_DEPTH = 24
const MAX_NODES = 20000

export function isSafeHref(href: unknown): href is string {
  if (typeof href !== 'string') return false
  // eslint-disable-next-line no-control-regex
  const v = href.replace(/[\u0000-\u0020\u007f-\u009f]/g, '')
  if (!v || v.length > 2048) return false
  return /^(https?:\/\/|mailto:|#|\/(?!\/))/i.test(v)
}

export function isSafeColor(c: unknown): c is string {
  return typeof c === 'string' && (/^#[0-9a-f]{3,8}$/i.test(c) || /^(rgb|hsl)a?\(\s*[\d.%\s,/-]+\)$/i.test(c) || /^[a-z]{3,20}$/i.test(c))
}

const str = (v: unknown, max: number): string | undefined => (typeof v === 'string' ? v.slice(0, max) : undefined)
const int = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : undefined

type AttrCleaner = (attrs: Record<string, unknown>) => Record<string, unknown>
const none: AttrCleaner = () => ({})

const NODE_ATTRS: Record<string, AttrCleaner> = {
  doc: none,
  paragraph: none,
  text: none,
  hardBreak: none,
  horizontalRule: none,
  blockquote: none,
  bulletList: none,
  listItem: none,
  taskList: none,
  tableRow: none,
  table: none,
  heading: (a) => ({ level: int(a.level, 1, 6) ?? 1 }),
  orderedList: (a) => ({ start: int(a.start, 1, 100000) ?? 1 }),
  taskItem: (a) => ({ checked: a.checked === true }),
  codeBlock: (a) => (typeof a.language === 'string' && /^[a-z0-9+#.-]{1,24}$/i.test(a.language) ? { language: a.language } : { language: null }),
  tableCell: cellAttrs,
  tableHeader: cellAttrs,
  image: (a) => ({
    resourceId: typeof a.resourceId === 'string' && UUID.test(a.resourceId) ? a.resourceId : null,
    path: typeof a.path === 'string' && /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{1,8}$/i.test(a.path) ? a.path : null,
    alt: str(a.alt, 300) ?? '',
  }),
  attachment: (a) => ({
    resourceId: typeof a.resourceId === 'string' && UUID.test(a.resourceId) ? a.resourceId : null,
    filename: str(a.filename, 255) ?? 'file',
    size: typeof a.size === 'number' && a.size >= 0 ? a.size : 0,
    kind: str(a.kind, 16) ?? 'other',
  }),
}

function cellAttrs(a: Record<string, unknown>) {
  const cw = Array.isArray(a.colwidth) && a.colwidth.every((n) => typeof n === 'number' && n > 0 && n < 4000) ? a.colwidth : null
  return { colspan: int(a.colspan, 1, 50) ?? 1, rowspan: int(a.rowspan, 1, 50) ?? 1, colwidth: cw }
}

const MARK_ATTRS: Record<string, (a: Record<string, unknown>) => Record<string, unknown> | null> = {
  bold: () => ({}),
  italic: () => ({}),
  underline: () => ({}),
  strike: () => ({}),
  code: () => ({}),
  link: (a) => (isSafeHref(a.href) ? { href: a.href.trim(), target: '_blank', rel: 'noopener noreferrer nofollow' } : null),
  highlight: (a) => (a.color === undefined || a.color === null ? {} : isSafeColor(a.color) ? { color: a.color } : {}),
  textStyle: (a) => (isSafeColor(a.color) ? { color: a.color } : {}),
}

export interface SanitizeResult { doc: JsonNode; changed: boolean }

export function sanitizeDoc(input: unknown): JsonNode {
  return sanitizeDocDetailed(input).doc
}

export function sanitizeDocDetailed(input: unknown): SanitizeResult {
  let count = 0
  let dropped = false

  const cleanNode = (n: unknown, depth: number): JsonNode | null => {
    if (!n || typeof n !== 'object' || depth > MAX_DEPTH || ++count > MAX_NODES) { dropped = true; return null }
    const node = n as JsonNode
    const type = node.type
    const attrCleaner = NODE_ATTRS[type]
    if (typeof type !== 'string' || !attrCleaner) { dropped = true; return null }

    if (type === 'text') {
      if (typeof node.text !== 'string' || node.text.length === 0) return null
      const marks = (Array.isArray(node.marks) ? node.marks : []).flatMap((m) => {
        const clean = m && typeof m.type === 'string' ? MARK_ATTRS[m.type]?.(m.attrs ?? {}) : null
        if (!clean) { dropped = true; return [] }
        return [Object.keys(clean).length ? { type: m.type, attrs: clean } : { type: m.type }]
      })
      return marks.length ? { type, text: node.text.slice(0, 100000), marks } : { type, text: node.text.slice(0, 100000) }
    }

    const out: JsonNode = { type }
    const attrs = attrCleaner(node.attrs ?? {})
    if (BLOCK_ID_TYPES.includes(type)) {
      const id = node.attrs?.blockId
      if (typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id)) attrs.blockId = id
    }
    if (Object.keys(attrs).length) out.attrs = attrs
    if (Array.isArray(node.content)) {
      const kids = node.content.map((c) => cleanNode(c, depth + 1)).filter((c): c is JsonNode => c !== null)
      if (kids.length) out.content = kids
    }
    return out
  }

  const root = cleanNode(input, 0)
  const doc: JsonNode = root && root.type === 'doc' ? root : { type: 'doc', content: [{ type: 'paragraph' }] }
  if (!doc.content?.length) doc.content = [{ type: 'paragraph' }]
  assignBlockIds(doc)
  return { doc, changed: dropped }
}

/** Give every block a stable id. Missing/duplicate ids get deterministic `auto-N` ids so reloads agree. */
export function assignBlockIds(doc: JsonNode): void {
  const seen = new Set<string>()
  let n = 0
  const walk = (node: JsonNode) => {
    if (BLOCK_ID_TYPES.includes(node.type)) {
      const id = node.attrs?.blockId
      if (typeof id !== 'string' || seen.has(id)) {
        let next = `auto-${++n}`
        while (seen.has(next)) next = `auto-${++n}`
        node.attrs = { ...(node.attrs ?? {}), blockId: next }
      }
      seen.add(node.attrs!.blockId as string)
    }
    node.content?.forEach(walk)
  }
  walk(doc)
}

export interface Heading { blockId: string; level: number; text: string }

export const nodeText = (n: JsonNode): string =>
  n.text ?? (n.content ? n.content.map(nodeText).join('') : '')

export function extractHeadings(doc: JsonNode): Heading[] {
  const out: Heading[] = []
  const walk = (n: JsonNode) => {
    if (n.type === 'heading') out.push({ blockId: String(n.attrs?.blockId ?? ''), level: Number(n.attrs?.level ?? 1), text: nodeText(n).trim() || 'Untitled heading' })
    else n.content?.forEach(walk)
  }
  walk(doc)
  return out
}

/** Plain text with whitespace between blocks (used for word counts / previews). */
export const plainText = (n: JsonNode): string => {
  if (n.text !== undefined) return n.text
  if (n.type === 'hardBreak') return ' '
  return (n.content ?? []).map(plainText).join(n.content?.every((c) => c.type === 'text' || c.type === 'hardBreak') ? '' : ' ')
}

export const wordCount = (doc: JsonNode): number => {
  const t = plainText(doc).replace(/\s+/g, ' ').trim()
  return t ? t.split(' ').length : 0
}
