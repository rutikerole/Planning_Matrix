// ───────────────────────────────────────────────────────────────────────
// v1.0.19 — Canonical procedure resolver.
//
// Single source of truth for "which Verfahrensart applies to this
// case". v1.0.18 had THREE renderers (Areas B body / Procedures card
// / Key Data Verfahren Indikation row) each deriving the procedure
// independently from different state fields — producing internally
// contradictory PDFs (page 4 said verfahrensfrei, page 7 said § 64
// vereinfachtes ERFORDERLICH, page 10 said verfahrensfrei). A Bauamt
// clerk would reject such a brief as inconsistent.
//
// This module owns the decision. exportPdf calls resolveProcedure
// ONCE and threads the ProcedureDecision through all three renderers.
//
// SCOPE NOTE. v1.0.19 ships NRW Sanierung baseline + stubs for
// other Bundesländer + other intents (returning generic 'standard'
// with caveats). Bayern's existing detectProcedure path in
// costNormsMuenchen.ts is deliberately NOT migrated this sprint —
// Bayern SHA invariant locks BAYERN_DELTA + MUENCHEN_BLOCK +
// composeLegalContext. v1.0.20+ unifies once the resolver covers
// every state-intent combination.
//
// NRW SANIERUNG DECISION TREE (for the Königsallee fixture case):
//
//   denkmalschutz OR ensembleschutz → 'standard'    (§ 65 + DSchG)
//   eingriff_tragende_teile        → 'vereinfachtes' (§ 64)
//   aenderung_aeussere_erscheinung → 'vereinfachtes' (§ 64)
//   eingriff_aussenhuelle (only)   → 'verfahrensfrei' (§ 62)
//   otherwise                       → 'bauvoranfrage'  (§ 71)
// ───────────────────────────────────────────────────────────────────────

import type { BundeslandCode } from './states/_types'
import type { ProjectState, TemplateId } from '@/types/projectState'
import type { ProjectRow } from '@/types/db'
import { getStateLocalization } from './stateLocalization'

export type ProcedureKind =
  | 'verfahrensfrei' // § 62/61 BauO — no permit needed
  | 'genehmigungsfreigestellt' // § 63 — notification, 1-month wait
  | 'vereinfachtes' // § 64 — simplified permit
  | 'standard' // § 65 — full permit
  | 'bauvoranfrage' // § 71 — precursor query

export type ProcedureIntent =
  | 'sanierung'
  | 'neubau'
  | 'umnutzung'
  | 'anbau'
  | 'aufstockung'
  | 'abbruch'
  | 'sonstiges'

/**
 * Map TemplateId → intent. T-01/T-02 are Neubau; T-03 is Sanierung;
 * T-04 is Umnutzung; T-05 is Abbruch; T-06 is Aufstockung; T-07 is
 * Anbau; T-08 catch-all is Sonstiges.
 */
export function intentFromTemplate(templateId: TemplateId): ProcedureIntent {
  switch (templateId) {
    case 'T-01':
    case 'T-02':
      return 'neubau'
    case 'T-03':
      return 'sanierung'
    case 'T-04':
      return 'umnutzung'
    case 'T-05':
      return 'abbruch'
    case 'T-06':
      return 'aufstockung'
    case 'T-07':
      return 'anbau'
    case 'T-08':
    default:
      return 'sonstiges'
  }
}

export interface ProcedureCaveat {
  kind:
    | 'gestaltungssatzung'
    | 'bebauungsplan_specific'
    | 'denkmalschutz_check'
    | 'abstand_pruefung'
    | 'nachbarbeteiligung'
  message_de: string
  message_en: string
}

export interface ProcedureCase {
  intent: ProcedureIntent
  bundesland: BundeslandCode
  /** Eingriff in tragende Teile (structural). */
  eingriff_tragende_teile: boolean
  /** Eingriff in Gebäudehülle (façade insulation, window swap, etc.). */
  eingriff_aussenhuelle: boolean
  denkmalschutz: boolean
  ensembleschutz: boolean
  /** Wesentliche Änderung der äußeren Erscheinung — independent of
   *  whether the work touches the façade physically. */
  aenderung_aeussere_erscheinung?: boolean
  grenzstaendig?: boolean
  in_gestaltungssatzung?: boolean
  fassadenflaeche_m2?: number
  // v1.0.21 Bug E — hard-blocker fact channels. When any of these is
  // set, the resolver short-circuits to a 'bauvoranfrage' decision
  // with explicit blocker reasoning so the Procedure tab + PDF page 7
  // + Top-3 cannot quietly emit "Simplified building permit · REQUIRED"
  // on an inadmissible project.
  /** MK-Gebietsart (Kerngebiet) — admissibility depends on §§ 7
   *  BauNVO + local Bebauungsplan, must be cleared before any
   *  procedure determination. */
  mk_gebietsart?: boolean
  /** Composite hard-blocker flag set by upstream Planungsrecht
   *  reasoning (e.g. by the chat persona) — used as an escape hatch
   *  when the specific blocker isn't enumerated here yet. */
  bauvoranfrage_hard_blocker?: boolean
  /** Sprint 1 (RED-1) — number of Sonderbau triggers the persona computed
   *  (e.g. anzahl_sonderbau_tatbestaende = 2 for a Großgarage + KiTa). ≥ 1
   *  forces the full regular procedure (§ 65 BauO NRW etc.) and removes
   *  Genehmigungsfreistellung (§ 63) and the simplified procedure (§ 64) from
   *  eligibility — the German Baurecht rule a GK5 + Sonderbau building must
   *  follow. Replaces the dead `sonderbau_scope` boolean, which keyed off a
   *  fact the persona never wrote (`factBool('sonderbau_scope')` was always
   *  false), so the rule never fired. */
  sonderbau_count?: number
  /** v1.0.28 Bug 52 — the persona's synthesized procedure conclusion
   *  (e.g. "verfahrensfrei nach § 62 BauO NRW"), read from the
   *  `verfahren_indikation` / `PROCEDURE.TYPE` fact. When it states the
   *  permit-free direction, the resolver honors it instead of the
   *  template-blind generic branch (which would emit the regular permit
   *  for an Abbruch and contradict the state-correct persona fact). */
  verfahren_indikation?: string
}

