import type { Resource } from '../../types'
import NotesCard from '../NotesCard'

export default function ResourceGrid({ items, label }: { items: Resource[]; label?: string }) {
  return (
    <ul aria-label={label} className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((r) => (
        <li key={r.id} className="min-w-0">
          <NotesCard resource={r} />
        </li>
      ))}
    </ul>
  )
}
