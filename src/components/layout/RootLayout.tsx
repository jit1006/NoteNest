import { useAuth } from '../../auth/AuthProvider'
import { PageSkeleton } from '../ui/Skeleton'
import AppShell from './AppShell'
import PublicLayout from './PublicLayout'
import ScrollToTop from './ScrollToTop'

/** Signed-in users get the app shell everywhere (public pages included); visitors get the marketing chrome. */
export default function RootLayout() {
  const { user, loading } = useAuth()
  if (loading) return <PageSkeleton />
  return <><ScrollToTop />{user ? <AppShell /> : <PublicLayout />}</>
}
