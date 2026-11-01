import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface Crumb {
  label: string
  to?: string
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        {items.map((c, i) => {
          const last = i === items.length - 1
          return (
            <Fragment key={`${c.label}-${i}`}>
              <li className="min-w-0">
                {c.to && !last ? (
                  <Link to={c.to} className="rounded hover:text-brand-600 dark:hover:text-brand-300">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined} className={last ? 'font-medium text-slate-900 dark:text-white' : ''}>
                    {c.label}
                  </span>
                )}
              </li>
              {!last && (
                <li aria-hidden="true">
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
