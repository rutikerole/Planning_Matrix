import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import {
  SMART_SUGGESTIONS_MUENCHEN,
  type SmartSuggestion,
} from '@/data/smartSuggestionsMuenchen'

interface MatchArgs {
  project: ProjectRow
  state: Partial<ProjectState>
  /** Cap the returned list. Default 8. */
  limit?: number
}

/**
 * Phase 8.1 (A.5) — relevance scoring instead of first-match-wins.
 *
 * For each suggestion that passes its filters, score by:
 *   + base 1.0
 *   + intent match (if declared) → +1.5
 *   + bundesland match (if declared) → +1.0
 *   + scope-match hit → +2.0
 *   + relevanceWeight multiplier (default 1.0)
 *
 * Then sort descending and slice to `limit`. Ties break alphabetically
 * by id for stable rendering.
 *
 * Suggestions whose `smart-{id}` is already in state.recommendations
 * are excluded so the user can't add the same item twice.
 */
export function pickSmartSuggestions({
  project,
  state,
  limit = 8,
}: MatchArgs): SmartSuggestion[] {
  const corpus = [
    ...(state.facts ?? []).map(
      (f) => `${f.key} ${typeof f.value === 'string' ? f.value : ''}`,
    ),
    ...(state.procedures ?? []).map(
      (p) => `${p.title_de} ${p.rationale_de ?? ''}`,
    ),
  ]
    .join(' ')
    .toLowerCase()

  const existingRecIds = new Set(
    (state.recommendations ?? []).map((r) => r.id),
  )

  const scored: Array<{ s: SmartSuggestion; score: number }> = []
  for (const s of SMART_SUGGESTIONS_MUENCHEN) {
    if (existingRecIds.has(`smart-${s.id}`)) continue
    if (s.intents && !s.intents.includes(project.intent)) continue
    if (s.bundeslaender && !s.bundeslaender.includes(project.bundesland))
      continue
    if (s.scopeMatch && !s.scopeMatch.test(corpus)) continue

    let score = 1.0
    if (s.intents?.includes(project.intent)) score += 1.5
    if (s.bundeslaender?.includes(project.bundesland)) score += 1.0
    if (s.scopeMatch?.test(corpus)) score += 2.0
    score *= s.relevanceWeight ?? 1.0

    scored.push({ s, score })
  }

  scored.sort(
    (a, b) => b.score - a.score || a.s.id.localeCompare(b.s.id),
  )
  return scored.slice(0, limit).map((entry) => entry.s)
}
