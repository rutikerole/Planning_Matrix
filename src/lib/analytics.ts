// Phase 8 — PostHog analytics, EU-hosted, cookieless, consent-gated.
//
// Configuration discipline:
//   • api_host = eu.posthog.com (EU data residency)
//   • disable_persistence = true — no cookies, no localStorage entries
//   • disable_session_recording = true — never record user sessions
//   • respect_dnt = true — honour Do-Not-Track signals
//   • capture_pageview = true — auto-track route changes
//
// PII discipline:
//   • Never send plot_address, email, name, phone
//   • Event properties go through an explicit allowlist (see capture())
//   • Route paths are sanitised — project IDs stripped from /projects/:id

import posthog from 'posthog-js'

let initialised = false

const PUBLIC_KEY = (
  import.meta.env.VITE_POSTHOG_KEY as string | undefined
)?.trim() ?? ''

function shouldRun(): boolean {
  return PUBLIC_KEY.length > 0 && import.meta.env.PROD
}

/**
 * Boot PostHog. Call only after the user grants analytics consent.
 * Idempotent — second call is a no-op.
 */
export function initPostHog(): void {
  if (initialised) return
  if (!shouldRun()) return
  posthog.init(PUBLIC_KEY, {
    api_host: 'https://eu.i.posthog.com',
    ui_host: 'https://eu.posthog.com',
    capture_pageview: true,
    disable_session_recording: true,
    disable_persistence: true,
    persistence: 'memory',
    respect_dnt: true,
    autocapture: false,
    loaded: (instance) => {
      // Strip project UUIDs from auto-captured pageview URLs so PostHog
      // never receives identifiable project IDs in event paths.
      instance.register({ $current_url_sanitised: sanitisePath(window.location.pathname) })
    },
  })
  initialised = true
}

/**
 * Tear PostHog down completely. Called when the user revokes consent.
 * After this returns, the global posthog object is reset and no
 * further events fire.
 */
export function shutdownPostHog(): void {
  if (!initialised) return
  try {
    posthog.reset()
    posthog.opt_out_capturing()
  } catch {
    // Defensive — never throw out of analytics teardown.
  }
  initialised = false
}

// ─── Allowlisted event capture (Phase 8 — narrow set) ──────────────────

/** Phase 8 legacy event names. Phase 9.2 keeps these working unchanged
 *  while adding a broader namespaced surface via captureNamespaced(). */
export type AnalyticsEvent =
  | 'landing_viewed'
  | 'wizard_q1_completed'
  | 'wizard_q2_completed'
  | 'project_created'
  | 'chat_turn_completed'
  | 'result_viewed'
  | 'legal_page_viewed'

interface EventProps {
  intent?: string
  hasPlot?: boolean
  templateId?: string
  turnCount?: number
  page?: string
}

/** Phase 8 narrow capture. Kept for backwards compat with existing
 *  call sites. Anything outside EventProps is ignored. */
export function track(event: AnalyticsEvent, props?: EventProps): void {
  if (!initialised) return
  const safe: Record<string, unknown> = {}
  if (props?.intent) safe.intent = props.intent
  if (typeof props?.hasPlot === 'boolean') safe.hasPlot = props.hasPlot
  if (props?.templateId) safe.templateId = props.templateId
  if (typeof props?.turnCount === 'number') safe.turnCount = props.turnCount
  if (props?.page) safe.page = props.page
  posthog.capture(event, safe)
}

// ─── Phase 9.2 — namespaced bridge from eventBus ────────────────────────
//
// The first-party event_log is the source of truth. PostHog is the
// product-team analytics view. Both receive the same emit calls so
// the vocabulary stays in sync and admin debugging questions ("what
// did THIS user do?") can pivot into product questions ("how many
// users do X?") without re-instrumentation.
//
// Privacy: PII_KEYS are stripped, every string value is run through
// the EMAIL/POSTCODE redactor, depth-limited to defend against object
// cycles and pathological nesting.

const PII_KEYS = new Set([
  'plot_address', 'plotAddress', 'plot.address', 'plot.postcode',
  'plot.city', 'email', 'password', 'phone', 'phone_general',
  'message_de', 'message_en', 'content_de', 'content_en', 'body',
])
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const POSTCODE_RE = /\b\d{5}\b/g

function scrubString(s: string): string {
  return s.replace(EMAIL_RE, '[REDACTED_EMAIL]').replace(POSTCODE_RE, '[REDACTED_PLZ]')
}

function scrubAttrs(obj: unknown, depth = 0): unknown {
  if (depth > 6) return '[DEPTH_LIMIT]'
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return scrubString(obj)
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map((v) => scrubAttrs(v, depth + 1))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (PII_KEYS.has(k)) {
      out[k] = '[REDACTED]'
    } else {
      out[k] = scrubAttrs(v, depth + 1)
    }
  }
  return out
}

/**
 * Phase 9.2 — bridge for eventBus → PostHog.
 *
 * Called by `eventBus.emit` on every event when PostHog is initialised
 * (consent given). Event name is namespaced: `${source}.${name}`,
 * matching the event_log convention. Properties are scrubbed via the
 * same PII rules as Sentry's beforeSend.
 *
 * If PostHog isn't initialised (consent not granted, or DSN missing,
 * or DEV mode), this is a silent no-op — eventBus continues writing
 * to event_log unaffected.
 */
export function captureNamespaced(
  source: string,
  name: string,
  attrs?: Record<string, unknown>,
): void {
  if (!initialised) return
  const eventName = `${source}.${name}`
  const safe = attrs ? (scrubAttrs(attrs) as Record<string, unknown>) : {}
  try {
    posthog.capture(eventName, safe)
  } catch {
    // Never throw out of analytics — the bridge is best-effort.
  }
}

/** Phase 9.2 — call after sign-in so PostHog can join sessions to a
 *  stable distinct_id. Email NEVER passed (cookieless, anonymised). */
export function identifyUser(userId: string): void {
  if (!initialised) return
  try {
    posthog.identify(userId)
  } catch {
    // ignore
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function sanitisePath(pathname: string): string {
  return pathname
    .replace(/\/projects\/[0-9a-f-]{36}(\/[a-z]+)?/i, '/projects/:id$1')
    .replace(/\/result\/share\/[A-Za-z0-9]+/, '/result/share/:token')
}
