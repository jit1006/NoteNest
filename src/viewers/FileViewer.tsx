import { lazy, Suspense } from 'react'
import { FileQuestion } from 'lucide-react'
import type { Resource, ResourceFile } from '../types/db'
import { useSignedUrl } from '../api/files'
import { formatBytes, KIND_LABEL } from '../lib/files'
import Spinner from '../components/ui/Spinner'
import ErrorState from '../components/ui/ErrorState'
import { SignedImg } from '../editor/nodes'
import DownloadButton from './DownloadButton'

const PdfViewer = lazy(() => import('./PdfViewer'))
const MarkdownViewer = lazy(() => import('./MarkdownViewer'))
const CodeViewer = lazy(() => import('./CodeViewer'))
const DocxViewer = lazy(() => import('./DocxViewer'))
const PptxViewer = lazy(() => import('./PptxViewer'))

interface Props { resource: Resource; file: ResourceFile; canAnnotate: boolean; initialPage?: number }

/** Chooses a safe previewer by kind. Anything without a trustworthy preview shows metadata + a download button. */
export default function FileViewer({ resource, file, canAnnotate, initialPage }: Props) {
  const url = useSignedUrl(file.storage_path)

  if (url.isLoading) return <div className="p-8"><Spinner label="Preparing secure preview" /></div>
  if (url.isError || !url.data) return <ErrorState error={url.error} title="This file isn’t available" />

  const fallback = (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <FileQuestion className="h-10 w-10 text-slate-400" aria-hidden="true" />
      <h3 className="text-base">No preview for this file type</h3>
      <p className="text-sm text-slate-500">{file.original_filename} · {KIND_LABEL[resource.kind]} · {formatBytes(file.size_bytes)}</p>
      <DownloadButton file={file} variant="primary" />
    </div>
  )

  let body
  switch (resource.kind) {
    case 'pdf': body = <PdfViewer url={url.data} resourceId={resource.id} canAnnotate={canAnnotate} initialPage={initialPage} />; break
    case 'markdown': body = <MarkdownViewer url={url.data} />; break
    case 'text':
    case 'code': body = <CodeViewer url={url.data} extension={file.extension} />; break
    case 'image': body = <div className="flex justify-center bg-slate-100 p-4 dark:bg-slate-950"><SignedImg path={file.storage_path} alt={resource.title} /></div>; break
    case 'docx': body = <DocxViewer url={url.data} cacheKey={file.id} />; break
    case 'pptx': body = <PptxViewer url={url.data} cacheKey={file.id} />; break
    default: body = fallback
  }
  return <Suspense fallback={<div className="p-8"><Spinner label="Loading viewer" /></div>}>{body}</Suspense>
}
