/**
 * Phase 3.5 #63 — Bayern HOAI cost-norm lookup.
 *
 * verifyBeforePublicLaunch — every value here is an EDUCATIONAL
 * ORIENTATION DRAWN FROM HOAI 2021 § 35-39 + practitioner Bayern
 * Honorartabelle ranges. They are not quotes. The Result Page
 * surfaces them with a ±25 % confidence interval and the explicit
 * caveat "Diese Werte sind Orientierungswerte". Real legal review
 * is a Phase 4+ content task.
 *
 * The brief's example numbers (single-family home, BayBO Art. 58
 * vereinfachtes Verfahren, GK 1) are used as the default base; we
 * apply a small multiplier per procedure type and per building class
 * for variety. Floor area is not factored in for v1 (HOAI fee is
 * based on Honorarsumme not area; we'd need the model to emit floor
 * area for that — Phase 4).
 */

export type ProcedureType =
  | 'art58_vereinfacht'
  | 'art60_baugenehmigung'
  | 'art57_freistellung'
  | 'unknown'

export type Gebaeudeklasse = '1' | '2' | '3' | '4' | '5' | 'unknown'

export interface CostBucket {
  /** Inclusive lower bound, EUR. */
  min: number
  /** Inclusive upper bound, EUR. */
  max: number
}

export interface CostBreakdown {
  architekt: CostBucket
  tragwerksplanung: CostBucket
  vermessung: CostBucket
  energieberatung: CostBucket
  behoerdengebuehren: CostBucket
  total: CostBucket
}

const BASE: CostBreakdown = {
  architekt: { min: 8_000, max: 14_000 },
  tragwerksplanung: { min: 2_500, max: 4_500 },
  vermessung: { min: 800, max: 1_500 },
  energieberatung: { min: 1_500, max: 2_500 },
  behoerdengebuehren: { min: 800, max: 2_000 },
  total: { min: 13_600, max: 24_500 },
}

const PROCEDURE_MULT: Record<ProcedureType, number> = {
  art58_vereinfacht: 1.0,
  art60_baugenehmigung: 1.25, // Sonderbau / fully-permitted
  art57_freistellung: 0.7, // small reno
  unknown: 1.0,
}

const KLASSE_MULT: Record<Gebaeudeklasse, number> = {
  '1': 1.0,
  '2': 1.05,
  '3': 1.18,
  '4': 1.45,
  '5': 1.85,
  unknown: 1.0,
}

/** Re-scales a CostBucket by a multiplier, rounded to nearest €100. */
function scale(b: CostBucket, mult: number): CostBucket {
  return {
    min: Math.round((b.min * mult) / 100) * 100,
    max: Math.round((b.max * mult) / 100) * 100,
  }
}

export function buildCostBreakdown(
  procedure: ProcedureType,
  klasse: Gebaeudeklasse,
): CostBreakdown {
  const m = PROCEDURE_MULT[procedure] * KLASSE_MULT[klasse]
  return {
    architekt: scale(BASE.architekt, m),
    tragwerksplanung: scale(BASE.tragwerksplanung, m),
    vermessung: scale(BASE.vermessung, m),
    energieberatung: scale(BASE.energieberatung, m),
    behoerdengebuehren: scale(BASE.behoerdengebuehren, m),
    total: scale(BASE.total, m),
  }
}

/** Format a EUR range like "€ 8.000 – 14.000" (DE) or "€8,000 – 14,000" (EN). */
export function formatEurRange(bucket: CostBucket, lang: 'de' | 'en'): string {
  const fmt = new Intl.NumberFormat(lang === 'en' ? 'en-GB' : 'de-DE', {
    maximumFractionDigits: 0,
  })
  return `€ ${fmt.format(bucket.min)} – ${fmt.format(bucket.max)}`
}

/** Heuristic detection of the active procedure type from project state. */
export function detectProcedure(rationale: string | undefined): ProcedureType {
  if (!rationale) return 'unknown'
  const t = rationale.toLowerCase()
  if (/art\.?\s*60|baugenehmigungsverfahren\b/.test(t)) return 'art60_baugenehmigung'
  if (/art\.?\s*57|genehmigungsfreistellung/.test(t)) return 'art57_freistellung'
  if (/art\.?\s*58|vereinfacht/.test(t)) return 'art58_vereinfacht'
  return 'unknown'
}

/** Heuristic Gebäudeklasse detection from facts text. */
export function detectKlasse(corpus: string): Gebaeudeklasse {
  const m = corpus.match(/geb(ä|ae)udeklasse\s*([1-5])/i)
  if (m) return m[2] as Gebaeudeklasse
  return 'unknown'
}
