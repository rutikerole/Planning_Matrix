import { supabase } from '@/lib/supabase'

export type VerifyFactField =
  | 'extracted_fact'
  | 'recommendation'
  | 'procedure'
  | 'document'
  | 'role'

export interface VerifyFactRequest {
  projectId: string
  field: VerifyFactField
  itemId: string
  note?: string
}

export interface VerifyFactSuccess {
  ok: true
  projectId: string
  field: VerifyFactField
  itemId: string
  requestId: string
}

export interface VerifyFactFailure {
  ok: false
  error: { code: string; message: string }
  requestId: string
}

/**
 * Phase 13 Week 3 — SPA → Edge Function bridge for verify-fact.
 *
 * The architect clicks "Bestätigen" on a row in VerificationPanel;
 * this hits POST /functions/v1/verify-fact which authenticates the
 * caller, checks designer role + accepted membership, and flips the
 * targeted qualifier to DESIGNER+VERIFIED in projects.state.
 */
export async function verifyFact(
  req: VerifyFactRequest,
): Promise<VerifyFactSuccess | VerifyFactFailure> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) {
    return {
      ok: false,
      error: { code: 'unauthenticated', message: 'Not signed in.' },
      requestId: 'client',
    }
  }
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-fact`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(req),
  })
  const body = (await res.json().catch(() => null)) as
    | VerifyFactSuccess
    | VerifyFactFailure
    | null
  if (!body) {
    return {
      ok: false,
      error: { code: 'internal', message: `HTTP ${res.status}` },
      requestId: 'client',
    }
  }
  return body
}
