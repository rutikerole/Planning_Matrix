// ───────────────────────────────────────────────────────────────────────
// Phase 7 Move 10 — useFreshSet
//
// Tracks items that arrived AFTER the consumer first mounted with a
// non-empty list. Returns a Set of ids currently "fresh" — within
// FRESH_DURATION_MS of arrival. Each id has its own timer so a later
// addition doesn't clobber an earlier one's expiry.
//
// First-mount items are seeded as already-seen so the initial render
// of an existing thread doesn't visually "confetti" with every row
// flagged fresh.
//
// Used by Top3 (recommendation freshness) and EckdatenPanel (fact
// freshness) to render a 2 px clay edge bar that holds visible for
// 60 % of the 2.4 s window then fades to 0 (.pm-fresh-edge utility).
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'

const FRESH_DURATION_MS = 2400

export function useFreshSet<T>(
  items: T[],
  getId: (item: T) => string,
): Set<string> {
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const seenRef = useRef<Set<string> | null>(null)
  const timersRef = useRef<Map<string, number>>(new Map())

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (seenRef.current === null) {
      // First mount — register all current ids as already-seen, none
      // fresh. Subsequent additions diff against this baseline.
      seenRef.current = new Set(items.map(getId))
      return
    }
    const newIds: string[] = []
    for (const item of items) {
      const id = getId(item)
      if (!seenRef.current.has(id)) {
        seenRef.current.add(id)
        newIds.push(id)
      }
    }
    if (newIds.length === 0) return
    setFresh((prev) => {
      const next = new Set(prev)
      for (const id of newIds) next.add(id)
      return next
    })
    for (const id of newIds) {
      const timer = window.setTimeout(() => {
        setFresh((prev) => {
          if (!prev.has(id)) return prev
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        timersRef.current.delete(id)
      }, FRESH_DURATION_MS)
      timersRef.current.set(id, timer)
    }
  }, [items, getId])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Component unmount: clear all in-flight timers.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((t) => window.clearTimeout(t))
      timers.clear()
    }
  }, [])

  return fresh
}
