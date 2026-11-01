import { useState } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { Download, EyeOff, ExternalLink } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { fetchSharedFileUrl, useSharedItem, type SharedNote, type SharedResource } from '../api/shared'
import NoteRenderer from '../editor/NoteRenderer'
import { SharedAccessContext } from '../editor/SharedAccess'
import { sanitizeDoc } from '../editor/sanitize'
import NotAvailable from '../components/ui/NotAvailable'
import { PageSkeleton } from '../components/ui/Skeleton'
import { KindBadge } from '../components/ui/Badge'
import { useToast } from '../components/ui/Toast'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { friendlyMessage } from '../lib/errors'
import { formatBytes } from '../lib/files'

/** Entry point for UNLISTED links. Requires sign-in AND the secret token — a bare URL is never enough. */
export default function SharedPage() {
  const { kind, id } = useParams()
  const [sp] = useSearchParams()
  const token = sp.get('token') ?? undefined
  const { user, loading } = useAuth()
  const location = useLocation()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const valid = kind === 'note' || kind === 'resource'
  const q = useSharedItem<SharedNote & SharedResource>(valid ? kind : 'note', id, token, !!user && valid)
  useDocumentTitle(q.data?.title ?? 'Shared item')

  if (loading) return <PageSkeleton />
  if (!valid || !token) return <NotAvailable what="shared item" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (q.isLoading) return <PageSkeleton />
  if (q.error || !q.data) return <NotAvailable what="shared item" />

  const d = q.data
  const banner = (
    <p className="mb-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      <EyeOff className="h-4 w-4 shrink-0" aria-hidden="true" />This item is <strong>unlisted</strong>: it is hidden from search and only people with the secret link can open it.
    </p>
  )

  if (kind === 'note') {
    return (
      <SharedAccessContext.Provider value={{ noteId: d.id, token }}>
        <div className="mx-auto max-w-3xl">
          {banner}
          <h1 className="mb-6 flex items-start gap-3 text-3xl font-extrabold sm:text-4xl"><span aria-hidden="true">{d.icon ?? '📝'}</span>{d.title}</h1>
          <NoteRenderer noteId={d.id} doc={sanitizeDoc(d.content) as SharedNote['content']} annotations={[]} canAnnotate={false} />
        </div>
      </SharedAccessContext.Provider>
    )
  }

  const open = async (download: boolean) => {
    setBusy(true)
    try {
      const f = d.files[0]
      const r = await fetchSharedFileUrl({ kind: 'resource', id: d.id, token, fileId: f?.id })
      if (download) { const a = document.createElement('a'); a.href = r.url; a.download = r.filename; document.body.appendChild(a); a.click(); a.remove() }
      else window.open(r.url, '_blank', 'noopener,noreferrer')
    } catch (e) { toast.error(friendlyMessage(e as Error)) } finally { setBusy(false) }
  }
  const f = d.files[0]
  return (
    <div className="mx-auto max-w-2xl">
      {banner}
      <div className="card p-6">
        <KindBadge kind={d.kind} />
        <h1 className="mt-3 break-words text-2xl">{d.title}</h1>
        {d.description && <p className="mt-2 whitespace-pre-line text-slate-600 dark:text-slate-400">{d.description}</p>}
        {f && <p className="mt-3 text-sm text-slate-500">{f.original_filename} · {formatBytes(f.size_bytes)}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" disabled={busy || !f} onClick={() => void open(false)}><ExternalLink className="h-4 w-4" aria-hidden="true" />Open file</button>
          <button type="button" className="btn-secondary" disabled={busy || !f} onClick={() => void open(true)}><Download className="h-4 w-4" aria-hidden="true" />Download</button>
          <Link to="/explore" className="btn-ghost">Explore library</Link>
        </div>
        <p className="mt-4 text-xs text-slate-400">Unlisted files open through a short-lived secure link; bookmarks and highlights are available for public and shared-space files.</p>
      </div>
    </div>
  )
}
