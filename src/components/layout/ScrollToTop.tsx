import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Reset scroll on route change (query-only changes, e.g. filters, keep position). */
export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
