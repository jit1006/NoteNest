import { Bookmark, BookmarkCheck } from 'lucide-react'
import { useBookmarks } from '../hooks/useBookmarks'

interface Props {
  resourceId: string
  resourceTitle: string
  /** `icon` = compact round button for cards, `full` = labelled button for detail pages */
  variant?: 'icon' | 'full'
}

export default function BookmarkButton({ resourceId, resourceTitle, variant = 'icon' }: Props) {
  const { isBookmarked, toggle } = useBookmarks()
  const saved = isBookmarked(resourceId)
  const Icon = saved ? BookmarkCheck : Bookmark
  const label = saved ? `Remove bookmark: ${resourceTitle}` : `Bookmark: ${resourceTitle}`

  if (variant === 'full') {
    return (
      <button
        type="button"
        onClick={() => toggle(resourceId)}
        aria-pressed={saved}
        className={saved ? 'btn border border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-500/50 dark:bg-brand-500/15 dark:text-brand-200' : 'btn-secondary'}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        {saved ? 'Bookmarked' : 'Bookmark'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => toggle(resourceId)}
      aria-pressed={saved}
      aria-label={label}
      title={saved ? 'Remove bookmark' : 'Add bookmark'}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition active:scale-90 ${
        saved
          ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-500/50 dark:bg-brand-500/15 dark:text-brand-300'
          : 'border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-300'
      }`}
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  )
}
