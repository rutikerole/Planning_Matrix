// ───────────────────────────────────────────────────────────────────────
// C7 (Bug 29) — owner-side client wrapper for the share-project Edge
// Function in CREATE mode (the architect MEMBERSHIP invite).
//
// This is the missing caller the ARCHITECT_FLOW_DEADEND_TRACE named: the
// only wired "share" path today is the read-only createShareToken
// (shareTokenApi.ts) — it does NOT grant verification rights. This
// wrapper hits share-project { action:'create' } → INSERT project_members
// {role_in_project:'designer'} → returns the /architect/accept?token=…
// URL the owner sends, which (after the architect signs in + accepts)
// unlocks the verify-fact write path.
//
// Mirrors shareTokenApi.ts's raw-fetch + Bearer convention (NOT
// supabase.functions.invoke — the codebase uses raw fetch in both
// shareTokenApi.ts:49 and verifyFactClient.ts:52). One deliberate
// deviation: `supabase` is imported lazily inside createArchitectInvite
// rather than at module top, so the pure parseInviteResponse mapper can
// be imported + unit-smoke-tested under tsx without the supabase module's
// unguarded import.meta.env read throwing.
// ───────────────────────────────────────────────────────────────────────

export interface ArchitectInvite {
  /** Full /architect/accept?token=… URL (server-built via PUBLIC_SITE_URL). */
  acceptUrl: string
  /** ISO timestamp, ~7 days out (project_members.expires_at, migration 0030). */
  expiresAt: string
  /** Raw invite UUID, for direct copy if the owner prefers. */
  inviteToken: string
}

export type ArchitectInviteErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'persistence_failed'
  | 'validation'
  | 'internal'

/** Typed error so the modal can branch on `.code` (e.g. forbidden → "not the owner"). */
export class ArchitectInviteError extends Error {
  readonly code: ArchitectInviteErrorCode
  constructor(code: ArchitectInviteErrorCode, message: string) {
    super(message)
    this.name = 'ArchitectInviteError'
    this.code = code
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

const KNOWN_CODES: ReadonlyArray<ArchitectInviteErrorCode> = [
  'unauthenticated',
  'forbidden',
  'not_found',
  'persistence_failed',
  'validation',
  'internal',
]

function normalizeCode(
  raw: string | undefined,
  status: number,
): ArchitectInviteErrorCode {
  if (raw && (KNOWN_CODES as ReadonlyArray<string>).includes(raw)) {
    return raw as ArchitectInviteErrorCode
  }
  // Fall back to HTTP-status mapping when the backend didn't label the code.
  if (status === 401) return 'unauthenticated'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'not_found'
  if (status === 400) return 'validation'
  return 'internal'
}

/**
 * Pure response → result mapper. share-project CREATE returns 201 with
 * { ok:true, inviteToken, expiresAt, acceptUrl, requestId } on success
 * (index.ts:259-271); any non-ok body carries { ok:false, error:{code,message} }.
 * Exported so the smoke test can assert the happy path + every error
 * branch without a live fetch / session. Throws ArchitectInviteError on
 * any failure.
 */
export function parseInviteResponse(status: number, body: unknown): ArchitectInvite {
  if (isRecord(body) && body.ok === true) {
    const { acceptUrl, expiresAt, inviteToken } = body
    if (
      typeof acceptUrl === 'string' &&
      typeof expiresAt === 'string' &&
      typeof inviteToken === 'string'
    ) {
      return { acceptUrl, expiresAt, inviteToken }
    }
    throw new ArchitectInviteError(
      'internal',
      'Malformed success response from share-project.',
    )
  }
  let rawCode: string | undefined
  let message: string | undefined
  if (isRecord(body) && body.ok === false && isRecord(body.error)) {
    if (typeof body.error.code === 'string') rawCode = body.error.code
    if (typeof body.error.message === 'string') message = body.error.message
  }
  throw new ArchitectInviteError(
    normalizeCode(rawCode, status),
    message ?? `Invite request failed (HTTP ${status}).`,
  )
}

function functionsBase(): { url: string; anonKey: string } {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!supabaseUrl || !anonKey) {
    throw new ArchitectInviteError('internal', 'Supabase env vars missing')
  }
  return { url: `${supabaseUrl}/functions/v1`, anonKey }
}

/**
 * Owner generates an architect verification invite. Returns the
 * /architect/accept?token=… URL + 7-day expiry. Throws
 * ArchitectInviteError (with .code) on auth / ownership / backend failure.
 */
export async function createArchitectInvite(
  projectId: string,
): Promise<ArchitectInvite> {
  // Lazy import so this module's top stays free of supabase.ts's
  // unguarded import.meta.env read (keeps parseInviteResponse testable).
  const { supabase } = await import('@/lib/supabase')
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) {
    throw new ArchitectInviteError('unauthenticated', 'No active session.')
  }

  const { url, anonKey } = functionsBase()
  const response = await fetch(`${url}/share-project`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: 'create', projectId }),
  })
  const body = (await response.json().catch(() => null)) as unknown
  return parseInviteResponse(response.status, body)
}
