import { useEffect, useMemo, useState } from 'react'
import { BookMarked, Download, ExternalLink, FileText, Search, X } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState, PageBanner, Modal, Tag } from '../components/Common'
import { getMaterialUrl, formatDate, GRADES } from '../lib/content'
import { supabase } from '../lib/supabase'
import type { NoteRecord } from '../lib/types'
import { useI18n } from '../lib/i18n'

export function NotesPage() {
  const { t } = useI18n()
  const [notes, setNotes] = useState<NoteRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [active, setActive] = useState<NoteRecord | null>(null)
  const [fileUrl, setFileUrl] = useState('')
  const [fileLoading, setFileLoading] = useState(false)

  const load = async () => {
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return }
    setLoading(true); setError('')
    const { data, error: e } = await supabase.from('notes').select('id,title,description,grade_label,subject,topic,content,file_path,external_url,is_published,created_at').eq('is_published', true).order('sort_order').order('created_at', { ascending: false })
    if (e) setError(e.message)
    setNotes(data ?? [])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => not¶»§q«^