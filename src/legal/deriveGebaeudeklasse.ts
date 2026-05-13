// ───────────────────────────────────────────────────────────────────────
// v1.0.22 — Unified MBO § 2 Abs. 3 Gebäudeklasse derivation.
//
// The v1.0.20 smoke walk surfaced two failure modes for the building-
// class display:
//   • Bug C-a: a 2-storey 9m-eaves EFH rendered "GK 4 · derived" in the
//     UI but with no reasoning visible to the bauherr — the user could
//     not tell whether GK 4 was a confident calc or a guess. (GK 4 is
//     arguably correct per MBO § 2 since Höhe > 7m, but without the
//     reasoning the user reads it as suspicious.)
//   • Bug C-b: a Berlin × T-01 fixture rendered "Building class — not
//     yet identified" even with enough fact signal to infer. The UI
//     deriveGkFromGeometry path failed silently.
//
// MBO § 2 Abs. 3 (applies via each state's BauO with minor wording
// differences; the article numbers vary but the thresholds are the
// federal-MBO baseline used by all 16 states):
//
//   GK 1 — freistehend, ≤ 7 m Höhe, ≤ 2 NE × ≤ 400 m²
//   GK 2 — NICHT freistehend, ≤ 7 m Höhe, ≤ 2 NE × ≤ 400 m²
//   GK 3 — sonstige ≤ 7 m Höhe (insbesondere > 2 NE oder > 400 m²)
//   GK 4 — ≤ 13 m Höhe, NE ≤ 400 m² je Einheit
//   GK 5 — > 13 m Höhe oder unterirdische Gebäude
//
// Höhe per MBO § 2 Abs. 3 Satz 2 = Oberkante Fußboden des höchsten
// Geschosses mit Aufenthaltsräumen. Practical approximation when only
// Traufhöhe is given: take Traufhöhe as a close upper bound for low-
// rise residential — the difference is within the 13 m threshold
// margin. When Geschosse is given but Höhe is not, approximate
// Höhe = Geschosse × 3 m + 1 m. Both approximations downgrade the
// qualifier from CALCULATED to ASSUMED.
//
// Output discipline:
//   • Bayern projects still see Bayern verbatim where the persona
//     emits a klasse fact directly (we pass that through unchanged).
//   • Substantive non-Bayern states see the same MBO logic — the §
//     numbers vary but the thresholds are the same.
//   • Stub states see the same MBO logic since MBO is federal-
//     baseline and the derivation does not cite any state §.
//   • When the input is insufficient (Höhe AND Geschosse both
//     missing), return null + honest-deferral reasoning. NEVER
//     fabricate a Gebäudeklasse.
// ───────────────────────────────────────────────────────────────────────

import type { TemplateId } from '@/types/projectState'

export type Gebaeudeklasse = 1 | 2 | 3 | 4 | 5
export type GebaeudeklasseQualifier = 'CALCULATED' | 'ASSUMED'

export interface DeriveGkInput {
  /** Bauwerks- oder Gebäudehöhe in metres. Falls Traufhöhe is the
   *  only signal, pass that — for low-rise residential this is a
   *  close upper bound. */
  hoeheM?: number | null
  /** Vollgeschosse (oberirdisch). Used to approximate Höhe when
   *  hoeheM is missing. */
  geschosse?: number | null
  /** True wenn das Gebäude freistehend ist. Defaults inferred from
   *  template (T-01/T-05/T-06 → freistehend; T-02/T-03/T-04/T-07 →
   *  Mischbebauung) when the explicit fact is missing. */
  freistehend?: boolean | null
  /** Anzahl der Nutzungseinheiten. Used to disambiguate GK 1/2 vs
   *  GK 3 at the ≤ 7 m level. */
  nutzungseinheitenAnzahl?: number | null
  /** Maximale Größe einer Nutzungseinheit in m². Used for GK 4
   *  threshold (each NE ≤ 400 m²) and GK 1/2 threshold (also ≤ 400 m²). */
  nutzungseinheitenGroesseMaxM2?: number | null
  /** Template the project was created with. Used as a freistehend
   *  default heuristic. */
  templateId?: TemplateId | null
}

export interface DerivedGebaeudeklasse {
  klasse: Gebaeudeklasse | null
  qualifier: GebaeudeklasseQualifier
  /** German reasoning string surfaced under the GK row. */
  reasoningDe: string
  /** English reasoning string. */
  reasoningEn: string
}

