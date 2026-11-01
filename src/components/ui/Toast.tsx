import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

type Kind = 'success' | 'error' | 'info'
interface Toast { id: number; kind: Kind; message: string }
interface ToastApi { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void }

const Ctx = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)

  const push = useCallback((kind: Kind, message: string) => {
    const id = ++seq.current
    setToasts((t) => [...t.slice(-3), { id, kind, message }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 7000 : 4000)
  }, [])

  const api = useMemo<ToastApi>(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }),
    [push],
  )

  const icon = { success: CheckCircle2, error: AlertTriangle, info: Info }
  const tone = {
    success: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950 dark:text-emerald-100',
    error: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-950 dark:text-rose-100',
    info: 'border-brand-300 bg-brand-50 text-brand-900 dark:border-brand-500/40 dark:bg-slate-900 dark:text-brand-100',
  }

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {toasts.map((t) => {
          const Icon = icon[t.kind]
          return (
            <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3 text-sm shadow-lift ${tone[t.kind]}`}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="min-w-0 flex-1 break-words">{t.message}</p>
              <button type="button" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ToastApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useToast must be used inside <ToastProvider>')
  return v
}
