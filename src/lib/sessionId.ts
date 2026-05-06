// ───────────────────────────────────────────────────────────────────────
// Phase 9.2 — per-tab session id for event_log correlation.
//
// sessionStorage NOT localStorage: a fresh tab gets a fresh session.
// Matches the user's mental model of "this is a new visit". The
// session_id sticks around for refreshes (sessionStorage survives
// reloads of the same tab) but resets when the tab closes.
//
// Falls back to a process-lifetime in-memory id when sessionStorage
// is unavailable (private browsing in some Safari versions, SSR).
// ───────────────────────────────────────────────────────────────────────

const KEY = 'pm.sessionId'

let memoryFallback: string | null = null

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    if (!memoryFallback) memoryFallback = crypto.randomUUID()
    return memoryFallback
  }
  try {
    let id = window.sessionStorage.getItem(KEY)
    if (!id) {
      id = crypto.randomUUID()
      window.sessionStorage.setItem(KEY, id)
    }
    return id
  } catch {
    // sessionStorage blocked or quota exceeded — fall through to memory
    if (!memoryFallback) memoryFallback = crypto.randomUUID()
    return memoryFallback
  }
}
