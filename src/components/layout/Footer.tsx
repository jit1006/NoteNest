import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import { subjects } from '../../data'
import Logo from '../ui/Logo'

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Your Semester. Your Notes. One Place. A smart library of semester-wise notes, practice papers and quick references for CS and MCA students.
          </p>
        </div>
        <nav aria-label="Footer: explore">
          <h2 className="text-sm">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <li><Link className="hover:text-brand-600 dark:hover:text-brand-300" to="/explore">All notes</Link></li>
            <li><Link className="hover:text-brand-600 dark:hover:text-brand-300" to="/pyqs">PYQ library</Link></li>
            <li><Link className="hover:text-brand-600 dark:hover:text-brand-300" to="/bookmarks">Bookmarks</Link></li>
            <li><Link className="hover:text-brand-600 dark:hover:text-brand-300" to="/planner">Study planner</Link></li>
          </ul>
        </nav>
        <nav aria-label="Footer: subjects">
          <h2 className="text-sm">Subjects</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-500 dark:text-slate-400">
            {subjects.slice(0, 5).map((s) => (
              <li key={s.id}>
                <Link className="hover:text-brand-600 dark:hover:text-brand-300" to={`/subjects/${s.id}`}>{s.shortName} · {s.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-slate-200 dark:border-slate-800">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
          <p className="flex items-start gap-1.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            All materials are self-created demo content. Practice papers are model papers, not official university papers.
          </p>
          <p>© 2026 NoteNest · Built for the Embarko Student Challenge</p>
        </div>
      </div>
    </footer>
  )
}
