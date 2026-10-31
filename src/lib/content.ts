import { requireSupabase } from './supabase'

export const SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'General Science', 'Mathematics']
export const GRADES = ['Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'All levels']
export const RESOURCE_TYPES = ['Notes', 'Worksheet', 'Question Paper', 'Practical', 'Reference']
export const MAX_FILE_SIZE = 50 * 1024 * 1024

export function safeFileName(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(-110) || 'file'
}

export async function uploadMaterial(file: File, folder: 'notes' | 'resources' | 'thumbnails') {
  const client = requireSupabase()
  if (file.size > MAX_FILE_SIZE) throw new Error('File is larger than the 50 MB upload limit.')
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png',
    'image/jpeg',
  ]
  if (!allowed.includes(file.type)) throw new Error('This file type is not allowed. Use PDF, Word, PowerPoint, PNG or JPG.')
  const path = `${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`
  const { error } = await client.storage.from('study-materials').upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  })
  if (error) thr¶»§q«^