/**
 * v1.0.28 Bug 52 — pull a citation token from the persona's
 * verfahren_indikation string ("verfahrensfrei nach § 62 BauO NRW" →
 * "§ 62 BauO NRW"; "BayBO Art. 57" → "BayBO Art. 57"). Returns null when
 * no recognizable citation is present.
 */
export function extractProcedureCitation(s: string): string | null {
  // T-01 RED-1 (Part B) — the optional trailing law-name token must START
  // UPPERCASE so a multi-word law name is still captured ("BauO NRW",
  // "LBauO M-V", "BauO Bln") but a verbose parenthetical / lowercase
  // continuation is NOT swallowed. Previously `(?:\s+\S+)?` greedily ate
  // "(vereinfachtes" out of "§ 66 LBauO (vereinfachtes Genehmigungsverfahren)",
  // yielding the mangled "§ 66 LBauO (vereinfachtes". Backward-compatible for
  // every existing honored value (BayBO Art. nn uses the art branch below).
  const para = s.match(
    /§\s*\d+[a-z]?(?:\s+Abs\.\s*\d+)?\s+\S+(?:\s+[A-ZÄÖÜ][\wÄÖÜäöüß.-]*)?/u,
  )
  if (para) return para[0].replace(/\s+/g, ' ').trim()
  const art = s.match(/BayBO\s+Art\.\s*\d+[a-z]?/u)
  if (art) return art[0]
  return null
}

/**
 * Sprint 0 (P2-C / RED-1) — THE single resolver for the persona's
 * procedure-type verdict out of project facts. RED-1 was the PDF and the
 * result page disagreeing because each read the verdict differently: the
 * PDF gained a free-form shape-scan (T-01 fix), but the result page still
 * hardcoded four keys and fell through to a generic "Landesbauordnung
 * {Land}" stub on any other key the model emits (procedure_likely,
 * verfahren, verfahrensart_hypothese …). Both surfaces now call THIS, so
 * the verdict can never drift between them again.
 *
 * Resolution order:
 *   1. the four canonical keys, in priority order (verfahren_indikation
 *      wins over verfahren.typ — preserves the established precedence);
 *   2. a shape-scan backstop matching any free-form verdict key the
 *      persona emits. Key match is case- and dot/underscore-insensitive
 *      and anchored, so non-verdict keys (verfahren_genehmigungspflichtig,
 *      procedure_freistellung_excluded) are excluded.
 */
const PROCEDURE_VERDICT_KEY =
  /^(verfahren(typ|indikation|sart\w*)?|procedure(likely|type|typ|vereinfacht\w*)?)$/

const EXPLICIT_VERDICT_KEYS = [
  'verfahren_indikation',
  'PROCEDURE.TYPE',
  'verfahren.typ',
  'verfahren_typ',
] as const

export function resolveVerfahrensIndikation(
  facts: ReadonlyArray<{ key: string; value: unknown }> | undefined,
): string | undefined {
  if (!facts || facts.length === 0) return undefined
  const asStr = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim().length > 0 ? v : undefined
  // 1. Canonical keys, in priority order.
  for (const key of EXPLICIT_VERDICT_KEYS) {
    const hit = asStr(facts.find((f) => f.key === key)?.value)
    if (hit) return hit
  }
  // 2. Free-form shape-scan backstop (RED-1): first fact whose normalized
  //    key matches the verdict-key shape and carries a non-empty string.
  const scan = facts.find(
    (f) =>
      PROCEDURE_VERDICT_KEY.test(f.key.toLowerCase().replace(/[._]/g, '')) &&
      asStr(f.value) !== undefined,
  )
  return asStr(scan?.value)
}

// v1.0.21 Bug E — describe an active hard blocker for the renderer.
export interface ProcedureHardBlocker {
  /** Slug for the blocker type. */
  kind: 'mk_gebietsart' | 'denkmalschutz' | 'bauvoranfrage_hard_blocker'
  labelDe: string
  labelEn: string
}

