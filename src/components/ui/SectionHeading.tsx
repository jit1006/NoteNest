import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

interface Props {
  eyebrow?: string
  title: string
  description?: string
  linkTo?: string
  linkLabel?: string
  id?: string
}

export default function SectionHeading({ eyebrow, title, description, linkTo, linkLabel, id }: Props) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">{eyebrow}</p>
        )}
        <h2 id={id} className="text-2xl sm:text-3xl">
          {title}
        </h2>
        {description && <p className="mt-2 text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          {linkLabel ?? 'View all'}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}
