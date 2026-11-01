import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'

const Landing = lazy(() => import('./pages/Landing'))
const Explore = lazy(() => import('./pages/Explore'))
const SubjectDetail = lazy(() => import('./pages/SubjectDetail'))
const ResourceDetail = lazy(() => import('./pages/ResourceDetail'))
const PYQLibrary = lazy(() => import('./pages/PYQLibrary'))
const Bookmarks = lazy(() => import('./pages/Bookmarks'))
const Planner = lazy(() => import('./pages/Planner'))
const NotFound = lazy(() => import('./pages/NotFound'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="explore" element={<Explore />} />
        <Route path="subjects/:subjectId" element={<SubjectDetail />} />
        <Route path="resources/:resourceId" element={<ResourceDetail />} />
        <Route path="pyqs" element={<PYQLibrary />} />
        <Route path="bookmarks" element={<Bookmarks />} />
        <Route path="planner" element={<Planner />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
