export type ContentStatus = 'draft' | 'published'

export interface NoteRecord {
  id: string
  title: string
  description: string
  grade_label: string
  subject: string
  topic: string
  content: string
  file_path: string | null
  external_url: string | null
  is_published: boolean
  created_at: string
}

export interface VideoRecord {
  id: string
  title: string
  description: string
  grade_label: string
  subject: string
  topic: string
  video_url: string
  thumbnail_path: string | null
  is_published: boolean
  created_at: string
}

export interface ResourceRecord {
  id: string
  title: string
  description: string
  class_level: number
  subject: string
  resource_type: string
  file_path: string | null
  external_url: string | null
  is_published: boolean
  created_at: string
}

export interface QuizRecord {
  id: string
  title: string
  description: string
  grade_label: string
  subject: string
  topic: string
  duration_minutes: number | null
  is_published: boolean
  created_at: string
  question_count?: number
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  prompt: string
  options: string[]
  sort_order: number
}

export interface QuizResultDetail {
  question_id: string
  selected_option: number
  correct_option: number
  is_correct: boolean
  explanation: string
}

export interface QuizResult {
  submission_id: string
  score: number
  total_questions: number
  percentage: number
  details: QuizResultDetail[]
}
