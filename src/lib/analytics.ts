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

// ─── Allowlisted event capture ──────────────────────────────────────────

/** Subset of events explicitly tracked. Adding events requires editing
 *  this enum + the docs/launch-checklist.md analytics section. */
export type AnalyticsEvent =
  | 'landing_viewed'
  | 'wizard_q1_completed'
  | 'wizard_q2_completed'
  | 'project_created'
  | 'chat_turn_completed'
  | 'result_viewed'
  | 'legal_page_viewed'

interface EventProps {
  intent?: string // wizard_q1_completed
  hasPlot?: boolean // wizard_q2_completed
  templateId?: string // project_created
  turnCount?: number // chat_turn_completed
  page?: string // legal_page_viewed
}

/** Allowlisted capture. Anything outside EventProps is ignored. */
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

// ─── Helpers ────────────────────────────────────────────────────────────

function sanitisePath(pathname: string): string {
  return pathname
    .replace(/\/projects\/[0-9a-f-]{36}(\/[a-z]+)?/i, '/projects/:id$1')
    .replace(/\/result\/share\/[A-Za-z0-9]+/, '/result/share/:token')
}