export function detectHardBlockers(c: ProcedureCase): ProcedureHardBlocker[] {
  const out: ProcedureHardBlocker[] = []
  if (c.mk_gebietsart) {
    out.push({
      kind: 'mk_gebietsart',
      labelDe: 'MK-Gebietsart (Kerngebiet — § 7 BauNVO + B-Plan-Klärung)',
      labelEn: 'MK use-type (Kerngebiet — § 7 BauNVO + B-Plan clarification)',
    })
  }
  if (c.denkmalschutz) {
    out.push({
      kind: 'denkmalschutz',
      labelDe: 'Denkmalschutz (denkmalrechtliche Erlaubnis vor Bauantrag)',
      labelEn: 'Denkmalschutz (heritage consent required before permit)',
    })
  }
  // Sprint 1 (RED-1) — Sonderbau is NO LONGER a bauvoranfrage hard blocker.
  // A Sonderbau-Tatbestand does not defer the procedure to a pre-inquiry; it
  // forces the FULL regular procedure (§ 65), which IS knowable. That rule is
  // applied in resolveProcedure() via c.sonderbau_count, before the verdict
  // branches, so a Sonderbau project resolves to standard (§ 65) — not the
  // template-default § 64 it silently fell through to before.
  if (
    c.bauvoranfrage_hard_blocker &&
    !out.some(
      (b) => b.kind === 'mk_gebietsart' || b.kind === 'denkmalschutz',
    )
  ) {
    out.push({
      kind: 'bauvoranfrage_hard_blocker',
      labelDe: 'Planungsrechtlicher Hard Blocker (Bauvoranfrage erforderlich)',
      labelEn: 'Planning-law hard blocker (pre-decision required)',
    })
  }
  return out
}

export interface ProcedureDecision {
  kind: ProcedureKind
  citation: string
  /** German one-sentence rationale (rendered as Area B body / procedure card body). */
  reasoning_de: string
  /** English one-sentence rationale. */
  reasoning_en: string
  /** Qualifier hint for the PDF qualifier pill. */
  confidence: 'CALCULATED' | 'ASSUMED'
  caveats: ReadonlyArray<ProcedureCaveat>
}

/** Localized label for a ProcedureKind. */
export function procedureLabel(
  kind: ProcedureKind,
  lang: 'de' | 'en',
): string {
  const labels: Record<ProcedureKind, { de: string; en: string }> = {
    verfahrensfrei: {
      de: 'Verfahrensfrei (Anzeige)',
      en: 'Permit-free (notification)',
    },
    genehmigungsfreigestellt: {
      de: 'Genehmigungsfreigestellt',
      en: 'Notification-only',
    },
    vereinfachtes: {
      de: 'Vereinfachtes Baugenehmigungsverfahren',
      en: 'Simplified building permit',
    },
    standard: {
      de: 'Reguläres Baugenehmigungsverfahren',
      en: 'Standard building permit',
    },
    bauvoranfrage: { de: 'Bauvoranfrage empfohlen', en: 'Preliminary inquiry recommended' },
  }
  return labels[kind][lang]
}

/** Status label for the procedure card pill. */
export function procedureStatusLabel(
  kind: ProcedureKind,
  lang: 'de' | 'en',
): string {
  if (kind === 'verfahrensfrei' || kind === 'genehmigungsfreigestellt') {
    return lang === 'de' ? 'VERFAHRENSFREI' : 'PERMIT-FREE'
  }
  return lang === 'de' ? 'ERFORDERLICH' : 'REQUIRED'
}

/**
 * Resolve the procedure decision for a given case.
 *
 * v1.0.21 Bug E — hard blockers short-circuit. If MK-Gebietsart,
 * Denkmalschutz, Sonderbau-Scope, or a generic
 * bauvoranfrage_hard_blocker fact is set, the resolver returns a
 * 'bauvoranfrage' decision with explicit blocker reasoning that lists
 * every blocker found, and tags the qualifier ASSUMED (not
 * CALCULATED) because the system has no calculation when blocked.
 * This prevents the v1.0.20 regression where Berlin × T-01 with two
 * hard blockers still rendered "Simplified building permit · REQUIRED".
 *
 * NRW Sanierung baseline is fully encoded after the hard-blocker
 * short-circuit. Other Bundesländer + other intents return a
 * conservative 'standard' decision with a bebauungsplan_specific
 * caveat so the brief is honest about the resolver not yet covering
 * the case.
 */
