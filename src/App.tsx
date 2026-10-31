import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { supabase } from './lib/supabase'
import { Atom, BookOpen, Video, FileText, ClipboardList, LogIn, LogOut, Menu, X, ArrowUpRight, ShieldCheck, GraduationCap, Mail, Lock, Plus, RefreshCw, Upload, Trash2, Pencil, Check, CircleHelp, Trophy, UserRound, MessageSquare, Eye, EyeOff, RotateCcw, Download, Play, Clock3, Sparkles } from 'lucide-react'

type Tab = 'home' | 'notes' | 'videos' | 'resources' | 'quizzes' | 'about' | 'contact' | 'account' | 'admin'
type Row = Record<string, any>
type ContentKey = 'notes' | 'videos' | 'resources' | 'quizzes'
const tableFor: Record<ContentKey, string> = { notes: 'notes', videos: 'video_lessons', resources: 'resources', quizzes: 'quizzes' }
const labelFor: Record<ContentKey, string> = { notes: 'Notes', videos: 'Video lessons', resources: 'Resources', quizzes: 'Quizzes' }
const nav: { id: Tab; label: string }[] = [
  { id: 'notes', label: 'Notes' }, { id: 'videos', label: 'Video lessons' },
  { id: 'resources', label: 'Resources' }, { id: 'quizzes', label: 'Quizzes' },
  { id: 'about', label: 'About Suraj Sir' }, { id: 'contact', label: 'Contact' }
]
const emptyForm = { type: 'note', title: '', description: '', subject: 'Physics', grade_label: 'Class 12', topic: '', url: '', duration: '20' }
const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/png', 'image/jpeg']

