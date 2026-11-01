import { useState } from 'react'

const EMOJI = ['📝', '📚', '📖', '🧠', '💡', '🔬', '🧮', '💻', '🗂️', '📊', '🌐', '🔐', '⚙️', '🧪', '🎯', '⭐', '🔥', '🚀', '🧩', '📐', '🗃️', '🔎', '✅', '❓']

export default function IconPicker({ value, onChange, disabled }: { value: string | null; onChange: (v: string | null) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button type="button" disabled={disabled} aria-haspopup="true" aria-expanded={open} aria-label="Change page icon" onClick={() => setOpen((o) => !o)}
        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 text-3xl hover:border-brand-300 disabled:opacity-60 dark:border-slate-700">{value ?? '📝'}</button>
      {open && (
        <div role="menu" className="absolute left-0 top-16 z-30 grid w-64 grid-cols-6 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lift dark:border-slate-700 dark:bg-slate-900">
          {EMOJI.map((e) => <button key={e} type="button" role="menuitem" onClick={() => { onChange(e); setOpen(false) }} className="rounded-lg p-1.5 text-xl hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={`Use ${e}`}>{e}</button>)}
          <button type="button" role="menuitem" onClick={() => { onChange(null); setOpen(false) }} className="col-span-6 rounded-lg p-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Remove icon</button>
        </div>
      )}
    </div>
  )
}
