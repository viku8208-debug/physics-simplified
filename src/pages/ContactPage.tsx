import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Mail, MessageCircle, Send } from 'lucide-react'
import { ErrorState, PageBanner } from '../components/Common'
import { supabase } from '../lib/supabase'

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', class_level: '', subject: '', message: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const update = (key: keyof typeof form, value: string) => { setForm((old) => ({ ...old, [key]: value })); setSuccess(false) }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('')
    if (!supabase) { setError('The website backend is not configured.'); return }
    setSaving(true)
    const { error: e } = await supabase.from('contact_messages').insert({
      name: form.name.trim(), email: form.email.trim(), class_level: form.class_level ? Number(form.class_level) : null,
      subject: form.subject.trim(), message: form.message.trim(),
    })
    if (e) setError(e.message)
    else { setSuccess(true); setForm({ name: '', email: '', class_level: '', subject: '', message: '' }) }
    setSaving(false)
  }
  return <>
    <PageBanner kicker="GET IN TOUCH" title="Ask a question. Start a conversation." description="Share a doubt, ask about a lesson or send feedback to Physics Simplified." ico¶»§q«^