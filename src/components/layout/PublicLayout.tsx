import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import ThemeToggle from '../ThemeToggle'
import Logo from '../ui/Logo'
import { PageSkeleton } from '../ui/Skeleton'

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`

/** Chrome for visitors who are not signed in (landing, auth pages, public library). */
export default function PublicLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey)
  }, [open])
  const skip = (e: React.MouseEvent) => { e.preventDefault(); const m = document.getElementById('main'); m?.focus(); m?.scrollIntoView() }

  return (
    <div className="flex min-h-screen flex-col">
      <a href="/" onClick={skip} className="sr-only-focusable fixed left-4 top-3 z-[60] rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Skip to main content</a>
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label="NoteNest home" className="rounded-lg"><Logo /></Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            <NavLink to="/" end className={link}>Home</NavLink>
            <NavLink to="/explore" className={link}>Explore library</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login" className="btn-ghost hidden sm:inline-flex">Sign in</Link>
            <Link to="/register" className="btn-primary hidden sm:inline-flex">Get started</Link>
            <button type="button" aria-expanded={open} aria-controls="pub-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)} className="btn-ghost h-10 w-10 p-0 md:hidden">
              {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="pub-menu" aria-label="Mobile" className="space-y-1 border-t border-slate-200 bg-white px-4 pb-4 pt-2 md:hidden dark:border-slate-800 dark:bg-slate-950">
            <NavLink to="/" end className={link}>Home</NavLink>
            <NavLink to="/explore" className={link}>Explore library</NavLink>
            <NavLink to="/login" className={link}>Sign in</NavLink>
            <NavLink to="/register" className={link}>Create account</NavLink>
          </nav>
        )}
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none"><Suspense fallback={<PageSkeleton />}><Outlet /></Suspense></main>
      <footer className="mt-20 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
          <p>NoteNest — Your Semester. Your Notes. One Place.</p>
          <p>Demo library content is self-created. Practice papers are model papers, not official university papers.</p>
        </div>
      </footer>
    </div>
  )
}
