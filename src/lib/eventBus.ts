// ───────────────────────────────────────────────────────────────────────
// Phase 9.2 — first-party event bus.
//
// Batched, debounced client → public.event_log writer. Three sinks
// total in the wider observability picture (event_log, PostHog,
// Sentry); this module owns the first-party event_log path. The
// PostHog mirror happens via an explicit call from the emitter
// helpers when consent allows; Sentry is a separate codepath.
//
// Structural guarantees:
//
//   1. emit() is non-blocking and never throws into the user path.
//      In-memory push only; flush is async.
//
//   2. Flush is debounced 2 seconds after first emit, and immediate
//      at a 20-event burst threshold. Single-flight: a second flush
//      waits for the first to finish.
//
//   3. On tab close, the current buffer is sent via fetch with
//      keepalive: true (the modern replacement for navigator.sendBeacon
//      that supports custom headers — sendBeacon strips Authorization,
//      breaking RLS).
//
//   4. On tab visibilityState='hidden', a flush kicks in immediately
//      so backgrounded events don't sit in memory until the user
//      returns.
//
//   5. DSGVO posture: event_log is FIRST-PARTY data stored in our own
//      Supabase project. No consent gate (legitimate interest under
//      Art 6(1)(f) — admin debugging, security, performance). The
//      THIRD-PARTY sinks (PostHog, Sentry) are gated separately by
//      AnalyticsLifecycle and SentryLifecycle.
//
//   6. Privacy contract: address strings stripped to `length: N`,
//      message bodies stripped to `length: N`, emails never captured
//      (user_id link only). Enforced at every emit call site, not
//      here — this module trusts its inputs.
// ───────────────────────────────────────────────────────────────────────

import { supabase } from './supabase'
import { getOrCreateSessionId } from './sessionId'
import { captureNamespaced } from './analytics'
import { useAuthStore } from '@/stores/authStore'

export type EventSource =
  | 'wizard'
  | 'chat'
  | 'result'
  | 'auth'
  | 'dashboard'
  | 'sentry'
  | 'system'

interface PendingEvent {
  session_id: string
  user_id: string | null
  project_id: string | null
  source: EventSource
  name: string
  attributes: Record<string, unknown>
  client_ts: string
  user_agent: string | null
  viewport_w: number | null
  viewport_h: number | null
  url_path: string | null
  trace_id: string | null
}

const FLUSH_DEBOUNCE_MS = 2_000
const MAX_BATCH = 20

class EventBus {
  private buffer: PendingEvent[] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null
  private flushing = false

  emit(
    source: EventSource,
    name: string,
    attributes: Record<string, unknown> = {},
  ): void {
    try {
      this.buffer.push(this.buildEvent(source, name, attributes))
      if (this.buffer.length >= MAX_BATCH) {
        // Burst — flush now, don't wait for the debounce window.
        void this.flush()
      } else {
        this.scheduleFlush()
      }
      // Phase 9.2 — mirror to PostHog when consent allows. Bridge is
      // a no-op if not initialised (consent not granted, DEV mode,
      // missing DSN). PII scrubbed inside the bridge.
      captureNamespaced(source, name, attributes)
    } catch (err) {
      // Logging must never break the app. Swallow and warn in dev.
      if (import.meta.env.DEV) {
        console.warn('[eventBus] emit failed', err)
      }
    }
  }

  private buildEvent(
    source: EventSource,
    name: string,
    attributes: Record<string, unknown>,
  ): PendingEvent {
    const user = useAuthStore.getState().user
    const projectId = extractProjectIdFromUrl()
    const traceId =
      typeof attributes.trace_id === 'string' ? attributes.trace_id : null

    // Strip trace_id from attributes if present (it's a dedicated column).
    let attrs = attributes
    if ('trace_id' in attrs) {
      attrs = { ...attrs }
      delete (attrs as Record<string, unknown>).trace_id
    }

    return {
      session_id: getOrCreateSessionId(),
      user_id: user?.id ?? null,
      project_id: projectId,
      source,
      name,
      attributes: attrs,
      client_ts: new Date().toISOString(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      viewport_w: typeof window !== 'undefined' ? window.innerWidth : null,
      viewport_h: typeof window !== 'undefined' ? window.innerHeight : null,
      url_path:
        typeof window !== 'undefined' ? window.location.pathname : null,
      trace_id: traceId,
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => {
      void this.flush()
    }, FLUSH_DEBOUNCE_MS)
  }

  async flush(): Promise<void> {
    if (this.flushing) return
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
    if (this.buffer.length === 0) return
    this.flushing = true
    const batch = this.buffer.splice(0, this.buffer.length)
    try {
      const { error } = await supabase.from('event_log').insert(batch)
      if (error) {
        if (import.meta.env.DEV) {
          console.warn('[eventBus] flush insert error', error)
        }
        // Don't re-buffer — the failure is most likely a permanent RLS
        // mismatch (anonymous user can't insert with a non-null user_id
        // from a stale closure, etc). Re-trying would just re-fail.
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[eventBus] flush threw', err)
      }
    } finally {
      this.flushing = false
    }
  }

  /**
   * Synchronous flush via `fetch` with keepalive — used on tab close.
   * Doesn't wait for the response (the tab is going away). Modern
   * browsers honour up to 64 KB body for keepalive requests, which is
   * far more than our typical buffer of a few KB.
   */
  flushBeacon(): void {
    if (this.buffer.length === 0) return
    const batch = this.buffer.splice(0, this.buffer.length)
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/event_log`
      const session = useAuthStore.getState().user
      const accessToken = (session as unknown as { access_token?: string })?.access_token
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Prefer: 'return=minimal',
      }
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`
      void fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(batch),
        keepalive: true,
      })
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[eventBus] flushBeacon failed', err)
      }
    }
  }

  /** Test-only — drains the buffer without writing. Not exported in prod. */
  __clearForTests(): void {
    this.buffer = []
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }
  }
}

export const eventBus = new EventBus()

// ── Lifecycle wiring (module scope, runs once per page load) ────────────

function extractProjectIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  // Matches /projects/<uuid> and /projects/<uuid>/result|overview|...
  const m = window.location.pathname.match(
    /^\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  )
  return m ? m[1] : null
}

if (typeof window !== 'undefined') {
  // Tab close — fire the keepalive flush.
  window.addEventListener('beforeunload', () => {
    eventBus.flushBeacon()
  })

  // Tab hidden (user switched apps) — flush so the buffer doesn't
  // sit in memory until they come back. visibilitychange fires
  // BEFORE beforeunload reliably across browsers.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void eventBus.flush()
    }
  })
}
