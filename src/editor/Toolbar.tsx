import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Bold, Code, Code2, Highlighter, Image as ImageIcon, Italic, Link2, List, ListChecks, ListOrdered,
  Minus, Paperclip, Palette, Pilcrow, Quote, Redo2, RemoveFormatting, Strikethrough, Table2, Underline as UnderlineIcon, Undo2, Unlink,
} from 'lucide-react'
import { CODE_LANGUAGES } from './extensions'
import { isSafeHref } from './sanitize'
import { IMAGE_ACCEPT, ACCEPT_ATTR } from '../lib/files'
import Modal from '../components/ui/Modal'

const HIGHLIGHTS = [['Yellow', '#fde68a'], ['Green', '#bbf7d0'], ['Blue', '#bfdbfe'], ['Pink', '#fbcfe8'], ['Purple', '#ddd6fe']]
const COLORS = [['Red', '#dc2626'], ['Blue', '#2563eb'], ['Green', '#16a34a'], ['Amber', '#d97706'], ['Violet', '#7c3aed']]

function Btn({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the editor selection
      onClick={onClick}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 ${
        active ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200' : ''
      }`}
    >
      {children}
    </button>
  )
}
const Sep = () => <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

interface Props {
  editor: Editor
  onPickImage: (file: File) => void
  onPickAttachment: (file: File) => void
  uploading?: boolean
}

export default function Toolbar({ editor, onPickImage, onPickAttachment, uploading }: Props) {
  const imgRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [menu, setMenu] = useState<null | 'hl' | 'color'>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [href, setHref] = useState('')
  const [linkError, setLinkError] = useState('')

  const c = () => editor.chain().focus()
  const heading = editor.isActive('heading', { level: 1 }) ? '1' : editor.isActive('heading', { level: 2 }) ? '2' : editor.isActive('heading', { level: 3 }) ? '3' : '0'
  const inTable = editor.isActive('table')
  const inCode = editor.isActive('codeBlock')

  const openLink = () => {
    setHref((editor.getAttributes('link').href as string | undefined) ?? '')
    setLinkError('')
    setLinkOpen(true)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && editor.isFocused) { e.preventDefault(); openLink() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  const applyLink = () => {
    let v = href.trim()
    if (!v) { c().unsetLink().run(); setLinkOpen(false); return }
    if (!/^[a-z][a-z0-9+.-]*:/i.test(v) && !v.startsWith('#') && !v.startsWith('/')) v = `https://${v}`
    if (!isSafeHref(v)) { setLinkError('Only http(s), mailto and in-app links are allowed.'); return }
    c().extendMarkRange('link').setLink({ href: v }).run()
    setLinkOpen(false)
  }

  return (
    <div role="toolbar" aria-label="Formatting" className="sticky top-16 z-20 -mx-4 border-y border-slate-200 bg-white/90 px-4 py-1.5 backdrop-blur sm:mx-0 sm:rounded-xl sm:border dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center gap-0.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible">
        <Btn label="Undo (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => c().undo().run()}><Undo2 className="h-4 w-4" /></Btn>
        <Btn label="Redo (Ctrl+Shift+Z)" disabled={!editor.can().redo()} onClick={() => c().redo().run()}><Redo2 className="h-4 w-4" /></Btn>
        <Sep />
        <label className="sr-only" htmlFor="block-type">Text style</label>
        <select
          id="block-type"
          value={heading}
          onChange={(e) => { const v = e.target.value; if (v === '0') c().setParagraph().run(); else c().toggleHeading({ level: Number(v) as 1 | 2 | 3 }).run() }}
          className="h-9 shrink-0 rounded-lg border border-slate-200 bg-transparent px-2 text-sm dark:border-slate-700"
        >
          <option value="0">Paragraph</option><option value="1">Heading 1</option><option value="2">Heading 2</option><option value="3">Heading 3</option>
        </select>
        <Sep />
        <Btn label="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => c().toggleBold().run()}><Bold className="h-4 w-4" /></Btn>
        <Btn label="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => c().toggleItalic().run()}><Italic className="h-4 w-4" /></Btn>
        <Btn label="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => c().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></Btn>
        <Btn label="Strikethrough" active={editor.isActive('strike')} onClick={() => c().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></Btn>
        <Btn label="Inline code" active={editor.isActive('code')} onClick={() => c().toggleCode().run()}><Code className="h-4 w-4" /></Btn>
        <div className="relative">
          <Btn label="Highlight colour" active={editor.isActive('highlight')} onClick={() => setMenu(menu === 'hl' ? null : 'hl')}><Highlighter className="h-4 w-4" /></Btn>
          {menu === 'hl' && (
            <div className="absolute left-0 top-10 z-30 flex gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-lift dark:border-slate-700 dark:bg-slate-900">
              {HIGHLIGHTS.map(([n, col]) => (
                <button key={col} type="button" aria-label={`Highlight ${n}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { c().setHighlight({ color: col }).run(); setMenu(null) }} className="h-6 w-6 rounded-full border border-black/10" style={{ background: col }} />
              ))}
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { c().unsetHighlight().run(); setMenu(null) }} className="rounded-full border border-slate-300 px-2 text-xs dark:border-slate-600">None</button>
            </div>
          )}
        </div>
        <div className="relative">
          <Btn label="Text colour" active={Boolean(editor.getAttributes('textStyle').color)} onClick={() => setMenu(menu === 'color' ? null : 'color')}><Palette className="h-4 w-4" /></Btn>
          {menu === 'color' && (
            <div className="absolute left-0 top-10 z-30 flex gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-lift dark:border-slate-700 dark:bg-slate-900">
              {COLORS.map(([n, col]) => (
                <button key={col} type="button" aria-label={`Text ${n}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { c().setColor(col).run(); setMenu(null) }} className="h-6 w-6 rounded-full border border-black/10" style={{ background: col }} />
              ))}
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { c().unsetColor().run(); setMenu(null) }} className="rounded-full border border-slate-300 px-2 text-xs dark:border-slate-600">Reset</button>
            </div>
          )}
        </div>
        <Btn label="Clear formatting" onClick={() => c().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="h-4 w-4" /></Btn>
        <Sep />
        <Btn label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => c().toggleBulletList().run()}><List className="h-4 w-4" /></Btn>
        <Btn label="Numbered list" active={editor.isActive('orderedList')} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Btn>
        <Btn label="Checklist" active={editor.isActive('taskList')} onClick={() => c().toggleTaskList().run()}><ListChecks className="h-4 w-4" /></Btn>
        <Btn label="Quote" active={editor.isActive('blockquote')} onClick={() => c().toggleBlockquote().run()}><Quote className="h-4 w-4" /></Btn>
        <Btn label="Code block" active={inCode} onClick={() => c().toggleCodeBlock().run()}><Code2 className="h-4 w-4" /></Btn>
        {inCode && (
          <>
            <label className="sr-only" htmlFor="code-lang">Code language</label>
            <select id="code-lang" value={(editor.getAttributes('codeBlock').language as string) || 'plaintext'}
              onChange={(e) => c().updateAttributes('codeBlock', { language: e.target.value === 'plaintext' ? null : e.target.value }).run()}
              className="h-9 shrink-0 rounded-lg border border-slate-200 bg-transparent px-2 text-sm dark:border-slate-700">
              {CODE_LANGUAGES.map((l) => <option key={l}>{l}</option>)}
            </select>
          </>
        )}
        <Btn label="Divider" onClick={() => c().setHorizontalRule().run()}><Minus className="h-4 w-4" /></Btn>
        <Sep />
        <Btn label="Insert table" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 className="h-4 w-4" /></Btn>
        <Btn label="Link (Ctrl+K)" active={editor.isActive('link')} onClick={openLink}><Link2 className="h-4 w-4" /></Btn>
        {editor.isActive('link') && <Btn label="Remove link" onClick={() => c().unsetLink().run()}><Unlink className="h-4 w-4" /></Btn>}
        <Btn label={uploading ? 'Uploading…' : 'Insert image'} disabled={uploading} onClick={() => imgRef.current?.click()}><ImageIcon className="h-4 w-4" /></Btn>
        <Btn label={uploading ? 'Uploading…' : 'Attach file'} disabled={uploading} onClick={() => fileRef.current?.click()}><Paperclip className="h-4 w-4" /></Btn>
        <input ref={imgRef} type="file" accept={IMAGE_ACCEPT} hidden aria-label="Choose image" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickImage(f); e.target.value = '' }} />
        <input ref={fileRef} type="file" accept={ACCEPT_ATTR} hidden aria-label="Choose file to attach" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickAttachment(f); e.target.value = '' }} />
      </div>

      {inTable && (
        <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 pt-1.5 text-xs dark:border-slate-800">
          <span className="mr-1 inline-flex items-center gap-1 font-semibold text-slate-500"><Pilcrow className="h-3 w-3" />Table</span>
          {([['Add row below', () => c().addRowAfter().run()], ['Add column right', () => c().addColumnAfter().run()], ['Delete row', () => c().deleteRow().run()], ['Delete column', () => c().deleteColumn().run()], ['Toggle header row', () => c().toggleHeaderRow().run()], ['Delete table', () => c().deleteTable().run()]] as [string, () => void][]).map(([l, fn]) => (
            <button key={l} type="button" onMouseDown={(e) => e.preventDefault()} onClick={fn} className="rounded-lg border border-slate-200 px-2 py-1 hover:border-brand-300 dark:border-slate-700">{l}</button>
          ))}
        </div>
      )}

      <Modal open={linkOpen} onClose={() => setLinkOpen(false)} title="Insert link" size="sm"
        footer={<><button type="button" className="btn-secondary" onClick={() => setLinkOpen(false)}>Cancel</button><button type="button" className="btn-primary" onClick={applyLink}>Apply</button></>}>
        <form onSubmit={(e) => { e.preventDefault(); applyLink() }}>
          <label htmlFor="link-href" className="label">URL</label>
          <input id="link-href" className="input" value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://example.com" autoFocus />
          {linkError && <p role="alert" className="mt-2 text-xs text-rose-600">{linkError}</p>}
          <p className="mt-2 text-xs text-slate-500">Leave empty to remove the link.</p>
        </form>
      </Modal>
    </div>
  )
}
