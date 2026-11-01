import type { ReactNode } from 'react'

export default function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 max-w-3xl">
        {eyebrow && <p className="mb-1 text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">{eyebrow}</p>}
        <h1 className="break-words text-2xl sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}
