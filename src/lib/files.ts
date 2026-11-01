import type { ResourceKind } from '../types/db'

export const MAX_FILE_BYTES = 50 * 1024 * 1024

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

const CODE_EXT = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'h', 'cpp', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'sql', 'sh', 'json', 'yaml', 'yml', 'css', 'kt', 'swift', 'r']

interface Spec { mime: string; kind: ResourceKind; sniff: 'pdf' | 'png' | 'jpeg' | 'gif' | 'webp' | 'zip' | 'text' }

/** Single allow-list mirrored by the database (`allowed_file_ext`) and the storage bucket MIME list. */
export const FILE_TYPES: Record<string, Spec> = {
  pdf: { mime: 'application/pdf', kind: 'pdf', sniff: 'pdf' },
  md: { mime: 'text/markdown', kind: 'markdown', sniff: 'text' },
  markdown: { mime: 'text/markdown', kind: 'markdown', sniff: 'text' },
  txt: { mime: 'text/plain', kind: 'text', sniff: 'text' },
  docx: { mime: DOCX, kind: 'docx', sniff: 'zip' },
  pptx: { mime: PPTX, kind: 'pptx', sniff: 'zip' },
  png: { mime: 'image/png', kind: 'image', sniff: 'png' },
  jpg: { mime: 'image/jpeg', kind: 'image', sniff: 'jpeg' },
  jpeg: { mime: 'image/jpeg', kind: 'image', sniff: 'jpeg' },
  gif: { mime: 'image/gif', kind: 'image', sniff: 'gif' },
  webp: { mime: 'image/webp', kind: 'image', sniff: 'webp' },
  ...Object.fromEntries(CODE_EXT.map((e) => [e, { mime: 'text/plain', kind: 'code' as ResourceKind, sniff: 'text' as const }])),
}

export const ACCEPT_ATTR = Object.keys(FILE_TYPES).map((e) => `.${e}`).join(',')
export const IMAGE_ACCEPT = '.png,.jpg,.jpeg,.gif,.webp'

export const extensionOf = (name: string): string => {
  const i = name.lastIndexOf('.')
  return i < 0 ? '' : name.slice(i + 1).toLowerCase()
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** Magic-byte check so a renamed binary cannot pass as a document. (Defence in depth; the server enforces MIME/ext/size/ownership.) */
export function sniffMatches(sniff: Spec['sniff'], b: Uint8Array): boolean {
  const s = (from: number, text: string) => text.split('').every((c, i) => b[from + i] === c.charCodeAt(0))
  switch (sniff) {
    case 'pdf': return s(0, '%PDF-')
    case 'png': return b[0] === 0x89 && s(1, 'PNG')
    case 'jpeg': return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
    case 'gif': return s(0, 'GIF8')
    case 'webp': return s(0, 'RIFF') && s(8, 'WEBP')
    case 'zip': return b[0] === 0x50 && b[1] === 0x4b && (b[2] === 3 || b[2] === 5)
    case 'text': {
      // no NUL bytes and no binary control characters in the head
      for (const c of b) if (c === 0 || (c < 9) || (c > 13 && c < 32)) return false
      return true
    }
  }
}

export interface FileCheck { ok: true; ext: string; mime: string; kind: ResourceKind }
export interface FileCheckFail { ok: false; error: string }

export async function validateFile(file: File, allowed?: ResourceKind[]): Promise<FileCheck | FileCheckFail> {
  const ext = extensionOf(file.name)
  const spec = FILE_TYPES[ext]
  if (!spec) return { ok: false, error: `".${ext || '?'}" files are not supported. Allowed: PDF, Markdown, TXT, DOCX, PPTX, images and common source code.` }
  if (allowed && !allowed.includes(spec.kind)) return { ok: false, error: `Only ${allowed.join(', ')} files are allowed here.` }
  if (file.size === 0) return { ok: false, error: 'That file is empty.' }
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: `That file is ${formatBytes(file.size)} — the limit is 50 MB.` }
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer())
  if (!sniffMatches(spec.sniff, head)) return { ok: false, error: `"${file.name}" does not look like a real .${ext} file.` }
  return { ok: true, ext, mime: spec.mime, kind: spec.kind }
}

export const KIND_LABEL: Record<ResourceKind, string> = {
  pdf: 'PDF', markdown: 'Markdown', text: 'Text', code: 'Source code', docx: 'Word', pptx: 'PowerPoint', image: 'Image', other: 'File',
}
