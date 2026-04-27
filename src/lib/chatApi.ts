// ───────────────────────────────────────────────────────────────────────
// Planning Matrix — chat-turn client
//
// Thin wrapper around POST /functions/v1/chat-turn. Reads the active
// Supabase session, forwards the bearer token, validates the response
// envelope, and surfaces typed errors. In dev mode it logs request /
// response / costInfo to console.group so cache-write/read patterns are
// visible from DevTools (D13).
//
// Retry policy: NONE here. The SPA owns retry at the call-site (the
// chat workspace decides when to retry priming, the input bar decides
// when to back off after 429). Idempotency via clientRequestId is what
// makes retry safe — same UUID, same persisted turn.
// ───────────────────────────────────────────────────────────────────────

import { supabase } from '@/lib/supabase'
import type {
  ChatTurnRequest,
  ChatTurnResponse,
  ChatTurnErrorCode,
} from '@/types/chatTurn'

export type ChatApiErrorCode =
  | ChatTurnErrorCode
  | 'no_session'
  | 'malformed_response'
  | 'network'

export class ChatTurnError extends Error {
  readonly code: ChatApiErrorCode
  readonly retryAfterMs: number | null
  readonly requestId: string | null
  readonly httpStatus: number

  constructor(
    code: ChatApiErrorCode,
    retryAfterMs: number | null,
    requestId: string | null,
    httpStatus: number,
    message: string,
  ) {
    super(message)
    this.name = 'ChatTurnError'
    this.code = code
    this.retryAfterMs = retryAfterMs
    this.requestId = requestId
    this.httpStatus = httpStatus
  }
}

/**
 * POST a turn to the Edge Function. Throws ChatTurnError on any failure
 * mode (no session, network, non-2xx with error envelope, malformed
 * body). Returns the success body shape on 2xx.
 */
export async function postChatTurn(
  request: ChatTurnRequest,
): Promise<Extract<ChatTurnResponse, { ok: true }>> {
  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData.session
  if (!session?.access_token) {
    throw new ChatTurnError('no_session', null, null, 401, 'No active Supabase session')
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!supabaseUrl || !anonKey) {
    throw new ChatTurnError(
      'no_session',
      null,
      null,
      0,
      'Supabase env vars missing — check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY',
    )
  }

  const url = `${supabaseUrl}/functions/v1/chat-turn`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(request),
    })
  } catch (err) {
    throw new ChatTurnError(
      'network',
      null,
      null,
      0,
      err instanceof Error ? err.message : 'Network error reaching chat-turn',
    )
  }

  let body: ChatTurnResponse
  try {
    body = (await response.json()) as ChatTurnResponse
  } catch {
    throw new ChatTurnError(
      'malformed_response',
      null,
      null,
      response.status,
      'Edge Function returned non-JSON body',
    )
  }

  // D13 — DEV-mode visibility into cache-write/read pattern. Verify
  // first call shows cacheWriteTokens > 0; second call within 5 min
  // should show cacheWriteTokens=0 and cacheReadTokens > 0.
  if (import.meta.env.DEV) {
    /* eslint-disable no-console */
    console.group(`%cchat-turn ← HTTP ${response.status}`, 'color:#7a5232')
    console.info('request', request)
    console.info('response', body)
    if (body.ok) {
      console.info('costInfo', body.costInfo)
      console.info('cacheWriteTokens', body.costInfo.cacheWriteTokens)
      console.info('cacheReadTokens', body.costInfo.cacheReadTokens)
      console.info('latencyMs', body.costInfo.latencyMs)
    }
    console.groupEnd()
    /* eslint-enable no-console */
  }

  if (!body.ok) {
    throw new ChatTurnError(
      body.error.code,
      body.error.retryAfterMs ?? null,
      body.error.requestId ?? null,
      response.status,
      body.error.message,
    )
  }

  return body
}
