import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { AdminShell } from './components/AdminShell'
import { SiteShell } from './components/SiteShell'
import { LoadingState } from './components/Common'
import { HomePage } from './pages/Home'
import { NotesPage } from './pages/NotesPage'
import { VideosPage } from './pages/VideosPage'
import { ResourcesPage } from './pages/ResourcesPage'
import { QuizzesPage } from './pages/QuizzesPage'
import { QuizTakePage } from './pages/QuizTakePage'
import { AboutPage } from './pages/AboutPage'
import { AccountPage } from './pages/AccountPage'
import { ContactPage } from './pages/ContactPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminOverviewPage } from './pages/AdminOverviewPage'
import { AdminMessagesPage, AdminNotesPage, AdminQuizzesPage, AdminResourcesPage, AdminVideosPage } from './pages/AdminContentPages'

function RequireTeacher() {
  const { loading, user, isStaff } = useAuth()
  const location = useLocation()
  if (loading) return <div className="route-loading"><LoadingState label="Checking teacher accessâ€¦" /></div>
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  if (!isStaff) return <div className="access-denied"><div className="access-denied__icon">Î¦</div><span className="eyebrow">RESTRICTED AREA</span><h1>Teacher access required.</h1><p>This workspace is only available¶»§q«^