import { Link, useLocation } from 'react-router-dom'
import { Compass, Home, LogIn, ShieldQuestion } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import EmptyState from './EmptyState'

/** Shown for missing OR forbidden content — deliberately identical so existence is never leaked. */
export default function NotAvailable({ what = 'page' }: { what?: string }) {
  const { user } = useAuth()
  const loc = useLocation()
  return (
    <div className="py-12">
      <EmptyState
        icon={ShieldQuestion}
        title={`This ${what} isn’t available`}
        message={user ? `It may not exist, may have been deleted, or you may not have permission to view it.` : `It may not exist, or it may be private. If someone shared it with you, sign in to continue.`}
        action={
          <>
            {!user && <Link to="/login" state={{ from: loc.pathname + loc.search }} className="btn-primary"><LogIn className="h-4 w-4" aria-hidden="true" />Sign in</Link>}
            <Link to={user ? '/dashboard' : '/'} className={user ? 'btn-primary' : 'btn-secondary'}><Home className="h-4 w-4" aria-hidden="true" />{user ? 'Dashboard' : 'Home'}</Link>
            <Link to="/explore" className="btn-secondary"><Compass className="h-4 w-4" aria-hidden="true" />Explore library</Link>
          </>
        }
      />
    </div>
  )
}