export function resolveProcedure(c: ProcedureCase): ProcedureDecision {
  // v1.0.21 Bug E — hard blockers first; no procedure can be decided
  // until they are cleared.
  const blockers = detectHardBlockers(c)
  if (blockers.length > 0) {
    const blockerListDe = blockers.map((b) => b.labelDe).join(' · ')
    const blockerListEn = blockers.map((b) => b.labelEn).join(' · ')
    return {
      kind: 'bauvoranfrage',
      citation:
        c.bundesland === 'nrw'
          ? '§ 71 BauO NRW (Bauvoranfrage)'
          : c.bundesland === 'bayern'
            ? 'BayBO Art. 71 (Vorbescheid)'
            : 'state-specific Voranfrage/Vorbescheid §',
      reasoning_de: `Verfahrensbestimmung zurückgestellt — Hard Blocker identifiziert: ${blockerListDe}. Verfahren kann erst nach Klärung der Zulässigkeit durch die zuständige Behörde (Bauvoranfrage) bestimmt werden.`,
      reasoning_en: `Procedure determination deferred — hard blocker(s) identified: ${blockerListEn}. The procedure cannot be set until the responsible authority confirms admissibility via a pre-decision (Bauvoranfrage / Vorbescheid).`,
      confidence: 'ASSUMED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Vorhabenkonzept kann unzulässig sein — vor jeder weiteren Planung Bauvoranfrage stellen.',
          message_en:
            'Project as currently scoped may be inadmissible — file a pre-decision (Bauvoranfrage) before any further planning.',
        },
      ],
    }
  }
  // Sprint 1 (RED-1) — SONDERBAU GATE. ≥ 1 Sonderbau-Tatbestand (Großgarage,
  // KiTa, Versammlungsstätte, …) forces the FULL regular procedure and removes
  // Genehmigungsfreistellung (§ 63) + the simplified procedure (§ 64) from
  // eligibility. This MUST run before the verfahrensfrei/vereinfacht verdict
  // branches: even if a fact mistakenly said "vereinfacht", a Sonderbau
  // building legally cannot use it. The Friedrichstraße T-02 walk proved the
  // gap — GK5 + 2 Sonderbau triggers, persona correctly said § 65, but the
  // resolver had no Sonderbau rule AND no reguläres branch, so it fell through
  // to the hardcoded NRW-neubau § 64. An explicit § 65 citation in the verdict
  // is honored; otherwise the state's regular-permit § is used.
  const viRaw = c.verfahren_indikation ?? ''
  if ((c.sonderbau_count ?? 0) >= 1) {
    const cited = extractProcedureCitation(viRaw)
    const reg = getStateLocalization(c.bundesland).procedure.regular
    const regCitation = reg.citation.trim()
    // The procedure IS the regular one (§ 65), so cite the regular §. The
    // verdict's own citation is used ONLY as a fallback for stub states with no
    // localized regular § — never to override it (a contradictory verdict that
    // said "§ 64 vereinfacht" must NOT make a Sonderbau-forced standard cite the
    // simplified §).
    const citation =
      regCitation ||
      cited ||
      'reguläres Baugenehmigungsverfahren — landesrechtliche Detail-Spezifika in Vorbereitung'
    const citeSuffix = regCitation || cited ? ` (${regCitation || cited})` : ''
    const n = c.sonderbau_count ?? 0
    return {
      kind: 'standard',
      citation,
      reasoning_de: `Mindestens ein Sonderbau-Tatbestand liegt vor (${n}) — das Vorhaben unterliegt zwingend dem regulären Baugenehmigungsverfahren${citeSuffix}. Genehmigungsfreistellung und vereinfachtes Verfahren sind ausgeschlossen.`,
      reasoning_en: `At least one Sonderbau trigger applies (${n}) — the project is subject to the full (regular) building-permit procedure${citeSuffix}. Permit exemption and the simplified procedure are excluded.`,
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Sonderbau-Anforderungen (z. B. Brandschutzkonzept, Prüfsachverständige) mit der zuständigen Bauaufsicht abstimmen.',
          message_en:
            'Coordinate Sonderbau requirements (e.g. fire-safety concept, approved experts) with the responsible building authority.',
        },
      ],
    }
  }
  // v1.0.28 Bug 52 — honor the persona's verfahrensfrei conclusion BEFORE
  // the template-blind branches. The persona writes a verfahren_indikation
  // fact after its synthesis (e.g. T-05 Abbruch Bonn: "verfahrensfrei nach
  // § 62 BauO NRW"); the generic branch below would otherwise emit the
  // regular permit (§ 65) and contradict it — the exact T-05 smoke-walk
  // defect. We honor ONLY the permit-free direction (never to downgrade a
  // permit the resolver would require) so this can't weaken a real
  // obligation. Hard blockers above still take precedence.
  const vi = viRaw.toLowerCase()
  if (/verfahrensfrei|verfahrensfreiheit|permit-free|genehmigungsfrei/.test(vi)) {
    const cited = extractProcedureCitation(c.verfahren_indikation ?? '')
    const freeCitation =
      cited ?? getStateLocalization(c.bundesland).procedure.free?.citation ?? ''
    return {
      kind: 'verfahrensfrei',
      citation: freeCitation || (c.verfahren_indikation ?? '').trim(),
      reasoning_de: `Verfahrensfrei${freeCitation ? ` nach ${freeCitation}` : ''} — kein Bauantrag und keine förmliche Anzeige erforderlich. Pflichten ergeben sich aus dem Nebenrecht (z. B. Schadstoff- und Entsorgungsrecht); Verfahrensfreiheit mit der unteren Bauaufsichtsbehörde bestätigen.`,
      reasoning_en: `Permit-free${freeCitation ? ` under ${freeCitation}` : ''} — no building application and no formal notification required. Obligations arise from ancillary law (e.g. hazardous-materials and waste law); confirm the permit-free status with the lower building authority.`,
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Verfahrensfreiheit vor Arbeitsbeginn mit der unteren Bauaufsichtsbehörde bestätigen — bei Sonderbau-Tatbeständen oder höherer Gebäudeklasse kann eine Genehmigungspflicht greifen.',
          message_en:
            'Confirm permit-free status with the lower building authority before work begins — a Sonderbau scope or higher building class can reinstate a permit requirement.',
        },
      ],
    }
  }
  // v1.0.29 Bug 79 + Bug 73 — honor the persona's SIMPLIFIED-permit conclusion
  // the same way Bug 52 honors verfahrensfrei. The T-02 Hamburg walk's persona
  // concluded "Vereinfachtes Baugenehmigungsverfahren § 61 HBauO", but the
  // template-blind generic branch below emitted the REGULAR permit ("regulär")
  // with ASSUMED confidence — contradicting the state-correct persona fact on
  // PDF pages 4 + 7 and downgrading the qualifier. Honor the cited simplified
  // procedure with CALCULATED confidence (the persona reasoned it from intent +
  // Gebäudeklasse + non-Sonderbau across multiple rounds). Hard blockers +
  // verfahrensfrei above still take precedence; never used to downgrade a
  // permit the resolver would itself require.
  if (/vereinfacht|simplified/.test(vi)) {
    const cited = extractProcedureCitation(c.verfahren_indikation ?? '')
    const simpCitation = cited ?? ''
    return {
      kind: 'vereinfachtes',
      citation: simpCitation || (c.verfahren_indikation ?? '').trim(),
      reasoning_de: `Vereinfachtes Baugenehmigungsverfahren${simpCitation ? ` nach ${simpCitation}` : ''} — Bauantrag erforderlich; das Bauamt prüft Planungsrecht und örtliche Bauvorschriften, die bauvorlageberechtigte Person haftet für die übrige Materie.`,
      reasoning_en: `Simplified building permit${simpCitation ? ` under ${simpCitation}` : ''} — a building application is required; the authority reviews planning law and local building rules, the submission-authorized planner is liable for the remaining substance.`,
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Anwendbarkeit des vereinfachten Verfahrens mit dem lokalen Bauamt bestätigen; bei Sonderbau-Tatbeständen greift das reguläre Verfahren.',
          message_en:
            'Confirm applicability of the simplified procedure with the local building authority; a Sonderbau scope reinstates the regular procedure.',
        },
      ],
    }
  }
  // Sprint 1 (RED-1) — honor the persona's REGULAR/standard verdict, the third
  // verdict direction (alongside verfahrensfrei + vereinfacht above). Before
  // this branch, a persona conclusion of "§ 65 BauO NRW — reguläres
  // Baugenehmigungsverfahren" matched NEITHER the verfahrensfrei nor the
  // vereinfacht regex and fell through to the template-default neubau branch
  // (§ 64), silently DOWNGRADING a stricter, correctly-computed obligation.
  // Honoring an upgrade to the full procedure can never weaken a requirement.
  // Guard against the simplified label, whose name also contains
  // "Baugenehmigungsverfahren".
  if (/regul[äa]r|standard/.test(vi) && !/vereinfacht|simplified|frei/.test(vi)) {
    const cited = extractProcedureCitation(viRaw)
    const reg = getStateLocalization(c.bundesland).procedure.regular
    const citation = cited ?? (reg.citation.trim() || viRaw.trim())
    return {
      kind: 'standard',
      citation,
      reasoning_de: `Reguläres Baugenehmigungsverfahren${citation ? ` (${citation})` : ''} — vollständige bauaufsichtliche Prüfung. Bauantrag mit allen Bauvorlagen erforderlich.`,
      reasoning_en: `Standard (full) building-permit procedure${citation ? ` (${citation})` : ''} — full building-authority review. A building application with all required documents is needed.`,
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Verfahrensart mit dem lokalen Bauamt bestätigen; Prüfumfang und Fachgutachten je nach Gebäudeklasse und Sonderbau-Tatbestand.',
          message_en:
            'Confirm the procedure with the local building authority; review scope and specialist reports depend on the building class and any Sonderbau scope.',
        },
      ],
    }
  }
  if (c.bundesland === 'nrw' && c.intent === 'sanierung') {
    return resolveNrwSanierung(c)
  }
  if (c.bundesland === 'nrw' && c.intent === 'neubau') {
    return {
      kind: 'vereinfachtes',
      citation: '§ 64 BauO NRW',
      reasoning_de:
        'Neubau löst Bauantragspflicht aus; Vereinfachtes Verfahren regelmäßig anwendbar.',
      reasoning_en:
        'New construction triggers building-permit obligation; simplified procedure typically applicable.',
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Konkreten Bebauungsplan und Gestaltungssatzung mit Bauamt verifizieren.',
          message_en:
            'Verify specific Bebauungsplan and Gestaltungssatzung with the local Bauamt.',
        },
      ],
    }
  }
  // v1.0.30 Bug 90 + 91 + 92 — use-conversion (T-04). A use change that
  // cleared the hard-blocker gate above is a NON-Sonderbau permit case: the
  // building-permit obligation is CALCULATED (intent + non-Sonderbau, since a
  // Sonderbau scope would have short-circuited to bauvoranfrage), and for a
  // non-Sonderbau use change the SIMPLIFIED procedure is the correct baseline
  // (§ 63 SächsBO / § 64 BauO NRW etc.) — NOT the "(regulär)" new-build label
  // the generic branch below emits (Bug 91), and NOT ASSUMED (Bug 90). This
  // converges the PDF resolver with the web baseline, which already returns
  // loc.procedure.simplified for umnutzung (deriveBaselineProcedure.ts:98-107)
  // — Bug 92. The verfahrensfrei/vereinfacht keyword branches above still take
  // precedence whenever the persona stated one explicitly.
  if (c.intent === 'umnutzung') {
    const loc = getStateLocalization(c.bundesland)
    const simp = loc.procedure.simplified
    const simpCitation = simp.citation.trim()
    const hasCitation = simpCitation.length > 0
    return {
      kind: 'vereinfachtes',
      citation: hasCitation
        ? simpCitation
        : 'landesrechtliche Detail-Spezifika in Vorbereitung',
      reasoning_de: hasCitation
        ? `Nutzungsänderung ist genehmigungspflichtig; für nicht-Sonderbauten regelmäßig im vereinfachten Verfahren (${simpCitation}). Verfahrensart und etwaige Sonderbau-Tatbestände mit dem lokalen Bauamt bestätigen.`
        : `Nutzungsänderung ist genehmigungspflichtig; für nicht-Sonderbauten regelmäßig im vereinfachten Verfahren — konkrete Verfahrensart (landesrechtliche Detail-Spezifika in Vorbereitung) mit dem lokalen Bauamt bestätigen.`,
      reasoning_en: hasCitation
        ? `A use change requires a building permit; for non-Sonderbau cases typically via the simplified procedure (${simpCitation}). Confirm the procedure type and any Sonderbau scope with the local building authority.`
        : `A use change requires a building permit; for non-Sonderbau cases typically via the simplified procedure (state-specific details being finalized) — confirm the procedure type with the local building authority.`,
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'bebauungsplan_specific',
          message_de:
            'Anwendbarkeit des vereinfachten Verfahrens mit dem lokalen Bauamt bestätigen; bei Sonderbau-Tatbeständen greift das reguläre Verfahren.',
          message_en:
            'Confirm applicability of the simplified procedure with the local building authority; a Sonderbau scope reinstates the regular procedure.',
        },
      ],
    }
  }
  // Generic branch for unmigrated states/intents.
  //
  // v1.0.25 Bug 26 fix — was `§ 65 BauO ${c.bundesland.toUpperCase()}`,
  // which fabricated non-existent citations for every stub state
  // ("§ 65 BauO SACHSEN", "§ 65 BauO BERLIN", …) and shipped them to
  // the PDF Areas-B body, Procedure card, and Key-Data row. Now drives
  // the citation off getStateLocalization — the SAME source the result
  // tab's deriveBaselineProcedure.ts:57-68 already uses — so the PDF
  // and tab resolvers converge:
  //   • substantive states (NRW/BW/Hessen/Niedersachsen) → real
  //     regular-permit § from the localization pack;
  //   • stub states (empty pack citation) → honest "Detail-Spezifika
  //     in Vorbereitung" framing, NEVER a fabricated §.
  // Bayern never reaches this branch (it resolves via detectProcedure
  // in costNormsMuenchen.ts), so the Bayern SHA is untouched.
  const loc = getStateLocalization(c.bundesland)
  const reg = loc.procedure.regular
  const hasCitation = reg.citation.trim().length > 0
  return {
    kind: 'standard',
    citation: hasCitation
      ? reg.citation
      : `${reg.nameDe} — landesrechtliche Detail-Spezifika in Vorbereitung`,
    // Phase-C item #2 F7 — drop the redundant ${reg.nameDe} interpolation: the
    // sentence already names the procedure ("Reguläres Baugenehmigungsverfahren"),
    // and reg.nameDe is "Baugenehmigungsverfahren (regulär)", which doubled the
    // term ("Reguläres Baugenehmigungsverfahren (Baugenehmigungsverfahren …".
    reasoning_de: hasCitation
      ? `Reguläres Baugenehmigungsverfahren (${reg.citation}) als Ausgangspunkt; konkrete Verfahrensart mit dem lokalen Bauamt bestätigen.`
      : `Verfahrensart für ${loc.labelDe} vorbehaltlich landesrechtlicher Detail-Spezifika (in Vorbereitung) — bitte mit dem lokalen Bauamt klären.`,
    reasoning_en: hasCitation
      ? `Standard building permit (${reg.citation}) as the starting point; confirm the specific procedure with the local building authority.`
      : `Procedure for ${loc.labelEn} subject to state-specific details (being finalized) — please confirm with the local building authority.`,
    confidence: 'ASSUMED',
    // Phase-C item #2 F8 — the "landesspezifische Detailregeln noch nicht
    // vollständig hinterlegt" caveat is honest only when we lack the regular §.
    // With a corpus/hand-coded § present (all 16 states), the reasoning already
    // hedges ("konkrete Verfahrensart … bestätigen"); the stale "not yet encoded"
    // bullet misrepresents real coverage, so it is emitted only when !hasCitation.
    caveats: hasCitation
      ? []
      : [
          {
            kind: 'bebauungsplan_specific',
            message_de:
              'Spezifische Verfahrensart mit lokalem Bauamt klären — landesspezifische Detailregeln noch nicht vollständig hinterlegt.',
            message_en:
              'Confirm specific procedure with the local building authority — state-specific detail rules not yet fully encoded.',
          },
        ],
  }
}

