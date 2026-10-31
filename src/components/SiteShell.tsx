import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { ArrowUpRight, GraduationCap, Menu, X } from 'lucide-react'
import { BrandMark } from './Common'
import { useI18n } from '../lib/i18n'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', key: 'home' },
  { to: '/notes', key: 'notes' },
  { to: '/videos', key: 'videos' },
  { to: '/resources', key: 'resources' },
  { to: '/quizzes', key: 'quizzes' },
  { to: '/about', key: 'about' },
  { to: '/contact', key: 'contact' },
]

export function SiteShell() {
  const { language, setLanguage, t } = useI18n()
  const { user, isStaff, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="shell site-header__inner">
          <Link to="/" className="brand-lockup" onClick={closeMenu}>
            <BrandMark />
            <span className="brand-lockup__text"><strong>Physics <em>Simplified</em></strong><small>with Suraj Bhardwaj</small></span>
          </Link>
          <nav className={`site-nav ${menuOpen ? 'site-nav--open' : ''}`} aria-label="Main navigation">
            {navItems.map((item) => <NavLink key={item.to} to={item.to} onClick={closeMenu} className={({ isActive }) => `site-nav__link ${isActive ? 'is-active' : ''}`}>{t(item.key)}</NavLink>)}
            <div className="site-nav__mob¶»§q«^