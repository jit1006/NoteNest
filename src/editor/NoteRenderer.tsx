import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Bookmark, BookmarkCheck, MessageSquarePlus, Trash2, X } from 'lucide-react'
import type { Annotation, AnnotationColor, NoteAnchor, TiptapDoc } from '../types/db'
import { buildExtensions } from './extensions'
import { AnnotationHighlights, type HighlightStorage } from './AnnotationHighlights'
import { blockTextMap, docPosToOffset } from './anchorDom'
import { makeAnchor } from '../lib/anchors'
import { sanitizeDoc } from './sanitize'
import { useCreateAnnotation, useDeleteAnnotation, useUpdateAnnotation } from '../api/annotations'
import { useBookmarkToggle } from '../api/bookmarks'
import { useToast } from '../components/ui/Toast'
import { friendlyMessage } from '../lib/errors'

const COLORS: { c: AnnotationColor; hex: string }[] = [
  { c: 'yellow', hex: '#fde68a' }, { c: 'green', hex: '#bbf7d0' }, { c: 'blue', hex: '#bfdbfe' }, { c: 'pink', hex: '#fbcfe8' }, { c: 'purple', hex: '#ddd6fe' },
]

interface Props {
  noteId: string
  doc: TiptapDoc
  annotations: Annotation[]
  /** signed-in readers can highlight & bookmark */
  canAnnotate: boolean
  scrollToBlock?: string | null
}

interface Sel { blockId: string; start: number; end: number; text: string; x: number; y: number }

