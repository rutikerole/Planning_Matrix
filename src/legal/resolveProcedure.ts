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
import type { TemplateId } from '@/types/projectState'
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
  /** Sonderbau scope (e.g. residential ≥ 60 Stellplätze, hotels,
   *  schools) — § 50 BauO NRW / Art. 2 Abs. 4 BayBO etc.; triggers
   *  Sonderbauverfahren that this resolver does not yet cover. */
  sonderbau_scope?: boolean
}

// v1.0.21 Bug E — describe an active hard blocker for the renderer.
export interface ProcedureHardBlocker {
  /** Slug for the blocker type. */
  kind: 'mk_gebietsart' | 'denkmalschutz' | 'bauvoranfrage_hard_blocker' | 'sonderbau_scope'
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
  if (c.sonderbau_scope) {
    out.push({
      kind: 'sonderbau_scope',
      labelDe: 'Sonderbau-Tatbestand (eigene Verfahrensregeln)',
      labelEn: 'Sonderbau scope (separate procedure)',
    })
  }
  if (
    c.bauvoranfrage_hard_blocker &&
    !out.some(
      (b) =>
        b.kind === 'mk_gebietsart' ||
        b.kind === 'denkmalschutz' ||
        b.kind === 'sonderbau_scope',
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
    reasoning_de: hasCitation
      ? `Reguläres Baugenehmigungsverfahren (${reg.nameDe}, ${reg.citation}) als Ausgangspunkt; konkrete Verfahrensart mit dem lokalen Bauamt bestätigen.`
      : `Verfahrensart für ${loc.labelDe} vorbehaltlich landesrechtlicher Detail-Spezifika (in Vorbereitung) — bitte mit dem lokalen Bauamt klären.`,
    reasoning_en: hasCitation
      ? `Standard building permit (${reg.nameEn}, ${reg.citation}) as the starting point; confirm the specific procedure with the local building authority.`
      : `Procedure for ${loc.labelEn} subject to state-specific details (being finalized) — please confirm with the local building authority.`,
    confidence: 'ASSUMED',
    caveats: [
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
