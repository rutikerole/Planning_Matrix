import type { ProjectState } from '@/types/projectState'

interface ProjectEventRow {
  id: string
  created_at: string
  triggered_by: string
  event_type: string
  reason?: string | null
}

export interface LastViewedDiff {
  /** True when this is a first visit (no prior timestamp). */
  isFirstView: boolean
  /** Events emitted after lastViewedAt. Sorted oldest-first. */
  events: ProjectEventRow[]
  /** Counts for the pill summary. */
  counts: {
    factsAdded: number
    factsUpgraded: number
    proceduresAdded: number
    recommendationsAdded: number
  }
  /** Relative time label since last view, locale-aware. Empty when first. */
  relativeLabel: string
}

interface Args {
  state: Partial<ProjectState>
  events: ProjectEventRow[]
  lastViewedAt: string | null
  lang: 'de' | 'en'
}

/**
 * Phase 8.3 (C.1) — diff between current project state + audit events
 * and the user's last-view timestamp. Drives the Since-last-view pill
 * and modal.
 */
export function composeLastViewedDiff({
  state,
  events,
  lastViewedAt,
  lang,
}: Args): LastViewedDiff {
  if (!lastViewedAt) {
    return {
      isFirstView: true,
      events: [],
      counts: {
        factsAdded: 0,
        factsUpgraded: 0,
        proceduresAdded: 0,
        recommendationsAdded: 0,
      },
      relativeLabel: '',
    }
  }
  const since = new Date(lastViewedAt).getTime()
  const now = Date.now()

  const newer = events.filter(
    (e) => new Date(e.created_at).getTime() > since,
  )

  // Fact-level diff. Counts state.facts whose qualifier.setAt > since
  // (added) and where setAt > since AND quality upgraded from ASSUMED.
  const facts = state.facts ?? []
  let factsAdded = 0
  let factsUpgraded = 0
  for (const f of facts) {
    const setAt = f.qualifier?.setAt
    if (!setAt) continue
    const ts = new Date(setAt).getTime()
    if (ts <= since) continue
    if (f.qualifier?.quality === 'DECIDED' || f.qualifier?.quality === 'VERIFIED') {
      factsUpgraded += 1
    } else {
      factsAdded += 1
    }
  }

  // Procedures + recommendations: count event types as a proxy.
  const proceduresAdded = newer.filter(
    (e) => /procedure|verfahren/i.test(e.event_type),
  ).length
  const recommendationsAdded = newer.filter(
    (e) => /recommend|empfehlung/i.test(e.event_type),
  ).length

  return {
    isFirstView: false,
    events: newer.slice().reverse(),
    counts: {
      factsAdded,
      factsUpgraded,
      proceduresAdded,
      recommendationsAdded,
    },
    relativeLabel: formatRelative(now - since, lang),
  }
}

function formatRelative(deltaMs: number, lang: 'de' | 'en'): string {
  const sec = Math.floor(deltaMs / 1000)
  if (sec < 60) {
    return lang === 'en' ? 'just now' : 'gerade eben'
  }
  const min = Math.floor(sec / 60)
  if (min < 60) {
    return lang === 'en'
      ? `${min}m ago`
      : `vor ${min} Min.`
  }
  const hr = Math.floor(min / 60)
  if (hr < 24) {
    return lang === 'en' ? `${hr}h ago` : `vor ${hr} Std.`
  }
  const days = Math.floor(hr / 24)
  if (days < 30) {
    return lang === 'en'
      ? `${days} day${days === 1 ? '' : 's'} ago`
      : `vor ${days} Tag${days === 1 ? '' : 'en'}`
  }
  const months = Math.floor(days / 30)
  return lang === 'en'
    ? `${months}mo ago`
    : `vor ${months} Mon.`
}
