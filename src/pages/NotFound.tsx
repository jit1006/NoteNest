import { useDocumentTitle } from '../hooks/useDocumentTitle'
import NotFoundPanel from '../components/ui/NotFoundPanel'

export default function NotFound() {
  useDocumentTitle('Page not found')
  return <NotFoundPanel />
}
