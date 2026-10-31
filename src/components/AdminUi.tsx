import { Plus, Search, Pencil, Trash2, ExternalLink } from 'lucide-react'
import type { ReactNode, FormEvent } from 'react'
import { EmptyState, Modal, Tag } from './Common'

export function AdminPageTitle({ eyebrow, title, description, buttonLabel, onAdd }: {
  eyebrow: string; title: string; description: string; buttonLabel: string; onAdd: () => void
}) {
  return <div className="admin-page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><button className="button button--cyan" onClick={onAdd}><Plus size={16} /> {buttonLabel}</button></div>
}

export function AdminSearch({ value, onChange, placeholder = 'Search contentâ€¦' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="admin-search"><Search size={17} /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>
}

export function StatusTag({ published }: { published: boolean }) {
  return published ? <Tag tone="green">Published</Tag> : <Tag tone="violet">Draft</Tag>
}

export function AdminTable({ columns, rows, emptyTitle, emptyText }: {
  columns: string[]
  rows: ReactNode[]
  emptyTitle: string
  emptyText: string
}) {
  return rows.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows}</tbody></table></div> : <EmptyState title={emptyTitle} description={emptyText} />
}

expo¶»§q«^