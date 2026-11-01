import { Link } from 'react-router-dom'
import { Compass, Home, SearchX } from 'lucide-react'
import EmptyState from './EmptyState'

interface Props {
  title?: string
  message?: string
}

export default function NotFoundPanel({
  title = 'Page not found',
  message = 'The page you are looking for does not exist or has moved.',
}: Props) {
  return (
    <div className="container-page py-20">
      <EmptyState
        icon={SearchX}
        title={title}
        message={message}
        action={
          <>
            <Link to="/" className="btn-primary">
              <Home className="h-4 w-4" aria-hidden="true" />
              Back to home
            </Link>
            <Link to="/explore" className="btn-secondary">
              <Compass className="h-4 w-4" aria-hidden="true" />
              Explore notes
            </Link>
          </>
        }
      />
    </div>
  )
}
