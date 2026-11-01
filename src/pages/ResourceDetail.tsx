import { Link, useParams } from 'react-router-dom'
import { Calendar, GraduationCap, Info, Layers, Tag } from 'lucide-react'
import BookmarkButton from '../components/BookmarkButton'
import DownloadButton from '../components/DownloadButton'
import PDFViewer from '../components/PDFViewer'
import { Pill, TypeBadge } from '../components/ui/Badge'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import NotFoundPanel from '../components/ui/NotFoundPanel'
import ResourceGrid from '../components/ui/ResourceGrid'
import { TYPE_LABEL_LONG, getResource, getSubject, relatedResources } from '../data'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { formatDate } from '../utils/format'

export default function ResourceDetail() {
  const { resourceId } = useParams()
  const resource = getResource(resourceId)
  useDocumentTitle(resource?.title ?? 'Resource not found')

  if (!resource) {
    return <NotFoundPanel title="Resource not found" message="This note doesn’t exist or may have been removed. Try searching for it instead." />
  }

  const subject = getSubject(resource.subjectId)
  const related = relatedResources(resource, 3)
  const isPyq = resource.resourceType === 'pyq'

  return (
    <div className="container-page py-10">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Explore', to: '/explore' },
          { label: resource.subjectName, to: `/subjects/${resource.subjectId}` },
          { label: resource.title },
        ]}
      />

      <header className="mb-8 max-w-4xl">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <TypeBadge type={resource.resourceType} />
          <Pill>
            <GraduationCap className="h-3 w-3" aria-hidden="true" />
            Semester {resource.semester}
          </Pill>
          {resource.year && (
            <Pill>
              <Calendar className="h-3 w-3" aria-hidden="true" />
              {resource.year}
            </Pill>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl">{resource.title}</h1>
        <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">{resource.description}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <DownloadButton resource={resource} variant="primary" />
          <BookmarkButton resourceId={resource.id} resourceTitle={resource.title} variant="full" />
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <PDFViewer resource={resource} />

        <aside aria-label="Resource details" className="space-y-5">
          <div className="card p-5">
            <h2 className="text-sm">Details</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {[
                ['Type', TYPE_LABEL_LONG[resource.resourceType]],
                ['Subject', resource.subjectName],
                ['Semester', String(resource.semester)],
                ['Unit', resource.unit],
                ['Topic', resource.topic],
                ...(resource.year ? [['Year', String(resource.year)]] : []),
                ['Added', formatDate(resource.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
                  <dd className="text-right font-medium text-slate-900 dark:text-white">{v}</dd>
                </div>
              ))}
            </dl>
            {subject && (
              <Link to={`/subjects/${subject.id}`} className="btn-secondary mt-4 w-full">
                <Layers className="h-4 w-4" aria-hidden="true" />
                View subject
              </Link>
            )}
          </div>

          <div className="card p-5">
            <h2 className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4" aria-hidden="true" />
              Tags
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {resource.tags.map((t) => (
                <li key={t}>
                  <Link to={`/explore?q=${encodeURIComponent(t)}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-brand-500/15">
                    {t}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {isPyq
              ? 'Demo model paper written for NoteNest. It is not an official university question paper.'
              : 'Demo study material written for NoteNest to illustrate the library. Always cross-check with your syllabus.'}
          </p>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-14" aria-labelledby="related-title">
          <h2 id="related-title" className="mb-5 text-xl">Related resources</h2>
          <ResourceGrid items={related} label="Related resources" />
        </section>
      )}
    </div>
  )
}
