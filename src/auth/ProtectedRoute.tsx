import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { PageSkeleton } from '../components/ui/Skeleton'

/** Redirects anonymous visitors to /login and returns them to the page they asked for. */
export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageSkeleton />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}