function resolveNrwSanierung(c: ProcedureCase): ProcedureDecision {
  if (c.denkmalschutz || c.ensembleschutz) {
    return {
      kind: 'standard',
      citation: '§ 65 BauO NRW + Denkmalschutzgesetz NRW',
      reasoning_de:
        'Denkmalschutz erfordert immer Baugenehmigung; zusätzlich Erlaubnis der Denkmalschutzbehörde.',
      reasoning_en:
        'Heritage protection always requires a building permit plus separate consent from the heritage authority.',
      confidence: 'CALCULATED',
      caveats: [
        {
          kind: 'denkmalschutz_check',
          message_de:
            'Untere Denkmalbehörde Düsseldorf konsultieren; Erlaubnis vor Baubeginn.',
          message_en:
            'Consult the local heritage authority before construction begins.',
        },
      ],
    }
  }
  if (c.eingriff_tragende_teile) {
    return {
      kind: 'vereinfachtes',
      citation: '§ 64 BauO NRW',
      reasoning_de:
        'Eingriff in tragende Teile löst Bauantrag im vereinfachten Verfahren aus.',
      reasoning_en:
        'Intervention in load-bearing elements triggers a simplified building-permit application.',
      confidence: 'CALCULATED',
      caveats: [],
    }
  }
  if (c.aenderung_aeussere_erscheinung) {
    return {
      kind: 'vereinfachtes',
      citation: '§ 64 BauO NRW',
      reasoning_de:
        'Wesentliche Änderung der äußeren Erscheinung erfordert Bauantrag.',
      reasoning_en:
        'Substantial change to the external appearance requires a building permit.',
      confidence: 'CALCULATED',
      caveats: [],
    }
  }
  if (c.eingriff_aussenhuelle) {
    const caveats: ProcedureCaveat[] = [
      {
        kind: 'gestaltungssatzung',
        message_de:
          'In innerstädtischen Erhaltungs-/Gestaltungssatzungslagen kann eine Genehmigungspflicht bestehen — mit Stadtarchiv bzw. Bauamt verifizieren.',
        message_en:
          'A Gestaltungssatzung may apply in inner-city preservation zones — verify with Stadtarchiv or local Bauamt.',
      },
    ]
    if (c.grenzstaendig || (c.fassadenflaeche_m2 ?? 0) > 100) {
      caveats.push({
        kind: 'abstand_pruefung',
        message_de:
          'Bei grenznaher Lage Abstandsflächen prüfen — § 6 Abs. 8 BauO NRW erlaubt bis 25 cm Dämmungsprojektion ohne Nachbarunterschrift.',
        message_en:
          'Verify Abstandsflächen for parcel-edge cases — § 6 Abs. 8 BauO NRW permits up to 25 cm insulation projection without neighbour consent.',
      })
    }
    return {
      kind: 'verfahrensfrei',
      citation: '§ 62 BauO NRW',
      reasoning_de:
        'Fassadendämmung/Fensterwechsel ohne wesentliche Änderung der äußeren Erscheinung und ohne Eingriff in tragende Teile sind verfahrensfrei.',
      reasoning_en:
        'Façade insulation and window replacement without substantial change to the external appearance and without structural intervention are permit-free.',
      confidence: 'CALCULATED',
      caveats,
    }
  }
  return {
    kind: 'bauvoranfrage',
    citation: '§ 71 BauO NRW',
    reasoning_de:
      'Verfahrensart aus den vorliegenden Angaben nicht eindeutig ableitbar — Bauvoranfrage empfohlen.',
    reasoning_en:
      'Procedure not unambiguously derivable from available facts — preliminary inquiry recommended.',
    confidence: 'ASSUMED',
    caveats: [
      {
        kind: 'bebauungsplan_specific',
        message_de:
          'Konkrete Maßnahmen und Bebauungsplan mit Bauamt klären.',
        message_en:
          'Clarify specific scope and Bebauungsplan with the local building authority.',
      },
    ],
  }
}

