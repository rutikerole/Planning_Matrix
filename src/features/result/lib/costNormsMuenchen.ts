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
 *
 * v1.0.6 Bug 1 — documented downgrade. The Hessen × T-03 smoke walk
 * surfaced "Computed from: 180 m² · HOAI Zone III · bayern factor"
 * on a Hessen project. Empirical DB probe showed
 * projects.bundesland='bayern' for that project — the cost engine
 * read it correctly. Root cause was the legacy wizard hardcoding
 * bayern (B04). Fixed in v1.0.6 Bug 0 (the wizard now writes the
 * user's explicit selection through). Cost engine itself unchanged;
 * for non-Bayern projects REGION_MULT silently falls through to 1.0
 * which is the right v1.0.6 behaviour (per-state HOAI factors are
 * a v1.1 content scope decision). Residual Bayern wording in
 * costRationales.ts + locale caveats is accepted v1.0.6 leakage; the
 * numeric multiplier + the dynamic `${inputs.bundesland} factor`
 * string are correct.
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
// v1.0.25 Bug 28 — keyed by the lowercase BundeslandCode (matching
// projects.bundesland), not "Bayern". The pre-fix uppercase key meant
// REGION_MULT[bundesland] always missed → fell through to 1.0 (dead
// code). All states currently use the 1.0 HOAI baseline (no per-state
// factor calibrated yet — docs/cost-formula.md); the lookup is now
// normalized so calibrated factors slot in correctly later.
const REGION_MULT: Record<string, number> = {
  bayern: 1.0,
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
  const bundesland = (opts.bundesland ?? 'bayern').toLowerCase()
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
  /** Sprint 0 addendum — when the area was NOT resolved from project facts
   *  (the engine fell back to BASE_AREA_SQM), label it as an assumption so the
   *  caption is as honest as the PDF's "no-area" phrasing instead of showing a
   *  default as if it were measured. */
  areaAssumed = false,
): string {
  const parts: string[] = []
  parts.push(
    areaAssumed
      ? lang === 'en'
        ? `${inputs.areaSqm} m² (assumed)`
        : `${inputs.areaSqm} m² (Annahme)`
      : `${inputs.areaSqm} m²`,
  )
  parts.push(
    lang === 'en'
      ? `HOAI Zone ${inputs.honorarzone}`
      : `HOAI-Zone ${inputs.honorarzone}`,
  )
  // audit-remediation m2/W7 (2026-05-28):
  // REGION_MULT carries only `bayern: 1.0`; every other state falls
  // through to 1.0 — i.e. the displayed multiplier is the München
  // baseline. The previous label "Bundesland-Faktor Berlin" implied a
  // calibrated regional factor we don't have. Replaced with an honest
  // basis line so the user reads the band as "München-Richtwert" until
  // DESTATIS regional calibration (WS1/2/4) lands.
  const isBayernBaseline =
    (inputs.bundesland ?? '').trim().toLowerCase() === 'bayern'
  if (isBayernBaseline) {
    const stateLabel =
      lang === 'en'
        ? getStateLocalization(inputs.bundesland).labelEn
        : getStateLocalization(inputs.bundesland).labelDe
    parts.push(
      lang === 'en' ? `${stateLabel} factor` : `Bundesland-Faktor ${stateLabel}`,
    )
  } else {
    parts.push(
      lang === 'en'
        ? 'estimate on München benchmarks (regional calibration pending)'
        : 'Schätzung auf München-Richtwerte (regionale Kalibrierung ausstehend)',
    )
  }
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
 *
 * v1.0.11 Bug 24 — corpus regex requires a unit suffix
 * (`<digits> m²/m2/qm/...`), which works for templates whose
 * persona emits area as a string with inline unit (T-01 / T-02
 * neubau typically: "180 m²"). T-03 Sanierung's persona emits
 * `fassadenflaeche_m2 = 220` as a numeric value with the unit
 * encoded in the KEY not the value — corpus regex misses it,
 * function returns undefined, caller falls back to default 180.
 * Use `resolveAreaSqmByTemplate` BEFORE this function for
 * templates with declared cost-basis fields; this corpus-regex
 * remains as the universal backstop.
 */
export function detectAreaSqm(corpus: string): number | undefined {
  const m = corpus.match(/(\d{2,4})\s*(?:m²|m2|qm|sqm|quadratmeter)/i)
  if (!m) return undefined
  const n = parseInt(m[1], 10)
  if (Number.isNaN(n) || n < 20 || n > 5000) return undefined
  return n
}

/**
 * v1.0.11 Bug 24 — per-template cost-basis field map. For each
 * template, declares the projects.state.facts[?].key whose
 * NUMERIC value drives the cost engine's area input.
 *
 * Empirically confirmed:
 *   - T-03 Sanierung → fassadenflaeche_m2 (NRW × T-03 Königsallee
 *                       project 5c610d71 user input 220 m²).
 *
 * User-supplied guesses (will work when the persona actually emits
 * the named key; otherwise the lookup misses and the caller falls
 * back to detectAreaSqm. No regression vs v1.0.10):
 *   - T-01 / T-02 Neubau-EFH/MFH → wohnflaeche
 *   - T-04 Umnutzung             → nutzflaeche_m2
 *   - T-05 Abbruch               → bruttoraumflaeche_m3 (volume)
 *   - T-06 Aufstockung           → aufstockung_flaeche_m2
 *   - T-07 Anbau                 → anbau_flaeche_m2
 *   - T-08 Sonstiges             → flaeche_m2 (generic)
 *
 * The empirical inventory should be widened in v1.0.12 once the
 * persona's actual fact-key conventions per template are verified
 * via production smoke walks on T-01..T-08.
 */
const COST_BASIS_FIELD_BY_TEMPLATE: Partial<Record<TemplateId, readonly string[]>> = {
  // Lists are tried in order; first numeric hit wins.
  // v1.0.29 Bug 64 — the T-02 Hamburg smoke walk proved the persona emits
  // `wohnflaeche_gesamt_m2` (720), which was absent here → the engine fell
  // back to BASE_AREA_SQM=180 and quoted €24,700–46,200 for a 720 m² MFH.
  'T-01': ['wohnflaeche', 'wohnflaeche_m2', 'wohnflaeche_gesamt_m2', 'wohnflaeche_gesamt'],
  'T-02': ['wohnflaeche', 'wohnflaeche_m2', 'wohnflaeche_gesamt_m2', 'wohnflaeche_gesamt'],
  'T-03': ['fassadenflaeche_m2'],
  'T-04': ['nutzflaeche_m2', 'nutzflaeche'],
  'T-05': ['bruttoraumflaeche_m3'],
  'T-06': ['aufstockung_flaeche_m2'],
  'T-07': ['anbau_flaeche_m2'],
  'T-08': ['flaeche_m2'],
}

interface CostBasisFactCandidate {
  key: string
  value: unknown
}

/**
 * v1.0.11 Bug 24 — template-aware area resolver. Looks up the
 * template's declared cost-basis fact-key list and returns the
 * first numeric value found in `facts`. Returns undefined when no
 * matching fact exists — caller falls back to detectAreaSqm
 * (corpus regex) and ultimately BASE_AREA_SQM=180.
 *
 * Range guard: same 20..5000 envelope as detectAreaSqm so an
 * out-of-band numeric (e.g. accidental year 1970) doesn't poison
 * the cost engine.
 */
export function resolveAreaSqmByTemplate(
  facts: ReadonlyArray<CostBasisFactCandidate> | undefined,
  templateId: TemplateId | null | undefined,
): number | undefined {
  if (!facts || !templateId) return undefined
  const keys = COST_BASIS_FIELD_BY_TEMPLATE[templateId]
  if (!keys) return undefined
  for (const key of keys) {
    const fact = facts.find((f) => f.key === key)
    if (!fact) continue
    let n: number | undefined
    if (typeof fact.value === 'number') n = fact.value
    else if (typeof fact.value === 'string') {
      const parsed = parseFloat(fact.value)
      if (Number.isFinite(parsed)) n = parsed
    }
    if (n != null && Number.isFinite(n) && n >= 20 && n <= 5000) return n
  }
  // v1.0.29 Bug 64 — MFH fallback: when no total Wohnfläche key resolved,
  // derive it from units × per-unit area (the persona reliably emits both
  // even when it omits the explicit total).
  if (templateId === 'T-02') {
    const num = (key: string): number | undefined => {
      const f = facts.find((x) => x.key === key)
      if (!f) return undefined
      const v =
        typeof f.value === 'number'
          ? f.value
          : typeof f.value === 'string'
            ? parseFloat(f.value)
            : NaN
      return Number.isFinite(v) ? v : undefined
    }
    const units = num('wohneinheiten_anzahl')
    const perUnit = num('wohneinheit_flaeche_m2')
    if (units && perUnit) {
      const total = units * perUnit
      if (total >= 20 && total <= 5000) return total
    }
  }
  return undefined
}

/**
 * Sprint 0 (P1-A / RED-3) — THE single cost-area resolver. Every cost
 * surface (At-a-Glance card, Executive Read, Cost tab, exported PDF)
 * MUST call this and nothing else for its area input, so the four
 * surfaces cannot print different headline costs for one project — the
 * RED-3 self-contradiction documented in
 * docs/ACCURACY_HARDENING_2026-06-08.md §P1-A.
 *
 * Resolution order:
 *   1. `resolveAreaSqmByTemplate` — template-aware; knows the per-template
 *      cost-basis fact-key AND the T-02 units × perUnit fallback.
 *   2. `detectAreaSqm` over the fact corpus — the universal regex backstop.
 *
 * Returns undefined when neither resolves; callers pass that straight to
 * `buildCostBreakdown`, which applies the BASE_AREA_SQM (180) default
 * identically — so a missing area yields the SAME figure on every surface.
 *
 * Before this existed, At-a-Glance + Executive Read used `detectAreaSqm`
 * alone (no template awareness) while the Cost tab + PDF used the template
 * resolver, so a T-02 MFH (units × perUnit) quoted two different headline
 * costs on the same deliverable.
 */
export function resolveCostAreaSqm(
  facts: ReadonlyArray<CostBasisFactCandidate> | undefined,
  templateId: TemplateId | null | undefined,
): number | undefined {
  const byTemplate = resolveAreaSqmByTemplate(facts, templateId)
  if (byTemplate != null) return byTemplate
  const corpus = (facts ?? [])
    .map((f) => `${f.key} ${typeof f.value === 'string' ? f.value : ''}`)
    .join(' ')
    .toLowerCase()
  return detectAreaSqm(corpus)
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
import { getStateLocalization } from '@/legal/stateLocalization'

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
    // phase-c/item-4 — state-neutral. T-01 renders the per-category BASE table
    // (not this band), so the old "München"/"Munich" string was dead; cleaned for
    // guard-completeness now that the matrix band-leak guard covers all 8 templates.
    basisDe: 'EFH-Neubau, ~150 m² Wohnfläche, vereinfachtes Verfahren',
    basisEn: 'Single-family new build, ~150 m² living space, simplified procedure',
  },
  'T-02': {
    lower: 28_000,
    upper: 55_000,
    // v1.0.35+ Phase-C — state-neutral: this band renders the headline cost for
    // T-02 across ALL states (template-keyed, not state-aware), so naming
    // München bled "München" into every non-Bayern PDF (128-cell sweep). Values
    // stay München-tuned (calibration debt); the label must not name a city.
    basisDe: 'MFH ab 4 WE, mit Brandschutz/Schallschutz/Statik-Prüfung',
    basisEn: 'Multi-family ≥ 4 units, including fire/sound/structural review',
  },
  'T-03': {
    lower:  8_000,
    upper: 22_000,
    // phase-c/item-4 — state-neutral. Dropped the "Art. 57 Abs. 7 BayBO, München"
    // framing (Bayern-specific § + city; the renovation procedure varies by state).
    // T-03 renders the renovation stub (not this band) — cleaned for completeness +
    // to kill the latent cross-state BayBO token.
    basisDe: 'Sanierung — Umfang abhängig vom Eingriff (verfahrensfrei bis genehmigungspflichtig)',
    basisEn: 'Renovation — scope depends on the intervention (procedure-exempt to permit-required)',
  },
  'T-04': {
    lower:  6_000,
    upper: 18_000,
    // v1.0.30 Bug 88 — drop the "verfahrensfrei (Anzeige nach Art. 57 Abs. 4
    // BayBO), München" framing: it bled BayBO + München onto every non-Bayern
    // project AND was factually wrong (a use change is frequently
    // genehmigungspflichtig, e.g. retail→gastronomy in Leipzig). State-neutral,
    // scope-honest. (T-02 + T-06 — the other headline-band templates rendered
    // for non-Bayern — are now state-neutral too. phase-c/item-4: T-01/T-03/T-05
    // bands are now state-neutral as well, so ALL 8 bands are city/§-free.)
    basisDe: 'Umnutzung — Umfang abhängig von Schallschutz-/Brandschutz-/TA-Lärm-Gutachten; Fachgutachten erforderlich',
    basisEn: 'Change of use — scope depends on sound-/fire-protection/noise assessments; specialist reports required',
  },
  'T-05': {
    lower:  4_500,
    upper: 12_000,
    // phase-c/item-4 — state-neutral (dropped "München"). T-05 renders the
    // demolition stub (not this band) — cleaned for completeness.
    basisDe: 'Abbruch (anzeige- bis genehmigungspflichtig) + Standsicherheitsbescheinigung Nachbar',
    basisEn: 'Demolition (notification to permit-required) + neighbour structural certification',
  },
  'T-06': {
    lower: 14_000,
    upper: 28_000,
    // v1.0.35+ Phase-C — state-neutral (same reason as T-02: this band renders
    // for T-06 across all states; naming München leaked into non-Bayern PDFs).
    basisDe: 'Aufstockung mit Tragwerksprüfung + GEG-Nachweis',
    basisEn: 'Storey addition with structural review + GEG certificate',
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

/**
 * Sprint 1 (Y-1) — templates whose headline cost is the per-template BAND
 * (COST_BANDS_BY_TEMPLATE), NOT the per-category HOAI engine breakdown. The
 * München-EFH-tuned BASE engine is wrong for these shapes (MFH / Aufstockung /
 * Anbau / Sonstiges), so the Cost tab + PDF render the sourced band. Kept here
 * as the single list so every surface agrees on which templates use the band.
 */
const HEADLINE_BAND_TEMPLATES: ReadonlySet<TemplateId> = new Set([
  'T-02',
  'T-06',
  'T-07',
  'T-08',
])

export function isHeadlineBandTemplate(
  templateId: TemplateId | undefined | null,
): boolean {
  return !!templateId && HEADLINE_BAND_TEMPLATES.has(templateId)
}

/**
 * Sprint 1 (Y-1) — THE single headline cost-range resolver. Before this, the
 * compact surfaces (At-a-Glance, Executive Read) rendered the engine
 * buildCostBreakdown().total while the Cost tab + PDF rendered the per-template
 * band for T-02/T-06/T-07/T-08 — so a T-02 MFH showed two different headline
 * ranges (engine €30,900–57,800 vs band €28,000–55,000) on one deliverable.
 * Every surface now derives the headline range from THIS: the band for
 * band-templates, the engine total otherwise.
 */
export function resolveHeadlineCostRange(
  templateId: TemplateId | undefined | null,
  engineTotal: CostBucket,
): CostBucket {
  if (isHeadlineBandTemplate(templateId)) {
    const band = costBandFor(templateId)
    return { min: band.lower, max: band.upper }
  }
  return engineTotal
}
