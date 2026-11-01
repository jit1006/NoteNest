import { Link } from 'react-router-dom'
import { Bookmark, Compass, Trash2 } from 'lucide-react'
import EmptyState from '../components/ui/EmptyState'
import ResourceGrid from '../components/ui/ResourceGrid'
import { getResource } from '../data'
import { useBookmarks } from '../hooks/useBookmarks'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { Resource } from '../types'
import { pluralize } from '../utils/format'

export default function Bookmarks() {
  useDocumentTitle('Bookmarks')
  const { ids, clear } = useBookmarks()
  // Ids that no longer exist in the catalog are ignored.
  const saved = ids.map((id) => getResource(id)).filter((r): r is Resource => Boolean(r))

  return (
    <div className="container-page py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl">Bookmarks</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {saved.length > 0 ? `${pluralize(saved.length, 'saved resource')}, stored on this device.` : 'Resources you save show up here.'}
          </p>
        </div>
        {saved.length > 0 && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (window.confirm('Remove all bookmarks?')) clear()
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Clear all
          </button>
        )}
      </header>

      {saved.length > 0 ? (
        <ResourceGrid items={saved} label="Bookmarked resources" />
      ) : (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          message="Tap the bookmark icon on any note or practice paper to keep it handy here."
          action={
            <Link to="/explore" className="btn-primary">
              <Compass className="h-4 w-4" aria-hidden="true" />
              Explore notes
            </Link>
          }
        />
      )}
    </div>
  )
}
