import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { supabase } from './lib/supabase'
import PdfPreview from './PdfPreview'
import { Atom, BookOpen, Video, FileText, ClipboardList, LogIn, LogOut, Menu, X, ArrowUpRight, ShieldCheck, GraduationCap, Mail, Lock, Plus, RefreshCw, Upload, Trash2, Pencil, Check, CircleHelp, Trophy, UserRound, MessageSquare, Eye, EyeOff, RotateCcw, Play, Clock3, Sparkles, Share2 } from 'lucide-react'

type Tab = 'home' | 'notes' | 'videos' | 'resources' | 'quizzes' | 'about' | 'contact' | 'reviews' | 'account' | 'admin'
type Row = Record<string, any>
type ContentKey = 'notes' | 'videos' | 'resources' | 'quizzes'
const tableFor: Record<ContentKey, string> = { notes: 'notes', videos: 'video_lessons', resources: 'resources', quizzes: 'quizzes' }
const labelFor: Record<ContentKey, string> = { notes: 'Notes', videos: 'Video lessons', resources: 'Resources', quizzes: 'Quizzes' }
const nav: { id: Tab; label: string }[] = [
  { id: 'notes', label: 'Notes' }, { id: 'videos', label: 'Video lessons' },
  { id: 'resources', label: 'Resources' }, { id: 'quizzes', label: 'Quizzes' },
  { id: 'about', label: 'About Suraj Sir' }, { id: 'contact', label: 'Contact' },
  { id: 'reviews', label: 'Reviews' }
]
const emptyForm = { type: 'note', title: '', description: '', subject: 'Physics', grade_label: 'Class 12', topic: '', url: '', duration: '20', assessment_type: 'quiz', available_from: '', available_until: '' }
const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/png', 'image/jpeg']

