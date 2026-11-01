import { mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Highlight from '@tiptap/extension-highlight'
import TextStyle from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { BlockId } from './BlockId'
import { Attachment, SignedImage } from './nodes'
import { isSafeHref } from './sanitize'

const lowlight = createLowlight(common)

/** Link whose rendered href is re-validated, so even hostile stored JSON cannot produce javascript: URLs. */
const SafeLink = Link.extend({
  renderHTML({ HTMLAttributes }) {
    const href = isSafeHref(HTMLAttributes.href) ? HTMLAttributes.href : ''
    return ['a', mergeAttributes(this.options.HTMLAttributes, { ...HTMLAttributes, href }), 0]
  },
})

export const CODE_LANGUAGES = ['plaintext', 'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'sql', 'bash', 'json', 'xml', 'css', 'yaml', 'markdown']

export function buildExtensions(opts: { editable: boolean; placeholder?: string }) {
  return [
    StarterKit.configure({ codeBlock: false, heading: { levels: [1, 2, 3] } }),
    CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
    Underline,
    SafeLink.configure({
      openOnClick: !opts.editable,
      autolink: opts.editable,
      protocols: ['http', 'https', 'mailto'],
      HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
    }),
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({ placeholder: opts.placeholder ?? "Type '/' for nothing special — just start writing…" }),
    BlockId,
    SignedImage,
    Attachment,
  ]
}