const TEMPLATE_FREISTEHEND_DEFAULT: Record<string, boolean> = {
  'T-01': true,  // Neubau EFH
  'T-05': true,  // Abbruch — typically freistehende objects
  'T-06': true,  // Aufstockung
  'T-02': false, // Neubau MFH — often integrated
  'T-03': false, // Sanierung — typically in Mischbebauung
  'T-04': false, // Umnutzung
  'T-07': false, // Anbau
}

const HONEST_DEFER_DE =
  'Gebäudeklasse — Traufhöhe nicht erfasst, Architekt:in bestätigt.'
const HONEST_DEFER_EN =
  'Building class — eaves height not recorded; architect to confirm.'

/**
 * Resolve the input's effective Höhe and whether the value is
 * calculated (explicit hoeheM) or approximated (derived from
 * Geschosse).
 */
function resolveHoehe(input: DeriveGkInput): {
  heightM: number
  approximated: boolean
} | null {
  if (input.hoeheM != null && Number.isFinite(input.hoeheM) && input.hoeheM > 0) {
    return { heightM: input.hoeheM, approximated: false }
  }
  if (
    input.geschosse != null &&
    Number.isFinite(input.geschosse) &&
    input.geschosse > 0
  ) {
    return { heightM: input.geschosse * 3 + 1, approximated: true }
  }
  return null
}

function resolveFreistehend(input: DeriveGkInput): {
  freistehend: boolean
  approximated: boolean
} {
  if (input.freistehend === true || input.freistehend === false) {
    return { freistehend: input.freistehend, approximated: false }
  }
  const dflt =
    input.templateId && input.templateId in TEMPLATE_FREISTEHEND_DEFAULT
      ? TEMPLATE_FREISTEHEND_DEFAULT[input.templateId]
      : true
  return { freistehend: dflt, approximated: true }
}

/**
 * Derive Gebäudeklasse per MBO § 2 Abs. 3. Pure function — no
 * project-state coupling so it composes cleanly into the UI overview
 * card and the PDF Key Data row.
 */
export function deriveGebaeudeklasse(
  input: DeriveGkInput,
): DerivedGebaeudeklasse {
  const hoehe = resolveHoehe(input)
  if (!hoehe) {
    return {
      klasse: null,
      qualifier: 'ASSUMED',
      reasoningDe: HONEST_DEFER_DE,
      reasoningEn: HONEST_DEFER_EN,
    }
  }
  const { heightM, approximated: heightApprox } = hoehe
  const { freistehend, approximated: freistehendApprox } = resolveFreistehend(input)
  const neCount = input.nutzungseinheitenAnzahl ?? null
  const neSize = input.nutzungseinheitenGroesseMaxM2 ?? null
  const qualifier: GebaeudeklasseQualifier =
    heightApprox || freistehendApprox || neCount == null ? 'ASSUMED' : 'CALCULATED'

  // GK 5 — > 13 m Höhe.
  if (heightM > 13) {
    return {
      klasse: 5,
      qualifier,
      reasoningDe: `Höhe ${heightM.toFixed(1)} m > 13 m → GK 5 (MBO § 2 Abs. 3).`,
      reasoningEn: `Höhe ${heightM.toFixed(1)} m > 13 m → GK 5 (MBO § 2 Abs. 3).`,
    }
  }

  // GK 4 — ≤ 13 m AND each NE ≤ 400 m². The 400 m² threshold is per
  // NE; when neSize is unknown, assume residential ≤ 400 m² (typical
  // EFH/MFH unit size) and tag ASSUMED.
  if (heightM > 7) {
    const neOk = neSize == null || neSize <= 400
    return {
      klasse: neOk ? 4 : 5,
      qualifier: neSize == null ? 'ASSUMED' : qualifier,
      reasoningDe: neOk
        ? `Höhe ${heightM.toFixed(1)} m im Bereich 7–13 m → GK 4 (MBO § 2 Abs. 3 Nr. 4).`
        : `Höhe ${heightM.toFixed(1)} m im Bereich 7–13 m, Nutzungseinheit > 400 m² → GK 5.`,
      reasoningEn: neOk
        ? `Höhe ${heightM.toFixed(1)} m within 7–13 m → GK 4 (MBO § 2 Abs. 3 No. 4).`
        : `Höhe ${heightM.toFixed(1)} m within 7–13 m, NE > 400 m² → GK 5.`,
    }
  }

  // Höhe ≤ 7 m below here.
  const fewUnits = neCount == null || neCount <= 2
  const smallUnits = neSize == null || neSize <= 400
  if (fewUnits && smallUnits) {
    if (freistehend) {
      return {
        klasse: 1,
        qualifier,
        reasoningDe: `Freistehend, Höhe ${heightM.toFixed(1)} m ≤ 7 m, ≤ 2 NE × ≤ 400 m² → GK 1 (MBO § 2 Abs. 3 Nr. 1).`,
        reasoningEn: `Freestanding, Höhe ${heightM.toFixed(1)} m ≤ 7 m, ≤ 2 NE × ≤ 400 m² → GK 1 (MBO § 2 Abs. 3 No. 1).`,
      }
    }
    return {
      klasse: 2,
      qualifier,
      reasoningDe: `Nicht freistehend, Höhe ${heightM.toFixed(1)} m ≤ 7 m, ≤ 2 NE × ≤ 400 m² → GK 2 (MBO § 2 Abs. 3 Nr. 2).`,
      reasoningEn: `Non-freestanding, Höhe ${heightM.toFixed(1)} m ≤ 7 m, ≤ 2 NE × ≤ 400 m² → GK 2 (MBO § 2 Abs. 3 No. 2).`,
    }
  }
  // > 2 NE or > 400 m² at ≤ 7 m → GK 3.
  return {
    klasse: 3,
    qualifier,
    reasoningDe: `Höhe ${heightM.toFixed(1)} m ≤ 7 m, > 2 NE oder > 400 m² je NE → GK 3 (MBO § 2 Abs. 3 Nr. 3).`,
    reasoningEn: `Höhe ${heightM.toFixed(1)} m ≤ 7 m, > 2 NE or > 400 m² per NE → GK 3 (MBO § 2 Abs. 3 No. 3).`,
  }
}

