import { NavLink, Outlet, Link } from 'react-router-dom'
import { ArrowLeft, BookOpen, FileText, LayoutDashboard, LogOut, PlaySquare, Settings2, Sparkles, ClipboardList } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const items = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/notes', label: 'Notes', icon: BookOpen },
  { to: '/admin/videos', label: 'Videos', icon: PlaySquare },
  { to: '/admin/resources', label: 'Resources', icon: FileText },
  { to: '/admin/quizzes', label: 'Quizzes', icon: ClipboardList },
  { to: '/admin/messages', label: 'Messages', icon: Settings2 },
]

export function AdminShell() {
  const { user, signOut } = useAuth()
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-brand"><span className="admin-brand__mark">Î¦</span><span><strong>Physics Simplified</strong><small>Teacher studio</small></span></Link>
        <div className="admin-sidebar__label">WORKSPACE</div>
        <nav className="admin-nav">
          {items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `admin-nav__link ${isActive ? 'is-active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}
        </nav>
        <div className="admin-sidebar__bottom">
          <div className="admin-profile"><div className="admin-profile__avatar">SB</div><div><strong>{user?.email?.split('@')[0] ?? 'Te¶»§q«^