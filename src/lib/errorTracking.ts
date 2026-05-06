// Phase 9.2 update — Sentry error tracking, EU region, PII-scrubbed,
// CONSENT-GATED.
//
// Phase 8 ran Sentry under Art. 6 (1) (f) legitimate interest with no
// consent gate. The Phase 9.2 audit reclassified that to a DSGVO risk
// against conservative German guidance: even with PII scrubbing, the
// SDK transmits IP + user-agent + session metadata to a US company
// (Sentry, Inc.). The Phase 9.2 sweep moves init behind state.functional
// in the existing cookie consent contract. Reject = SDK never loaded.
//
// Init / shutdown is now driven by SentryLifecycle.tsx, which mirrors
// the AnalyticsLifecycle contract for PostHog. Calling initSentry()
// twice is a no-op; shutdownSentry() flushes and closes the client.
//
// Scrubbing discipline (beforeSend) unchanged from Phase 8:
//   • plot_address, email, password, phone, body, message_*, content_*
//   • EMAIL_RE / POSTCODE_RE on every string

import * as Sentry from '@sentry/react'
import type { ErrorEvent, EventHint } from '@sentry/react'
import { eventBus } from './eventBus'

const SENTRY_DSN = (
  import.meta.env.VITE_SENTRY_DSN as string | undefined
)?.trim() ?? ''

function shouldRun(): boolean {
  return SENTRY_DSN.length > 0 && import.meta.env.PROD
}

const PII_KEYS = new Set([
  'plot_address',
  'plotAddress',
  'plot.address',
  'plot.postcode',
  'plot.city',
  'email',
  'password',
  'phone',
  'phone_general',
  'message_de',
  'message_en',
  'content_de',
  'content_en',
  'body',
])

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const POSTCODE_RE = /\b\d{5}\b/g

function scrubString(s: string): string {
  return s.replace(EMAIL_RE, '[REDACTED_EMAIL]').replace(POSTCODE_RE, '[REDACTED_PLZ]')
}

function scrubObject(obj: unknown, depth = 0): unknown {
  if (depth > 6) return '[DEPTH_LIMIT]'
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return scrubString(obj)
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map((v) => scrubObject(v, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (PII_KEYS.has(k)) {
      out[k] = '[REDACTED]'
    } else {
      out[k] = scrubObject(v, depth + 1)
    }
  }
  return out
}

// Filter Sentry's known noise classes — these are not actionable and
// just consume quota.
const NOISE_PATTERNS: Array<RegExp> = [
  /ResizeObserver loop limit exceeded/,
  /ResizeObserver loop completed with undelivered notifications/,
  /Non-Error promise rejection captured/,
]

function beforeSend(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  // Drop noise before any other work.
  const message = event.message ?? event.exception?.values?.[0]?.value ?? ''
  if (NOISE_PATTERNS.some((re) => re.test(message))) return null

  if (event.request?.url) {
    event.request.url = scrubString(event.request.url)
  }
  if (event.contexts) {
    event.contexts = scrubObject(event.contexts) as ErrorEvent['contexts']
  }
  if (event.extra) {
    event.extra = scrubObject(event.extra) as ErrorEvent['extra']
  }
  if (event.tags) {
    event.tags = scrubObject(event.tags) as ErrorEvent['tags']
  }
  if (event.user) {
    // Drop email; keep id (uuid is not PII per DSGVO Art. 4).
    delete event.user.email
    delete event.user.username
    delete event.user.ip_address
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      message: b.message ? scrubString(b.message) : b.message,
      data: b.data ? (scrubObject(b.data) as typeof b.data) : b.data,
    }))
  }

  // Phase 9.2 — bridge to first-party event_log so admins see
  // errors inline in the inline logs drawer without leaving for
  // Sentry. event_log is first-party, not consent-gated.
  try {
    eventBus.emit('sentry', 'frontend.error', {
      sentry_event_id: event.event_id,
      level: event.level ?? 'error',
      message: typeof message === 'string' ? message.slice(0, 500) : null,
    })
  } catch {
    // Don't let the bridge break Sentry — the bus is best-effort.
  }
  return event
}

let initialized = false

/** Boot Sentry. Idempotent. SentryLifecycle.tsx calls this when
 *  consent allows; we no-op if SENTRY_DSN is empty or already up. */
export function initSentry(): void {
  if (initialized) return
  if (!shouldRun()) return
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    sendDefaultPii: false,
    beforeSend,
  })
  initialized = true
}

/** Phase 9.2 — flush + close the Sentry client when consent is
 *  withdrawn. After this, SDK-side network calls stop until
 *  initSentry is called again. */
export function shutdownSentry(): void {
  if (!initialized) return
  void Sentry.close(2000)
  initialized = false
}

/** Re-export Sentry's ErrorBoundary so the app root can wrap its
 *  router without a second import path. */
export const ErrorBoundary = Sentry.ErrorBoundary
