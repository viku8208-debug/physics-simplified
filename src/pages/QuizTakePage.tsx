import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Award, Check, CircleHelp, LockKeyhole, X } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState, Tag } from '../components/Common'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { QuizQuestion, QuizRecord, QuizResult } from '../lib/types'

export function QuizTakePage() {
  const { id = '' } = useParams()
  const { user, loading: authLoading } = useAuth()
  const [quiz, setQuiz] = useState<QuizRecord | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return }
    setLoading(true); setError('')
    const [quizResponse, questionResponse] = await Promise.all([
      supabase.from('quizzes').select('id,title,description,grade_label,subject,topic,duration_minutes,is_published,created_at').eq('id', id).eq('is_published', true).maybeSingle(),
      supabase.from('quiz_questions').select('id,quiz_id,prompt,options,sort_order').eq('quiz_id', id).order('sort_order'),
    ])
    if (quizResponse.err¶»§q«^