function PSBMark({ small = false }: { small?: boolean }) {
  return <span className={small ? 'psb-mark psb-mark-small' : 'psb-mark'} aria-label="PSB logo">
    <img className="psb-logo-image" src="/psb-logo-transparent.webp" alt="" />
  </span>
}
function getVideoEmbedUrl(raw: string) {
  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, '').toLowerCase()
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0]
      return id ? 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&modestbranding=1' : raw
    }
    if (host.endsWith('youtube.com')) {
      const id = url.searchParams.get('v') || url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1]
      return id ? 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&modestbranding=1' : raw
    }
    if (host.endsWith('vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean).pop()
      return id && /^\d+$/.test(id) ? 'https://player.vimeo.com/video/' + id : raw
    }
    return raw
  } catch {
    return raw
  }
}
function isDirectVideoUrl(raw: string) {
  return /\.(mp4|webm|ogg|m3u8)(?:[?#]|$)/i.test(raw)
}

export default function App() {
  const [tab, setTab] = useState<Tab>(() => window.location.pathname.toLowerCase().endsWith('/admin.html') ? 'admin' : 'home')
  const [mobile, setMobile] = useState(false)
  const [quizClock, setQuizClock] = useState(Date.now())
  const [session, setSession] = useState<any>(null)
  const [staff, setStaff] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [studentClass, setStudentClass] = useState('12')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [rows, setRows] = useState<Record<ContentKey, Row[]>>({ notes: [], videos: [], resources: [], quizzes: [] })
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [contact, setContact] = useState({ name: '', email: '', subject: '', message: '', class_level: '' })
  const [activeQuiz, setActiveQuiz] = useState<Row | null>(null)
  const [quizQuestions, setQuizQuestions] = useState<Row[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [quizAttempt, setQuizAttempt] = useState<Row | null>(null)
  const [quizTimeLeft, setQuizTimeLeft] = useState(0)
  const answersRef = useRef<Record<string, number>>({})
  const saveAnswersChainRef = useRef<Promise<unknown>>(Promise.resolve())
  const quizSubmittingRef = useRef(false)
  const [quizResult, setQuizResult] = useState<Row | null>(null)
  const [selectedQuizId, setSelectedQuizId] = useState('')
  const [questionForm, setQuestionForm] = useState({ prompt: '', options: ['', '', '', ''], correct: 0, explanation: '' })
  const [messages, setMessages] = useState<Row[]>([])
  const [submissions, setSubmissions] = useState<Row[]>([])
  const [editing, setEditing] = useState<Row | null>(null)
  const [profile, setProfile] = useState({ full_name: '', class_level: '12', phone: '' })
  const [history, setHistory] = useState<Row[]>([])
  const [recovering, setRecovering] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [reviews, setReviews] = useState<Row[]>([])
  const [reviewDraft, setReviewDraft] = useState({ rating: 5, comment: '' })
  const [reviewLoading, setReviewLoading] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [sharedResource, setSharedResource] = useState<Row | null>(null)
  const [sharePageLoading, setSharePageLoading] = useState(false)
  const [sharePageError, setSharePageError] = useState('')
  const [shareFileLoading, setShareFileLoading] = useState(false)
  const [shareFileUrl, setShareFileUrl] = useState('')
  const [shareFileName, setShareFileName] = useState('')
  const [shareFileType, setShareFileType] = useState('')
  const [shareVideoUrl, setShareVideoUrl] = useState('')
  const [shareExternalUrl, setShareExternalUrl] = useState('')
  const [activeMaterial, setActiveMaterial] = useState<Row | null>(null)
  const [materialUrl, setMaterialUrl] = useState('')
  const [materialLoading, setMaterialLoading] = useState(false)
  const [materialError, setMaterialError] = useState('')
  const resourceShareCode = window.location.pathname.match(/^\/r\/(psb-[A-Za-z0-9_-]{16})\/?$/)?.[1] || ''
  const contentShareCode = window.location.pathname.match(/^\/s\/(psb-[A-Za-z0-9_-]{16})\/?$/)?.[1] || ''
  const userEmail = session?.user?.email || ''

  const notify = (message: string) => setNotice(message)
  const refreshAuth = async () => {
    if (!supabase) return
    const { data, error } = await supabase.auth.getSession()
    if (error) { notify(error.message); return }
    const s = data.session
    setSession(s)
    setStaff(['teacher', 'admin'].includes(s?.user?.app_metadata?.role || ''))
    if (s?.user) {
      const { data: p } = await supabase.from('profiles').select('full_name,class_level,phone').eq('id', s.user.id).maybeSingle()
      if (p) setProfile({ full_name: p.full_name || '', class_level: String(p.class_level || '12'), phone: p.phone || '' })
    }
  }
  const loadContent = async () => {
    if (!supabase) return
    setLoading(true)
    const specs: [ContentKey, string, string][] = [
      ['notes', 'notes', 'id,title,description,grade_label,subject,topic,content,file_path,external_url,is_published,created_at'],
      ['videos', 'video_lessons', 'id,title,description,grade_label,subject,topic,video_url,thumbnail_path,is_published,created_at'],
      ['resources', 'resources', 'id,title,description,class_level,subject,resource_type,file_path,external_url,is_published,created_at'],
      ['quizzes', 'quizzes', 'id,title,description,grade_label,subject,topic,duration_minutes,assessment_type,available_from,available_until,is_published,created_at']
    ]
    const next: Record<string, Row[]> = { notes: [], videos: [], resources: [], quizzes: [] }
    for (const [key, table, fields] of specs) {
      const { data, error } = await supabase.from(table).select(fields).order('created_at', { ascending: false }).limit(100)
      if (error) { next[key] = []; console.warn('Content load failed:', table, error.message) }
      else next[key] = data || []
    }
    setRows(next as Record<ContentKey, Row[]>)
    setLoading(false)
  }
  const loadTeacherData = async () => {
    if (!supabase || !staff) return
    const [m, s] = await Promise.all([
      supabase.from('contact_messages').select('id,name,email,subject,message,class_level,status,created_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('quiz_submissions').select('id,quiz_id,user_id,score,total_questions,auto_submitted,attempted_at').order('attempted_at', { ascending: false }).limit(100)
    ])
    if (!m.error) setMessages(m.data || [])
    if (!s.error) setSubmissions(s.data || [])
  }
  const loadStudentHistory = async () => {
    if (!supabase || !session?.user) return
    const { data, error } = await supabase.from('quiz_submissions').select('id,quiz_id,score,total_questions,auto_submitted,attempted_at').eq('user_id', session.user.id).order('attempted_at', { ascending: false }).limit(20)
    if (!error) setHistory(data || [])
  }

  const loadReviews = async () => {
    if (!supabase) return
    setReviewLoading(true)
    const { data, error } = await supabase
      .from('reviews')
      .select('id,display_name,class_level,rating,comment,created_at')
      .order('created_at', { ascending: false })
      .limit(40)
    if (error) console.warn('Reviews could not be loaded:', error.message)
    else setReviews(data || [])
    setReviewLoading(false)
  }
  const checkMyReview = () => {
    if (!session?.user) { setHasReviewed(false); return }
    setHasReviewed(window.localStorage.getItem('psb-reviewed-' + session.user.id) === '1')
  }

  useEffect(() => {
    void refreshAuth()
    void loadContent()
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') { setRecovering(true); setTab('account') }
      setSession(s)
      const allowed = ['teacher', 'admin'].includes(s?.user?.app_metadata?.role || '')
      setStaff(allowed)
      if (s?.user) window.setTimeout(() => { void loadContent() }, 0)
      else { setMessages([]); setSubmissions([]) }
    })
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => { if (staff) { void loadContent(); void loadTeacherData() } }, [staff])
  useEffect(() => { if (session?.user) void loadStudentHistory() }, [session?.user?.id])
  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1650)
    return () => window.clearTimeout(timer)
  }, [])
  useEffect(() => {
    if (!resourceShareCode) return
    let cancelled = false
    setSharePageLoading(true)
    setSharePageError('')
    void (async () => {
      if (!supabase) {
        if (!cancelled) {
          setSharePageLoading(false)
          setSharePageError('The resource service is temporarily unavailable.')
        }
        return
      }
      const { data, error } = await supabase.rpc('resolve_resource_share_link', { p_code: resourceShareCode })
      if (cancelled) return
      if (error || !data) {
        setSharePageError('This resource link is invalid, expired, or no longer published.')
      } else {
        setSharedResource(data as Row)
      }
      setSharePageLoading(false)
    })()
    return () => { cancelled = true }
  }, [resourceShareCode])
  useEffect(() => {
    if (!contentShareCode) return
    let cancelled = false
    setSharePageLoading(true)
    setSharePageError('')
    void (async () => {
      if (!supabase) {
        if (!cancelled) {
          setSharePageLoading(false)
          setSharePageError('The learning material service is temporarily unavailable.')
        }
        return
      }
      const { data, error } = await supabase.rpc('resolve_content_share_link', { p_code: contentShareCode })
      if (cancelled) return
      if (error || !data) {
        setSharePageError('This learning link is invalid, expired, or the material is no longer published.')
      } else {
        setSharedResource(data as Row)
      }
      setSharePageLoading(false)
    })()
    return () => { cancelled = true }
  }, [contentShareCode])
  useEffect(() => {
    return () => {
      if (shareFileUrl.startsWith('blob:')) URL.revokeObjectURL(shareFileUrl)
    }
  }, [shareFileUrl])
  useEffect(() => {
    void loadReviews()
    if (!supabase) return
    const channel = supabase
      .channel('public-reviews-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, payload => {
        const incoming = payload.new as Row
        if (!incoming?.id) return
        setReviews(current => {
          const next = [incoming, ...current.filter(item => item.id !== incoming.id)]
          return next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 40)
        })
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [])
  useEffect(() => {
    if (session?.user) void checkMyReview()
    else setHasReviewed(false)
  }, [session?.user?.id])
  const count = useMemo(() => Object.values(rows).reduce((n, list) => n + list.filter(item => item.is_published).length, 0), [rows])
  useEffect(() => {
    if (tab !== 'quizzes') return
    const timer = window.setInterval(() => setQuizClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [tab])

  const signIn = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return notify('Backend configuration is missing. Contact the site administrator.')
    setBusy(true); setNotice('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) notify(error.message)
    else { await refreshAuth(); await loadContent(); notify('You are signed in.'); setTab(window.location.pathname.toLowerCase().endsWith('/admin.html') ? 'admin' : 'home') }
  }
  const signUp = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return notify('Backend configuration is missing. Contact the site administrator.')
    setBusy(true); setNotice('')
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: name.trim(), class_level: Number(studentClass) } }
    })
    setBusy(false)
    if (error) notify(error.message)
    else {
      if (data.user && data.session) await supabase.from('profiles').upsert({ id: data.user.id, full_name: name.trim(), class_level: Number(studentClass) }, { onConflict: 'id' })
      setAuthMode('signin')
      notify('Confirmation email sent to ' + email.trim() + '. Verify it, then sign in.')
    }
  }
  const updateRecoveryPassword = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || newPassword.length < 8) return notify('Use a password with at least 8 characters.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setBusy(false)
    if (error) notify(error.message)
    else { setRecovering(false); setNewPassword(''); notify('Password updated successfully. You can now sign in with your new password.') }
  }
  const resetPassword = async () => {
    if (!supabase || !email.trim()) return notify('Enter your email address first.')
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    setBusy(false)
    notify(error ? error.message : 'Password reset email sent to ' + email.trim() + '.')
  }
  const saveProfile = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !session?.user) return
    setBusy(true)
    const { error } = await supabase.from('profiles')
      .update({ phone: profile.phone.trim() || null })
      .eq('id', session.user.id)
    setBusy(false)
    notify(error ? error.message : 'Your contact number has been saved.')
  }
  const claimTeacher = async () => {
    if (!supabase) return
    setBusy(true); setNotice('')
    const { error } = await supabase.rpc('claim_teacher_access')
    if (error) notify(error.message)
    else {
      await supabase.auth.refreshSession()
      await refreshAuth()
      setStaff(true); await loadTeacherData(); setTab('admin')
      notify('Teacher access activated securely.')
    }
    setBusy(false)
  }
  const signOut = async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    setStaff(false); setSession(null); setTab('home')
    notify(error ? error.message : 'You have signed out.')
  }

  const startQuiz = async (quiz: Row) => {
    if (!session?.user) { notify('Please sign in before starting a quiz or test.'); setTab('account'); return }
    if (!supabase) return
    setBusy(true); setQuizResult(null)
    // The server first resumes an existing attempt (even if new starts have since closed),
    // or creates a fresh timed attempt only while the scheduled window is open.
    const { data: attempt, error: attemptError } = await supabase.rpc('start_quiz_attempt', { p_quiz_id: quiz.id })
    if (attemptError || !attempt?.attempt_id) { setBusy(false); return notify(attemptError?.message || 'Could not start this assessment.') }

    const { data: questions, error: questionError } = await supabase.from('quiz_questions')
      .select('id,prompt,options,sort_order')
      .eq('quiz_id', quiz.id)
      .order('sort_order', { ascending: true })
    setBusy(false)
    if (questionError) return notify(questionError.message)
    if (!questions?.length) return notify('This assessment is not ready yet. Please ask Suraj Sir to add questions.')

    const restoredAnswers: Record<string, number> = {}
    if (Array.isArray(attempt.answers)) {
      for (const answer of attempt.answers) {
        if (answer?.question_id && Number.isInteger(Number(answer.selected_option))) {
          restoredAnswers[answer.question_id] = Number(answer.selected_option)
        }
      }
    }
    answersRef.current = restoredAnswers
    setAnswers(restoredAnswers)
    saveAnswersChainRef.current = Promise.resolve()
    quizSubmittingRef.current = false
    setQuizAttempt(attempt)
    setQuizTimeLeft(Math.max(0, Math.ceil((new Date(attempt.deadline_at).getTime() - Date.now()) / 1000)))
    setActiveQuiz(quiz)
    setQuizQuestions(questions)
    setTab('quizzes')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (attempt.resumed) notify('Your previous attempt has been resumed. The timer continued while you were away.')
  }
  const updateQuizAnswer = (questionId: string, selectedOption: number) => {
    if (!supabase || !quizAttempt) return
    const nextAnswers = { ...answersRef.current, [questionId]: selectedOption }
    answersRef.current = nextAnswers
    setAnswers(nextAnswers)
    const payload = Object.entries(nextAnswers).map(([id, option]) => ({ question_id: id, selected_option: option }))
    const attemptId = quizAttempt.attempt_id
    saveAnswersChainRef.current = saveAnswersChainRef.current
      .catch(() => undefined)
      .then(async () => {
        const { error } = await supabase.rpc('save_quiz_attempt_answers', { p_attempt_id: attemptId, p_answers: payload })
        if (error) console.warn('Quiz answer autosave failed:', error.message)
      })
  }
  const submitQuiz = async (e?: FormEvent, automatic = false) => {
    e?.preventDefault()
    if (!supabase || !activeQuiz || !quizAttempt || quizSubmittingRef.current) return
    const currentAnswers = answersRef.current
    if (!automatic && Object.keys(currentAnswers).length !== quizQuestions.length) {
      return notify('Please answer every question before submitting. Unanswered questions are scored as zero when time expires.')
    }
    quizSubmittingRef.current = true
    setBusy(true)
    await saveAnswersChainRef.current.catch(() => undefined)
    const payload = Object.entries(answersRef.current).map(([id, option]) => ({ question_id: id, selected_option: option }))
    const { data, error } = await supabase.rpc('submit_quiz_attempt', {
      p_attempt_id: quizAttempt.attempt_id,
      p_answers: payload
    })
    setBusy(false)
    quizSubmittingRef.current = false
    if (error) {
      notify((automatic ? 'Automatic submission is being retried. ' : '') + error.message)
      if (automatic) window.setTimeout(() => { void submitQuiz(undefined, true) }, 4000)
      return
    }
    setQuizResult(data)
    setActiveQuiz(null)
    setQuizAttempt(null)
    setQuizQuestions([])
    setQuizTimeLeft(0)
    await loadStudentHistory()
    notify(data?.auto_submitted ? 'Time is over. Your test was automatically submitted.' : 'Assessment submitted. Your score is ready.')
  }
  useEffect(() => {
    if (!activeQuiz || !quizAttempt?.deadline_at) return
    let submitting = false
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((new Date(quizAttempt.deadline_at).getTime() - Date.now()) / 1000))
      setQuizTimeLeft(remaining)
      if (remaining <= 0 && !submitting) {
        submitting = true
        void submitQuiz(undefined, true)
      }
    }
    updateTimer()
    const timer = window.setInterval(updateTimer, 250)
    return () => window.clearInterval(timer)
  }, [activeQuiz?.id, quizAttempt?.attempt_id])
  const leaveQuiz = async () => {
    await saveAnswersChainRef.current.catch(() => undefined)
    setActiveQuiz(null)
    setQuizQuestions([])
    setQuizResult(null)
    setQuizTimeLeft(0)
    answersRef.current = {}
    setAnswers({})
    notify('Your attempt remains saved and the timer keeps running. Reopen the same quiz to resume it.')
  }

  const openContent = async (item: Row, key: ContentKey) => {
    setActiveMaterial({ ...item, _key: key })
    setMaterialUrl('')
    setMaterialError('')
    setMaterialLoading(false)
    const external = key === 'videos' ? item.video_url : item.external_url
    if (key === 'videos' && external) {
      setMaterialUrl(external)
      return
    }
    if (item.file_path) {
      if (!supabase) return setMaterialError('The learning material service is unavailable.')
      setMaterialLoading(true)
      const { data, error } = await supabase.storage.from('study-materials').createSignedUrl(item.file_path, 3600)
      setMaterialLoading(false)
      if (error || !data?.signedUrl) return setMaterialError(error?.message || 'Could not prepare this material for viewing.')
      setMaterialUrl(data.signedUrl)
      return
    }
    if (external) {
      setMaterialUrl(external)
      return
    }
    if (!item.content) setMaterialError('This item does not have a viewable file or link yet.')
  }
  const shareContent = async (item: Row, key: ContentKey) => {
    if (!supabase || key === 'quizzes') return notify('This item cannot be shared right now.')
    setBusy(true)
    const { data, error } = await supabase.rpc('create_content_share_link', {
      p_content_type: key,
      p_content_id: item.id
    })
    setBusy(false)
    if (error || !data) return notify(error?.message || 'Could not create a share link.')
    const url = new URL('/s/' + data, window.location.origin).toString()
    const shareText = item.title + ' · Physics by Suraj Bhardwaj'
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, text: shareText, url })
        notify('Share link ready.')
        return
      } catch (shareError) {
        if ((shareError as Error)?.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      notify('Short PSB link copied. You can share it on WhatsApp.')
    } catch {
      notify('Share this PSB link: ' + url)
    }
  }
  const openSharedResource = async () => {
    if (!sharedResource) return
    const kind = sharedResource.content_type || 'resources'
    setShareFileUrl('')
    setShareVideoUrl('')
    setShareExternalUrl('')
    setShareFileType('')
    setShareFileName('')
    if (kind === 'videos' && sharedResource.video_url) {
      setShareVideoUrl(sharedResource.video_url)
      return
    }
    if (sharedResource.file_path) {
      if (!supabase) {
        setSharePageError('The learning material service is unavailable.')
        return
      }
      setShareFileLoading(true)
      setSharePageError('')
      try {
        const { data, error } = await supabase.storage
          .from('study-materials')
          .createSignedUrl(sharedResource.file_path, 3600)
        if (error || !data?.signedUrl) throw new Error(error?.message || 'Could not prepare the file for viewing.')
        const extension = sharedResource.file_path.match(/\.[a-z0-9]{2,6}$/i)?.[0] || ''
        const safeTitle = String(sharedResource.title || 'PSB-material')
          .replace(/[^a-z0-9_-]+/gi, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 64) || 'PSB-material'
        setShareFileName(safeTitle + extension)
        setShareFileType(extension.toLowerCase())
        setShareFileUrl(data.signedUrl)
      } catch (error) {
        setSharePageError((error as Error)?.message || 'Could not open the shared material.')
      } finally {
        setShareFileLoading(false)
      }
      return
    }
    if (sharedResource.external_url) {
      setShareExternalUrl(sharedResource.external_url)
    }
  }
  useEffect(() => {
    if (sharedResource) void openSharedResource()
  }, [sharedResource])
  const saveContent = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !staff || !session?.user) return notify('Teacher permission is required.')
    if (!form.title.trim()) return notify('Please enter a title.')
    setBusy(true); setNotice('')
    let uploadedPath: string | null = null
    if (file) {
      if (!allowedTypes.includes(file.type)) { setBusy(false); return notify('Use PDF, DOC, DOCX, PPT, PPTX, JPG or PNG files only.') }
      if (file.size > 50 * 1024 * 1024) { setBusy(false); return notify('File size must be 50 MB or less.') }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
      uploadedPath = 'teacher/' + session.user.id + '/' + crypto.randomUUID() + '-' + safeName
      const { error: uploadError } = await supabase.storage.from('study-materials').upload(uploadedPath, file, { upsert: false, contentType: file.type })
      if (uploadError) { setBusy(false); return notify('Upload failed: ' + uploadError.message) }
    }
    const shared = { title: form.title.trim(), description: form.description.trim(), subject: form.subject.trim() || 'Physics' }
    let result: any
    if (form.type === 'quiz') {
      if (!form.duration || Number(form.duration) < 1 || Number(form.duration) > 240) { setBusy(false); return notify('Set a test duration between 1 and 240 minutes.') }
      const availableFrom = form.available_from ? new Date(form.available_from).toISOString() : null
      const availableUntil = form.available_until ? new Date(form.available_until).toISOString() : null
      if (availableFrom && availableUntil && new Date(availableUntil) <= new Date(availableFrom)) { setBusy(false); return notify('The closing time must be after the opening time.') }
      if (availableUntil && new Date(availableUntil).getTime() <= Date.now()) { setBusy(false); return notify('The closing time must be in the future.') }
      result = await supabase.from('quizzes').insert({
        ...shared, grade_label: form.grade_label, topic: form.topic.trim(),
        duration_minutes: Number(form.duration), assessment_type: form.assessment_type,
        available_from: availableFrom, available_until: availableUntil, is_published: false
      }).select('id').single()
      if (!result.error) { setSelectedQuizId(result.data.id); notify('Quiz draft created. Add questions below, then publish it.'); setForm(emptyForm); setFile(null); await loadContent(); setBusy(false); return }
    } else if (form.type === 'video') {
      if (!form.url.trim()) { setBusy(false); return notify('Add a video link before publishing a lesson.') }
      result = await supabase.from('video_lessons').insert({ ...shared, grade_label: form.grade_label, topic: form.topic.trim(), video_url: form.url.trim(), is_published: true })
    } else if (form.type === 'resource') {
      if (!uploadedPath && !form.url.trim()) { setBusy(false); return notify('Upload a file or add an external resource link.') }
      result = await supabase.from('resources').insert({ ...shared, class_level: Number(form.grade_label.replace(/[^0-9]/g, '')) || 12, resource_type: file ? file.name.split('.').pop()?.toUpperCase() || 'File' : 'External link', file_path: uploadedPath, external_url: form.url.trim() || null, is_published: true })
    } else {
      if (!uploadedPath && !form.url.trim() && !form.description.trim()) { setBusy(false); return notify('Add note content, a file or an external link.') }
      result = await supabase.from('notes').insert({ ...shared, grade_label: form.grade_label, topic: form.topic.trim(), content: form.description.trim(), file_path: uploadedPath, external_url: form.url.trim() || null, is_published: true })
    }
    setBusy(false)
    if (result?.error) {
      if (uploadedPath) await supabase.storage.from('study-materials').remove([uploadedPath])
      notify(result.error.message)
    } else { notify('Published successfully. Students can now see this material.'); setForm(emptyForm); setFile(null); await loadContent() }
  }
  const addQuestion = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !staff || !selectedQuizId) return notify('Create a quiz draft first.')
    const options = questionForm.options.map(x => x.trim())
    if (!questionForm.prompt.trim() || options.some(x => !x)) return notify('Enter a question and all four options.')
    setBusy(true)
    const { data, error } = await supabase.from('quiz_questions').insert({ quiz_id: selectedQuizId, prompt: questionForm.prompt.trim(), options, sort_order: Date.now() }).select('id').single()
    if (error) { setBusy(false); return notify(error.message) }
    const { error: answerError } = await supabase.from('quiz_question_answers').insert({ question_id: data.id, correct_option: questionForm.correct, explanation: questionForm.explanation.trim() })
    if (answerError) {
      await supabase.from('quiz_questions').delete().eq('id', data.id)
      setBusy(false); return notify(answerError.message)
    }
    setQuestionForm({ prompt: '', options: ['', '', '', ''], correct: 0, explanation: '' })
    setBusy(false)
    notify('Question added securely. Correct answers are not exposed to students.')
  }
  const publishQuiz = async () => {
    if (!supabase || !staff || !selectedQuizId) return
    setBusy(true)
    const { count: total, error: countError } = await supabase.from('quiz_questions').select('id', { count: 'exact', head: true }).eq('quiz_id', selectedQuizId)
    if (countError || !total) { setBusy(false); return notify(countError?.message || 'Add at least one question before publishing.') }
    if (total > 100) { setBusy(false); return notify('A quiz or test can contain up to 100 questions.') }
    const { error } = await supabase.from('quizzes').update({ is_published: true }).eq('id', selectedQuizId)
    setBusy(false)
    if (error) notify(error.message)
    else { setSelectedQuizId(''); await loadContent(); notify('Quiz published and available to students.') }
  }
  const updateContent = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !staff || !editing) return
    setBusy(true)
    const table = editing.table as string
    const updates: Row = {
      title: editing.title,
      description: editing.description,
      is_published: editing.is_published
    }
    if (table === 'quizzes') {
      const availableFrom = editing.available_from ? new Date(editing.available_from).toISOString() : null
      const availableUntil = editing.available_until ? new Date(editing.available_until).toISOString() : null
      if (!editing.duration_minutes || Number(editing.duration_minutes) < 1 || Number(editing.duration_minutes) > 240) {
        setBusy(false); return notify('Set a test duration between 1 and 240 minutes.')
      }
      if (availableFrom && availableUntil && new Date(availableUntil) <= new Date(availableFrom)) {
        setBusy(false); return notify('The closing time must be after the opening time.')
      }
      updates.duration_minutes = Number(editing.duration_minutes)
      updates.assessment_type = editing.assessment_type || 'quiz'
      updates.available_from = availableFrom
      updates.available_until = availableUntil
    }
    const { error } = await supabase.from(table).update(updates).eq('id', editing.id)
    setBusy(false)
    if (error) notify(error.message)
    else { setEditing(null); await loadContent(); notify('Content updated.') }
  }
  const removeContent = async (table: string, id: string) => {
    if (!supabase || !staff || !window.confirm('Delete this item permanently?')) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) notify(error.message)
    else { await loadContent(); notify('Item deleted.') }
  }
  const togglePublished = async (table: string, item: Row) => {
    if (!supabase || !staff) return
    const { error } = await supabase.from(table).update({ is_published: !item.is_published }).eq('id', item.id)
    if (error) notify(error.message)
    else { await loadContent(); notify(item.is_published ? 'Item moved to draft.' : 'Item published.') }
  }
  const setMessageStatus = async (message: Row, status: string) => {
    if (!supabase || !staff) return
    const { error } = await supabase.from('contact_messages').update({ status }).eq('id', message.id)
    if (error) notify(error.message)
    else { await loadTeacherData(); notify('Message status updated.') }
  }
  const sendContact = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return notify('Backend configuration is missing.')
    setBusy(true)
    const { error } = await supabase.from('contact_messages').insert({
      name: contact.name.trim(), email: contact.email.trim(), subject: contact.subject.trim(), message: contact.message.trim(),
      class_level: contact.class_level ? Number(contact.class_level) : null
    })
    setBusy(false)
    notify(error ? error.message : 'Your message has been sent to the teaching team.')
    if (!error) setContact({ name: '', email: '', subject: '', message: '', class_level: '' })
  }
  const submitReview = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return notify('Backend configuration is missing.')
    if (!session?.user) { notify('Please sign in before submitting a review.'); changeTab('account'); return }
    if (reviewDraft.comment.trim().length < 8) return notify('Please write at least 8 characters.')
    setBusy(true)
    const { error } = await supabase.from('reviews').insert({
      rating: Number(reviewDraft.rating),
      comment: reviewDraft.comment.trim()
    })
    setBusy(false)
    if (error) {
      if (error.code === '23505') {
        setHasReviewed(true)
        window.localStorage.setItem('psb-reviewed-' + session.user.id, '1')
        notify('Only one review is allowed per student account. Your earlier review is already on record.')
      } else notify(error.message)
    } else {
      setHasReviewed(true)
      window.localStorage.setItem('psb-reviewed-' + session.user.id, '1')
      setReviewDraft({ rating: 5, comment: '' })
      await loadReviews()
      notify('Thank you. Your verified review is now live.')
    }
  }
  const changeTab = (t: Tab) => { const keepAdminPath = t === 'admin' || (t === 'account' && window.location.pathname.toLowerCase().endsWith('/admin.html')); setTab(t); window.history.replaceState({}, '', keepAdminPath ? '/admin.html' : '/'); setMobile(false); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const contentRows = (Object.keys(tableFor) as ContentKey[]).flatMap(key => rows[key].map(item => ({ ...item, _key: key, _table: tableFor[key] })))
  const publishedCount = (key: ContentKey) => rows[key].filter(item => item.is_published).length

  const cards = (items: Row[], key: ContentKey) => {
    const visibleItems = items.filter(item => item.is_published)
    return visibleItems.length
      ? <div className="grid">{visibleItems.map(item => {
        const scheduled = key === 'quizzes' && item.available_from && new Date(item.available_from).getTime() > quizClock
        const closed = key === 'quizzes' && item.available_until && new Date(item.available_until).getTime() <= quizClock
        const assessmentLabel = item.assessment_type === 'test' ? 'Timed test' : 'Practice quiz'
        return <article className="content-card" key={item.id}>
          <div className="card-icon">{key === 'videos' ? <Video/> : key === 'quizzes' ? <ClipboardList/> : key === 'resources' ? <FileText/> : <BookOpen/>}</div>
          <div className="card-meta">{item.grade_label || (item.class_level ? 'Class ' + item.class_level : 'Physics')} · {item.subject || 'Physics'}{key === 'quizzes' ? ' · ' + assessmentLabel.toUpperCase() : ''}</div>
          <h3>{item.title}</h3><p>{item.description || item.topic || 'Learning material from Suraj Bhardwaj.'}</p>
          {scheduled && <p className="quiz-schedule-note"><Clock3 size={14}/> Opens {new Date(item.available_from).toLocaleString()}</p>}
          {closed && <p className="quiz-schedule-note is-closed">New attempts are closed. Students with an active attempt can still resume.</p>}
          <div className="content-card-actions">
            {key === 'quizzes'
              ? <button className="text-link" onClick={() => startQuiz(item)} disabled={busy || !!scheduled}><Play size={15}/> {scheduled ? 'Not open yet' : closed ? 'Resume active attempt' : item.assessment_type === 'test' ? 'Start test' : 'Start quiz'} <ArrowUpRight size={15}/></button>
              : <button className="text-link" onClick={() => void openContent(item, key)}>{key === 'videos' ? 'Watch lesson' : 'View material'} <ArrowUpRight size={15}/></button>}
            {key !== 'quizzes' && <button className="text-link resource-share-link" onClick={() => void shareContent(item, key)} disabled={busy}><Share2 size={14}/> Share</button>}
          </div>
          {key === 'quizzes' && item.duration_minutes && <span className="tiny-meta"><Clock3 size={12}/> {item.duration_minutes} min</span>}
        </article>
      })}</div>
      : <div className="empty"><div className="empty-symbol"><BookOpen/></div><h3>New learning material is on its way</h3><p>Suraj Sir will publish verified notes, lessons and resources here. Please check back soon.</p></div>
  }

  if (resourceShareCode || contentShareCode) {
    const sharedKind = sharedResource?.content_type || 'resources'
    const isPdf = shareFileType === '.pdf' || shareFileName.toLowerCase().endsWith('.pdf')
    const isImage = /\.(png|jpe?g|webp|gif)$/i.test(shareFileType || shareFileName)
    const isDirectVideo = shareVideoUrl ? isDirectVideoUrl(shareVideoUrl) : false
    const sharedClass = sharedResource?.class_level ? 'Class ' + sharedResource.class_level : sharedResource?.grade_label || 'Physics'
    const shareThisPage = async () => {
      const shareData = { title: sharedResource?.title || 'Physics by Suraj Bhardwaj', text: 'Shared learning material · Physics by Suraj Bhardwaj', url: window.location.href }
      if (navigator.share) {
        try { await navigator.share(shareData); return } catch (err) { if ((err as Error)?.name === 'AbortError') return }
      }
      try { await navigator.clipboard.writeText(window.location.href); notify('Short PSB link copied.') }
      catch { notify(window.location.href) }
    }
    return <div className="app share-page">
      <main className="share-shell">
        <div className="share-brand">
          <PSBMark />
          <div><b>PHYSICS BY SURAJ BHARDWAJ</b><small>Concept to Clarity · PSB</small></div>
        </div>
        <section className="share-card">
          {sharePageLoading ? <div className="share-state"><div className="share-spinner" /><h2>Loading learning material…</h2><p>Opening a shared PSB lesson.</p></div>
            : sharePageError ? <div className="share-state"><h2>Material unavailable</h2><p>{sharePageError}</p><a className="share-button" href="/">Visit website</a></div>
            : sharedResource ? <>
              <div className="share-card-heading">
                <span className="eyebrow">SHARED {sharedKind === 'videos' ? 'VIDEO LESSON' : sharedKind === 'notes' ? 'STUDY NOTE' : 'STUDY RESOURCE'}</span>
                <button className="share-inline-button" onClick={() => void shareThisPage()}><Share2 size={15}/> Share</button>
              </div>
              <h1>{sharedResource.title}</h1>
              <p className="share-description">{sharedResource.description || 'Learning material from Physics by Suraj Bhardwaj.'}</p>
              <div className="share-meta">
                <span>{sharedClass}</span>
                <span>{sharedResource.subject || 'Physics'}</span>
                <span>{sharedResource.resource_type || sharedResource.topic || (sharedKind === 'videos' ? 'Video lesson' : 'Study material')}</span>
              </div>
              {shareFileLoading && <div className="share-state"><div className="share-spinner" /><p>Preparing the in-site viewer…</p></div>}
              {sharedKind === 'videos' && shareVideoUrl && <div className="share-viewer-frame">
                {isDirectVideo
                  ? <video src={shareVideoUrl} controls controlsList="nodownload noplaybackrate" disablePictureInPicture playsInline />
                  : <iframe src={getVideoEmbedUrl(shareVideoUrl)} title={sharedResource.title + ' video'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
              </div>}
              {sharedKind === 'notes' && sharedResource.content && <article className="share-note-content">{sharedResource.content}</article>}
              {shareFileUrl && <div className="share-file-area">
                {isPdf && <PdfPreview url={shareFileUrl} title={sharedResource.title} cacheKey={sharedResource.file_path || sharedResource.external_url || sharedResource.title} />}
                {isImage && <img className="share-image-preview" src={shareFileUrl} alt={sharedResource.title} />}
                {!isPdf && !isImage && <div className="share-preview-message"><FileText size={24}/><b>Preview not available for this file type</b><p>Please ask the teacher for a PDF version so it can be viewed here without a download button.</p></div>}
              </div>}
              {shareExternalUrl && <div className="share-viewer-frame">
                <iframe src={sharedKind === 'videos' ? getVideoEmbedUrl(shareExternalUrl) : shareExternalUrl} title={sharedResource.title + ' embedded material'} sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
              </div>}
              {!shareFileLoading && !shareVideoUrl && !shareFileUrl && !shareExternalUrl && !(sharedKind === 'notes' && sharedResource.content) && <div className="share-preview-message"><p>This material does not currently have an online preview.</p></div>}
              <p className="view-only-note">View-only experience. Download controls are hidden where the file viewer supports it.</p>
            </> : null}
        </section>
        <footer className="share-footer">A short sharing link from Physics by Suraj Bhardwaj · <a href="/">Open PSB website</a></footer>
      </main>
    </div>
  }

  return <div className="app">
    <div className={showSplash ? 'splash-screen is-visible' : 'splash-screen is-hidden'} aria-hidden={!showSplash}>
      <img src="/psb-logo-transparent.webp" alt="PSB logo" />
      <b>PHYSICS BY SURAJ BHARDWAJ</b>
      <span>Concept to Clarity</span>
    </div>
    <div className="topline"><span>PHYSICS, MADE CLEAR.</span><span>Learn with curiosity · Grow with confidence</span></div>
    <header className="header">
      <button className="brand" onClick={() => changeTab('home')} aria-label="Physics by Suraj Bhardwaj home"><PSBMark/><span><b>PHYSICS <i>BY SURAJ BHARDWAJ</i></b><small>Concept to Clarity · PSB</small></span></button>
      <nav className={mobile ? 'nav open' : 'nav'}>{nav.map(n => <button className={tab === n.id ? 'active' : ''} key={n.id} onClick={() => changeTab(n.id)}>{n.label}</button>)}</nav>
      <div className="header-actions">
        {staff && <button className="admin-chip" onClick={() => changeTab('admin')}><ShieldCheck size={15}/> Teacher panel</button>}
        {session ? <button className="account-btn" onClick={() => changeTab('account')}><UserRound size={16}/> My account</button> : <button className="account-btn" onClick={() => changeTab('account')}><LogIn size={16}/> Student login</button>}
        <button className="menu-btn" onClick={() => setMobile(!mobile)} aria-label="Toggle menu">{mobile ? <X/> : <Menu/>}</button>
      </div>
    </header>

    {tab === 'home' && <main>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span/> A BETTER WAY TO UNDERSTAND PHYSICS</div><h1>Make sense of<br/><em>the universe.</em></h1>
          <p>Clear explanations, focused study material and purposeful practice — helping every concept move from confusion to clarity.</p>
          <div className="hero-actions"><button className="primary" onClick={() => changeTab('notes')}>Explore learning <ArrowUpRight size={17}/></button><button className="secondary" onClick={() => changeTab('about')}>Meet Suraj Sir</button></div>
          <div className="hero-foot"><span><b>{count}</b> published learning items</span><span>Designed for curious minds</span></div>
        </div>
        <div className="hero-art" aria-label="Animated three-dimensional atom illustration">
          <div className="atom-stage"><div className="atom-halo"/><div className="atom-orbit orbit-x"><i/></div><div className="atom-orbit orbit-y"><i/></div><div className="atom-orbit orbit-z"><i/></div><div className="atom-nucleus"><span/></div><div className="atom-dust dust-a"/><div className="atom-dust dust-b"/></div>
          <div className="float-card float-a"><span>01</span><b>Understand</b><small>Build strong foundations</small></div><div className="float-card float-b"><span>02</span><b>Practice</b><small>Learn by doing</small></div><div className="equation">E = mc²</div>
        </div>
      </section>
      <section className="trust"><div><GraduationCap/><b>Concept-first teaching</b><span>Understand the why, not just the formula.</span></div><div><BookOpen/><b>Focused resources</b><span>Study material organised for learning.</span></div><div><ClipboardList/><b>Practice with purpose</b><span>Check your understanding as you grow.</span></div></section>
      <section className="section"><div className="section-head"><div><span className="eyebrow">YOUR LEARNING SPACE</span><h2>Choose your next step.</h2></div><button className="text-link" onClick={() => changeTab('notes')}>Browse all material <ArrowUpRight size={15}/></button></div>
        <div className="feature-grid">{nav.slice(0, 4).map((n, i) => <button className="feature" key={n.id} onClick={() => changeTab(n.id)}><span className="feature-no">0{i + 1}</span><span className="feature-icon">{i === 0 ? <BookOpen/> : i === 1 ? <Video/> : i === 2 ? <FileText/> : <ClipboardList/>}</span><b>{n.label}</b><small>{['Clear notes for focused revision.', 'Learn important ideas visually.', 'Extra material for deeper study.', 'Test what you have understood.'][i]}</small><span className="feature-arrow"><ArrowUpRight/></span></button>)}</div>
      </section>
      <section className="teacher-strip"><div><span className="eyebrow">YOUR GUIDE THROUGH PHYSICS</span><h2>Learn with Suraj Bhardwaj.</h2><p>Physics becomes easier when ideas are explained clearly, patiently and with purpose.</p></div><button className="secondary light" onClick={() => changeTab('about')}>Know more about Suraj Sir <ArrowUpRight size={16}/></button></section>
      <section className="section review-invite">
        <div className="section-head">
          <div><span className="eyebrow">STUDENT VOICES</span><h2>Real experiences. Real students.</h2>
            <p>{reviews.length ? reviews.length + ' verified student review' + (reviews.length === 1 ? '' : 's') + ' shared so far.' : 'Your experience can help another student find clarity.'}</p>
          </div>
          <button className="primary" onClick={() => changeTab('reviews')}>Read / write a review <ArrowUpRight size={16}/></button>
        </div>
      </section>
    </main>}

    {(['notes', 'videos', 'resources'] as ContentKey[]).includes(tab as ContentKey) && <main className="page"><div className="page-intro"><span className="eyebrow">THE LEARNING LIBRARY</span><h1>{tab === 'notes' ? 'Study notes' : tab === 'videos' ? 'Video lessons' : 'Learning resources'}<em>.</em></h1><p>Explore the latest material published by Suraj Bhardwaj.</p><button className="refresh" onClick={loadContent}><RefreshCw size={15}/> Refresh</button></div>{loading ? <div className="empty">Loading published material…</div> : cards(rows[tab as ContentKey], tab as ContentKey)}</main>}

    {tab === 'quizzes' && <main className="page"><div className="page-intro"><span className="eyebrow">PRACTICE & ASSESSMENTS</span><h1>{activeQuiz ? activeQuiz.title : quizResult ? 'Assessment results' : 'Quizzes & tests'}<em>.</em></h1><p>{activeQuiz ? 'Choose the best answer. The timer starts when you begin and submits your answers automatically at zero.' : 'Attempt practice quizzes and scheduled timed tests from Suraj Sir.'}</p></div>
      {activeQuiz && <form className="quiz-panel" onSubmit={submitQuiz}>
        <div className="quiz-topline">
          <span>{activeQuiz.subject || 'Physics'} · {activeQuiz.grade_label || 'All levels'} · {activeQuiz.assessment_type === 'test' ? 'Timed test' : 'Practice quiz'}</span>
          <span className={quizTimeLeft <= 60 ? 'quiz-countdown is-urgent' : 'quiz-countdown'}><Clock3 size={16}/> {Math.floor(quizTimeLeft / 60)}:{String(quizTimeLeft % 60).padStart(2, '0')} left</span>
          <button type="button" className="switch" onClick={leaveQuiz}>Exit</button>
        </div>
        <p className="quiz-auto-note">Unanswered questions receive zero marks when the timer ends. Your answers are saved as you go.</p>
        {quizQuestions.map((q, i) => <fieldset className="question" key={q.id}><legend><b>Q{i + 1}.</b> {q.prompt}</legend><div className="option-list">{(q.options as string[]).map((option, j) => <label className={answers[q.id] === j ? 'option selected' : 'option'} key={j}><input type="radio" name={q.id} checked={answers[q.id] === j} onChange={() => updateQuizAnswer(q.id, j)}/><span>{String.fromCharCode(65 + j)}.</span>{option}</label>)}</div></fieldset>)}
        <button className="primary full" disabled={busy || quizTimeLeft <= 0}>{busy ? 'Submitting…' : 'Submit ' + (activeQuiz.assessment_type === 'test' ? 'test' : 'quiz')} <ArrowUpRight size={17}/></button>
      </form>}
      {quizResult && <div className="result-panel"><Trophy size={38}/><span className="eyebrow">{quizResult.auto_submitted ? 'AUTOMATICALLY SUBMITTED' : 'YOUR RESULT'}</span><strong>{quizResult.score} / {quizResult.total_questions}</strong><b>{quizResult.percentage}% score</b><p>{quizResult.auto_submitted ? 'The time limit ended, so your saved answers were submitted automatically.' : quizResult.percentage >= 80 ? 'Excellent work. Keep building on these strong foundations.' : quizResult.percentage >= 50 ? 'Good effort. Review the explanations and try again.' : 'Keep practising. Every attempt makes the concepts clearer.'}</p><div className="result-details">{(quizResult.details || []).map((d: Row, i: number) => <div className="result-item" key={d.question_id}><b>{d.is_correct ? '✓' : '↻'} Question {i + 1}</b><span>{d.is_correct ? 'Correct' : 'Review this concept'}</span>{d.explanation && <p>{d.explanation}</p>}</div>)}</div><button className="secondary" onClick={leaveQuiz}>Back to quizzes</button></div>}
      {!activeQuiz && !quizResult && (loading ? <div className="empty">Loading quizzes and tests…</div> : cards(rows.quizzes, 'quizzes'))}
    </main>}

    {tab === 'about' && <main className="page about"><div className="page-intro"><span className="eyebrow">THE TEACHER BEHIND THE METHOD</span><h1>Clarity changes<br/><em>everything.</em></h1><p>Physics by Suraj Bhardwaj is built around one idea: when the concept is clear, the subject becomes approachable.</p></div>
      <div className="about-panel"><div className="teacher-portrait"><img src="/psb-logo-transparent.webp" alt="PSB Physics learning logo" /></div><div><span className="eyebrow">YOUR PHYSICS MENTOR</span><h2>Suraj Bhardwaj</h2><p>A science educator focused on helping students build strong fundamentals, understand the logic behind formulas and develop confidence through consistent practice.</p><p>This learning space brings together notes, video lessons, resources and quizzes in one place.</p><div className="teacher-tags"><span>Concept clarity</span><span>Focused learning</span><span>Physics</span></div></div></div>
    </main>}

    {tab === 'reviews' && <main className="page narrow">
      <div className="page-intro"><span className="eyebrow">STUDENT VOICES</span><h1>Reviews & feedback<em>.</em></h1>
        <p>Only signed-in students with a confirmed email address can submit one review per account.</p>
      </div>
      {!session ? <div className="form-card review-auth-card"><h2>Share your experience</h2><p>Sign in or create a student account before writing a review.</p><button className="primary full" onClick={() => changeTab('account')}>Sign in / create account <ArrowUpRight size={16}/></button></div>
        : hasReviewed ? <div className="empty review-thanks"><div className="empty-symbol"><Check/></div><h3>Thank you for your review.</h3><p>Your review has been submitted from this verified student account. One review per account is allowed.</p></div>
        : <form className="form-card review-form" onSubmit={submitReview}>
          <h2>Write a review</h2>
          <label>Your rating</label>
          <div className="rating-picker" role="radiogroup" aria-label="Choose a rating">
            {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" role="radio" aria-checked={reviewDraft.rating === value} className={reviewDraft.rating >= value ? 'rating-star selected' : 'rating-star'} onClick={() => setReviewDraft({ ...reviewDraft, rating: value })}>★</button>)}
            <span>{reviewDraft.rating} / 5</span>
          </div>
          <label>Your experience<textarea required minLength={8} maxLength={500} value={reviewDraft.comment} onChange={e => setReviewDraft({ ...reviewDraft, comment: e.target.value })} placeholder="What helped you understand Physics better?" /></label>
          <small className="review-hint">Your name and class are taken from your registered profile and cannot be edited here.</small>
          <button className="primary full" disabled={busy}>{busy ? 'Submitting…' : 'Submit review'} <ArrowUpRight size={16}/></button>
        </form>}
      <section className="review-list-section">
        <div className="section-head"><div><span className="eyebrow">VERIFIED STUDENT FEEDBACK</span><h2>What students say</h2></div><span className="tiny-meta">{reviews.length} review{reviews.length === 1 ? '' : 's'}</span></div>
        {reviewLoading ? <div className="empty">Loading reviews…</div> : reviews.length ? <div className="review-list">{reviews.map(review => <article className="review-card" key={review.id}>
          <div className="review-card-head"><div><b>{review.display_name}</b><small>{review.class_level ? 'Class ' + review.class_level : 'Student'}</small></div><span className="review-stars" aria-label={review.rating + ' out of 5 stars'}>{'★'.repeat(Number(review.rating))}{'☆'.repeat(5 - Number(review.rating))}</span></div>
          <p>{review.comment}</p><time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString()}</time>
        </article>)}</div> : <div className="empty">No reviews have been submitted yet. Be the first student to share an experience.</div>}
      </section>
    </main>}

    {tab === 'account' && <main className="page narrow"><div className="page-intro"><span className="eyebrow">YOUR LEARNING ACCOUNT</span><h1>{session ? 'Your account' : authMode === 'signin' ? 'Welcome back' : 'Create your account'}<em>.</em></h1><p>{session ? 'Manage your student details and review your quiz progress.' : 'Sign in or create a student account to attempt quizzes and track progress.'}</p></div>
      {recovering ? <form className="form-card" onSubmit={updateRecoveryPassword}><h2>Set a new password</h2><label>New password<input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters"/></label><button className="primary full" disabled={busy}>{busy ? 'Updating…' : 'Update password'} <Check size={16}/></button></form> : !session ? <form className="form-card" onSubmit={authMode === 'signin' ? signIn : signUp}>
        {authMode === 'signup' && <><label>Full name<input required minLength={2} value={name} onChange={e => setName(e.target.value)} placeholder="Your name"/></label><label>Class<select value={studentClass} onChange={e => setStudentClass(e.target.value)}>{[7, 8, 9, 10, 11, 12].map(n => <option value={String(n)} key={n}>Class {n}</option>)}</select></label></>}
        <label>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></label>
        <label>Password<input required minLength={6} type="password" autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
        <button className="primary full" disabled={busy}>{busy ? 'Please wait…' : authMode === 'signin' ? 'Sign in' : 'Create account'} <ArrowUpRight size={17}/></button>
        {authMode === 'signin' && <button type="button" className="switch" onClick={resetPassword} disabled={busy}>Forgot password? Send reset email</button>}
        <button type="button" className="switch" onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}>{authMode === 'signin' ? 'New here? Create an account' : 'Already registered? Sign in'}</button>
      </form> : <div className="account-layout"><div className="account-summary"><UserRound/><b>{userEmail}</b><span>{staff ? 'Teacher account' : 'Student account'}</span><button className="secondary" onClick={signOut}><LogOut size={15}/> Sign out</button></div>
        <form className="form-card" onSubmit={saveProfile}><h2>Student profile</h2><label>Full name<input value={profile.full_name} readOnly disabled/><small className="review-hint">Registered name is locked after account creation.</small></label><label>Class<input value={'Class ' + profile.class_level} readOnly disabled/><small className="review-hint">Registered class is locked after account creation.</small></label><label>Phone (optional)<input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="Your contact number"/></label><button className="primary full" disabled={busy}>Save contact number <Check size={16}/></button></form>
        <div className="history-panel"><h2><Trophy size={18}/> Recent quiz attempts</h2>{history.length ? history.map(h => <div className="history-row" key={h.id}><span>{rows.quizzes.find(q => q.id === h.quiz_id)?.title || 'Physics quiz'}</span><b>{h.score}/{h.total_questions}</b><small>{new Date(h.attempted_at).toLocaleDateString()}</small></div>) : <p>No quiz attempts yet. Start a quiz to see your progress here.</p>}</div>
      </div>}
    </main>}

    {tab === 'admin' && <main className="page"><div className="page-intro"><span className="eyebrow">SECURE TEACHER WORKSPACE</span><h1>Teacher panel<em>.</em></h1><p>Manage study material, quizzes, student messages and results.</p></div>
      {!session ? <div className="empty"><ShieldCheck/><h3>Sign in to continue</h3><button className="primary" onClick={() => changeTab('account')}>Open sign in</button></div> : !staff ? <div className="empty"><ShieldCheck/><h3>Activate teacher access</h3><p>Signed in as {userEmail}. Only the verified, authorised teacher email can activate this workspace.</p><button className="primary" disabled={busy} onClick={claimTeacher}>{busy ? 'Checking…' : 'Activate teacher access'}</button></div> : <>
        <div className="stats-grid"><div><BookOpen/><b>{publishedCount('notes')}</b><span>Published notes</span></div><div><Video/><b>{publishedCount('videos')}</b><span>Video lessons</span></div><div><ClipboardList/><b>{publishedCount('quizzes')}</b><span>Published quizzes</span></div><div><Mail/><b>{messages.filter(m => m.status === 'new').length}</b><span>New messages</span></div></div>
        <div className="admin-layout">
          <aside className="admin-side"><div className="admin-welcome"><ShieldCheck/><div><b>Teacher access active</b><small>{userEmail}</small></div><span className="live-pill">SECURE</span></div><div className="admin-help"><b>Publishing checklist</b><p>Choose Practice Quiz or Timed Test, set its duration and optional opening/closing time, create the draft, add each question and correct answer, then publish. Timed attempts auto-submit when the clock reaches zero.</p><p>Student files are stored in a private bucket and served with expiring links.</p></div></aside>
          <div className="admin-main">
            <form className="form-card admin-form" onSubmit={saveContent}><h2><Plus size={20}/> Publish learning material</h2>
              <label>Content type<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="note">Study note / worksheet</option><option value="video">Video lesson</option><option value="resource">Resource / file</option><option value="quiz">Quiz (create draft)</option></select></label>
              <label>Title<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Laws of Motion"/></label>
              <label>Description / note content<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Explain what students will learn…"/></label>
              <div className="form-row"><label>Subject<input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}/></label><label>Class / level<select value={form.grade_label} onChange={e => setForm({ ...form, grade_label: e.target.value })}>{['All levels', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'JEE', 'NEET'].map(x => <option key={x}>{x}</option>)}</select></label></div>
              <label>Topic<input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="Chapter / topic"/></label>
              {form.type === 'video' && <label>Video URL<input required type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="YouTube or lesson link"/></label>}
              {form.type === 'resource' && <label>External URL (optional when a file is uploaded)<input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://…"/></label>}
              {form.type === 'note' && <label>External link (optional)<input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://…"/></label>}
              {form.type === 'quiz' && <>
                <div className="form-row">
                  <label>Assessment type<select value={form.assessment_type} onChange={e => setForm({ ...form, assessment_type: e.target.value })}><option value="quiz">Practice quiz</option><option value="test">Timed test / exam</option></select></label>
                  <label>Time limit (minutes)<input required type="number" min="1" max="240" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}/></label>
                </div>
                <div className="form-row">
                  <label>Opens at (optional)<input type="datetime-local" value={form.available_from} onChange={e => setForm({ ...form, available_from: e.target.value })}/><small className="review-hint">Leave blank to make it available as soon as Sir publishes it.</small></label>
                  <label>Stop new attempts at (optional)<input type="datetime-local" value={form.available_until} onChange={e => setForm({ ...form, available_until: e.target.value })}/><small className="review-hint">Students who have already started can finish their own timer.</small></label>
                </div>
              </>}
              {(form.type === 'note' || form.type === 'resource') && <label className="file-upload"><span><Upload size={17}/> Upload PDF / Word / PowerPoint / image (max 50 MB)</span><input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png" onChange={(e: ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}/>{file && <small>Selected: {file.name}</small>}</label>}
              <button className="primary full" disabled={busy}>{busy ? 'Saving…' : form.type === 'quiz' ? 'Create quiz draft' : 'Publish for students'} <ArrowUpRight size={17}/></button>
            </form>
            {selectedQuizId && <form className="form-card question-editor" onSubmit={addQuestion}><div className="editor-head"><h2><CircleHelp size={19}/> Add quiz question</h2><button type="button" className="switch" onClick={() => setSelectedQuizId('')}>Close</button></div>
              <label>Question<input required value={questionForm.prompt} onChange={e => setQuestionForm({ ...questionForm, prompt: e.target.value })} placeholder="Write the question"/></label>
              <div className="option-editor">{questionForm.options.map((opt, i) => <label key={i}>Option {String.fromCharCode(65 + i)}<input required value={opt} onChange={e => setQuestionForm({ ...questionForm, options: questionForm.options.map((v, j) => j === i ? e.target.value : v) })}/></label>)}</div>
              <label>Correct answer<select value={String(questionForm.correct)} onChange={e => setQuestionForm({ ...questionForm, correct: Number(e.target.value) })}>{questionForm.options.map((_, i) => <option value={i} key={i}>Option {String.fromCharCode(65 + i)}</option>)}</select></label>
              <label>Explanation (optional)<textarea value={questionForm.explanation} onChange={e => setQuestionForm({ ...questionForm, explanation: e.target.value })}/></label>
              <div className="row-actions"><button className="secondary" type="submit" disabled={busy}>Add question <Plus size={15}/></button><button className="primary" type="button" disabled={busy} onClick={publishQuiz}>Publish quiz <ArrowUpRight size={15}/></button></div>
            </form>}
          </div>
        </div>
        <section className="manager-section"><div className="section-head"><div><span className="eyebrow">CONTENT CONTROL</span><h2>Manage published material</h2></div><button className="refresh" onClick={loadContent}><RefreshCw size={14}/> Refresh</button></div>
          {contentRows.length ? <div className="manage-list">{contentRows.map(item => <div className="manage-item" key={item.id}><div><span className="card-meta">{labelFor[item._key as ContentKey]} · {item.is_published ? 'PUBLISHED' : 'DRAFT'}</span><b>{item.title}</b><small>{item.description || item.topic || 'No description'}</small></div><div className="manage-actions"><button title="Edit" onClick={() => setEditing({
              id: item.id, table: item._table, title: item.title, description: item.description || '', is_published: item.is_published,
              duration_minutes: item.duration_minutes || 20, assessment_type: item.assessment_type || 'quiz',
              available_from: item.available_from ? new Date(new Date(item.available_from).getTime() - new Date(item.available_from).getTimezoneOffset() * 60000).toISOString().slice(0,16) : '',
              available_until: item.available_until ? new Date(new Date(item.available_until).getTime() - new Date(item.available_until).getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''
            })}><Pencil size={15}/></button><button title={item.is_published ? 'Unpublish' : 'Publish'} onClick={() => togglePublished(item._table, item)}><Eye size={15}/></button><button className="danger" title="Delete" onClick={() => removeContent(item._table, item.id)}><Trash2 size={15}/></button></div></div>)}</div> : <div className="empty">No content has been published yet.</div>}
          {editing && <form className="form-card edit-form" onSubmit={updateContent}><h3>Edit item</h3><label>Title<input required value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })}/></label><label>Description<textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })}/></label>
            {editing.table === 'quizzes' && <>
              <div className="form-row"><label>Assessment type<select value={editing.assessment_type || 'quiz'} onChange={e => setEditing({ ...editing, assessment_type: e.target.value })}><option value="quiz">Practice quiz</option><option value="test">Timed test / exam</option></select></label><label>Time limit (minutes)<input required type="number" min="1" max="240" value={editing.duration_minutes} onChange={e => setEditing({ ...editing, duration_minutes: e.target.value })}/></label></div>
              <div className="form-row"><label>Opens at<input type="datetime-local" value={editing.available_from || ''} onChange={e => setEditing({ ...editing, available_from: e.target.value })}/></label><label>Stop new attempts at<input type="datetime-local" value={editing.available_until || ''} onChange={e => setEditing({ ...editing, available_until: e.target.value })}/></label></div>
            </>}
            <label className="check-line"><input type="checkbox" checked={editing.is_published} onChange={e => setEditing({ ...editing, is_published: e.target.checked })}/> Visible to students</label><div className="row-actions"><button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button><button className="primary" disabled={busy}>Save changes</button></div></form>}
        </section>
        <section className="manager-section"><div className="section-head"><div><span className="eyebrow">STUDENT SUPPORT</span><h2>Contact inbox</h2></div><span className="tiny-meta">{messages.length} messages</span></div>
          {messages.length ? <div className="inbox-list">{messages.map(m => <article className="inbox-item" key={m.id}><div className="inbox-title"><b>{m.subject}</b><span className={m.status === 'new' ? 'status-new' : 'status-done'}>{m.status}</span></div><p>{m.message}</p><small>{m.name} · {m.email} · {new Date(m.created_at).toLocaleString()}</small><div className="row-actions"><a className="text-link" href={'mailto:' + encodeURIComponent(m.email) + '?subject=' + encodeURIComponent('Re: ' + m.subject)}><Mail size={14}/> Reply by email</a>{m.status === 'new' && <button className="switch" onClick={() => setMessageStatus(m, 'resolved')}>Mark resolved <Check size={14}/></button>}</div></article>)}</div> : <div className="empty">No student messages yet.</div>}
        </section>
        <section className="manager-section"><div className="section-head"><div><span className="eyebrow">ASSESSMENT INSIGHTS</span><h2>Quiz submissions</h2></div><span className="tiny-meta">{submissions.length} attempts</span></div>
          {submissions.length ? <div className="manage-list">{submissions.map(s => <div className="manage-item" key={s.id}><div><b>{rows.quizzes.find(q => q.id === s.quiz_id)?.title || 'Physics quiz'}</b><small>Student ID: {s.user_id || 'Guest'} · {new Date(s.attempted_at).toLocaleString()} · {s.auto_submitted ? 'AUTO-SUBMITTED' : 'Submitted manually'}</small></div><strong>{s.score}/{s.total_questions}</strong></div>)}</div> : <div className="empty">Quiz attempts will appear here as students complete quizzes.</div>}
        </section>
      </>}
    </main>}

    {tab === 'contact' && <main className="page narrow"><div className="page-intro"><span className="eyebrow">GET IN TOUCH</span><h1>Let's connect<em>.</em></h1><p>Send a message about classes, learning material or anything related to Physics by Suraj Bhardwaj.</p></div><form className="form-card" onSubmit={sendContact}>
      <label>Your name<input required minLength={2} maxLength={100} value={contact.name} onChange={e => setContact({ ...contact, name: e.target.value })}/></label>
      <label>Email address<input required type="email" maxLength={254} value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })}/></label>
      <label>Subject<input required minLength={2} maxLength={180} value={contact.subject} onChange={e => setContact({ ...contact, subject: e.target.value })} placeholder="What would you like to ask?"/></label>
      <label>Class (optional)<select value={contact.class_level} onChange={e => setContact({ ...contact, class_level: e.target.value })}><option value="">Select class</option>{[7, 8, 9, 10, 11, 12].map(n => <option key={n} value={String(n)}>Class {n}</option>)}</select></label>
      <label>Message<textarea required minLength={10} maxLength={3000} value={contact.message} onChange={e => setContact({ ...contact, message: e.target.value })}/></label>
      <button className="primary full" disabled={busy}>Send message <ArrowUpRight size={17}/></button></form></main>}

    {reviews.length > 0 && <aside className="review-ticker" aria-label="Live student reviews">
      <div className="review-ticker-title"><span className="ticker-live-dot"/> LIVE REVIEWS</div>
      <div className="review-ticker-viewport">
        <div className="review-ticker-track">
          {[0, 1].map(copy => <div className="review-ticker-group" key={copy} aria-hidden={copy === 1}>
            {reviews.map(review => <div className="review-ticker-item" key={copy + '-' + review.id}>
              <div className="ticker-author"><b>{review.display_name}</b><small>{review.class_level ? 'Class ' + review.class_level : 'Student'}</small></div>
              <span className="ticker-stars" aria-label={review.rating + ' out of 5 stars'}>{'★'.repeat(Number(review.rating))}</span>
              <span className="ticker-comment">{review.comment}</span>
            </div>)}
          </div>)}
        </div>
      </div>
      <button className="review-ticker-link" onClick={() => changeTab('reviews')}>View all</button>
    </aside>}
    {notice && <div className="notice" role="status" aria-live="polite">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
    {activeMaterial && <div className="material-viewer-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setActiveMaterial(null) }}>
      <section className="material-viewer" role="dialog" aria-modal="true" aria-labelledby="material-viewer-title">
        <header className="material-viewer-header">
          <div><span className="eyebrow">PSB IN-SITE VIEWER</span><h2 id="material-viewer-title">{activeMaterial.title}</h2><small>{activeMaterial.subject || 'Physics'} · {activeMaterial.grade_label || activeMaterial.class_level || 'All levels'}</small></div>
          <div className="material-viewer-actions">
            {activeMaterial._key !== 'quizzes' && <button className="share-inline-button" onClick={() => void shareContent(activeMaterial, activeMaterial._key as ContentKey)} disabled={busy}><Share2 size={15}/> Share</button>}
            <button className="viewer-close" onClick={() => setActiveMaterial(null)} aria-label="Close viewer"><X size={20}/></button>
          </div>
        </header>
        <div className="material-viewer-body" onContextMenu={e => e.preventDefault()}>
          {materialLoading ? <div className="share-state"><div className="share-spinner"/><p>Preparing secure preview…</p></div>
            : materialError ? <div className="share-preview-message"><p>{materialError}</p></div>
            : activeMaterial._key === 'videos' && materialUrl
              ? <div className="share-viewer-frame">{isDirectVideoUrl(materialUrl) ? <video src={materialUrl} controls controlsList="nodownload noplaybackrate" disablePictureInPicture playsInline/> : <iframe src={getVideoEmbedUrl(materialUrl)} title={activeMaterial.title + ' video'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>}</div>
              : materialUrl && /\.pdf(?:$|[?#])/i.test(activeMaterial.file_path || materialUrl)
                ? <PdfPreview url={materialUrl} title={activeMaterial.title} cacheKey={activeMaterial.file_path || activeMaterial.external_url || activeMaterial.id || activeMaterial.title} />
                : materialUrl && /\.(png|jpe?g|webp|gif)(?:$|[?#])/i.test(activeMaterial.file_path || materialUrl)
                  ? <img className="share-image-preview" src={materialUrl} alt={activeMaterial.title}/>
                  : materialUrl && activeMaterial.file_path
                    ? <div className="share-preview-message"><FileText size={25}/><b>Preview not available for this file type</b><p>Please ask the teacher for a PDF version for in-site viewing.</p></div>
                    : materialUrl
                      ? <div className="share-viewer-frame"><iframe src={materialUrl} title={activeMaterial.title + ' embedded material'} sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen/></div>
                      : activeMaterial.content
                        ? <article className="share-note-content">{activeMaterial.content}</article>
                        : <div className="share-preview-message"><p>No preview is available for this material.</p></div>}
        </div>
        <footer className="view-only-note">Viewing mode · Download controls are hidden where supported. Screen capture cannot be completely prevented in a browser.</footer>
      </section>
    </div>}
    <footer className="footer"><div className="brand footer-brand"><PSBMark small/><span><b>PHYSICS <i>BY SURAJ BHARDWAJ</i></b><small>Concept to Clarity · PSB</small></span></div><div className="footer-links">{['home', ...nav.map(x => x.id)].map(x => <button key={x} onClick={() => changeTab(x as Tab)}>{x === 'home' ? 'Home' : x === 'about' ? 'About' : x === 'contact' ? 'Contact' : x === 'reviews' ? 'Reviews' : labelFor[x as ContentKey] || x}</button>)}</div><small>© {new Date().getFullYear()} Physics by Suraj Bhardwaj. PSB.</small></footer>
  </div>
}