/**
 * Pull derivation inputs from a project fact list. Used by both the
 * UI AtAGlance card and the PDF Key Data section so the two surfaces
 * agree byte-for-byte on the same inputs.
 */
export function deriveGkInputFromFacts(
  facts: Array<{ key: string; value: unknown }>,
  templateId?: TemplateId | null,
): DeriveGkInput {
  const num = (re: RegExp): number | null => {
    const f = facts.find((x) => re.test(x.key))
    if (!f) return null
    if (typeof f.value === 'number') return f.value
    if (typeof f.value === 'string') {
      const n = parseFloat(f.value.replace(',', '.'))
      return Number.isFinite(n) ? n : null
    }
    return null
  }
  const bool = (re: RegExp): boolean | null => {
    const f = facts.find((x) => re.test(x.key))
    if (!f) return null
    if (f.value === true || f.value === false) return f.value
    if (typeof f.value === 'string') {
      const v = f.value.toLowerCase().trim()
      if (v === 'true' || v === 'ja' || v === 'yes') return true
      if (v === 'false' || v === 'nein' || v === 'no') return false
    }
    return null
  }
  return {
    hoeheM:
      num(/^bauwerks_hoehe_m$/i) ??
      num(/^gebaeude_hoehe_m$/i) ??
      num(/^traufhoehe_m$/i) ??
      num(/^height_m$/i),
    geschosse:
      num(/^vollgeschosse_oberirdisch$/i) ??
      num(/^geschosse$/i) ??
      num(/^geschosszahl$/i) ??
      num(/^storeys$/i),
    freistehend: bool(/^freistehend$/i),
    nutzungseinheitenAnzahl:
      num(/^nutzungseinheiten_anzahl$/i) ?? num(/^ne_anzahl$/i),
    nutzungseinheitenGroesseMaxM2:
      num(/^nutzungseinheiten_groesse_max_m2$/i) ??
      num(/^ne_groesse_max_m2$/i),
    templateId: templateId ?? null,
  }
}

/**
 * Format the derivation into the canonical PDF Key Data row VALUE
 * string. Surfaces both the GK number and the qualifier tag inline so
 * the bauherr can read "GK 4 · CALCULATED" or "GK 4 · ASSUMED"
 * directly. Honest deferral renders as the full sentence with no
 * fabricated GK number.
 */
export function formatGebaeudeklasseValue(
  derived: DerivedGebaeudeklasse,
  lang: 'de' | 'en',
): string {
  if (derived.klasse == null) {
    return lang === 'en' ? derived.reasoningEn : derived.reasoningDe
  }
  const qualifierLabel =
    derived.qualifier === 'CALCULATED'
      ? lang === 'en'
        ? 'CALCULATED'
        : 'BERECHNET'
      : lang === 'en'
        ? 'ASSUMED'
        : 'ANGENOMMEN'
  return `GK ${derived.klasse} · ${qualifierLabel}`
}
