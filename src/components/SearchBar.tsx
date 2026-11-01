import { useId, type FormEvent } from 'react'
import { Search, X } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  /** Called on Enter / button press. If omitted the field is a live filter with no submit button. */
  onSubmit?: (value: string) => void
  placeholder?: string
  size?: 'md' | 'lg'
  label?: string
  autoFocus?: boolean
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search notes, topics or subjects…',
  size = 'md',
  label = 'Search resources',
  autoFocus,
}: Props) {
  const id = useId()
  const lg = size === 'lg'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit?.(value.trim())
  }

  return (
    <form role="search" onSubmit={submit} className="w-full">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={`group relative flex items-center rounded-2xl border border-slate-200 bg-white shadow-soft transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 ${
          lg ? 'p-1.5' : 'p-1'
        }`}
      >
        <Search className={`pointer-events-none ml-3 shrink-0 text-slate-400 ${lg ? 'h-5 w-5' : 'h-[18px] w-[18px]'}`} aria-hidden="true" />
        <input
          id={id}
          type="search"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className={`min-w-0 flex-1 bg-transparent px-3 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white [&::-webkit-search-cancel-button]:hidden ${
            lg ? 'py-3 text-base' : 'py-2 text-sm'
          }`}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {onSubmit && (
          <button type="submit" className={`btn-primary ${lg ? 'px-6 py-3' : ''}`}>
            Search
          </button>
        )}
      </div>
    </form>
  )
}
