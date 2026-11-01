import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Navbar from './Navbar'
import ScrollToTop from './ScrollToTop'
import { PageSkeleton } from '../ui/Skeleton'

export default function Layout() {
  // A plain "#main" link would change the hash and break HashRouter, so focus programmatically.
  const skip = (e: React.MouseEvent) => {
    e.preventDefault()
    const main = document.getElementById('main')
    main?.focus()
    main?.scrollIntoView()
  }
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="/"
        onClick={skip}
        className="sr-only-focusable fixed left-4 top-3 z-50 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Skip to main content
      </a>
      <ScrollToTop />
      <Navbar />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
