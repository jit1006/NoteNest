import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, FileText, Hash, NotebookText, Trash2 } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useBookmarks, useDeleteBookmark, type BookmarkRow } from '../api/bookmarks'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import { useToast } from '../components/ui/Toast'
import { friendlyMessage } from '../lib/errors'
import { formatDate } from '../utils/format'

type Tab = 'all' | 'notes' | 'blocks' | 'pages'
const TABS: [Tab, string][] = [['all', 'All'], ['notes', 'Notes & files'], ['blocks', 'Passages'], ['pages', 'PDF pages']]

function describe(b: BookmarkRow) {
  if (b.notes) return { to: `/notes/${b.notes.id}${b.block_id ? `?block=${encodeURIComponent(b.block_id)}` : ''}`, title: b.notes.title, sub: b.block_id ? `Passage${b.label ? `: “${b.label}”` : ''}` : 'Note', icon: b.block_id ? Hash : NotebookText }
  if (b.resources) return { to: `/resources/${b.resources.id}${b.pdf_page ? `?page=${b.pdf_page}` : ''}`, title: b.resources.title, sub: b.pdf_page ? `PDF page ${b.pdf_page}` : 'File', icon: FileText }
  return null
}

export default function BookmarksPage() {
  useDocumentTitle('Bookmarks')
  const list = useBookmarks(); const del = useDeleteBookmark(); const toast = useToast()
  const [tab, setTab] = useState<Tab>('all')
  const rows = (list.data ?? []).filter((b) => tab === 'all' ? true : tab === 'notes' ? !b.block_id && !b.pdf_page : tab === 'blocks' ? !!b.block_id : !!b.pdf_page)

  return (
    <>
      <PageHeader title="Bookmarks" description="Notes, passages and PDF pages you saved. Only you can see these." />
      <div role="tablist" aria-label="Bookmark type" className="mb-6 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} type="button" onClick={() => setTab(id)} className={`rounded-xl border px-3.5 py-1.5 text-sm font-semibold ${tab === id ? 'border-transparent bg-gradient-to-r from-brand-600 to-accent-600 text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{label}</button>)}
      </div>
      {list.error ? <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        : list.isLoading ? <div className="skeleton h-32" />
        : rows.length ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {rows.map((b) => {
              const d = describe(b)
              const Icon = d?.icon ?? Bookmark
              return (
                <li key={b.id} className="card flex items-center gap-3 p-4">
                  <Icon className="h-5 w-5 shrink-0 text-brand-500" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    {d ? <Link to={d.to} className="block truncate text-sm font-semibold hover:text-brand-600">{d.title}</Link> : <span className="text-sm font-semibold text-slate-500">No longer available</span>}
                    <p className="truncate text-xs text-slate-500">{d?.sub ?? 'This item was deleted or is no longer shared with you.'} · saved {formatDate(b.created_at.slice(0, 10))}</p>
                  </div>
                  <button type="button" className="btn-ghost h-9 w-9 p-0 text-slate-400 hover:text-rose-600" aria-label="Remove bookmark" onClick={() => del.mutate(b.id, { onError: (e) => toast.error(friendlyMessage(e as Error)) })}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                </li>
              )
            })}
          </ul>
        ) : <EmptyState icon={Bookmark} title="Nothing bookmarked here" message="Use the bookmark buttons on notes, headings and PDF pages." action={<Link to="/explore" className="btn-primary">Explore the library</Link>} />}
    </>
  )
}
