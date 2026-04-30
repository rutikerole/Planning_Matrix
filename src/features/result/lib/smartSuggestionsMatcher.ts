import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import {
  SMART_SUGGESTIONS_MUENCHEN,
  type SmartSuggestion,
} from '@/data/smartSuggestionsMuenchen'

interface MatchArgs {
  project: ProjectRow
  state: Partial<ProjectState>
  /** Cap the returned list. Brief asks for 3–5; default 5. */
  limit?: number
}

/**
 * Phase 3.5 #64 — picks 3–5 applicable smart suggestions for a project.
 *
 * Filtering is permissive: a suggestion ships when ALL its declared
 * filters match. Suggestions that decline to declare a filter are
 * always eligible. We exclude suggestions whose `id` already appears
 * as a recommendation id in the project state (so the user can't add
 * the same item twice).
 */
export function pickSmartSuggestions({
  project,
  state,
  limit = 5,
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

  const out: SmartSuggestion[] = []
  for (const s of SMART_SUGGESTIONS_MUENCHEN) {
    if (existingRecIds.has(`smart-${s.id}`)) continue
    if (s.intents && !s.intents.includes(project.intent)) continue
    if (s.bundeslaender && !s.bundeslaender.includes(project.bundesland))
      continue
    if (s.scopeMatch && !s.scopeMatch.test(corpus)) continue
    out.push(s)
    if (out.length >= limit) break
  }
  return out
}
