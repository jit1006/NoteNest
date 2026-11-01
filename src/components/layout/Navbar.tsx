import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Bookmark, CalendarCheck, Compass, FileQuestion, Home, Menu, X, type LucideIcon } from 'lucide-react'
import { useBookmarks } from '../../hooks/useBookmarks'
import ThemeToggle from '../ThemeToggle'
import Logo from '../ui/Logo'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/pyqs', label: 'PYQs', icon: FileQuestion },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/planner', label: 'Planner', icon: CalendarCheck },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
  }`

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { ids } = useBookmarks()

  // Close the mobile menu on navigation.
  useEffect(() => setOpen(false), [pathname])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const badge = (to: string) =>
    to === '/bookmarks' && ids.length > 0 ? (
      <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-bold leading-5 text-white" aria-label={`${ids.length} saved`}>
        {ids.length}
      </span>
    ) : null

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="NoteNest home" className="rounded-lg">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {ITEMS.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              {label}
              {badge(to)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 md:hidden dark:border-slate-700 dark:text-slate-300"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="border-t border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden dark:border-slate-800 dark:bg-slate-950">
          <ul className="space-y-1">
            {ITEMS.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={(s) => `${linkClass(s)} w-full py-3`}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                  {badge(to)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
