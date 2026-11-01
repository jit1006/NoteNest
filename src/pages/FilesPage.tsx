import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileText, FolderUp, Trash2 } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useMyUploads, usePurgeResource } from '../api/resources'
import { useUid } from '../api/helpers'
import { supabase } from '../lib/supabase'
import { unwrap, friendlyMessage } from '../lib/errors'
import { formatBytes } from '../lib/files'
import UploadPanel from '../components/UploadPanel'
import PageHeader from '../components/ui/PageHeader'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import EmptyState from '../components/ui/EmptyState'
import { KindBadge, VisibilityBadge } from '../components/ui/Badge'
import { useToast } from '../components/ui/Toast'
import { formatDate } from '../utils/format'
import type { Resource } from '../types/db'

const QUOTA = 200 * 1024 * 1024

function useUsage() {
  const uid = useUid()
  return useQuery({
    queryKey: ['usage', uid], enabled: !!uid,
    queryFn: async () => (unwrap(await supabase.from('resource_files').select('size_bytes').eq('owner_id', uid!)) as { size_bytes: number }[]).reduce((n, r) => n + Number(r.size_bytes), 0),
  })
}

export default function FilesPage() {
  useDocumentTitle('Files')
  const uploads = useMyUploads()
  const usage = useUsage()
  const purge = usePurgeResource()
  const toast = useToast()
  const [victim, setVictim] = useState<Resource | null>(null)
  const used = usage.data ?? 0

  return (
    <>
      <PageHeader title="File manager" description="Upload study material and manage everything you have stored." />
      <section aria-labelledby="up-h" className="card p-5 sm:p-6"><h2 id="up-h" className="mb-4 text-base">Upload</h2><UploadPanel /></section>

      <section aria-labelledby="usage-h" className="mt-8">
        <h2 id="usage-h" className="mb-2 text-base">Storage</h2>
        <div role="progressbar" aria-label="Storage used" aria-valuemin={0} aria-valuemax={QUOTA} aria-valuenow={used} className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${Math.min(100, (used / QUOTA) * 100)}%` }} /></div>
        <p className="mt-1.5 text-xs text-slate-500">{formatBytes(used)} of {formatBytes(QUOTA)} used</p>
      </section>

      <section aria-labelledby="mine-h" className="mt-8">
        <h2 id="mine-h" className="mb-3 text-base">My files</h2>
        {uploads.isLoading ? <div className="skeleton h-24" /> : uploads.data?.length ? (
          <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
            {uploads.data.map((r) => {
              const f = r.resource_files?.[0]
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <FileText className="h-5 w-5 shrink-0 text-indigo-500" aria-hidden="true" />
                  <div className="min-w-0 flex-1"><Link to={`/resources/${r.id}`} className="block truncate text-sm font-semibold hover:text-brand-600">{r.title}</Link><p className="text-xs text-slate-500">{f?.original_filename} · {f ? formatBytes(f.size_bytes) : ''} · {formatDate(r.created_at.slice(0, 10))}</p></div>
                  <KindBadge kind={r.kind} /><VisibilityBadge value={r.visibility} />
                  <button type="button" className="btn-ghost h-9 w-9 p-0 text-slate-400 hover:text-rose-600" aria-label={`Delete ${r.title}`} onClick={() => setVictim(r)}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                </li>
              )
            })}
          </ul>
        ) : <EmptyState icon={FolderUp} title="No files yet" message="Drop a PDF, document or image above to get started." />}
      </section>

      <ConfirmDialog open={!!victim} danger title="Delete this file permanently?" message={`“${victim?.title}” and its stored copy will be erased. This cannot be undone.`} confirmLabel="Delete permanently" busy={purge.isPending} onCancel={() => setVictim(null)}
        onConfirm={() => victim && purge.mutate(victim.id, { onSuccess: () => { toast.success('File deleted'); setVictim(null) }, onError: (e) => toast.error(friendlyMessage(e as Error)) })} />
    </>
  )
}
