import { BookOpen, CircleHelp, FileText, Play, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { useI18n } from '../lib/i18n'

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-mark ${compact ? 'brand-mark--compact' : ''}`} aria-hidden="true">
      <span className="brand-mark__orbit brand-mark__orbit--one" />
      <span className="brand-mark__orbit brand-mark__orbit--two" />
      <span className="brand-mark__core">Î¦</span>
    </span>
  )
}

export function SectionHeading({ eyebrow, title, description, action }: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ icon = 'notes', title, description, action }: {
  icon?: 'notes' | 'videos' | 'resources' | 'quizzes'
  title: string
  description: string
  action?: ReactNode
}) {
  const Icon = icon === 'videos' ? Play : icon === 'resources' ? FileText : icon === 'quizzes' ? CircleHelp : BookOpen
  return (
    <div className="empty-state">
      <div className="empty-state__icon"><Icon size={24} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function LoadingState({ label }: { label?: st¶»§q«^