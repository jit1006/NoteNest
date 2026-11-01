import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bookmark, CalendarCheck, Compass, FolderUp, LayoutDashboard, LogOut, Menu, Network, Plus, Settings, X, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import { useMySpaces } from '../../api/spaces'
import { useProfile, avatarUrl } from '../../api/profile'
import ThemeToggle from '../ThemeToggle'
import Logo from '../ui/Logo'
import SearchBar from '../SearchBar'
import { PageSkeleton } from '../ui/Skeleton'
import { useToast } from '../ui/Toast'
import { friendlyMessage } from '../../lib/errors'
import { CreateSpaceDialog } from '../dialogs/EntityDialogs'

interface Item { to: string; label: string; icon: LucideIcon }
const NAV: Item[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/explore', label: 'Explore library', icon: Compass },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/files', label: 'Files', icon: FolderUp },
  { to: '/references', label: 'Reference explorer', icon: Network },
  { to: '/planner', label: 'Study planner', icon: CalendarCheck },
  { to: '/settings', label: 'Profile & settings', icon: Settings },
]

const link = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const spaces = useMySpaces()
  const [creating, setCreating] = useState(false)
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <Link to="/dashboard" onClick={onNavigate} aria-label="NoteNest dashboard" className="rounded-lg px-1"><Logo /></Link>
      <nav aria-label="Main" className="space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={onNavigate} className={link}><Icon className="h-4 w-4" aria-hidden="true" />{label}</NavLink>
        ))}
      </nav>
      <nav aria-label="Your spaces">
        <div className="mb-2 flex items-center justify-between px-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Spaces</h2>
          <button type="button" onClick={() => setCreating(true)} aria-label="Create space" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"><Plus className="h-4 w-4" aria-hidden="true" /></button>
        </div>
        {spaces.isLoading && <div className="skeleton mx-3 h-8" />}
        <ul className="space-y-0.5">
          {spaces.data?.owned.map((s) => (
            <li key={s.id}><NavLink to={`/spaces/${s.id}`} onClick={onNavigate} className={link}><span aria-hidden="true">{s.icon ?? '📚'}</span><span className="truncate">{s.title}</span></NavLink></li>
          ))}
          {spaces.data?.shared.map(({ space, role }) => (
            <li key={space.id}><NavLink to={`/spaces/${space.id}`} onClick={onNavigate} className={link}><span aria-hidden="true">{space.icon ?? '👥'}</span><span className="min-w-0 flex-1 truncate">{space.title}</span><span className="text-[10px] uppercase text-slate-400">{role}</span></NavLink></li>
          ))}
        </ul>
      </nav>
      <CreateSpaceDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

export default function AppShell() {
  const { user, signOut } = useAuth()
  const profile = useProfile()
  const toast = useToast()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [drawer, setDrawer] = useState(false)
  const [q, setQ] = useState('')
  const focusMode = new URLSearchParams(useLocation().search).get('focus') === '1'

  useEffect(() => setDrawer(false), [pathname])
  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false)
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey)
  }, [drawer])
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  const skip = (e: React.MouseEvent) => { e.preventDefault(); const m = document.getElementById('main'); m?.focus(); m?.scrollIntoView() }
  const logout = async () => { try { await signOut(); navigate('/', { replace: true }) } catch (e) { toast.error(friendlyMessage(e as Error)) } }
  const avatar = avatarUrl(profile.data?.avatar_path)

  if (focusMode) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <main id="main" tabIndex={-1} className="outline-none"><Suspense fallback={<PageSkeleton />}><Outlet /></Suspense></main>
      </div>
    )
  }

  return (
    <div className="min-h-screen lg:pl-64">
      <a href="/" onClick={skip} className="sr-only-focusable fixed left-4 top-3 z-[60] rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Skip to main content</a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-950"><Sidebar /></aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-slate-950/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-lift dark:bg-slate-950">
            <button type="button" aria-label="Close menu" onClick={() => setDrawer(false)} className="btn-ghost absolute right-2 top-2 h-9 w-9 p-0"><X className="h-5 w-5" aria-hidden="true" /></button>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-xl lg:px-8 dark:border-slate-800 dark:bg-slate-950/85">
        <button type="button" aria-label="Open menu" aria-expanded={drawer} onClick={() => setDrawer(true)} className="btn-ghost h-10 w-10 p-0 lg:hidden"><Menu className="h-5 w-5" aria-hidden="true" /></button>
        <div className="max-w-xl flex-1">
          <SearchBar value={q} onChange={setQ} onSubmit={(v) => { navigate(`/explore${v ? `?q=${encodeURIComponent(v)}` : ''}`); setQ('') }} placeholder="Search notes and files…" label="Search the library" />
        </div>
        <ThemeToggle />
        <div className="flex items-center gap-2">
          <Link to="/settings" className="hidden items-center gap-2 rounded-xl px-2 py-1 hover:bg-slate-100 sm:flex dark:hover:bg-slate-800" aria-label="Profile and settings">
            {avatar ? <img src={avatar} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">{(profile.data?.display_name || user?.email || '?').slice(0, 1).toUpperCase()}</span>}
            <span className="max-w-[9rem] truncate text-sm font-semibold">{profile.data?.display_name || user?.email}</span>
          </Link>
          <button type="button" onClick={() => void logout()} className="btn-ghost h-10 w-10 p-0" aria-label="Sign out" title="Sign out"><LogOut className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-8 outline-none lg:px-8">
        <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
      </main>
    </div>
  )
}
