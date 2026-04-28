// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #68 — project_files types
//
// Mirrors the shape of public.project_files in 0007_project_files.sql.
// Used by uploadApi + the message-attachment renderer + the document
// linkage helper.
// ───────────────────────────────────────────────────────────────────────

import type { FileCategory } from './chatInput'

export type ProjectFileStatus =
  | 'uploading'
  | 'uploaded'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'deleted'

export type UploadedByRole =
  | 'client'
  | 'designer'
  | 'engineer'
  | 'authority'
  | 'system'

export interface ProjectFileRow {
  id: string
  project_id: string
  owner_id: string
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  storage_bucket: string
  category: FileCategory | null
  uploaded_by_role: UploadedByRole
  message_id: string | null
  document_id: string | null
  status: ProjectFileStatus
  created_at: string
  updated_at: string
}
