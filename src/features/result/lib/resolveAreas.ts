import type { Areas, ProjectState } from '@/types/projectState'

/**
 * Phase 8.5 (A.2) — derive Areas state from evidence when the
 * persisted areas object is still PENDING.
 *
 * The Tengstraße project finished a full consultation with all three
 * domains substantively covered (§ 34 BauGB inner-area in A, GK 3 +
 * § 58 BayBO in B, Baumschutz + PV-Pflicht + Stellplatz + Denkmal
 * flags in C) yet state.areas[A/B/C].state stayed PENDING because the
 * persona didn't emit `areas_update` consistently.
 *
 * The persona prompt update (commit 12 / Tier 3) requires
 * `areas_update` on every substantive turn. This selector is the
 * client-side fallback so legacy projects already in the DB render
 * correctly without a state rewrite.
 *
 * Heuristic: a domain auto-flips to ACTIVE if state.facts contains
 * ≥ 3 facts whose keys match the domain's pattern AND at least one
 * fact has quality !== 'ASSUMED' (i.e. some real evidence beyond
 * pure user assumption).
 */

const DOMAIN_PATTERNS: Record<'A' | 'B' | 'C', RegExp> = {
  A: /baugb|planungsrecht|bplan|bebauungsplan|innenbereich|au(s|ß)enbereich|baunvo|grz|gfz|nutzungsart/i,
  B: /baybo|bauordnung|gebaeudeklasse|geb_klasse|gk_|abstandsfl|brandschutz|geg|w(ä|ae)rmeschutz|verfahren|standsicherheit|art\.?\s*5[7-9]|art\.?\s*60|art\.?\s*61|art\.?\s*62/i,
  C: /baumschutz|baumschutzv|denkmal|baydschg|ensemble|stellplatz|stpls|baulast|naturschutz|altlast|pv-pflicht|pv_pflicht/i,
}

const MIN_FACTS_FOR_ACTIVE = 3

export interface ResolvedAreas {
  areas: Areas
  /** Per-domain flag: did the resolver derive ACTIVE because the
   *  persisted state was PENDING? Used by UI to label "derived". */
  derivedFlags: Record<'A' | 'B' | 'C', boolean>
}

const EMPTY_AREAS: Areas = {
  A: { state: 'PENDING' },
  B: { state: 'PENDING' },
  C: { state: 'PENDING' },
}

export function resolveAreas(state: Partial<ProjectState>): ResolvedAreas {
  const persisted = state.areas ?? EMPTY_AREAS
  const facts = state.facts ?? []
  const derivedFlags = { A: false, B: false, C: false }

  const out: Areas = {
    A: persisted.A ?? { state: 'PENDING' },
    B: persisted.B ?? { state: 'PENDING' },
    C: persisted.C ?? { state: 'PENDING' },
  }

  for (const k of ['A', 'B', 'C'] as const) {
    if (out[k].state !== 'PENDING') continue
    const pattern = DOMAIN_PATTERNS[k]
    let matchCount = 0
    let hasNonAssumed = false
    for (const f of facts) {
      const haystack = `${f.key} ${f.evidence ?? ''}`
      if (!pattern.test(haystack)) continue
      matchCount += 1
      if (f.qualifier?.quality && f.qualifier.quality !== 'ASSUMED') {
        hasNonAssumed = true
      }
    }
    if (matchCount >= MIN_FACTS_FOR_ACTIVE && hasNonAssumed) {
      out[k] = {
        state: 'ACTIVE',
        reason:
          out[k].reason ??
          `Auto-derived from ${matchCount} domain facts; persona did not emit areas_update.`,
      }
      derivedFlags[k] = true
    }
  }

  return { areas: out, derivedFlags }
}

/**
 * Convenience: count PENDING-after-resolution areas. Used by
 * AtAGlance + computeOpenItems so they don't double-count derived
 * areas as still-pending.
 */
export function countPendingAfterResolve(
  state: Partial<ProjectState>,
): number {
  const { areas } = resolveAreas(state)
  return (['A', 'B', 'C'] as const).filter(
    (k) => areas[k].state === 'PENDING',
  ).length
}
