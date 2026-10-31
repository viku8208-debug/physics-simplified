import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import { Atom, BookOpen, Video, FileText, ClipboardList, LogIn, LogOut, Menu, X, ArrowUpRight, ShieldCheck, GraduationCap, Mail, Lock, Plus, RefreshCw } from 'lucide-react'

type Tab = 'home' | 'notes' | 'videos' | 'resources' | 'quizzes' | 'about' | 'contact' | 'account' | 'admin'
type Row = Record<string, any>

const nav: { id: Tab; label: string }[] = [
  { id: 'notes', label: 'Notes' }, { id: 'videos', label: 'Video lessons' },
  { id: 'resources', label: 'Resources' }, { id: 'quizzes', label: 'Quizzes' },
  { id: 'about', label: 'About Suraj Sir' }
]
const tableFor: Record<string, string> = { notes: 'notes', videos: 'video_lessons', resources: 'resources', quizzes: 'quizzes' }
const titleFor: Record<string, string> = { notes: 'Study notes', videos: 'Video lessons', resources: 'Learning resources', quizzes: 'Practice quizzes' }

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [mobile, setMobile] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [staff, setStaff] = useState(false)
  const [authMode, setAuthMode] = useState<'signin'|'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [rows, setRows] = useState<Record<string, Row[]>>({ notes: [], videos: [], resources: [], quizzes: [] })
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', subject:'Physics', grade_label:'All levels', topic:'', url:'', type:'Worksheet' })
  const [contact, setContact] = useState({ name:'', email:'', subject:'', message:'', class_level:'' })

  const userEmail = session?.user?.email || ''
  const refreshAuth = async () => {
    if (!supabase) return
    const { data } = await supabase.auth.getSession()
    const s = data.session
    setSession(s)
    setStaff(s?.user?.app_metadata?.role === 'teacher' || s?.user?.app_metadata?.role === 'admin')
  }
  const loadContent = async () => {
    if (!supabase) return
    setLoading(true)
    const specs = [
      ['notes', 'notes', 'id,title,description,grade_label,subject,topic,content,file_path,external_url,created_at'],
      ['videos', 'video_lessons', 'id,title,description,grade_label,subject,topic,video_url,created_at'],
      ['resources', 'resources', 'id,title,description,class_level,subject,resource_type,file_path,external_url,created_at'],
      ['quizzes', 'quizzes', 'id,title,description,grade_label,subject,topic,duration_minutes,created_at']
    ] as const
    const next: Record<string, Row[]> = {}
    for (const [key, table, fields] of specs) {
      const { data, error } = await supabase.from(table).select(fields).eq('is_published', true).order('created_at', { ascending:false }).limit(12)
      if (error) { setNotice(error.message); next[key] = [] } else next[key] = data || []
    }
    setRows(next)
    setLoading(false)
  }

  useEffect(() => {
    void refreshAuth()
    void loadContent()
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setStaff(s?.user?.app_metadata?.role === 'teacher' || s?.user?.app_metadata?.role === 'admin')
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const count = useMemo(() => Object.values(rows).reduce((n, list) => n + list.length, 0), [rows])

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return setNotice('The website backend is not configured yet.')
    setBusy(true); setNotice('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setNotice(error.message)
    else { await refreshAuth(); setNotice('Signed in successfully.'); setTab('home') }
  }
  const signUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return setNotice('The website backend is not configured yet.')
    setBusy(true); setNotice('')
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
    setBusy(false)
    setNotice(error ? error.message : 'Confirmation email sent. Please verify your email, then sign in.')
    if (!error) setAuthMode('signin')
  }
  const claimTeacher = async () => {
    if (!supabase) return
    setBusy(true); setNotice('')
    const { error } = await supabase.rpc('claim_teacher_access')
    if (error) setNotice(error.message)
    else { await supabase.auth.refreshSession(); await refreshAuth(); setNotice('Teacher access activated.'); setTab('admin') }
    setBusy(false)
  }
  const signOut = async () => { await supabase?.auth.signOut(); setStaff(false); setTab('home'); setNotice('You have signed out.') }

  const saveContent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !staff) return
    setBusy(true); setNotice('')
    const shared = { title: form.title, description: form.description, subject: form.subject, is_published: true }
    let result: any
    if (tab === 'admin' && form.type === 'Video lesson') {
      result = await supabase.from('video_lessons').insert({ ...shared, grade_label: form.grade_label, topic: form.topic, video_url: form.url })
    } else if (tab === 'admin' && form.type === 'Resource') {
      result = await supabase.from('resources').insert({ ...shared, class_level: Number(form.grade_label.replace(/\\D/g,'')) || 12, resource_type: 'Reference', external_url: form.url })
    } else if (tab === 'admin' && form.type === 'Quiz') {
      result = await supabase.from('quizzes').insert({ ...shared, grade_label: form.grade_label, topic: form.topic })
    } else {
      result = await supabase.from('notes').insert({ ...shared, grade_label: form.grade_label, topic: form.topic, external_url: form.url })
    }
    setBusy(false)
    if (result.error) setNotice(result.error.message)
    else { setNotice('Content published successfully.'); setForm({ title:'', description:'', subject:'Physics', grade_label:'All levels', topic:'', url:'', type:'Worksheet' }); await loadContent() }
  }
  const sendContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return setNotice('The website backend is not configured yet.')
    setBusy(true)
    const { error } = await supabase.from('contact_messages').insert({ name: contact.name, email: contact.email, subject: contact.subject, message: contact.message, class_level: contact.class_level ? Number(contact.class_level) : null })
    setBusy(false)
    setNotice(error ? error.message : 'Your message has been sent. Thank you!')
    if (!error) setContact({ name:'', email:'', subject:'', message:'', class_level:'' })
  }

  const changeTab = (t: Tab) => { setTab(t); setMobile(false); setNotice(''); window.scrollTo({ top:0, behavior:'smooth' }) }
  const openUrl = (url?: string | null) => { if (url) window.open(url, '_blank', 'noopener,noreferrer') }
  const cards = (items: Row[], type: string) => items.length ? <div className="grid">{items.map(item => <article className="content-card" key={item.id}><div className="card-icon">{type === 'videos' ? <Video/> : type === 'quizzes' ? <ClipboardList/> : type === 'resources' ? <FileText/> : <BookOpen/>}</div><div className="card-meta">{item.grade_label || (item.class_level ? 'Class '+item.class_level : 'Physics')} · {item.subject || 'Physics'}</div><h3>{item.title}</h3><p>{item.description || item.topic || 'Learning material shared by Suraj Bhardwaj.'}</p><button className="text-link" onClick={() => openUrl(item.external_url || item.video_url || item.file_path)}>{type === 'videos' ? 'Watch lesson' : type === 'quizzes' ? 'Open quiz' : 'Open material'} <ArrowUpRight size={15}/></button></article>)}</div> : <div className="empty"><div className="empty-symbol"><BookOpen/></div><h3>New learning material is on its way</h3><p>Suraj Sir will publish notes, lessons and resources here. Please check back soon.</p></div>

  return <div className="app">
    <div className="topline"><span>PHYSICS, MADE CLEAR.</span><span>Learn with curiosity · Grow with confidence</span></div>
    <header className="header">
      <button className="brand" onClick={() => changeTab('home')}><span className="brand-icon"><Atom/></span><span><b>PHYSICS <i>SIMPLIFIED</i></b><small>Concept to Clarity by Suraj Bhardwaj</small></span></button>
      <nav className={mobile ? 'nav open' : 'nav'}>{nav.map(n => <button className={tab===n.id?'active':''} key={n.id} onClick={() => changeTab(n.id)}>{n.label}</button>)}</nav>
      <div className="header-actions">{staff && <button className="admin-chip" onClick={() => changeTab('admin')}><ShieldCheck size={15}/> Teacher panel</button>}{session ? <button className="account-btn" onClick={signOut}><LogOut size={16}/> Sign out</button> : <button className="account-btn" onClick={() => changeTab('account')}><LogIn size={16}/> Student login</button>}<button className="menu-btn" onClick={() => setMobile(!mobile)}>{mobile?<X/>:<Menu/>}</button></div>
    </header>

    {tab==='home' && <main>
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span/> A BETTER WAY TO UNDERSTAND PHYSICS</div><h1>Make sense of<br/><em>the universe.</em></h1><p>Clear explanations, focused study material and thoughtful practice — helping every concept move from confusion to clarity.</p><div className="hero-actions"><button className="primary" onClick={() => changeTab('notes')}>Explore learning <ArrowUpRight size={17}/></button><button className="secondary" onClick={() => changeTab('about')}>Meet your teacher</button></div><div className="hero-foot"><span><b>{count}</b> published learning items</span><span>Designed for curious minds</span></div></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="atom-core"><Atom size={104}/></div><div className="float-card float-a"><span>01</span><b>Understand</b><small>Build strong foundations</small></div><div className="float-card float-b"><span>02</span><b>Practice</b><small>Learn by doing</small></div><div className="equation">E = mc²</div></div></section>
      <section className="trust"><div><GraduationCap/><b>Concept-first teaching</b><span>Understand the why, not just the formula.</span></div><div><BookOpen/><b>Focused resources</b><span>Study material organised for learning.</span></div><div><ClipboardList/><b>Practice with purpose</b><span>Check your understanding as you grow.</span></div></section>
      <section className="section"><div className="section-head"><div><span className="eyebrow">YOUR LEARNING SPACE</span><h2>Choose your next step.</h2></div><button className="text-link" onClick={() => changeTab('notes')}>Browse all material <ArrowUpRight size={15}/></button></div><div className="feature-grid">{nav.slice(0,4).map((n,i)=><button className="feature" key={n.id} onClick={() => changeTab(n.id)}><span className="feature-no">0{i+1}</span><span className="feature-icon">{i===0?<BookOpen/>:i===1?<Video/>:i===2?<FileText/>:<ClipboardList/>}</span><b>{n.label}</b><small>{['Clear notes for focused revision.','Learn important ideas visually.','Extra material for deeper study.','Test what you have understood.'][i]}</small><span className="feature-arrow"><ArrowUpRight/></span></button>)}</div></section>
      <section className="teacher-strip"><div><span className="eyebrow">YOUR GUIDE THROUGH PHYSICS</span><h2>Learn with Suraj Bhardwaj.</h2><p>Physics becomes easier when ideas are explained clearly, patiently and with purpose.</p></div><button className="secondary light" onClick={() => changeTab('about')}>Know more about Suraj Sir <ArrowUpRight size={16}/></button></section>
    </main>}

    {tableFor[tab] && <main className="page"><div className="page-intro"><span className="eyebrow">THE LEARNING LIBRARY</span><h1>{titleFor[tab]}<em>.</em></h1><p>Explore the latest material published by Suraj Bhardwaj.</p><button className="refresh" onClick={loadContent}><RefreshCw size={15}/> Refresh</button></div>{loading?<div className="empty">Loading published material…</div>:cards(rows[tab],tab)}</main>}

    {tab==='about' && <main className="page about"><div className="page-intro"><span className="eyebrow">THE TEACHER BEHIND THE METHOD</span><h1>Clarity changes<br/><em>everything.</em></h1><p>Physics Simplified is built around one idea: when the concept is clear, the subject becomes approachable.</p></div><div className="about-panel"><div className="teacher-mark"><Atom size={76}/></div><div><span className="eyebrow">YOUR PHYSICS MENTOR</span><h2>Suraj Bhardwaj</h2><p>A science educator focused on helping students build strong fundamentals, understand the logic behind formulas and develop confidence through consistent practice.</p><p>This learning space brings together notes, video lessons, resources and quizzes in one place.</p></div></div></main>}

    {tab==='account' && <main className="page narrow"><div className="page-intro"><span className="eyebrow">YOUR LEARNING ACCOUNT</span><h1>{authMode==='signin'?'Welcome back':'Create your account'}<em>.</em></h1><p>Sign in to access your student learning space.</p></div><form className="form-card" onSubmit={authMode==='signin'?signIn:signUp}>{authMode==='signup'&&<label>Full name<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}<label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>Password<input required minLength={6} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/></label><button className="primary full" disabled={busy}>{busy?'Please wait…':authMode==='signin'?'Sign in':'Create account'} <ArrowUpRight size={17}/></button><button type="button" className="switch" onClick={()=>setAuthMode(authMode==='signin'?'signup':'signin')}>{authMode==='signin'?'New here? Create an account':'Already registered? Sign in'}</button></form></main>}

    {tab==='admin' && <main className="page"><div className="page-intro"><span className="eyebrow">SECURE TEACHER WORKSPACE</span><h1>Teacher panel<em>.</em></h1><p>Publish learning material for students. Only the authorised, email-verified teacher account can activate access.</p></div>{!session ? <div className="empty"><ShieldCheck/><h3>Sign in to continue</h3><button className="primary" onClick={()=>changeTab('account')}>Open sign in</button></div> : !staff ? <div className="empty"><ShieldCheck/><h3>Activate teacher access</h3><p>Signed in as {userEmail}. Verify the authorised teacher email, then activate this protected workspace.</p><button className="primary" disabled={busy} onClick={claimTeacher}>{busy?'Checking…':'Activate teacher access'}</button></div> : <div className="admin-layout"><div className="admin-welcome"><ShieldCheck/><div><b>Teacher access active</b><small>{userEmail}</small></div><span className="live-pill">SECURE</span></div><form className="form-card admin-form" onSubmit={saveContent}><h2><Plus size={20}/> Publish learning material</h2><label>Content type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Worksheet</option><option>Video lesson</option><option>Resource</option><option>Quiz</option></select></label><label>Title<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><div className="form-row"><label>Subject<input value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></label><label>Class / level<input value={form.grade_label} onChange={e=>setForm({...form,grade_label:e.target.value})}/></label></div><label>Topic<input value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})}/></label><label>Link (optional)<input type="url" value={form.url} onChange={e=>setForm({...form,url:e.target.value})} placeholder="https://…"/></label><button className="primary full" disabled={busy}>{busy?'Publishing…':'Publish for students'} <ArrowUpRight size={17}/></button></form></div>}</main>}

    {tab==='contact' && <main className="page narrow"><div className="page-intro"><span className="eyebrow">GET IN TOUCH</span><h1>Let's connect<em>.</em></h1><p>Send a message about classes, learning material or anything related to Physics Simplified.</p></div><form className="form-card" onSubmit={sendContact}><label>Your name<input required value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})}/></label><label>Email address<input required type="email" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})}/></label><label>Subject<input required minLength={2} maxLength={180} value={contact.subject} onChange={e=>setContact({...contact,subject:e.target.value})} placeholder="What would you like to ask?"/></label><label>Class (optional)<select value={contact.class_level} onChange={e=>setContact({...contact,class_level:e.target.value})}><option value="">Select class</option>{[7,8,9,10,11,12].map(n=><option key={n} value={String(n)}>Class {n}</option>)}</select></label><label>Message<textarea required value={contact.message} onChange={e=>setContact({...contact,message:e.target.value})}/></label><button className="primary full" disabled={busy}>Send message <ArrowUpRight size={17}/></button></form></main>}

    {notice && <div className="notice" role="status">{notice}<button onClick={()=>setNotice('')} aria-label="Dismiss">×</button></div>}
    <footer className="footer"><div className="brand footer-brand"><span className="brand-icon"><Atom/></span><span><b>PHYSICS <i>SIMPLIFIED</i></b><small>Concept to Clarity by Suraj Bhardwaj</small></span></div><div className="footer-links">{['home',...nav.map(x=>x.id),'contact'].map(x=><button key={x} onClick={()=>changeTab(x as Tab)}>{x==='home'?'Home':x==='about'?'About':x==='contact'?'Contact':titleFor[x] || x}</button>)}</div><small>© {new Date().getFullYear()} Physics Simplified. Built for curious minds.</small></footer>
  </div>
}