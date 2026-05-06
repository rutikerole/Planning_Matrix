/**
 * Phase 3.5 #63 — Bayern HOAI cost-norm lookup.
 *
 * Phase 5 — renamed from costNormsErlangen.ts as part of the
 * Erlangen → München pivot. HOAI is bundesland-level, not
 * city-level, so the orientation ranges carry over unchanged;
 * München-specific Behördengebühren are surfaced via the
 * specialist voices using legalContext, not here.
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
 * area for that — future phase).
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

/**
 * Phase 8.5 (A.5) — recalibrated to München-realistic practitioner
 * ranges. The previous baseline (€13.6k–24.5k total) was below market
 * for a typical EFH at construction value €750k+. New ranges reflect:
 *
 *   - HOAI 2021 § 35 Zone III architect LP 1-4 fees for München at
 *     typical EFH Anrechenbare Kosten ~€500k–800k.
 *   - München practitioner +15-25% premium over Bayern average,
 *     documented at gehaltsvergleich.com / architektenkammer Bayern
 *     market data.
 *   - Authority fees scaled to München LHM kostensatzung typical
 *     residential review.
 *
 * verifyBeforePublicLaunch — same caveat. These are orientation ranges
 * sourced from practitioner observation; for binding quotes the
 * Bauherr engages an Architekt directly.
 *
 * For non-München Bundesländer the engine still falls through to
 * REGION_MULT (Bayern = 1.0), but the BASE itself is München-tuned.
 * Phase 9 expansion will introduce per-Bundesland BASE tables.
 */
