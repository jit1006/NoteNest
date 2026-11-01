import { Bookmark, BookmarkCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useBookmarkToggle, type BookmarkTarget } from '../api/bookmarks'
import { useToast } from './ui/Toast'
import { friendlyMessage } from '../lib/errors'

export default function BookmarkToggle({ target, label }: { target: BookmarkTarget; label: string }) {
  const { saved, toggleAsync, pending, enabled } = useBookmarkToggle(target, label)
  const toast = useToast()
  if (!enabled) return <Link to="/login" className="btn-secondary"><Bookmark className="h-4 w-4" aria-hidden="true" />Sign in to bookmark</Link>
  const Icon = saved ? BookmarkCheck : Bookmark
  return (
    <button type="button" disabled={pending} aria-pressed={saved}
      onClick={() => toggleAsync().then(() => toast.success(saved ? 'Bookmark removed' : 'Bookmarked')).catch((e) => toast.error(friendlyMessage(e as Error)))}
      className={saved ? 'btn border border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-500/50 dark:bg-brand-500/15 dark:text-brand-200' : 'btn-secondary'}>
      <Icon className="h-4 w-4" aria-hidden="true" />{saved ? 'Bookmarked' : 'Bookmark'}
    </button>
  )
}
