import { EyeOff, FileText, Globe2, Lock, NotebookText, type LucideIcon } from 'lucide-react'
import type { ResourceCategory, ResourceKind, Visibility } from '../../types/db'
import { KIND_LABEL } from '../../lib/files'

export function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300 ${className}`}>{children}</span>
}

const VIS: Record<Visibility, { Icon: LucideIcon; label: string; cls: string }> = {
  private: { Icon: Lock, label: 'Private', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  unlisted: { Icon: EyeOff, label: 'Unlisted', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  public: { Icon: Globe2, label: 'Public', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
}

export function VisibilityBadge({ value }: { value: Visibility }) {
  const { Icon, label, cls } = VIS[value]
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}><Icon className="h-3 w-3" aria-hidden="true" />{label}</span>
}

export function KindBadge({ kind }: { kind: ResourceKind | 'note' }) {
  const note = kind === 'note'
  const Icon = note ? NotebookText : FileText
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${note ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />{note ? 'Note' : KIND_LABEL[kind]}
    </span>
  )
}

export const CATEGORY_LABEL: Record<ResourceCategory, string> = { notes: 'Notes', pyq: 'Practice paper', reference: 'Reference', assignment: 'Assignment', other: 'Other' }

export function CategoryBadge({ category }: { category: ResourceCategory }) {
  return <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{CATEGORY_LABEL[category]}</span>
}
