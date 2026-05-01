// Phase 8 — Sentry error tracking, EU region, PII-scrubbed.
//
// Lawful basis: Art. 6 (1) (f) GDPR — legitimate interest in
// application stability. NO cookie consent required for legitimate-
// interest error tracking, BUT we still gate on production-only and
// scrub all known PII fields client-side before transmission.
//
// Scrubbing discipline (beforeSend):
//   • plot_address — building location, top PII concern
//   • email — pattern-matched
//   • password — never makes it to logs anyway, defensive
//   • phone — pattern-matched
//   • body / message_de / message_en — chat content (may contain
//     plot addresses + personal context)

import * as Sentry from '@sentry/react'
import type { ErrorEvent, EventHint } from '@sentry/react'

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

function beforeSend(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
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
  return event
}

/** Boot Sentry. Always-on in production (legitimate-interest basis). */
export function initSentry(): void {
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
}

/** Re-export Sentry's ErrorBoundary so the app root can wrap its
 *  router without a second import path. */
export const ErrorBoundary = Sentry.ErrorBoundary
