/**
 * Phase 3.5 #65 — client wrappers for the share-token Edge Functions.
 *
 *   • createShareToken — auth-required POST that returns a 30-day
 *     public URL the owner can copy/paste/email.
 *   • getSharedProject — anon GET (POST really; we keep semantic
 *     parity with create-share-token) that the public share view
 *     calls to fetch project + messages + events by token.
 *   • revokeShareToken — direct supabase update from the owner's
 *     client; RLS gates to created_by = auth.uid().
 */

import { supabase } from '@/lib/supabase'
import type { MessageRow, ProjectRow } from '@/types/db'

interface ProjectEventRow {
  id: string
  project_id: string
  event_type: string
  before_state?: unknown
  after_state?: unknown
  reason?: string | null
  triggered_by: 'user' | 'assistant' | 'system'
  created_at: string
}

export interface CreateShareTokenResult {
  token: string
  url: string
  expiresAt: string
}

export interface SharedProjectPayload {
  project: ProjectRow
  messages: MessageRow[]
  events: ProjectEventRow[]
  expiresAt: string
}

function functionsBase(): { url: string; anonKey: string } {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase env vars missing')
  }
  return { url: `${supabaseUrl}/functions/v1`, anonKey }
}

export async function createShareToken(
  projectId: string,
): Promise<CreateShareTokenResult> {
  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData.session
  if (!session?.access_token) throw new Error('No active session')

  const { url, anonKey } = functionsBase()
  const response = await fetch(`${url}/create-share-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ projectId }),
  })
  const body = (await response.json()) as
    | { ok: true; token: string; url: string; expiresAt: string }
    | { ok: false; error: { code: string; message: string } }

  if (!body.ok) throw new Error(body.error.message)
  return { token: body.token, url: body.url, expiresAt: body.expiresAt }
}

export async function getSharedProject(
  token: string,
): Promise<SharedProjectPayload> {
  const { url, anonKey } = functionsBase()
  const response = await fetch(`${url}/get-shared-project`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({ token }),
  })
  const body = (await response.json()) as
    | { ok: true; project: ProjectRow; messages: MessageRow[]; events: ProjectEventRow[]; expiresAt: string }
    | { ok: false; error: { code: string; message: string } }

  if (!response.ok || !body.ok) {
    const msg = !body.ok ? body.error.message : `HTTP ${response.status}`
    throw new Error(msg)
  }
  return {
    project: body.project,
    messages: body.messages,
    events: body.events,
    expiresAt: body.expiresAt,
  }
}

/** Revoke a share token. RLS gates to the owner via created_by = auth.uid(). */
export async function revokeShareToken(token: string): Promise<void> {
  const { error } = await supabase
    .from('project_share_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token', token)
  if (error) throw error
}
