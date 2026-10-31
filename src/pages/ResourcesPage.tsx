import { useEffect, useMemo, useState } from 'react'
import { Download, ExternalLink, FileText, Search, X } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState, PageBanner, Modal, Tag } from '../components/Common'
import { formatDate, getMaterialUrl, RESOURCE_TYPES } from '../lib/content'
import { supabase } from '../lib/supabase'
import type { ResourceRecord } from '../lib/types'

export function ResourcesPage() {
  const [resources, setResources] = useState<ResourceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [type, setType] = useState('')
  const [active, setActive] = useState<ResourceRecord | null>(null)
  const [fileUrl, setFileUrl] = useState('')
  const [fileLoading, setFileLoading] = useState(false)

  const load = async () => {
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return }
    setLoading(true); setError('')
    const { data, error: e } = await supabase.from('resources').select('id,title,description,class_level,subject,resource_type,file_path,external_url,is_published,created_at').eq('is_published', true).order('sort_order').order('created_at', { ascending: false })
    if (e) setError(e.message)
    setResources((data ?? []) as ResourceRecord[])
    setLoading(false)
  }
  useEffect(() => { void load() }, [])

  const fil¶»§q«^