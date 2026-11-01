import { BookOpen, FileQuestion, Zap, type LucideIcon } from 'lucide-react'
import type { ResourceType } from '../../types'
import { TYPE_LABEL } from '../../data'

const STYLE: Record<ResourceType, { cls: string; Icon: LucideIcon }> = {
  notes: { cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300', Icon: BookOpen },
  pyq: { cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300', Icon: FileQuestion },
  reference: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', Icon: Zap },
}

export function TypeBadge({ type }: { type: ResourceType }) {
  const { cls, Icon } = STYLE[type]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {TYPE_LABEL[type]}
    </span>
  )
}

export function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300 ${className}`}
    >
      {children}
    </span>
  )
}
