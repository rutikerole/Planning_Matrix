// Phase 7.5 — useSpineMobile.
//
// Returns true on viewports < 1024 px. The Spine collapses to
// SpineMobileTrigger + a vaul left drawer at this breakpoint. Tablet
// (640–1023) and mobile (<640) share one code path — same drawer
// pattern, no third layout.

import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 1023.98px)'

function subscribe(cb: () => void) {
  if (typeof window === 'undefined') return () => {}
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', cb)
  return () => mql.removeEventListener('change', cb)
}

function getSnapshot() {
  return typeof window !== 'undefined' && window.matchMedia(QUERY).matches
}

function getServerSnapshot() {
  // Default to non-mobile so server-rendered HTML doesn't ship the
  // drawer trigger on a desktop user's first paint.
  return false
}

export function useSpineMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
