import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, ClipboardList, FileText, Inbox, PlaySquare, Plus, UploadCloud } from 'lucide-react'
import { ErrorState, LoadingState } from '../components/Common'
import { supabase } from '../lib/supabase'

const statConfig = [
  { key: 'notes', label: 'Published notes', icon: BookOpen, path: '/admin/notes', tone: 'cyan' },
  { key: 'videos', label: 'Video lessons', icon: PlaySquare, path: '/admin/videos', tone: 'violet' },
  { key: 'resources', label: 'Resources', icon: FileText, path: '/admin/resources', tone: 'green' },
  { key: 'quizzes', label: 'Published quizzes', icon: ClipboardList, path: '/admin/quizzes', tone: 'amber' },
  { key: 'submissions', label: 'Quiz attempts', icon: Inbox, path: '/admin/quizzes', tone: 'cyan' },
  { key: 'messages', label: 'Contact messages', icon: Inbox, path: '/admin/messages', tone: 'violet' },
] as const

export function AdminOverviewPage() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async () => {
    if (!supabase) { setError('Backend is not configured.'); setLoading(false); return }
    setLoading(true); setError('')
    const sources = [
      ['notes', 'notes', true], ['videos', 'video_lessons', true], ['resources', 'resources', true], ['quizzes', 'quizzes', true], ['submissions', 'quiz_submissions', false], [¶»§q«^