// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #68 — file upload client wrappers
//
// Three operations the SPA needs:
//   1. uploadProjectFile     — Storage put + project_files INSERT.
//   2. fetchSignedFileUrl    — POST /functions/v1/signed-file-url to
//                              mint a 1-hour signed URL for a row.
//   3. deletePendingFile     — POST /functions/v1/delete-file to remove
//                              a chip pre-send (storage + row).
//
// We deliberately keep the upload path in the SPA (no Edge Function for
// the upload itself) so progress events and abort signals remain a
// browser-side concern. The Edge Functions handle the two operations
// that benefit from server-side checks: signing (path-scoped, expiring)
// and pre-send deletion (refuses to nuke files already linked to a sent
// message).
// ───────────────────────────────────────────────────────────────────────

import { supabase } from '@/lib/supabase'
import type { FileCategory } from '@/types/chatInput'
import type { ProjectFileRow } from '@/types/projectFile'

const MAX_FILE_SIZE = 25 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/vnd.dwg',
  'application/acad',
])

export interface UploadResult {
  row: ProjectFileRow
}

export type UploadErrorCode =
  | 'unauthenticated'
  | 'too_large'
  | 'unsupported_type'
  | 'storage_failed'
  | 'persistence_failed'
  | 'network'

export class UploadError extends Error {
  code: UploadErrorCode

  constructor(code: UploadErrorCode, message: string) {
    super(message)
    this.name = 'UploadError'
    this.code = code
  }
}

/**
 * Validate a file against the bucket's policy mirror. Catching here
 * avoids a round-trip to Storage for predictable rejections.
 */
export function validateFile(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadError(
      'too_large',
      `Datei ist zu groß. Maximum: ${Math.floor(MAX_FILE_SIZE / 1024 / 1024)} MB.`,
    )
  }
  if (!ALLOWED_MIME_TYPES.has(file.type) && !inferAllowedByExt(file.name)) {
    throw new UploadError(
      'unsupported_type',
      `Dateityp wird nicht unterstützt: ${file.type || 'unbekannt'}.`,
    )
  }
}

// DWG files sometimes report empty mime; allow if extension matches.
function inferAllowedByExt(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase()
  return ext === 'dwg' || ext === 'dxf'
}

/**
 * Sanitize a file name for use inside the storage path. Strips any
 * char outside [A-Za-z0-9._-]; collapses spaces.
 */
function sanitize(name: string): string {
  return name.replace(/\s+/g, '_').replace(/[^A-Za-z0-9._-]/g, '')
}

interface UploadArgs {
  projectId: string
  file: File
  category: FileCategory
}

/**
 * Upload a file to Storage + insert the project_files row. Returns
 * the persisted row so the caller can track it by id.
 */
export async function uploadProjectFile({
  projectId,
  file,
  category,
}: UploadArgs): Promise<UploadResult> {
  validateFile(file)

  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData.session
  if (!session?.user?.id) {
    throw new UploadError('unauthenticated', 'Keine aktive Sitzung.')
  }
  const ownerId = session.user.id

  const safeName = sanitize(file.name)
  const random = crypto.randomUUID()
  const storagePath = `${ownerId}/${projectId}/${random}-${safeName}`

  // Upload to Storage. The bucket's RLS policy enforces that
  // (storage.foldername(name))[1] === auth.uid().
  const { error: storageErr } = await supabase.storage
    .from('project-files')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })

  if (storageErr) {
    throw new UploadError(
      'storage_failed',
      storageErr.message ?? 'Hochladen fehlgeschlagen.',
    )
  }

  // Insert the project_files row. RLS verifies ownership of the
  // parent project + owner_id = auth.uid().
  const { data: row, error: rowErr } = await supabase
    .from('project_files')
    .insert({
      project_id: projectId,
      owner_id: ownerId,
      file_name: file.name,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      storage_path: storagePath,
      storage_bucket: 'project-files',
      category,
      uploaded_by_role: 'client',
      status: 'uploaded',
    })
    .select()
    .single()

  if (rowErr || !row) {
    // Best-effort cleanup of the orphan storage object.
    void supabase.storage.from('project-files').remove([storagePath])
    throw new UploadError(
      'persistence_failed',
      rowErr?.message ?? 'Konnte Datei nicht in der Datenbank registrieren.',
    )
  }

  return { row: row as ProjectFileRow }
}

/**
 * Fetch a 1-hour signed URL for a previously uploaded file. The Edge
 * Function verifies the requester is the row's owner.
 */
