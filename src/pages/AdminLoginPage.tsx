import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Atom, LockKeyhole, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const { user, isStaff } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (user && isStaff) navigate('/admin', { replace: true }) }, [user, isStaff, navigate])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase) { setError('The backend is not configured.'); return }
    setLoading(true); setError('')
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError) throw signInError

      let role = data.user?.app_metadata?.role
      if (role !== 'teacher' && role !== 'admin') {
        // The database function grants access only to the preconfigured, email-confirmed teacher.
        // It ignores all user-supplied email claims and does not expose the private role table.
        const { error: claimError } = await supabase.rpc('claim_teacher_access')
        if (!claimError) {
          const { data: refreshed, error: refreshError } = await supabase.auth.¶»§q«^