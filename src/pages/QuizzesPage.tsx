import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BrainCircuit, Clock3, ListChecks } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState, PageBanner, Tag } from '../components/Common'
import { formatDate } from '../lib/content'
import { supabase } from '../lib/supabase'
import type { QuizRecord } from '../lib/types'

export function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async () => {
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return }
    setLoading(true); setError('')
    const { data, error: e } = await supabase.from('quizzes').select('id,title,description,grade_label,subject,topic,duration_minutes,is_published,created_at').eq('is_published', true).order('sort_order').order('created_at', { ascending: false })
    if (e) setError(e.message)
    const rows = (data ?? []) as QuizRecord[]
    const enriched = await Promise.all(rows.map(async (quiz) => {
      const { count } = await supabase!.from('quiz_questions').select('id', { count: 'exact', head: true }).eq('quiz_id', quiz.id)
      return { ...quiz, question_count: count ?? 0 }
    }))
    setQuizzes(enriched)
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  return (
    <>
      <PageBanner kicker="CHECK YOUR UNDERSTANDING" title="Practice until it makes sense¶»§q«^