// ───────────────────────────────────────────────────────────────────────
// Sprint 1 (RED-1) — SHARED ProcedureCase builder.
//
// Before this, exportPdf built the ProcedureCase inline and the result tabs
// (At-a-Glance / Executive Read / Procedure tab) didn't build one at all —
// they read the template baseline (deriveBaselineProcedure) and ignored the
// persona's computed verdict + Sonderbau facts entirely. That is why the same
// project showed "§ 65 reguläres" on Key Data / Legal landscape but
// "§ 64 simplified · likely" on every narrative surface. One builder, read by
// the PDF AND the result-page resolver, makes the surfaces converge on ONE
// decision derived facts-first.
//
// Fact reads are shape-tolerant (the persona emits free-form keys). Boolean
// fields use the STRICT affirmative whitelist (true/'true'/'JA'/'ja') — the
// original exportPdf semantics, so a descriptive value like
// "nicht bekannt an der Einheit" reads false, NOT true. The Sonderbau count
// reads the explicit count fact, with a NEGATION-AWARE trigger fallback so
// "sonderbau_trigger = nein — Gaststätte < 60 Gäste" is correctly read as
// "no Sonderbau", not as a trigger.
// ───────────────────────────────────────────────────────────────────────

interface FactLike {
  key: string
  value: unknown
}

