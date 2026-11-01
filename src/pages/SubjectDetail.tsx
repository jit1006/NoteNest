import { useParams } from 'react-router-dom'
import { BookOpen, FileQuestion, FileText, Layers, Zap } from 'lucide-react'
import NotFoundPanel from '../components/ui/NotFoundPanel'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import ResourceGrid from '../components/ui/ResourceGrid'
import SubjectIcon from '../components/ui/SubjectIcon'
import EmptyState from '../components/ui/EmptyState'
import { countByType, getSubject, resourcesForSubject } from '../data'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { ACCENT } from '../utils/accent'

export default function SubjectDetail() {
  const { subjectId } = useParams()
  const subject = getSubject(subjectId)
  useDocumentTitle(subject?.name ?? 'Subject not found')

  if (!subject) {
    return <NotFoundPanel title="Subject not found" message="We couldn’t find that subject. It may have been renamed or removed." />
  }

  const list = resourcesForSubject(subject.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const counts = countByType(list)
  const notes = list.filter((r) => r.resourceType === 'notes')
  const pyqs = list.filter((r) => r.resourceType === 'pyq')
  const refs = list.filter((r) => r.resourceType === 'reference')

  const stats = [
    { label: 'Total files', value: list.length, icon: FileText },
    { label: 'Notes', value: counts.notes, icon: BookOpen },
    { label: 'PYQs', value: counts.pyq, icon: FileQuestion },
    { label: 'References', value: counts.reference, icon: Zap },
  ]

  return (
    <div className="container-page py-10">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Explore', to: '/explore' },
          { label: `Semester ${subject.semester}`, to: `/explore?semester=${subject.semester}` },
          { label: subject.name },
        ]}
      />

      <header className="card relative overflow-hidden p-6 sm:p-8">
        <div aria-hidden="true" className={`absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br opacity-20 blur-2xl ${ACCENT[subject.accent].gradient}`} />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
          <SubjectIcon subject={subject} size="lg" />
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-bold uppercase tracking-widest ${ACCENT[subject.accent].text}`}>
              Semester {subject.semester} · {subject.shortName}
            </p>
            <h1 className="mt-1 text-3xl sm:text-4xl">{subject.name}</h1>
            <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-400">{subject.description}</p>
          </div>
        </div>
        <dl className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <Icon className="h-5 w-5 text-brand-600 dark:text-brand-300" aria-hidden="true" />
              <div className="flex flex-col-reverse">
                <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
                <dd className="text-xl font-bold text-slate-900 dark:text-white">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </header>

      <section className="mt-12" aria-labelledby="units-title">
        <h2 id="units-title" className="mb-5 flex items-center gap-2 text-xl">
          <Layers className="h-5 w-5 text-brand-600" aria-hidden="true" />
          Units and chapters
        </h2>
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subject.units.map((u) => (
            <li key={u.title} className="card p-5">
              <h3 className="text-base">{u.title}</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                {u.chapters.map((c) => (
                  <li key={c} className="flex items-start gap-2">
                    <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                    {c}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      {list.length === 0 ? (
        <div className="mt-12">
          <EmptyState icon={FileText} title="No resources yet" message="Resources for this subject will appear here once they are added." />
        </div>
      ) : (
        <>
          {[
            { id: 'notes', title: 'Notes', items: notes },
            { id: 'pyqs', title: 'Previous year question papers (demo model papers)', items: pyqs },
            { id: 'refs', title: 'Quick references', items: refs },
          ]
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <section key={g.id} className="mt-12" aria-labelledby={`${g.id}-title`}>
                <h2 id={`${g.id}-title`} className="mb-5 text-xl">
                  {g.title} <span className="text-base font-normal text-slate-400">({g.items.length})</span>
                </h2>
                <ResourceGrid items={g.items} label={g.title} />
              </section>
            ))}
        </>
      )}
    </div>
  )
}
