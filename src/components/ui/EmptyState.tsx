import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  message: string
  action?: React.ReactNode
}

export default function EmptyState({ icon: Icon, title, message, action }: Props) {
  return (
    <div
      role="status"
      className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/40"
    >
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 text-brand-600 dark:from-brand-500/20 dark:to-accent-500/20 dark:text-brand-300">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="text-lg">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
}
