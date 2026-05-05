import { useEffect, useState } from 'react'

const KEY = (projectId: string) => `pm:last-viewed:${projectId}`

/**
 * Phase 8.3 (C.1) — localStorage-backed last-viewed timestamp.
 *
 * Reads on mount; writes on first effect run. Returns the PREVIOUS
 * last-viewed value (so the diff composer can compare current state
 * against it) and a `markViewed()` callback the workspace calls when
 * the user has demonstrably engaged (e.g. after 3 seconds on the page,
 * or on first tab-switch). v1 calls it automatically after a short
 * delay.
 */
export function useLastViewed(projectId: string) {
  const [lastViewedAt, setLastViewedAt] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      return window.localStorage.getItem(KEY(projectId))
    } catch {
      return null
    }
  })

  // Mark "viewed" after 3 seconds — long enough that returning users
  // see the diff against the last meaningful view.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const now = new Date().toISOString()
      try {
        window.localStorage.setItem(KEY(projectId), now)
      } catch {
        // incognito — fine
      }
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [projectId])

  const markViewed = () => {
    const now = new Date().toISOString()
    try {
      window.localStorage.setItem(KEY(projectId), now)
    } catch {
      // ignore
    }
    setLastViewedAt(now)
  }

  return { lastViewedAt, markViewed }
}
