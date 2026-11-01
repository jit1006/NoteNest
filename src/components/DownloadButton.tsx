import { Download } from 'lucide-react'
import type { Resource } from '../types'
import { downloadName } from '../utils/format'

interface Props {
  resource: Resource
  variant?: 'primary' | 'secondary'
  compact?: boolean
}

/** Same-origin static file: the `download` attribute triggers a real file download. */
export default function DownloadButton({ resource, variant = 'secondary', compact }: Props) {
  return (
    <a
      href={resource.pdfUrl}
      download={downloadName(resource.title, resource.id)}
      className={variant === 'primary' ? 'btn-primary' : 'btn-secondary'}
      aria-label={`Download PDF: ${resource.title}`}
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      {compact ? 'PDF' : 'Download PDF'}
    </a>
  )
}
