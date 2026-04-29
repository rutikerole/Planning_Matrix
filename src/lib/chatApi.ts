// ───────────────────────────────────────────────────────────────────────
// Planning Matrix — chat-turn client
//
// Thin wrapper around POST /functions/v1/chat-turn. Reads the active
// Supabase session, forwards the bearer token, validates the response
// envelope, and surfaces typed errors. In dev mode it logs request /
// response / costInfo to console.group so cache-write/read patterns are
// visible from DevTools (D13).
//
// Phase 3.4 #52: adds `postChatTurnStreaming` — same auth + body, but
// requests `Accept: text/event-stream` and parses the SSE response
// progressively, dispatching to caller-supplied handlers.
//
// Retry policy: NONE here. The SPA owns retry at the call-site.
// Idempotency via clientRequestId is what makes retry safe — same UUID,
// same persisted turn.
// ───────────────────────────────────────────────────────────────────────

import { supabase } from '@/lib/supabase'
import { TextFieldExtractor } from '@/lib/streamingExtractor'
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
  | 'streaming_failed'

export interface RateLimitInfo {
  currentCount: number
  maxCount: number
  resetAt: string
}

export class ChatTurnError extends Error {
  readonly code: ChatApiErrorCode
  readonly retryAfterMs: number | null
  readonly requestId: string | null
  readonly httpStatus: number
  /** Phase 4.1 #125 — populated when code === 'rate_limit_exceeded'. */
  readonly rateLimit: RateLimitInfo | null

