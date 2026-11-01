import { useState } from 'react'
import { Download } from 'lucide-react'
import type { ResourceFile } from '../types/db'
import { signedUrl } from '../api/files'
import { useToast } from '../components/ui/Toast'
import { friendlyMessage } from '../lib/errors'

/** Mints a fresh, short-lived signed URL with Content-Disposition: attachment and downloads it. */
export default function DownloadButton({ file, variant = 'secondary' }: { file: Pick<ResourceFile, 'storage_path' | 'original_filename'>; variant?: 'primary' | 'secondary' }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    try {
      const url = await signedUrl(file.storage_path, 60, file.original_filename)
      const a = document.createElement('a')
      a.href = url; a.rel = 'noopener'; a.download = file.original_filename
      document.body.appendChild(a); a.click(); a.remove()
    } catch (e) { toast.error(friendlyMessage(e as Error)) } finally { setBusy(false) }
  }
  return (
    <button type="button" onClick={() => void go()} disabled={busy} className={variant === 'primary' ? 'btn-primary' : 'btn-secondary'} aria-label={`Download ${file.original_filename}`}>
      <Download className="h-4 w-4" aria-hidden="true" />{busy ? 'Preparing…' : 'Download'}
    </button>
  )
}