function BlockBookmark({ noteId, blockId, label, style }: { noteId: string; blockId: string; label: string; style: React.CSSProperties }) {
  const { saved, toggle, pending } = useBookmarkToggle({ noteId, blockId }, label)
  const Icon = saved ? BookmarkCheck : Bookmark
  return (
    <button type="button" style={style} disabled={pending} onClick={() => toggle()} aria-pressed={saved}
      aria-label={saved ? 'Remove block bookmark' : 'Bookmark this block'} title={saved ? 'Remove block bookmark' : 'Bookmark this block'}
      className={`absolute -left-9 z-10 hidden h-7 w-7 items-center justify-center rounded-lg border bg-white shadow-soft transition hover:border-brand-400 md:inline-flex dark:bg-slate-900 ${saved ? 'border-brand-400 text-brand-600' : 'border-slate-200 text-slate-400 dark:border-slate-700'}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}

export default function NoteRenderer({ noteId, doc, annotations, canAnnotate, scrollToBlock }: Props) {
  const toast = useToast()
  const create = useCreateAnnotation()
  const update = useUpdateAnnotation()
  const del = useDeleteAnnotation()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [sel, setSel] = useState<Sel | null>(null)
  const [commenting, setCommenting] = useState(false)
  const [comment, setComment] = useState('')
  const [active, setActive] = useState<{ id: string; x: number; y: number } | null>(null)
  const [hover, setHover] = useState<{ id: string; top: number; text: string } | null>(null)

  const content = useMemo(() => sanitizeDoc(doc), [doc])

  const readSelection = useCallback((): Sel | null => {
    const ed = editorRef.current
    const wrap = wrapRef.current
    const sel = window.getSelection()
    if (!ed || ed.isDestroyed || !wrap || !sel || sel.isCollapsed || !sel.rangeCount) return null
    const range = sel.getRangeAt(0)
    const dom = ed.view.dom
    if (!dom.contains(range.startContainer) || !dom.contains(range.endContainer)) return null
    // map the DOM selection to document positions (works for non-editable documents and on touch devices)
    const a = ed.view.posAtDOM(range.startContainer, range.startOffset)
    const b = ed.view.posAtDOM(range.endContainer, range.endOffset)
    const from = Math.min(a, b), to = Math.max(a, b)
    const $from = ed.state.doc.resolve(from), $to = ed.state.doc.resolve(to)
    if ($from.parent !== $to.parent || !$from.parent.isTextblock) return null
    const blockId = $from.parent.attrs.blockId as string | undefined
    if (!blockId) return null
    const map = blockTextMap($from.parent, $from.start())
    const start = docPosToOffset(map, from), end = docPosToOffset(map, to)
    if (end <= start) return null
    const text = map.text.slice(start, end)
    if (!text.trim()) return null
    const box = wrap.getBoundingClientRect(), r = range.getBoundingClientRect()
    return { blockId, start, end, text, x: Math.min(Math.max(r.left + r.width / 2 - box.left, 120), Math.max(box.width - 120, 120)), y: r.top - box.top - 48 }
  }, [])

  const editor = useEditor({
    editable: false,
    extensions: [...buildExtensions({ editable: false }), AnnotationHighlights],
    content,
    editorProps: { attributes: { class: 'note-prose', 'aria-label': 'Note content', role: 'article' } },
  })
  const editorRef = useRef(editor)
  editorRef.current = editor

  // follow the user's text selection (mouse, keyboard and touch all fire `selectionchange`)
  useEffect(() => {
    if (!canAnnotate) return
    let raf = 0
    const onSel = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const tb = wrapRef.current?.querySelector('[role="toolbar"]')
        if (tb && tb.contains(document.activeElement)) return // typing a comment: keep the toolbar
        setSel(readSelection())
      })
    }
    document.addEventListener('selectionchange', onSel)
    return () => { document.removeEventListener('selectionchange', onSel); cancelAnimationFrame(raf) }
  }, [canAnnotate, readSelection])

  // keep content in sync when the note changes
  useEffect(() => { if (editor && !editor.isDestroyed) editor.commands.setContent(content, false) }, [editor, content])

  // push personal highlights into the decoration plugin
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const st = editor.storage.annotationHighlights as HighlightStorage
    st.items = annotations; st.activeId = active?.id ?? null
    editor.view.dispatch(editor.state.tr.setMeta('annotations', true))
  }, [editor, annotations, active, content])

  // deep link to a block (?block=…)
  useEffect(() => {
    if (!scrollToBlock || !editor) return
    const t = window.setTimeout(() => {
      const el = wrapRef.current?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(scrollToBlock)}"]`)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('block-flash'); window.setTimeout(() => el.classList.remove('block-flash'), 2200)
    }, 150)
    return () => window.clearTimeout(t)
  }, [scrollToBlock, editor, content])

  const onClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-annot-id]')
    const box = wrapRef.current?.getBoundingClientRect()
    if (el && box) {
      const r = el.getBoundingClientRect()
      setActive({ id: el.dataset.annotId!, x: Math.min(Math.max(r.left - box.left + r.width / 2, 140), box.width - 140), y: r.bottom - box.top + 6 })
    } else setActive(null)
  }

  const onMove = (e: React.MouseEvent) => {
    if (!canAnnotate) return
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-block-id]')
    const box = wrapRef.current?.getBoundingClientRect()
    if (!el || !box || !['P', 'H1', 'H2', 'H3', 'PRE', 'BLOCKQUOTE', 'TABLE', 'UL', 'OL'].includes(el.tagName)) return
    const id = el.dataset.blockId!
    if (hover?.id !== id) setHover({ id, top: el.getBoundingClientRect().top - box.top, text: (el.textContent ?? '').slice(0, 80) })
  }

  const highlight = async (color: AnnotationColor, withComment?: string) => {
    if (!sel || !editor) return
    // rebuild the anchor from the CURRENT block text
    let anchor: NoteAnchor | null = null
    editor.state.doc.descendants((node, pos) => {
      if (anchor || !node.isTextblock || node.attrs.blockId !== sel.blockId) return
      const map = blockTextMap(node, pos + 1)
      anchor = makeAnchor(sel.blockId, map.text, sel.start, sel.end)
    })
    if (!anchor) return
    try {
      await create.mutateAsync({ noteId, anchor, quote: sel.text, color, comment: withComment })
      window.getSelection()?.removeAllRanges()
      setSel(null); setCommenting(false); setComment('')
      toast.success(withComment ? 'Comment saved' : 'Highlight saved')
    } catch (e) { toast.error(friendlyMessage(e as Error)) }
  }

  const activeAnn = annotations.find((a) => a.id === active?.id)

  return (
    <div ref={wrapRef} className="relative" onClick={onClick} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      {canAnnotate && hover && <BlockBookmark noteId={noteId} blockId={hover.id} label={hover.text} style={{ top: hover.top }} />}
      <EditorContent editor={editor} />

      {canAnnotate && sel && (
        <div role="toolbar" aria-label="Highlight selection" style={{ left: sel.x, top: Math.max(sel.y, 4) }}
          className="absolute z-30 w-max max-w-[92vw] -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lift dark:border-slate-700 dark:bg-slate-900"
          onMouseDown={(e) => { if ((e.target as HTMLElement).tagName !== 'TEXTAREA') e.preventDefault() }}>
          {!commenting ? (
            <div className="flex items-center gap-1">
              {COLORS.map(({ c, hex }) => (
                <button key={c} type="button" aria-label={`Highlight ${c}`} onClick={() => void highlight(c)} className="h-6 w-6 rounded-full border border-black/10" style={{ background: hex }} />
              ))}
              <button type="button" className="btn-ghost h-8 px-2 text-xs" onClick={() => setCommenting(true)}><MessageSquarePlus className="h-4 w-4" aria-hidden="true" />Comment</button>
            </div>
          ) : (
            <form className="flex w-64 flex-col gap-2" onSubmit={(e) => { e.preventDefault(); void highlight('yellow', comment.trim() || undefined) }}>
              <label className="sr-only" htmlFor="ann-comment">Your comment</label>
              <textarea id="ann-comment" className="input min-h-[4.5rem] text-sm" maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a private comment…" autoFocus />
              <div className="flex justify-end gap-2"><button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => setCommenting(false)}>Back</button><button className="btn-primary px-3 py-1 text-xs" disabled={!comment.trim() || create.isPending}>Save</button></div>
            </form>
          )}
        </div>
      )}

      {activeAnn && active && (
        <div role="dialog" aria-label="Highlight details" style={{ left: active.x, top: active.y }}
          className="absolute z-30 w-72 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-lift dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {COLORS.map(({ c, hex }) => (
                <button key={c} type="button" aria-label={`Change colour to ${c}`} aria-pressed={activeAnn.color === c} onClick={() => update.mutate({ id: activeAnn.id, color: c })}
                  className={`h-5 w-5 rounded-full border ${activeAnn.color === c ? 'border-slate-900 dark:border-white' : 'border-black/10'}`} style={{ background: hex }} />
              ))}
            </div>
            <button type="button" aria-label="Close" onClick={() => setActive(null)}><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
          <blockquote className="mt-2 line-clamp-3 border-l-2 border-slate-300 pl-2 text-xs italic text-slate-500">{activeAnn.quote}</blockquote>
          <label className="label mt-2" htmlFor="ann-edit">Private comment</label>
          <textarea id="ann-edit" key={activeAnn.id} defaultValue={activeAnn.comment} maxLength={2000} className="input min-h-[3.5rem] text-sm"
            onBlur={(e) => { if (e.target.value !== activeAnn.comment) update.mutate({ id: activeAnn.id, comment: e.target.value }) }} />
          <button type="button" className="btn-ghost mt-2 w-full text-rose-600" onClick={() => del.mutate(activeAnn.id, { onSuccess: () => { setActive(null); toast.info('Highlight removed') } })}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />Delete highlight
          </button>
        </div>
      )}
    </div>
  )
}