/** Strict affirmative — boolean ProcedureCase fields (matches original exportPdf). */
function factAffirmative(v: unknown): boolean {
  return v === true || v === 'true' || v === 'JA' || v === 'ja'
}

/** A free-form Sonderbau-trigger value is "present" unless empty or it starts
 *  with a negation (nein/kein/nicht/no/false/keine/entfällt/—). */
function sonderbauTriggerPresent(v: unknown): boolean {
  if (v === true) return true
  if (typeof v === 'number') return v > 0
  if (typeof v === 'string') {
    const t = v.trim().toLowerCase()
    if (t.length === 0) return false
    return !/^(false|nein|no|0|keine?|kein|none|nicht|n\/a|entf[äa]llt|-|–|—)\b/.test(t)
  }
  return false
}

/**
 * Count the Sonderbau triggers the persona computed. Shape-tolerant:
 *   1. an explicit count fact (key contains "sonderbau" AND "anzahl") wins;
 *   2. otherwise, the number of distinct AFFIRMATIVE Sonderbau-trigger facts
 *      (key contains "sonderbau", excluding the count key, value not negated).
 * Returns 0 when no Sonderbau signal is present.
 */
export function detectSonderbauCount(
  facts: ReadonlyArray<FactLike> | undefined,
): number {
  if (!facts || facts.length === 0) return 0
  for (const f of facts) {
    const k = f.key.toLowerCase().replace(/[._\s-]/g, '')
    if (k.includes('sonderbau') && k.includes('anzahl')) {
      const n =
        typeof f.value === 'number' ? f.value : parseInt(String(f.value), 10)
      if (Number.isFinite(n)) return n
    }
  }
  let count = 0
  for (const f of facts) {
    const k = f.key.toLowerCase().replace(/[._\s-]/g, '')
    if (
      k.includes('sonderbau') &&
      !k.includes('anzahl') &&
      sonderbauTriggerPresent(f.value)
    ) {
      count += 1
    }
  }
  return count
}