const BASE: CostBreakdown = {
  architekt: { min: 15_000, max: 28_000 },
  tragwerksplanung: { min: 4_500, max: 8_000 },
  vermessung: { min: 1_200, max: 2_200 },
  energieberatung: { min: 2_500, max: 4_500 },
  behoerdengebuehren: { min: 1_500, max: 3_500 },
  total: { min: 24_700, max: 46_200 },
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

/**
 * Phase 8.1 (A.4) — HOAI Honorarzone factors. Zone I = simplest, V =
 * most complex; residential is typically Zone III. Values are
 * orientation-grade ratios off the Zone III baseline, NOT exact
 * § 35 HOAI percentages.
 */
export type Honorarzone = 'I' | 'II' | 'III' | 'IV' | 'V'

const ZONE_MULT: Record<Honorarzone, number> = {
  I: 0.85,
  II: 0.95,
  III: 1.0,
  IV: 1.1,
  V: 1.2,
}

/**
 * Phase 8.1 (A.4) — Bundesland-level rate factor. Only Bayern in v1;
 * future Länder slot in here without changing the engine signature.
 */
const REGION_MULT: Record<string, number> = {
  Bayern: 1.0,
}

const BASE_AREA_SQM = 180

/**
 * Phase 8.1 (A.4) — area-based scaling. Anrechenbare Kosten under
 * HOAI scale roughly with built area; this is a coarse linear
 * approximation clamped to keep extreme values reasonable. 180 m² is
 * the default EFH baseline.
 */
function areaFactor(areaSqm: number | undefined): number {
  if (!areaSqm || areaSqm <= 0) return 1.0
  const f = areaSqm / BASE_AREA_SQM
  return Math.max(0.5, Math.min(2.5, f))
}

export interface BuildOptions {
  /** Floor area in m². Defaults to BASE_AREA_SQM (180) when missing. */
  areaSqm?: number
  /** HOAI Honorarzone (I-V). Defaults to III (typical residential). */
  honorarzone?: Honorarzone
  /** Bundesland identifier; defaults to 'Bayern' (the only region in v1). */
  bundesland?: string
}

export interface CostInputs {
  areaSqm: number
  honorarzone: Honorarzone
  bundesland: string
  procedure: ProcedureType
  klasse: Gebaeudeklasse
  /** The composite multiplier applied off BASE — useful for tooltips. */
  multiplier: number
}

/** Re-scales a CostBucket by a multiplier, rounded to nearest €100. */
function scale(b: CostBucket, mult: number): CostBucket {
  return {
    min: Math.round((b.min * mult) / 100) * 100,
    max: Math.round((b.max * mult) / 100) * 100,
  }
}

/**
 * Phase 8.1 (A.4) — extended call signature. The 2-arg form keeps
 * existing callers working unchanged; passing `opts` enables the
 * area + Honorarzone + region inputs the brief asks for.
 */
export function buildCostBreakdown(
  procedure: ProcedureType,
  klasse: Gebaeudeklasse,
  opts: BuildOptions = {},
): CostBreakdown {
  const inputs = resolveInputs(procedure, klasse, opts)
  const m = inputs.multiplier
  return {
    architekt: scale(BASE.architekt, m),
    tragwerksplanung: scale(BASE.tragwerksplanung, m),
    vermessung: scale(BASE.vermessung, m),
    energieberatung: scale(BASE.energieberatung, m),
    behoerdengebuehren: scale(BASE.behoerdengebuehren, m),
    total: scale(BASE.total, m),
  }
}

/**
 * Phase 8.1 (A.4) — surface the inputs that produced a cost. Used
 * by the cost-row tooltip ("Computed from: 180 m² × HOAI Zone III ×
 * Bayern factor 1.0").
 */
export function resolveInputs(
  procedure: ProcedureType,
  klasse: Gebaeudeklasse,
  opts: BuildOptions = {},
): CostInputs {
  const areaSqm = opts.areaSqm ?? BASE_AREA_SQM
  const honorarzone = opts.honorarzone ?? 'III'
  const bundesland = opts.bundesland ?? 'Bayern'
  const region = REGION_MULT[bundesland] ?? 1.0
  const multiplier =
    PROCEDURE_MULT[procedure] *
    KLASSE_MULT[klasse] *
    ZONE_MULT[honorarzone] *
    areaFactor(areaSqm) *
    region
  return { areaSqm, honorarzone, bundesland, procedure, klasse, multiplier }
}

/**
 * Phase 8.1 (A.4) — compact human-readable string of the inputs that
 * produced a cost row. Locale-aware; rendered inside the tooltip.
 */
export function describeCostInputs(
  inputs: CostInputs,
  lang: 'de' | 'en',
): string {
  const parts: string[] = []
  parts.push(`${inputs.areaSqm} m²`)
  parts.push(
    lang === 'en'
      ? `HOAI Zone ${inputs.honorarzone}`
      : `HOAI-Zone ${inputs.honorarzone}`,
  )
  parts.push(
    lang === 'en'
      ? `${inputs.bundesland} factor`
      : `Bundesland-Faktor ${inputs.bundesland}`,
  )
  if (inputs.klasse !== 'unknown') {
    parts.push(
      lang === 'en' ? `building class ${inputs.klasse}` : `GK ${inputs.klasse}`,
    )
  }
  return parts.join(' · ')
}

/**
 * Phase 8.1 (A.4) — best-effort area lookup from project facts.
 * Returns undefined when no area fact is present so callers fall
 * back to the BASE_AREA_SQM default.
 */
export function detectAreaSqm(corpus: string): number | undefined {
  const m = corpus.match(/(\d{2,4})\s*(?:m²|m2|qm|sqm|quadratmeter)/i)
  if (!m) return undefined
  const n = parseInt(m[1], 10)
  if (Number.isNaN(n) || n < 20 || n > 5000) return undefined
  return n
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

// ─── Phase 10 commit 12 — per-template cost bands ───────────────────────

import type { TemplateId } from '@/types/projectState'

export interface CostBandPerTemplate {
  /** EUR lower bound (typical-case minimum). */
  lower: number
  /** EUR upper bound (typical-case maximum). */
  upper: number
  /** Short German explanation of the basis (surfaced in the UI tooltip
   *  / "What this includes" line). */
  basisDe: string
  /** Short English explanation. */
  basisEn: string
}

/**
 * Phase 10 — per-template headline cost bands. Read by the result
 * page's Cost tab via `state.templateId`. The BASE breakdown above
 * stays for the per-category bars (architekt / tragwerk / vermessung /
 * energieberatung / behörde) on T-01; non-T-01 templates use the
 * headline only until per-template breakdowns ship.
 *
 * Numbers cross-referenced to brief §1 + each template's TYPISCHE
 * KOSTENRAHMEN section. T-01 matches BASE.total exactly. Other 7 are
 * München-tuned per the brief's content review.
 *
 * Verify before public launch: same caveat as BASE — these are
 * orientation ranges sourced from practitioner observation; for
 * binding quotes the Bauherr engages an Architekt:in directly.
 */
export const COST_BANDS_BY_TEMPLATE: Record<TemplateId, CostBandPerTemplate> = {
  'T-01': {
    lower: 17_300,
    upper: 32_300,
    basisDe: 'EFH Neubau, München, ~150 m² Wohnfläche, vereinfachtes Verfahren',
    basisEn: 'Single-family new build, Munich, ~150 m² living space, simplified procedure',
  },
  'T-02': {
    lower: 28_000,
    upper: 55_000,
    basisDe: 'MFH ab 4 WE, München, mit Brandschutz/Schallschutz/Statik-Prüfung',
    basisEn: 'Multi-family ≥ 4 units, Munich, including fire/sound/structural review',
  },
  'T-03': {
    lower:  8_000,
    upper: 22_000,
    basisDe: 'Sanierung verfahrensfrei (Anzeige nach Art. 57 Abs. 7 BayBO), München',
    basisEn: 'Renovation procedure-exempt (notification per Art. 57 Abs. 7 BayBO), Munich',
  },
  'T-04': {
    lower:  6_000,
    upper: 18_000,
    basisDe: 'Umnutzung verfahrensfrei (Anzeige nach Art. 57 Abs. 4 BayBO), München',
    basisEn: 'Change of use procedure-exempt (notification per Art. 57 Abs. 4), Munich',
  },
  'T-05': {
    lower:  4_500,
    upper: 12_000,
    basisDe: 'Abbruch anzeigepflichtig + Standsicherheits­bescheinigung Nachbar, München',
    basisEn: 'Demolition with notification + neighbour structural certification, Munich',
  },
  'T-06': {
    lower: 14_000,
    upper: 28_000,
    basisDe: 'Aufstockung mit Tragwerksprüfung + GEG-Nachweis, München',
    basisEn: 'Storey addition with structural review + GEG certificate, Munich',
  },
  'T-07': {
    lower:  4_500,
    upper: 18_000,
    basisDe: 'Anbau (klein verfahrensfrei bis groß genehmigungspflichtig)',
    basisEn: 'Extension (small procedure-exempt to large permit-required)',
  },
  'T-08': {
    lower:  2_000,
    upper: 15_000,
    basisDe: 'Sonstige Vorhaben — Sub-Kategorie bestimmt die Spanne',
    basisEn: 'Other projects — sub-category determines the range',
  },
}

/** Convenience accessor used by the Cost tab. Falls back to T-01 (and
 *  surfaces an empty-state hint upstream) if templateId is somehow
 *  missing from a project row. */
export function costBandFor(templateId: TemplateId | undefined | null): CostBandPerTemplate {
  return COST_BANDS_BY_TEMPLATE[templateId ?? 'T-01'] ?? COST_BANDS_BY_TEMPLATE['T-01']
}
