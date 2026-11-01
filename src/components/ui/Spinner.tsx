export default function Spinner({ label = 'Loading', className = '' }: { label?: string; className?: string }) {
  return (
    <span role="status" className={`inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 ${className}`}>
      <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      <span>{label}…</span>
    </span>
  )
}
