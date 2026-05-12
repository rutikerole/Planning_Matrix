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
 * NRW Sanierung baseline is fully encoded. Other Bundesländer +
 * other intents return a conservative 'standard' decision with a
 * bebauungsplan_specific caveat so the brief is honest about the
 * resolver not yet covering the case.
 */
export function resolveProcedure(c: ProcedureCase): ProcedureDecision {
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
  // Generic stub for unmigrated states/intents.
  return {
    kind: 'standard',
    citation: `§ 65 BauO ${c.bundesland.toUpperCase()}`,
    reasoning_de:
      'Verfahrensart vorbehaltlich detaillierter staatlicher Anwendungsregeln; reguläres Verfahren als Ausgangspunkt.',
    reasoning_en:
      'Procedure subject to detailed state-specific application rules; standard permit as starting point.',
    confidence: 'ASSUMED',
    caveats: [
      {
        kind: 'bebauungsplan_specific',
        message_de:
          'Spezifische Verfahrensart mit lokalem Bauamt klären — Resolver deckt diesen Fall noch nicht ab.',
        message_en:
          'Confirm specific procedure with the local building authority — resolver does not yet cover this case.',
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
