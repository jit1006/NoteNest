import { Link } from 'react-router-dom'
import { Compass, Home, SearchX } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import EmptyState from '../components/ui/EmptyState'

export default function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <div className="container-page py-16">
      <EmptyState icon={SearchX} title="Page not found" message="The page you are looking for does not exist or has moved."
        action={<><Link to="/" className="btn-primary"><Home className="h-4 w-4" aria-hidden="true" />Home</Link><Link to="/explore" className="btn-secondary"><Compass className="h-4 w-4" aria-hidden="true" />Explore library</Link></>} />
    </div>
  )
}
