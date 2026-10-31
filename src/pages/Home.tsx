import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowRight, Atom, BookOpen, BrainCircuit, FileText, MoveUpRight, Play, Waves } from 'lucide-react'
import { SectionHeading, EmptyState, LoadingState, ErrorState, Tag } from '../components/Common'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/content'
import { useI18n } from '../lib/i18n'
import type { NoteRecord, VideoRecord, QuizRecord } from '../lib/types'

export function HomePage() {
  const { t } = useI18n()
  const [notes, setNotes] = useState<NoteRecord[]>([])
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [quizzes, setQuizzes] = useState<QuizRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    if (!supabase) { setLoading(false); setError('Supabase is not configured.'); return }
    setLoading(true); setError('')
    const [n, v, q] = await Promise.all([
      supabase.from('notes').select('id,title,description,grade_label,subject,topic,content,file_path,external_url,is_published,created_at').eq('is_published', true).order('created_at', { ascending: false }).limit(3),
      supabase.from('video_lessons').select('id,title,description,grade_label,subject,topic,video_url,thumbnail_path,is_published,created_at').eq('is_published', true).order('created_at', { ascending: false }).limit(3),
      supabase.from('quizzes').select('id,title¶»§q«^