  constructor(
    code: ChatApiErrorCode,
    retryAfterMs: number | null,
    requestId: string | null,
    httpStatus: number,
    message: string,
    rateLimit: RateLimitInfo | null = null,
  ) {
    super(message)
    this.name = 'ChatTurnError'
    this.code = code
    this.retryAfterMs = retryAfterMs
    this.requestId = requestId
    this.httpStatus = httpStatus
    this.rateLimit = rateLimit
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
  return {
    url: `${supabaseUrl}/functions/v1/chat-turn`,
    anonKey,
    accessToken: session.access_token,
  }
}

/**
 * POST a turn to the Edge Function (synchronous JSON envelope). Used
 * as the fallback path when streaming fails.
 */
export async function postChatTurn(
  request: ChatTurnRequest,
  signal?: AbortSignal,
): Promise<Extract<ChatTurnResponse, { ok: true }>> {
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
      body: JSON.stringify(request),
      signal,
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

  if (import.meta.env.DEV) {
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
  }

  if (!body.ok) {
    throw new ChatTurnError(
      body.error.code,
      body.error.retryAfterMs ?? null,
      body.error.requestId ?? null,
      response.status,
      body.error.message,
      body.error.rateLimit ?? null,
    )
  }

  return body
}

// ── Streaming variant ────────────────────────────────────────────────

export interface StreamingHandlers {
  /** Fired once per extracted text fragment from the model's tool input. */
  onTextDelta: (delta: string) => void
  /** Fired once when persistence completes. Resolves the mutation. */
  onComplete: (envelope: Extract<ChatTurnResponse, { ok: true }>) => void
  /** Fired when the stream errors. The mutation falls back to non-streaming. */
  onError: (err: ChatTurnError) => void
}

interface StreamCompleteFrame {
  type: 'complete'
  assistantMessage: Extract<ChatTurnResponse, { ok: true }>['assistantMessage']
  projectState: Extract<ChatTurnResponse, { ok: true }>['projectState']
  completionSignal: Extract<ChatTurnResponse, { ok: true }>['completionSignal']
  costInfo: Extract<ChatTurnResponse, { ok: true }>['costInfo']
  requestId?: string
}
interface StreamDeltaFrame {
  type: 'json_delta'
  partial: string
}
interface StreamErrorFrame {
  type: 'error'
  code: ChatTurnErrorCode | 'internal'
  message: string
  retryAfterMs?: number
  requestId?: string
}
type StreamFrame = StreamDeltaFrame | StreamCompleteFrame | StreamErrorFrame

/**
 * POST a turn with `Accept: text/event-stream` and parse SSE frames as
 * they arrive. Calls handlers per the streaming protocol documented in
 * supabase/functions/chat-turn/streaming.ts.
 *
 * The active locale (`'de'` or `'en'`) selects which message field we
 * extract from the tool input JSON.
 */
export async function postChatTurnStreaming(
  request: ChatTurnRequest,
  lang: 'de' | 'en',
  handlers: StreamingHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let env: RequestEnv
  try {
    env = await resolveEnv()
  } catch (err) {
    handlers.onError(
      err instanceof ChatTurnError
        ? err
        : new ChatTurnError(
            'no_session',
            null,
            null,
            401,
            err instanceof Error ? err.message : String(err),
          ),
    )
    return
  }

  let response: Response
  try {
    response = await fetch(env.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        apikey: env.anonKey,
        Authorization: `Bearer ${env.accessToken}`,
      },
      body: JSON.stringify(request),
      signal,
    })
  } catch (err) {
    handlers.onError(
      new ChatTurnError(
        'network',
        null,
        null,
        0,
        err instanceof Error ? err.message : 'Network error reaching chat-turn',
      ),
    )
    return
  }

  // Hot-fix (post-Phase-1) — guarantee exactly one of onComplete /
  // onError fires, no matter how the response arrives. Prior shape
  // hung the bubble forever when (a) the response was non-SSE
  // (proxy stripped Accept, function took the JSON branch), or
  // (b) the SSE stream closed without ever delivering a `complete`
  // or `error` frame. The Promise wrapper in useChatTurn.ts:88
  // had no settle path in those cases — the streaming bubble stayed
  // open, the persisted assistant message never landed in the
  // messages cache, and only a page refresh (which re-fetches via
  // useMessages) revealed the answer.
  //
  // Two guards:
  //   1. wrap the caller's onComplete / onError so the local
  //      `settled` flag flips on either path.
  //   2. after the read loop returns done:true, if !settled, treat
  //      the buffered text as a non-streaming JSON envelope and
  //      synthesize the matching settle call. Same handling for
  //      a non-SSE Content-Type at the start.
  let settled = false
  const wrappedHandlers: StreamingHandlers = {
    onTextDelta: handlers.onTextDelta,
    onComplete: (env) => {
      if (settled) return
      settled = true
      handlers.onComplete(env)
    },
    onError: (err) => {
      if (settled) return
      settled = true
      handlers.onError(err)
    },
  }

  const settleFromJsonBody = (raw: string, status: number) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      wrappedHandlers.onError(
        new ChatTurnError(
          'streaming_failed',
          null,
          null,
          status,
          'Stream ended without a complete or error frame and the response body was empty.',
        ),
      )
      return
    }
    let body: ChatTurnResponse
    try {
      body = JSON.parse(trimmed) as ChatTurnResponse
    } catch {
      wrappedHandlers.onError(
        new ChatTurnError(
          'malformed_response',
          null,
          null,
          status,
          'Stream ended without a complete frame and the body was not parsable JSON.',
        ),
      )
      return
    }
    if (body.ok) {
      wrappedHandlers.onComplete({
        ok: true,
        assistantMessage: body.assistantMessage,
        projectState: body.projectState,
        completionSignal: body.completionSignal,
        costInfo: body.costInfo,
      })
    } else {
      wrappedHandlers.onError(
        new ChatTurnError(
          body.error.code,
          body.error.retryAfterMs ?? null,
          body.error.requestId ?? null,
          status,
          body.error.message,
          body.error.rateLimit ?? null,
        ),
      )
    }
  }

  if (!response.ok || !response.body) {
    // Phase 4.1 #125 — when the function rejected the request before
    // reaching the SSE phase (rate-limit, auth, validation), it sent a
    // structured JSON error envelope. Parse it so the UI gets the
    // proper code + rateLimit info instead of a generic streaming_failed.
    let parsedError: ChatTurnError | null = null
    try {
      const body = (await response.json()) as ChatTurnResponse
      if (!body.ok) {
        parsedError = new ChatTurnError(
          body.error.code,
          body.error.retryAfterMs ?? null,
          body.error.requestId ?? null,
          response.status,
          body.error.message,
          body.error.rateLimit ?? null,
        )
      }
    } catch {
      /* fall through to the generic streaming_failed envelope below */
    }
    wrappedHandlers.onError(
      parsedError ??
        new ChatTurnError(
          'streaming_failed',
          null,
          null,
          response.status,
          `Streaming endpoint returned HTTP ${response.status}`,
        ),
    )
    return
  }

  // Hot-fix guard #1 — Content-Type check. If a proxy stripped the
  // Accept header (or the function took the non-streaming branch
  // for any other reason), the response will be application/json.
  // Read the body as a single envelope and settle deterministically.
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/event-stream')) {
    if (import.meta.env.DEV) {
      console.warn(
        `[chat-turn] streaming endpoint returned non-SSE content-type "${contentType}"; reading as JSON envelope.`,
      )
    }
    const raw = await response.text()
    settleFromJsonBody(raw, response.status)
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  const extractor = new TextFieldExtractor(lang === 'en' ? 'message_en' : 'message_de')
  let sseBuffer = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      sseBuffer += decoder.decode(value, { stream: true })

      // Each SSE event ends with `\n\n`. Pull complete events out of
      // the buffer and process them; leave any partial trailing event.
      let idx: number
      while ((idx = sseBuffer.indexOf('\n\n')) !== -1) {
        const eventBlock = sseBuffer.slice(0, idx)
        sseBuffer = sseBuffer.slice(idx + 2)
        const dataLines = eventBlock
          .split('\n')
          .filter((l) => l.startsWith('data: '))
          .map((l) => l.slice(6))
        if (dataLines.length === 0) continue
        const payload = dataLines.join('\n')
        let frame: StreamFrame
        try {
          frame = JSON.parse(payload) as StreamFrame
        } catch {
          continue
        }
        handleFrame(frame)
      }
    }
  } catch (err) {
    wrappedHandlers.onError(
      new ChatTurnError(
        'streaming_failed',
        null,
        null,
        0,
        err instanceof Error ? err.message : 'Streaming read error',
      ),
    )
    return
  }

  // Hot-fix guard #2 — read loop exited cleanly (done:true). If we
  // reached this point without onComplete / onError firing, no
  // recognised SSE frame was ever delivered. The body might still
  // contain a non-streaming JSON envelope (some CDNs buffer SSE and
  // flush at close, with the raw buffered bytes resembling a JSON
  // body); try to parse it. Otherwise surface streaming_failed so
  // useChatTurn's fallback path takes over.
  if (!settled) {
    if (import.meta.env.DEV) {
      console.warn(
        '[chat-turn] streaming response closed without a complete/error frame — attempting JSON-envelope fallback.',
      )
    }
    settleFromJsonBody(sseBuffer, response.status)
  }

  function handleFrame(frame: StreamFrame) {
    if (frame.type === 'json_delta') {
      const text = extractor.feed(frame.partial)
      if (text.length > 0) handlers.onTextDelta(text)
    } else if (frame.type === 'complete') {
      if (import.meta.env.DEV) {
        console.group('%cchat-turn ← STREAM complete', 'color:#7a5232')
        console.info('request', request)
        console.info('costInfo', frame.costInfo)
        console.info('cacheWriteTokens', frame.costInfo.cacheWriteTokens)
        console.info('cacheReadTokens', frame.costInfo.cacheReadTokens)
        console.info('latencyMs', frame.costInfo.latencyMs)
        console.groupEnd()
      }
      wrappedHandlers.onComplete({
        ok: true,
        assistantMessage: frame.assistantMessage,
        projectState: frame.projectState,
        completionSignal: frame.completionSignal,
        costInfo: frame.costInfo,
      })
    } else if (frame.type === 'error') {
      wrappedHandlers.onError(
        new ChatTurnError(
          // Cast — server emits a known set of codes, fall back to internal.
          (frame.code as ChatApiErrorCode) ?? 'streaming_failed',
          frame.retryAfterMs ?? null,
          frame.requestId ?? null,
          0,
          frame.message,
        ),
      )
    }
  }
}
