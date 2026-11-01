import { Link } from 'react-router-dom'
import { BookmarkCheck, CalendarCheck, Download, FileQuestion, Layers, Moon, Search, Smartphone } from 'lucide-react'
import HeroSection from '../components/HeroSection'
import SemesterSelector from '../components/SemesterSelector'
import SubjectCard from '../components/SubjectCard'
import ResourceGrid from '../components/ui/ResourceGrid'
import SectionHeading from '../components/ui/SectionHeading'
import { getSubject, popularResources, recentResources, subjects } from '../data'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import type { Subject } from '../types'

const FEATURED_IDS = ['dsa', 'dbms', 'os', 'ai']
const featured = FEATURED_IDS.map((id) => getSubject(id)).filter((s): s is Subject => Boolean(s))

const BENEFITS = [
  { icon: Layers, title: 'Organised by semester', text: 'Jump straight to the subjects and units that matter this term instead of digging through folders.' },
  { icon: Search, title: 'Instant search', text: 'Search across titles, topics, units and tags, then narrow results with combined filters.' },
  { icon: Download, title: 'Real PDFs, offline-ready', text: 'Preview in the browser or download the file — every resource is a genuine, readable PDF.' },
  { icon: FileQuestion, title: 'Exam practice', text: 'A dedicated library of model practice papers filtered by subject, semester and year.' },
  { icon: BookmarkCheck, title: 'Bookmarks that stay', text: 'Save what you need. Bookmarks are stored on your device and survive refreshes.' },
  { icon: CalendarCheck, title: 'Study planner', text: 'Turn notes into a plan with tasks, due dates and a simple progress summary.' },
  { icon: Moon, title: 'Light & dark', text: 'A comfortable reading experience day or night, remembered between visits.' },
  { icon: Smartphone, title: 'Mobile-first', text: 'Designed for phones first, polished on tablets and desktops.' },
]

export default function Landing() {
  useDocumentTitle()
  return (
    <>
      <HeroSection />

      <section className="container-page mt-4 py-14" aria-labelledby="sem-title">
        <SectionHeading
          id="sem-title"
          eyebrow="Explore by semester"
          title="Start from where you are"
          description="Pick your semester to see every subject and resource available for it."
          linkTo="/explore"
          linkLabel="Browse everything"
        />
        <SemesterSelector />
      </section>

      <section className="container-page py-10" aria-labelledby="feat-title">
        <SectionHeading
          id="feat-title"
          eyebrow="Featured subjects"
          title="Core subjects, covered end to end"
          description="Units, chapters, notes, practice papers and quick references for each subject."
        />
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((s) => (
            <li key={s.id}>
              <SubjectCard subject={s} />
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
          Looking for another subject? Open{' '}
          <Link to="/explore" className="font-semibold text-brand-600 hover:underline dark:text-brand-300">
            Explore
          </Link>{' '}
          to see all {subjects.length}.
        </p>
      </section>

      <section className="container-page py-10" aria-labelledby="recent-title">
        <SectionHeading id="recent-title" eyebrow="Recently added" title="Fresh on NoteNest" linkTo="/explore?sort=newest" linkLabel="See all notes" />
        <ResourceGrid items={recentResources(6)} label="Recently added resources" />
      </section>

      <section className="container-page py-10" aria-labelledby="pop-title">
        <SectionHeading
          id="pop-title"
          eyebrow="Popular study resources"
          title="Students keep coming back to these"
          description="A hand-picked set of high-value notes and cheat sheets."
        />
        <ResourceGrid items={popularResources(6)} label="Popular resources" />
      </section>

      <section className="container-page py-14" aria-labelledby="benefit-title">
        <SectionHeading eyebrow="Why NoteNest" title="Everything you need to study smarter" id="benefit-title" />
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="card p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page pt-6" aria-labelledby="cta-title">
        <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-brand-600 via-brand-600 to-accent-600 px-6 py-12 text-center sm:px-12">
          <div aria-hidden="true" className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <h2 id="cta-title" className="text-2xl text-white sm:text-3xl">Ready to plan your semester?</h2>
          <p className="mx-auto mt-2 max-w-xl text-brand-100">Browse your notes, bookmark what matters and turn it into a study plan.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/explore" className="btn bg-white text-brand-700 hover:bg-brand-50">Explore notes</Link>
            <Link to="/planner" className="btn border border-white/40 text-white hover:bg-white/10">Open study planner</Link>
          </div>
        </div>
      </section>
    </>
  )
}
