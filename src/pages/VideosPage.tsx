import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Play, Search, X } from 'lucide-react'
import { EmptyState, ErrorState, LoadingState, Modal, PageBanner, Tag } from '../components/Common'
import { formatDate, getMaterialUrl, getVideoEmbedUrl } from '../lib/content'
import { supabase } from '../lib/supabase'
import type { VideoRecord } from '../lib/types'

export function VideosPage() {
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<VideoRecord | null>(null)
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})

  const load = async () => {
    if (!supabase) { setError('Supabase is not configured.'); setLoading(false); return }
    setLoading(true); setError('')
    const { data, error: e } = await supabase.from('video_lessons').select('id,title,description,grade_label,subject,topic,video_url,thumbnail_path,is_published,created_at').eq('is_published', true).order('sort_order').order('created_at', { ascending: false })
    if (e) setError(e.message)
    const rows = (data ?? []) as VideoRecord[]
    setVideos(rows)
    const thumbPairs = await Promise.all(rows.filter((v) => v.thumbnail_path).map(async (v) => {
      try { return [v.id, await getMaterialUrl(v.thumbnail_path!)] as const } catch { return [v.id, ''] as const }
    }))
    setThumbnails(Object¶»§q«^