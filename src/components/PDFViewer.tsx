import { useEffect, useState } from 'react'
import { AlertTriangle, ExternalLink, FileText } from 'lucide-react'
import type { Resource } from '../types'
import DownloadButton from './DownloadButton'

type Status = 'checking' | 'ok' | 'missing'

/**
 * Embeds the PDF with the browser's native viewer. A HEAD request first verifies the
 * file exists so a missing PDF shows a clear message instead of a blank frame. On
 * browsers that cannot embed PDFs (some mobile browsers) the <object> fallback and the
 * action buttons below still give access to the file.
 */
export default function PDFViewer({ resource }: { resource: Resource }) {
  const [status, setStatus] = useState<Status>('checking')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    setStatus('checking')
    setLoaded(false)
    fetch(resource.pdfUrl, { method: 'HEAD' })
      .then((res) => {
        if (cancelled) return
        const type = res.headers.get('content-type') ?? ''
        // Some static hosts answer 200 + index.html for unknown files.
        setStatus(res.ok && (type === '' || type.includes('pdf') || type.includes('octet-stream')) ? 'ok' : 'missing')
      })
      .catch(() => {
        // e.g. opened from file:// where fetch is blocked: let the browser try anyway.
        if (!cancelled) setStatus('ok')
      })
    return () => {
      cancelled = true
    }
  }, [resource.pdfUrl])

  if (status === 'missing') {
    return (
      <div role="alert" className="card flex flex-col items-center gap-3 p-10 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" aria-hidden="true" />
        <h2 className="text-lg">This PDF could not be found</h2>
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
          The file for “{resource.title}” is missing from the library. Please try again later or browse other resources.
        </p>
      </div>
    )
  }

  return (
    <section aria-label={`PDF preview: ${resource.title}`} className="card overflow-hidden">
      <div className="relative h-[70vh] min-h-[28rem] bg-slate-100 dark:bg-slate-800/60">
        {(status === 'checking' || !loaded) && (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <div className="skeleton h-full w-full rounded-none" />
          </div>
        )}
        {status === 'ok' && (
          <object
            data={`${resource.pdfUrl}#view=FitH`}
            type="application/pdf"
            className="relative h-full w-full"
            aria-label={resource.title}
            onLoad={() => setLoaded(true)}
          >
            <div className="relative flex h-full flex-col items-center justify-center gap-3 bg-white p-8 text-center dark:bg-slate-900">
              <FileText className="h-10 w-10 text-brand-500" aria-hidden="true" />
              <p className="max-w-sm text-sm text-slate-600 dark:text-slate-300">
                Your browser can’t display PDFs inline. Open the file in a new tab or download it instead.
              </p>
            </div>
          </object>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 p-3 dark:border-slate-800">
        <DownloadButton resource={resource} variant="primary" />
        <a href={resource.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Open in new tab
        </a>
      </div>
    </section>
  )
}
