import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function ErrorState({ error, onRetry, title = 'Something went wrong' }: { error: unknown; onRetry?: () => void; title?: string }) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return (
    <div role="alert" className="flex flex-col items-center rounded-3xl border border-rose-200 bg-rose-50/60 px-6 py-12 text-center dark:border-rose-500/30 dark:bg-rose-500/5">
      <AlertTriangle className="mb-3 h-8 w-8 text-rose-500" aria-hidden="true" />
      <h2 className="text-lg">{title}</h2>
      {message && <p className="mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">{message}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-4">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  )
}
