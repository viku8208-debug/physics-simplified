import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronDown, ChevronUp, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { ErrorState, LoadingState, Toast } from '../components/Common'
import { AdminPageTitle, AdminSearch, AdminTable, FileField, FormModal, PublishToggle, RowActions, SelectField, StatusTag, TextAreaField, TextField } from '../components/AdminUi'
import { formatDate, GRADES, RESOURCE_TYPES, SUBJECTS, uploadMaterial } from '../lib/content'
import { requireSupabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { NoteRecord, QuizRecord, ResourceRecord, VideoRecord } from '../lib/types'

const blankNote = () => ({ title: '', description: '', grade_label: 'All levels', subject: 'Physics', topic: '', content: '', external_url: '', is_published: false, file_path: null as string | null })
const blankVideo = () => ({ title: '', description: '', grade_label: 'All levels', subject: 'Physics', topic: '', video_url: '', is_published: false, thumbnail_path: null as string | null })
const blankResource = () => ({ title: '', description: '', class_level: '9', subject: 'Physics', resource_type: 'Notes', external_url: '', is_published: false, file_path: null as string | null })

function pageError(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.' }

export function AdminNotesPage() {
  const { user ¶»§q«^