export async function fetchSignedFileUrl(fileId: string): Promise<string> {
  const env = await resolveEdgeEnv('signed-file-url')

  const response = await fetch(env.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.anonKey,
      Authorization: `Bearer ${env.accessToken}`,
    },
    body: JSON.stringify({ fileId }),
  })

  if (!response.ok) {
    const body = await safeJson(response)
    throw new UploadError(
      'persistence_failed',
      body?.error?.message ?? `Signed URL fehlgeschlagen (${response.status})`,
    )
  }
  const body = await response.json()
  if (!body?.url || typeof body.url !== 'string') {
    throw new UploadError('persistence_failed', 'Ungültige Antwort vom Server.')
  }
  return body.url
}

/**
 * Delete a pending (un-sent) attachment. Refuses if the file has
 * already been linked to a sent message.
 */
export async function deletePendingFile(fileId: string): Promise<void> {
  const env = await resolveEdgeEnv('delete-file')

  const response = await fetch(env.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.anonKey,
      Authorization: `Bearer ${env.accessToken}`,
    },
    body: JSON.stringify({ fileId }),
  })

  if (!response.ok) {
    const body = await safeJson(response)
    throw new UploadError(
      'persistence_failed',
      body?.error?.message ?? `Delete fehlgeschlagen (${response.status})`,
    )
  }
}

/**
 * Link uploaded files to the user message that just got persisted.
 * Called from useChatTurn.onSuccess after we know the user message id
 * (via client_request_id lookup).
 */
export async function linkFilesToMessage(args: {
  fileIds: string[]
  messageId: string
}): Promise<void> {
  if (args.fileIds.length === 0) return
  const { error } = await supabase
    .from('project_files')
    .update({ message_id: args.messageId })
    .in('id', args.fileIds)
    .is('message_id', null)
  if (error) {
    // Non-fatal — the file still exists, just without the link. Log in
    // DEV for diagnostic purposes; the audit trail still has the rows.
    if (import.meta.env.DEV) {
      console.warn('[uploadApi] linkFilesToMessage failed:', error.message)
    }
  }
}

/**
 * Look up the persisted user message id by clientRequestId. Used after
 * chat-turn returns to bind project_files to the correct row.
 */
export async function fetchPersistedUserMessageId(args: {
  projectId: string
  clientRequestId: string
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('messages')
    .select('id')
    .eq('project_id', args.projectId)
    .eq('client_request_id', args.clientRequestId)
    .eq('role', 'user')
    .maybeSingle()
  if (error) {
    if (import.meta.env.DEV) {
      console.warn('[uploadApi] fetchPersistedUserMessageId failed:', error.message)
    }
    return null
  }
  return data?.id ?? null
}

/**
 * Phase 4.1.9 — batched: list ALL project_files rows for a project in
 * a single REST call. Replaces the prior per-message fetch which was
 * firing N+1 queries (one per user message) and storming Supabase
 * with 30+ requests on every chat workspace mount. Filtering by
 * project_id matches the RLS policy's gate exactly (`projects.owner_id
 * = auth.uid()`), eliminating the cross-project filter scan that the
 * per-message variant required. MessageAttachment consumes this via
 * `useProjectAttachments` and filters client-side by message_id,
 * sharing the TanStack cache across all message instances.
 */
export async function fetchProjectAttachments(
  projectId: string,
): Promise<ProjectFileRow[]> {
  if (!projectId) return []
  const { data, error } = await supabase
    .from('project_files')
    .select('*')
    .eq('project_id', projectId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: true })
  if (error) {
    if (import.meta.env.DEV) {
      console.warn('[uploadApi] fetchProjectAttachments failed:', error.message)
    }
    return []
  }
  return (data ?? []) as ProjectFileRow[]
}

// ── Edge Function env helper ───────────────────────────────────────────

interface EdgeEnv {
  url: string
  anonKey: string
  accessToken: string
}

async function resolveEdgeEnv(name: string): Promise<EdgeEnv> {
  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData.session
  if (!session?.access_token) {
    throw new UploadError('unauthenticated', 'Keine aktive Sitzung.')
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!supabaseUrl || !anonKey) {
    throw new UploadError(
      'persistence_failed',
      'Supabase env vars missing — check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY',
    )
  }
  return {
    url: `${supabaseUrl}/functions/v1/${name}`,
    anonKey,
    accessToken: session.access_token,
  }
}

async function safeJson(res: Response): Promise<{ error?: { message?: string } } | null> {
  try {
    return await res.json()
  } catch {
    return null
  }
}
