import { mergeAttributes, Node } from '@tiptap/core'
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react'
import { Link } from 'react-router-dom'
import { FileText, ImageOff, Paperclip } from 'lucide-react'
import { useSignedUrl } from '../api/files'
import { formatBytes } from '../lib/files'

/** Image stored as a private file. The document keeps only {resourceId, path}; the URL is signed on demand. */
export function SignedImg({ path, alt, className = '' }: { path: string | null | undefined; alt?: string; className?: string }) {
  const { data: url, isError, isLoading } = useSignedUrl(path)
  if (!path || isError) {
    return (
      <span className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-6 text-sm text-slate-500 dark:border-slate-700">
        <ImageOff className="h-4 w-4" aria-hidden="true" /> Image unavailable
      </span>
    )
  }
  if (isLoading || !url) return <span className="skeleton block h-40 w-full max-w-md" aria-label="Loading image" />
  return <img src={url} alt={alt ?? ''} loading="lazy" className={`max-h-[32rem] max-w-full rounded-xl ${className}`} referrerPolicy="no-referrer" />
}

function ImageView({ node, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper className={`my-4 ${selected ? 'rounded-xl ring-2 ring-brand-500' : ''}`} data-drag-handle>
      <SignedImg path={node.attrs.path as string | null} alt={node.attrs.alt as string} />
    </NodeViewWrapper>
  )
}

export const SignedImage = Node.create({
  name: 'image',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { resourceId: { default: null }, path: { default: null }, alt: { default: '' } }
  },
  parseHTML() { return [{ tag: 'img[data-resource-id]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes({ 'data-resource-id': HTMLAttributes.resourceId ?? '', alt: HTMLAttributes.alt ?? '' })]
  },
  addNodeView() { return ReactNodeViewRenderer(ImageView) },
})

function AttachmentView({ node, selected }: NodeViewProps) {
  const a = node.attrs as { resourceId: string | null; filename: string; size: number; kind: string }
  return (
    <NodeViewWrapper className="my-3" data-drag-handle>
      <div className={`flex items-center gap-3 rounded-xl border bg-white p-3 dark:bg-slate-900 ${selected ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-slate-200 dark:border-slate-700'}`} contentEditable={false}>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{a.filename}</span>
          <span className="text-xs text-slate-500">{a.kind.toUpperCase()} · {formatBytes(a.size)}</span>
        </span>
        {a.resourceId && <Link to={`/resources/${a.resourceId}`} className="btn-secondary px-3 py-1.5 text-xs"><Paperclip className="h-3.5 w-3.5" aria-hidden="true" />Open</Link>}
      </div>
    </NodeViewWrapper>
  )
}

export const Attachment = Node.create({
  name: 'attachment',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { resourceId: { default: null }, filename: { default: 'file' }, size: { default: 0 }, kind: { default: 'other' } }
  },
  parseHTML() { return [{ tag: 'div[data-attachment]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-attachment': HTMLAttributes.resourceId ?? '' }), String(HTMLAttributes.filename ?? 'file')]
  },
  addNodeView() { return ReactNodeViewRenderer(AttachmentView) },
})
