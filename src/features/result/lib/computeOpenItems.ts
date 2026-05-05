import type { ProjectState } from '@/types/projectState'
import { humanizeFact } from './humanizeFact'

export interface OpenItem {
  /** Stable id for routing (`?focus={id}`) and React keys. */
  id: string
  /** Human-readable label (1 line) — fact label or area name. */
  label: string
  /** What kind of follow-up: assumption fact, pending legal area, no-fact-yet. */
  kind: 'assumed_fact' | 'pending_area'
  /** Higher number = more urgent. Used for `topPriority` ordering. */
  priority: number
}

export interface OpenItems {
  all: OpenItem[]
  /** Top-N subset by priority. Default N = 4 to fit the action card. */
  topPriority: OpenItem[]
  /** all.length, exposed so consumers don't recompute. */
  count: number
}

/**
 * Phase 8.1 (A.2) — single source of truth for "open items needing
 * professional eyes." Both AtAGlance "Open questions" and ActionCards
 * "Verify with architect" consume this so the page can say
 * "top 4 of 6 open" instead of presenting two unrelated counts.
 *
 * Priority weighting (heuristic):
 *   - ASSUMED facts whose key prefixes a structural decision domain
 *     (PLANUNGSRECHT / BAUORDNUNG / STATUTE / PROCEDURE / GEBAEUDEKLASSE)
 *     score 3 — these gate downstream procedure / cost / role assignment.
 *   - Other ASSUMED facts score 2.
 *   - PENDING areas score 1 — broad-stroke unknowns.
 */
export function computeOpenItems(
  state: Partial<ProjectState>,
  lang: 'de' | 'en' = 'de',
  topN = 4,
): OpenItems {
  const facts = state.facts ?? []
  const areas = state.areas

  const items: OpenItem[] = []

  for (const f of facts) {
    if (f.qualifier?.quality !== 'ASSUMED') continue
    const key = f.key.toUpperCase()
    const isStructural =
      /(PLANUNGSRECHT|BAUORDNUNG|STATUTE|PROCEDURE|GEBAEUDEKLASSE|VERFAHREN|GEB_KLASSE|GK_)/.test(
        key,
      )
    // Phase 8.5 (C.4 + C.8): humanizeFact replaces the previous
    // f.evidence ?? "${key}: ${value}" fallback. The evidence field
    // carried raw user quotes ("Bauherr: 'approximately 1925'") into
    // the Verify card AND the Executive Read flag summary; the key
    // fallback rendered DB shapes ("Ensemble Schwabing Geprueft: false").
    // humanizeFact uses curated locale templates with algorithmic
    // fallback for unmapped keys.
    const label = humanizeFact(f, lang)
    items.push({
      id: `f-${f.key}`,
      label,
      kind: 'assumed_fact',
      priority: isStructural ? 3 : 2,
    })
  }

  if (areas) {
    for (const k of ['A', 'B', 'C'] as const) {
      const a = areas[k]
      if (a?.state !== 'PENDING') continue
      items.push({
        id: `area-${k}`,
        label:
          k === 'A'
            ? lang === 'en'
              ? 'Planning law not yet assessed'
              : 'Planungsrecht noch zu beurteilen'
            : k === 'B'
              ? lang === 'en'
                ? 'Building law not yet assessed'
                : 'Bauordnungsrecht noch zu beurteilen'
              : lang === 'en'
                ? 'Other requirements not yet assessed'
                : 'Sonstige Vorgaben noch zu beurteilen',
        kind: 'pending_area',
        priority: 1,
      })
    }
  }

  const all = items
    .slice()
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))

  return {
    all,
    topPriority: all.slice(0, topN),
    count: all.length,
  }
}
