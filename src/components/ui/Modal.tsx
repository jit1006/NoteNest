import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

/** Accessible modal built on the native <dialog>: focus trap, Esc to close, backdrop click. */
export default function Modal({ open, onClose, title, description, children, footer, size = 'md' }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size]

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
      className={`w-[calc(100%-2rem)] ${width} rounded-2xl border border-slate-200 bg-white p-0 text-slate-700 shadow-lift backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300`}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
            <div>
              <h2 id={titleId} className="text-lg">{title}</h2>
              {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close dialog" className="btn-ghost -mr-2 -mt-1 h-9 w-9 p-0">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>
          <div className="overflow-y-auto p-5">{children}</div>
          {footer && <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-100 p-4 dark:border-slate-800">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}
