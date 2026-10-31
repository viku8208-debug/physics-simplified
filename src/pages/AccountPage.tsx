import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Atom, BookOpen, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export function AccountPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, isStaff } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const requestedNext = searchParams.get('next') || '/quizzes'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/quizzes'

  useEffect(() => {
    if (user) navigate(isStaff ? '/admin' : next, { replace: true })
  }, [user, isStaff, next, navigate])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) { setError('The backend is not configured.'); return }
    setLoading(true); setError(''); setMessage('')
    try {
      if (mode === 'signin') {
        const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (e) throw e
      } else {
        if (fullName.trim()¶»§q«^