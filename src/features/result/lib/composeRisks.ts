import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { RISK_CATALOG, type RiskCatalogEntry } from '@/data/riskCatalog'

export interface ScoredRisk {
  entry: RiskCatalogEntry
  /** Likelihood 1–3, after evidence-pattern bumping. */
  likelihood: 1 | 2 | 3
  /** Impact 1–3, fixed from catalog. */
  impact: 1 | 2 | 3
  /** Score = likelihood × impact, used for sort. */
  score: number
}

interface Args {
  project: ProjectRow
  state: Partial<ProjectState>
  /** Cap visible. Default 3 (top by score). */
  limit?: number
}

/**
 * Phase 8.3 (C.2) — score the risk catalog against the project's state
 * corpus + intent. Returns the top-N risks sorted by likelihood ×
 * impact descending.
 *
 * Filtering:
 *   - Risks with `intents` only fire when the project's intent matches.
 *   - Risks with `evidencePattern` see their likelihood bump from
 *     `baseLikelihood` to `bumpedLikelihood` when the pattern hits the
 *     project corpus (facts + procedures + areas reasons).
 *
 * Risks with neither filter fire on every project (universal).
 */
export function composeRisks({ project, state, limit = 3 }: Args): {
  visible: ScoredRisk[]
  total: number
} {
  const corpus = buildCorpus(state)

  const scored: ScoredRisk[] = []
  for (const entry of RISK_CATALOG) {
    if (entry.intents && !entry.intents.includes(project.intent)) continue
    // v1.0.28 Bug 57 — exclude intents (B-Plan/Bauamt-backlog don't apply to
    // a verfahrensfrei Abbruch) + suppress a risk when a fact explicitly
    // negates it (Heritage when denkmalschutz=false; also kills the
    // /denkmal/-matches-"kein Denkmalschutz" false positive).
    if (entry.excludeIntents?.includes(project.intent)) continue
    if (entry.suppressWhenFactFalse && factIsFalse(state, entry.suppressWhenFactFalse))
      continue
    if (entry.bundeslaender && !entry.bundeslaender.includes(project.bundesland))
      continue

    let likelihood: 1 | 2 | 3 = entry.baseLikelihood
    if (entry.evidencePattern && entry.bumpedLikelihood) {
      if (entry.evidencePattern.test(corpus)) {
        likelihood = entry.bumpedLikelihood
      }
    }

    scored.push({
      entry,
      likelihood,
      impact: entry.impact,
      score: likelihood * entry.impact,
    })
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.impact - a.impact ||
      a.entry.id.localeCompare(b.entry.id),
  )

  return {
    visible: scored.slice(0, limit),
    total: scored.length,
  }
}

/** v1.0.28 Bug 57 — true when a fact with `key` is explicitly false. */
function factIsFalse(state: Partial<ProjectState>, key: string): boolean {
  const f = (state.facts ?? []).find((x) => x.key === key)
  if (!f) return false
  return f.value === false || f.value === 'false' || f.value === 'NEIN' || f.value === 'nein'
}

function buildCorpus(state: Partial<ProjectState>): string {
  const facts = state.facts ?? []
  const procs = state.procedures ?? []
  const areas = state.areas
  const parts: string[] = []
  for (const f of facts) {
    parts.push(f.key)
    if (typeof f.value === 'string') parts.push(f.value)
    if (f.evidence) parts.push(f.evidence)
    if (f.qualifier?.reason) parts.push(f.qualifier.reason)
  }
  for (const p of procs) {
    parts.push(p.title_de, p.rationale_de ?? '')
  }
  if (areas) {
    for (const k of ['A', 'B', 'C'] as const) {
      const a = areas[k]
      if (a?.reason) parts.push(a.reason)
    }
  }
  return parts.join(' ').toLowerCase()
}
