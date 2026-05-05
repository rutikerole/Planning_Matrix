// ───────────────────────────────────────────────────────────────────────
// Phase 8.6 (D.4) — runtime fact-plausibility validation
//
// Phase 8.5's persona prompt rubric (Phase 8.5 commit 12) tells the
// model how to distinguish BGF / footprint / plot, and which values
// belong with which keys. The persona can still get it wrong. This
// module is the second-pass safety net: walks `toolInput.extracted_facts`
// after Anthropic returns, and for any fact that's
//
//   • numeric and out of plausibility bounds, OR
//   • categorical and outside its enumerated set
//
// downgrades the qualifier from DECIDED / VERIFIED → ASSUMED and pushes
// a warning event into the plausibilityEvents array that
// commitChatTurnAtomic appends to project_events in the same
// transaction (Phase 8.6 commit 4).
//
// Non-blocking: the fact still commits. The Inspect Data Flow modal
// (Phase 8.3) renders the warning events; the result page renders
// the downgraded qualifier so the bauherr sees "ASSUMED" instead of
// "DECIDED" and knows the value needs human verification.
//
// verifyBeforePublicLaunch — bounds tuned against typical Bayern
// residential ranges. False positives are acceptable (just downgrades
// to ASSUMED); the brief flags this for follow-up if real-world
// projects trip them too often.
// ───────────────────────────────────────────────────────────────────────

import type { RespondToolInput } from '../../../src/types/respondTool.ts'

interface NumericBounds {
  min: number
  max: number
}

/**
 * Numeric bounds per fact key. A value outside [min, max] downgrades
 * the qualifier to ASSUMED. The brief's bounds:
 *   bruttogrundflaeche_m2:    50 –  5000  (BGF, HOAI fee basis)
 *   geplante_grundflaeche_m2: 30 –  2000  (footprint, GRZ basis)
 *   nettogrundflaeche_m2:     40 –  4000  (NGF; derived from BGF)
 *   grundstueck_groesse_m2:  100 – 50000  (plot size)
 *   vollgeschosse_oberirdisch: 1 –    12  (above-ground full storeys)
 *   bauwerks_hoehe_m:          2 –   200  (building height in metres)
 */
const NUMERIC_BOUNDS: Record<string, NumericBounds> = {
  bruttogrundflaeche_m2:    { min: 50,  max: 5000 },
  geplante_grundflaeche_m2: { min: 30,  max: 2000 },
  nettogrundflaeche_m2:     { min: 40,  max: 4000 },
  grundstueck_groesse_m2:   { min: 100, max: 50000 },
  vollgeschosse_oberirdisch:{ min: 1,   max: 12 },
  bauwerks_hoehe_m:         { min: 2,   max: 200 },
}

/**
 * Categorical sets per fact key. A value outside the set downgrades
 * the qualifier to ASSUMED. Comparison is case-insensitive and
 * whitespace-tolerant.
 */
const CATEGORICAL_SETS: Record<string, ReadonlyArray<string>> = {
  gebaeudeklasse_geplant:   ['gk 1', 'gk 2', 'gk 3', 'gk 4', 'gk 5'],
  gebaeudeklasse_hypothese: ['gk 1', 'gk 2', 'gk 3', 'gk 4', 'gk 5'],
  baugb_paragraph:          ['§ 30', '§ 34', '§ 35', '30', '34', '35'],
}

export interface PlausibilityWarning {
  event_type: string
  reason: string
}

export interface PlausibilityResult {
  /** Number of facts whose qualifier was downgraded. */
  downgraded: number
  /** Warning events to commit alongside the turn. Empty when nothing
   *  flagged. */
  warnings: PlausibilityWarning[]
}

/**
 * Walk `toolInput.extracted_facts` and downgrade any fact whose value
 * fails its plausibility check. Mutates the toolInput in place so
 * `applyToolInputToState` sees the downgraded qualifier without
 * re-piping. Returns the warnings array for `commitChatTurnAtomic`'s
 * `plausibilityEvents` parameter.
 */
export function validateFactPlausibility(
  toolInput: RespondToolInput,
): PlausibilityResult {
  const facts = toolInput.extracted_facts
  if (!facts || facts.length === 0) {
    return { downgraded: 0, warnings: [] }
  }

  const warnings: PlausibilityWarning[] = []
  let downgraded = 0

  for (const fact of facts) {
    const violation = checkFact(fact)
    if (!violation) continue

    // Downgrade DECIDED / VERIFIED → ASSUMED. Already-ASSUMED stays.
    if (fact.quality === 'DECIDED' || fact.quality === 'VERIFIED') {
      fact.quality = 'ASSUMED'
      downgraded += 1
    }
    // Append the violation to the fact's reason so the audit trail
    // captures it next to the data.
    const note = `[plausibility] ${violation}`
    fact.reason = fact.reason ? `${fact.reason} · ${note}` : note

    warnings.push({
      event_type: 'assistant.fact_plausibility_warning',
      reason: `${fact.key}=${formatValue(fact.value)} ${violation}`,
    })
  }

  return { downgraded, warnings }
}

interface FactLike {
  key: string
  value: unknown
  quality: string
}

function checkFact(fact: FactLike): string | null {
  const bounds = NUMERIC_BOUNDS[fact.key]
  if (bounds) {
    const num = parseNumeric(fact.value)
    if (num === null) {
      return `non-numeric value for numeric key (expected ${bounds.min}–${bounds.max})`
    }
    if (num < bounds.min || num > bounds.max) {
      return `out of plausible range ${bounds.min}–${bounds.max}`
    }
    return null
  }

  const set = CATEGORICAL_SETS[fact.key]
  if (set) {
    const norm = String(fact.value).trim().toLowerCase().replace(/\s+/g, ' ')
    if (!set.some((allowed) => allowed.toLowerCase() === norm)) {
      return `out of enumerated set: expected one of [${set.join(', ')}]`
    }
    return null
  }

  return null
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    // Tolerate "180", "180 m²", "180,5", "ca. 180".
    const match = value.match(/(-?\d+(?:[.,]\d+)?)/)
    if (!match) return null
    const n = parseFloat(match[1].replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '∅'
  if (typeof value === 'string') return `"${value}"`
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return '?'
  }
}
