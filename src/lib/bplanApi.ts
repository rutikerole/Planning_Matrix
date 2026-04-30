// Phase 6a — typed SPA wrapper for the bplan-lookup Edge Function.
//
// Mirrors src/lib/chatApi.ts conventions:
//   • reads the active Supabase session for the JWT
//   • forwards the bearer token + apikey
//   • surfaces typed errors with retry-after when 429
//   • zero retry policy — the call site decides
//
// The user's plot address is geocoded client-side (Nominatim, see
// src/features/wizard/components/PlotMap/geocode.ts); only the
// resolved lat/lng leave the SPA via this function. The address
// itself never reaches the WMS endpoint.

import { supabase } from '@/lib/supabase'
import type {
  BplanLookupResult,
  BplanLookupEnvelope,
  BplanLookupErrorEnvelope,
} from '@/types/bplan'

export class BplanLookupError extends Error {
  readonly code: string
  readonly httpStatus: number
  readonly requestId: string | null

  constructor(code: string, httpStatus: number, message: string, requestId: string | null) {
    super(message)
    this.name = 'BplanLookupError'
    this.code = code
    this.httpStatus = httpStatus
    this.requestId = requestId
  }
}

interface RequestEnv {
  url: string
  anonKey: string
  accessToken: string
}

async function resolveEnv(): Promise<RequestEnv> {
  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData.session
  if (!session?.access_token) {
    throw new BplanLookupError('no_session', 401, 'No active Supabase session', null)
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!supabaseUrl || !anonKey) {
    throw new BplanLookupError(
      'no_session',
      0,
      'Supabase env vars missing — check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY',
      null,
    )
  }
  return {
    url: `${supabaseUrl}/functions/v1/bplan-lookup`,
    anonKey,
    accessToken: session.access_token,
  }
}

export interface LookupArgs {
  lat: number
  lng: number
  signal?: AbortSignal
}

/**
 * POST coordinates to the bplan-lookup Edge Function. Resolves to the
 * BplanLookupResult on success; throws BplanLookupError on auth /
 * validation / rate-limit / network failure. WMS upstream errors do
 * NOT throw — they resolve to `{ status: 'upstream_error', ... }` so
 * the UI can render a calm fallback state without an exception.
 */
export async function lookupBplan({ lat, lng, signal }: LookupArgs): Promise<BplanLookupResult> {
  const env = await resolveEnv()

  let response: Response
  try {
    response = await fetch(env.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.anonKey,
        Authorization: `Bearer ${env.accessToken}`,
      },
      body: JSON.stringify({ lat, lng }),
      signal,
    })
  } catch (err) {
    throw new BplanLookupError(
      'network',
      0,
      err instanceof Error ? err.message : 'Network error reaching bplan-lookup',
      null,
    )
  }

  let body: BplanLookupEnvelope | BplanLookupErrorEnvelope
  try {
    body = (await response.json()) as BplanLookupEnvelope | BplanLookupErrorEnvelope
  } catch {
    throw new BplanLookupError(
      'malformed_response',
      response.status,
      'Edge Function returned non-JSON body',
      null,
    )
  }

  if (!body.ok) {
    throw new BplanLookupError(
      body.error.code,
      response.status,
      body.error.message,
      body.requestId ?? null,
    )
  }

  return body.result
}