/**
 * Build the canonical ProcedureCase from a project + its state, reading the
 * persona's facts. THE single construction site — exportPdf and the result-page
 * resolveProcedures() both call this so the PDF and the web surfaces decide the
 * procedure from identical inputs.
 */
export function buildProcedureCase(
  project: Pick<ProjectRow, 'bundesland' | 'intent'>,
  state: Partial<ProjectState>,
): ProcedureCase {
  const facts: FactLike[] = state.facts ?? []
  const factBool = (key: string, fallback = false): boolean => {
    const f = facts.find((x) => x.key === key)
    if (!f) return fallback
    return factAffirmative(f.value)
  }
  const factNum = (key: string): number | undefined => {
    const f = facts.find((x) => x.key === key)
    if (!f) return undefined
    if (typeof f.value === 'number') return f.value
    const n = Number(f.value)
    return Number.isFinite(n) ? n : undefined
  }
  return {
    intent: intentFromTemplate((state.templateId ?? 'T-03') as TemplateId),
    bundesland: (project.bundesland ?? 'nrw') as BundeslandCode,
    eingriff_tragende_teile: factBool('eingriff_tragende_teile'),
    eingriff_aussenhuelle: factBool('eingriff_aussenhuelle', true),
    denkmalschutz: factBool('denkmalschutz'),
    ensembleschutz: factBool('ensembleschutz'),
    aenderung_aeussere_erscheinung: factBool('aenderung_aeussere_erscheinung'),
    grenzstaendig: factBool('grenzstaendig'),
    in_gestaltungssatzung: factBool('in_gestaltungssatzung'),
    fassadenflaeche_m2: factNum('fassadenflaeche_m2'),
    mk_gebietsart: factBool('mk_gebietsart'),
    bauvoranfrage_hard_blocker: factBool('bauvoranfrage_hard_blocker'),
    sonderbau_count: detectSonderbauCount(facts),
    verfahren_indikation: resolveVerfahrensIndikation(facts),
  }
}