function PSBMark({ small = false }: { small?: boolean }) {
  return <span className={small ? 'psb-mark psb-mark-small' : 'psb-mark'} aria-label="PSB logo">
    <svg viewBox="0 0 64 64" role="img" aria-hidden="true">
      <defs><linearGradient id="psb-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#92f1ec"/><stop offset="1" stopColor="#45aabe"/></linearGradient></defs>
      <circle cx="32" cy="32" r="28" fill="none" stroke="url(#psb-gradient)" strokeWidth="2"/>
      <ellipse cx="32" cy="32" rx="22" ry="9" fill="none" stroke="#78e2e8" strokeWidth="2" transform="rotate(48 32 32)"/>
      <ellipse cx="32" cy="32" rx="22" ry="9" fill="none" stroke="#78e2e8" strokeWidth="2" transform="rotate(-48 32 32)"/>
      <circle cx="32" cy="32" r="3.4" fill="#b6ffff"/>
      <text x="32" y="39" textAnchor="middle" fontSize="14" fontWeight="900" letterSpacing="-1" fill="#f0ffff" stroke="#0b2435" strokeWidth="1.2" paintOrder="stroke">PSB</text>
    </svg>
  </span>
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [mobile, setMobile] = useState(false)
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
  const [quizResult, setQuizResult] = useState<Row | null>(null)
  const [selectedQuizId, setSelectedQuizId] = useState('')
  const [questionForm, setQuestionForm] = useState({ prompt: '', options: ['', '', '', ''], correct: 0, explanation: '' })
  const [messages, setMessages] = useState<Row[]>([])
  const [submissions, setSubmissions] = useState<Row[]>([])
  const [editing, setEditing] = useState<Row | null>(null)
  const [profile, setProfile] = useState({ full_name: '', class_level: '12', phone: '' })
  const [history, setHistory] = useState<Row[]>([])
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
      ['quizzes', 'quizzes', 'id,title,description,grade_label,subject,topic,duration_minutes,is_published,created_at']
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
      supabase.from('quiz_submissions').select('id,quiz_id,user_id,score,total_questions,attempted_at').order('attempted_at', { ascending: false }).limit(100)
    ])
    if (!m.error) setMessages(m.data || [])
    if (!s.error) setSubmissions(s.data || [])
  }
  const loadStudentHistory = async () => {
    if (!supabase || !session?.user) return
    const { data, error } = await supabase.from('quiz_submissions').select('id,quiz_id,score,total_questions,attempted_at').eq('user_id', session.user.id).order('attempted_at', { ascending: false }).limit(20)
    if (!error) setHistory(data || [])
  }

  useEffect(() => {
    void refreshAuth()
    void loadContent()
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
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
  const count = useMemo(() => Object.values(rows).reduce((n, list) => n + list.filter(item => item.is_published).length, 0), [rows])

  const signIn = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return notify('Backend configuration is missing. Contact the site administrator.')
    setBusy(true); setNotice('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) notify(error.message)
    else { await refreshAuth(); await loadContent(); notify('You are signed in.'); setTab('home') }
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
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id, full_name: profile.full_name.trim(), class_level: Number(profile.class_level) || null, phone: profile.phone.trim() || null
    }, { onConflict: 'id' })
    setBusy(false)
    notify(error ? error.message : 'Your profile has been saved.')
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
    if (!session?.user) { notify('Please sign in before starting a quiz.'); setTab('account'); return }
    if (!supabase) return
    setBusy(true); setQuizResult(null)
    const { data, error } = await supabase.from('quiz_questions').select('id,prompt,options,sort_order').eq('quiz_id', quiz.id).order('sort_order', { ascending: true })
    setBusy(false)
    if (error) return notify(error.message)
    if (!data?.length) return notify('This quiz is not ready yet. Please check again later.')
    setActiveQuiz(quiz); setQuizQuestions(data); setAnswers({}); setTab('quizzes')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const submitQuiz = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !activeQuiz) return
    if (Object.keys(answers).length !== quizQuestions.length) return notify('Please answer every question before submitting.')
    setBusy(true)
    const payload = quizQuestions.map(q => ({ question_id: q.id, selected_option: answers[q.id] }))
    const { data, error } = await supabase.rpc('submit_quiz', { p_quiz_id: activeQuiz.id, p_answers: payload })
    setBusy(false)
    if (error) notify(error.message)
    else { setQuizResult(data); setActiveQuiz(null); await loadStudentHistory(); notify('Quiz submitted. Your score is ready.') }
  }
  const leaveQuiz = () => { setActiveQuiz(null); setQuizQuestions([]); setAnswers({}); setQuizResult(null) }

  const openContent = async (item: Row) => {
    if (!supabase) return
    const path = item.file_path
    if (path) {
      const { data, error } = await supabase.storage.from('study-materials').createSignedUrl(path, 3600)
      if (error) return notify('Could not open this file: ' + error.message)
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
      return
    }
    const url = item.external_url || item.video_url
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
    else notify('This item does not have a file or link attached yet.')
  }
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
      result = await supabase.from('quizzes').insert({ ...shared, grade_label: form.grade_label, topic: form.topic.trim(), duration_minutes: Number(form.duration) || null, is_published: false }).select('id').single()
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
    const { error } = await supabase.from(table).update({
      title: editing.title, description: editing.description, is_published: editing.is_published
    }).eq('id', editing.id)
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
  const changeTab = (t: Tab) => { setTab(t); setMobile(false); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const contentRows = (Object.keys(tableFor) as ContentKey[]).flatMap(key => rows[key].map(item => ({ ...item, _key: key, _table: tableFor[key] })))
  const publishedCount = (key: ContentKey) => rows[key].filter(item => item.is_published).length

  const cards = (items: Row[], key: ContentKey) => items.filter(item => item.is_published).length
    ? <div className="grid">{items.filter(item => item.is_published).map(item => <article className="content-card" key={item.id}>
      <div className="card-icon">{key === 'videos' ? <Video/> : key === 'quizzes' ? <ClipboardList/> : key === 'resources' ? <FileText/> : <BookOpen/>}</div>
      <div className="card-meta">{item.grade_label || (item.class_level ? 'Class ' + item.class_level : 'Physics')} · {item.subject || 'Physics'}</div>
      <h3>{item.title}</h3><p>{item.description || item.topic || 'Learning material from Suraj Bhardwaj.'}</p>
      {key === 'quizzes' ? <button className="text-link" onClick={() => startQuiz(item)} disabled={busy}><Play size={15}/> Start quiz <ArrowUpRight size={15}/></button>
        : <button className="text-link" onClick={() => openContent(item)}>{key === 'videos' ? 'Watch lesson' : 'Open material'} <ArrowUpRight size={15}/></button>}
      {key === 'quizzes' && item.duration_minutes && <span className="tiny-meta"><Clock3 size={12}/> {item.duration_minutes} min</span>}
    </article>)}</div>
    : <div className="empty"><div className="empty-symbol"><BookOpen/></div><h3>New learning material is on its way</h3><p>Suraj Sir will publish verified notes, lessons and resources here. Please check back soon.</p></div>

  return <div className="app">
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
    </main>}

    {(['notes', 'videos', 'resources'] as Tab[]).includes(tab) && <main className="page"><div className="page-intro"><span className="eyebrow">THE LEARNING LIBRARY</span><h1>{tab === 'notes' ? 'Study notes' : tab === 'videos' ? 'Video lessons' : 'Learning resources'}<em>.</em></h1><p>Explore the latest material published by Suraj Bhardwaj.</p><button className="refresh" onClick={loadContent}><RefreshCw size={15}/> Refresh</button></div>{loading ? <div className="empty">Loading published material…</div> : cards(rows[tab], tab)}</main>}

    {tab === 'quizzes' && <main className="page"><div className="page-intro"><span className="eyebrow">PRACTICE WITH PURPOSE</span><h1>{activeQuiz ? activeQuiz.title : quizResult ? 'Quiz results' : 'Practice quizzes'}<em>.</em></h1><p>{activeQuiz ? 'Choose one answer for every question, then submit to see your score.' : 'Test your understanding and learn from every attempt.'}</p></div>
      {activeQuiz && <form className="quiz-panel" onSubmit={submitQuiz}><div className="quiz-topline"><span>{activeQuiz.subject || 'Physics'} · {activeQuiz.grade_label || 'All levels'}</span><button type="button" className="switch" onClick={leaveQuiz}>Exit quiz</button></div>
        {quizQuestions.map((q, i) => <fieldset className="question" key={q.id}><legend><b>Q{i + 1}.</b> {q.prompt}</legend><div className="option-list">{(q.options as string[]).map((option, j) => <label className={answers[q.id] === j ? 'option selected' : 'option'} key={j}><input type="radio" name={q.id} checked={answers[q.id] === j} onChange={() => setAnswers(prev => ({ ...prev, [q.id]: j }))}/><span>{String.fromCharCode(65 + j)}.</span>{option}</label>)}</div></fieldset>)}
        <button className="primary full" disabled={busy}>{busy ? 'Submitting…' : 'Submit answers'} <ArrowUpRight size={17}/></button>
      </form>}
      {quizResult && <div className="result-panel"><Trophy size={38}/><span className="eyebrow">YOUR RESULT</span><strong>{quizResult.score} / {quizResult.total_questions}</strong><b>{quizResult.percentage}% score</b><p>{quizResult.percentage >= 80 ? 'Excellent work. Keep building on these strong foundations.' : quizResult.percentage >= 50 ? 'Good effort. Review the explanations and try again.' : 'Keep practising. Every attempt makes the concepts clearer.'}</p><div className="result-details">{(quizResult.details || []).map((d: Row, i: number) => <div className="result-item" key={d.question_id}><b>{d.is_correct ? '✓' : '↻'} Question {i + 1}</b><span>{d.is_correct ? 'Correct' : 'Review this concept'}</span>{d.explanation && <p>{d.explanation}</p>}</div>)}</div><button className="secondary" onClick={leaveQuiz}>Back to quizzes</button></div>}
      {!activeQuiz && !quizResult && (loading ? <div className="empty">Loading quizzes…</div> : cards(rows.quizzes, 'quizzes'))}
    </main>}

    {tab === 'about' && <main className="page about"><div className="page-intro"><span className="eyebrow">THE TEACHER BEHIND THE METHOD</span><h1>Clarity changes<br/><em>everything.</em></h1><p>Physics by Suraj Bhardwaj is built around one idea: when the concept is clear, the subject becomes approachable.</p></div>
      <div className="about-panel"><div className="teacher-portrait"><div className="portrait-glow"><PSBMark/></div><span>TEACHER PROFILE</span></div><div><span className="eyebrow">YOUR PHYSICS MENTOR</span><h2>Suraj Bhardwaj</h2><p>A science educator focused on helping students build strong fundamentals, understand the logic behind formulas and develop confidence through consistent practice.</p><p>This learning space brings together notes, video lessons, resources and quizzes in one place.</p><div className="teacher-tags"><span>Concept clarity</span><span>Focused learning</span><span>Physics</span></div></div></div>
    </main>}

    {tab === 'account' && <main className="page narrow"><div className="page-intro"><span className="eyebrow">YOUR LEARNING ACCOUNT</span><h1>{session ? 'Your account' : authMode === 'signin' ? 'Welcome back' : 'Create your account'}<em>.</em></h1><p>{session ? 'Manage your student details and review your quiz progress.' : 'Sign in or create a student account to attempt quizzes and track progress.'}</p></div>
      {!session ? <form className="form-card" onSubmit={authMode === 'signin' ? signIn : signUp}>
        {authMode === 'signup' && <><label>Full name<input required minLength={2} value={name} onChange={e => setName(e.target.value)} placeholder="Your name"/></label><label>Class<select value={studentClass} onChange={e => setStudentClass(e.target.value)}>{[7, 8, 9, 10, 11, 12].map(n => <option value={String(n)} key={n}>Class {n}</option>)}</select></label></>}
        <label>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></label>
        <label>Password<input required minLength={6} type="password" autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
        <button className="primary full" disabled={busy}>{busy ? 'Please wait…' : authMode === 'signin' ? 'Sign in' : 'Create account'} <ArrowUpRight size={17}/></button>
        {authMode === 'signin' && <button type="button" className="switch" onClick={resetPassword} disabled={busy}>Forgot password? Send reset email</button>}
        <button type="button" className="switch" onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}>{authMode === 'signin' ? 'New here? Create an account' : 'Already registered? Sign in'}</button>
      </form> : <div className="account-layout"><div className="account-summary"><UserRound/><b>{userEmail}</b><span>{staff ? 'Teacher account' : 'Student account'}</span><button className="secondary" onClick={signOut}><LogOut size={15}/> Sign out</button></div>
        <form className="form-card" onSubmit={saveProfile}><h2>Student profile</h2><label>Full name<input value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })}/></label><label>Class<select value={profile.class_level} onChange={e => setProfile({ ...profile, class_level: e.target.value })}>{[7, 8, 9, 10, 11, 12].map(n => <option key={n} value={String(n)}>Class {n}</option>)}</select></label><label>Phone (optional)<input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="Your contact number"/></label><button className="primary full" disabled={busy}>Save profile <Check size={16}/></button></form>
        <div className="history-panel"><h2><Trophy size={18}/> Recent quiz attempts</h2>{history.length ? history.map(h => <div className="history-row" key={h.id}><span>{rows.quizzes.find(q => q.id === h.quiz_id)?.title || 'Physics quiz'}</span><b>{h.score}/{h.total_questions}</b><small>{new Date(h.attempted_at).toLocaleDateString()}</small></div>) : <p>No quiz attempts yet. Start a quiz to see your progress here.</p>}</div>
      </div>}
    </main>}

    {tab === 'admin' && <main className="page"><div className="page-intro"><span className="eyebrow">SECURE TEACHER WORKSPACE</span><h1>Teacher panel<em>.</em></h1><p>Manage study material, quizzes, student messages and results.</p></div>
      {!session ? <div className="empty"><ShieldCheck/><h3>Sign in to continue</h3><button className="primary" onClick={() => changeTab('account')}>Open sign in</button></div> : !staff ? <div className="empty"><ShieldCheck/><h3>Activate teacher access</h3><p>Signed in as {userEmail}. Only the verified, authorised teacher email can activate this workspace.</p><button className="primary" disabled={busy} onClick={claimTeacher}>{busy ? 'Checking…' : 'Activate teacher access'}</button></div> : <>
        <div className="stats-grid"><div><BookOpen/><b>{publishedCount('notes')}</b><span>Published notes</span></div><div><Video/><b>{publishedCount('videos')}</b><span>Video lessons</span></div><div><ClipboardList/><b>{publishedCount('quizzes')}</b><span>Published quizzes</span></div><div><Mail/><b>{messages.filter(m => m.status === 'new').length}</b><span>New messages</span></div></div>
        <div className="admin-layout">
          <aside className="admin-side"><div className="admin-welcome"><ShieldCheck/><div><b>Teacher access active</b><small>{userEmail}</small></div><span className="live-pill">SECURE</span></div><div className="admin-help"><b>Publishing checklist</b><p>For quizzes, create a draft, add questions and mark the correct answers, then publish.</p><p>Student files are stored in a private bucket and served with expiring links.</p></div></aside>
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
              {form.type === 'quiz' && <label>Duration (minutes)<input type="number" min="1" max="240" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}/></label>}
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
          {contentRows.length ? <div className="manage-list">{contentRows.map(item => <div className="manage-item" key={item.id}><div><span className="card-meta">{labelFor[item._key as ContentKey]} · {item.is_published ? 'PUBLISHED' : 'DRAFT'}</span><b>{item.title}</b><small>{item.description || item.topic || 'No description'}</small></div><div className="manage-actions"><button title="Edit" onClick={() => setEditing({ id: item.id, table: item._table, title: item.title, description: item.description || '', is_published: item.is_published })}><Pencil size={15}/></button><button title={item.is_published ? 'Unpublish' : 'Publish'} onClick={() => togglePublished(item._table, item)}><Eye size={15}/></button><button className="danger" title="Delete" onClick={() => removeContent(item._table, item.id)}><Trash2 size={15}/></button></div></div>)}</div> : <div className="empty">No content has been published yet.</div>}
          {editing && <form className="form-card edit-form" onSubmit={updateContent}><h3>Edit item</h3><label>Title<input required value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })}/></label><label>Description<textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })}/></label><label className="check-line"><input type="checkbox" checked={editing.is_published} onChange={e => setEditing({ ...editing, is_published: e.target.checked })}/> Visible to students</label><div className="row-actions"><button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button><button className="primary" disabled={busy}>Save changes</button></div></form>}
        </section>
        <section className="manager-section"><div className="section-head"><div><span className="eyebrow">STUDENT SUPPORT</span><h2>Contact inbox</h2></div><span className="tiny-meta">{messages.length} messages</span></div>
          {messages.length ? <div className="inbox-list">{messages.map(m => <article className="inbox-item" key={m.id}><div className="inbox-title"><b>{m.subject}</b><span className={m.status === 'new' ? 'status-new' : 'status-done'}>{m.status}</span></div><p>{m.message}</p><small>{m.name} · {m.email} · {new Date(m.created_at).toLocaleString()}</small><div className="row-actions"><a className="text-link" href={'mailto:' + encodeURIComponent(m.email) + '?subject=' + encodeURIComponent('Re: ' + m.subject)}><Mail size={14}/> Reply by email</a>{m.status === 'new' && <button className="switch" onClick={() => setMessageStatus(m, 'resolved')}>Mark resolved <Check size={14}/></button>}</div></article>)}</div> : <div className="empty">No student messages yet.</div>}
        </section>
        <section className="manager-section"><div className="section-head"><div><span className="eyebrow">ASSESSMENT INSIGHTS</span><h2>Quiz submissions</h2></div><span className="tiny-meta">{submissions.length} attempts</span></div>
          {submissions.length ? <div className="manage-list">{submissions.map(s => <div className="manage-item" key={s.id}><div><b>{rows.quizzes.find(q => q.id === s.quiz_id)?.title || 'Physics quiz'}</b><small>Student ID: {s.user_id || 'Guest'} · {new Date(s.attempted_at).toLocaleString()}</small></div><strong>{s.score}/{s.total_questions}</strong></div>)}</div> : <div className="empty">Quiz attempts will appear here as students complete quizzes.</div>}
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

    {notice && <div className="notice" role="status" aria-live="polite">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
    <footer className="footer"><div className="brand footer-brand"><PSBMark small/><span><b>PHYSICS <i>BY SURAJ BHARDWAJ</i></b><small>Concept to Clarity · PSB</small></span></div><div className="footer-links">{['home', ...nav.map(x => x.id)].map(x => <button key={x} onClick={() => changeTab(x as Tab)}>{x === 'home' ? 'Home' : x === 'about' ? 'About' : x === 'contact' ? 'Contact' : labelFor[x as ContentKey] || x}</button>)}</div><small>© {new Date().getFullYear()} Physics by Suraj Bhardwaj. PSB.</small></footer>
  </div>
}
