import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import RootLayout from './components/layout/RootLayout'
import ProtectedRoute from './auth/ProtectedRoute'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './auth/pages'
import { isConfigured } from './lib/env'
import SetupRequired from './pages/SetupRequired'
import { useAuth } from './auth/AuthProvider'

const Landing = lazy(() => import('./pages/Landing'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Explore = lazy(() => import('./pages/Explore'))
const SpacePage = lazy(() => import('./pages/SpacePage'))
const SemesterPage = lazy(() => import('./pages/SemesterPage'))
const SubjectPage = lazy(() => import('./pages/SubjectPage'))
const ResourcePage = lazy(() => import('./pages/ResourcePage'))
const NoteReadPage = lazy(() => import('./pages/NoteReadPage'))
const NoteEditorPage = lazy(() => import('./pages/NoteEditorPage'))
const SharedPage = lazy(() => import('./pages/SharedPage'))
const FilesPage = lazy(() => import('./pages/FilesPage'))
const BookmarksPage = lazy(() => import('./pages/BookmarksPage'))
const ReferencesPage = lazy(() => import('./pages/ReferencesPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const PlannerPage = lazy(() => import('./pages/PlannerPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

function Home() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/dashboard" replace />
  return <Landing />
}

export default function App() {
  if (!isConfigured) return <SetupRequired />
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />

        {/* readable by visitors when the content is public (enforced by RLS, not by the router) */}
        <Route path="explore" element={<Explore />} />
        <Route path="spaces/:spaceId" element={<SpacePage />} />
        <Route path="semesters/:semesterId" element={<SemesterPage />} />
        <Route path="subjects/:subjectId" element={<SubjectPage />} />
        <Route path="resources/:resourceId" element={<ResourcePage />} />
        <Route path="notes/:noteId" element={<NoteReadPage />} />
        <Route path="shared/:kind/:id" element={<SharedPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="notes/:noteId/edit" element={<NoteEditorPage />} />
          <Route path="files" element={<FilesPage />} />
          <Route path="bookmarks" element={<BookmarksPage />} />
          <Route path="references" element={<ReferencesPage />} />
          <Route path="planner" element={<PlannerPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
