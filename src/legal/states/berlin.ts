// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Berlin minimum stub (Stadtstaat)
//
// MBO-default + "in Vorbereitung" framing. No persona content.
// Berlin is a Stadtstaat — its LBO is the municipal-level rule;
// per locked decision, cityBlock stays null and the LBO content
// lives entirely in systemBlock. No StateDelta.kind discriminator.
//
// C1 batch (2026-05-28) — allowedCitations populated from the
// scripts/legal-corpus/states/berlin.json secondary-mirror capture.
// This closes the Layer-C citation-enforcement hole: previously
// allowedCitations was [] which short-circuited the positive-list
// check at chat-turn/citationLint.ts:597. With this list, the model's
// emitted §§ get cross-checked against the corpus-known set; out-of-
// list citations get qualifier-downgraded to ASSUMED.
//
// systemBlock REMAINS the 42-line skeleton — this batch is Path 2''
// (Pass A + Pass C only). Pass B (systemBlock rewrite to substantive
// prose) is gated on real legal review.
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'
import { buildAntiBayernLeakBlock } from './_antiBayernLeak.ts'

const ANTI_LEAK = buildAntiBayernLeakBlock({
  labelDe: 'Berlin',
  labelEn: 'Berlin',
  codePrefix: 'BauO Bln',
  isSubstantive: false,
})

const SYSTEM_BLOCK = `${ANTI_LEAK}══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: BERLIN (STADTSTAAT) — Mindest-Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis: Detail-Spezifika für Berlin werden in einer späteren
Bearbeitungsphase ergänzt. Bis dahin gelten die MBO-Defaults als
Arbeitsgrundlage. Aussagen zu konkreten Paragraphen oder Verfahren
sind ohne ausdrückliche Verifikation durch eine/n bauvorlage-
berechtigte/n Architekt:in nicht belastbar.

LBO. BauO Bln (Bauordnung für Berlin).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.
     Berlin als Stadtstaat: die Bauordnung wirkt zugleich als Landes-
     und Kommunalrecht; Kollisionsfragen mit B-Plan-Festsetzungen
     werden im Einzelfall geklärt.

DEFAULT-FALLBACK. MBO als Referenzrahmen, soweit projektrelevante
Berlin-Spezifika nicht vorliegen.
`

// Berlin allow-list — every § the C1 Berlin cell addendums cite, sourced
// from scripts/legal-corpus/states/berlin.json (secondary-mirror tier).
// § 80 (Beseitigung von Anlagen, Nutzungsuntersagung) is INTENTIONALLY
// not included — heading is enforcement, not owner-side procedure
// (consistent with NI § 79 / BW § 65 / HBO § 82 omissions).
const ALLOWED_CITATIONS: readonly string[] = [
  // BauO Bln core §§ (per scripts/legal-corpus/states/berlin.json)
  '§ 2 BauO Bln',     // Begriffe (Gebäudeklassen)
  '§ 6 BauO Bln',     // Abstandsflächen, Abstände
  '§ 12 BauO Bln',    // Standsicherheit
  '§ 14 BauO Bln',    // Brandschutz
  '§ 26 BauO Bln',    // Allg. Anforderungen Brandverhalten Baustoffe/Bauteile
  '§ 33 BauO Bln',    // Erster und zweiter Rettungsweg (escape routes — ITEM D)
  '§ 49 BauO Bln',    // Stellplätze, Abstellplätze für Fahrräder
  '§ 51 BauO Bln',    // Sonderbauten und Garagen
  '§ 61 BauO Bln',    // Verfahrensfreie Bauvorhaben, Beseitigung von Anlagen
  '§ 62 BauO Bln',    // Genehmigungsfreistellung
  '§ 63 BauO Bln',    // Vereinfachtes Baugenehmigungsverfahren
  '§ 64 BauO Bln',    // Baugenehmigungsverfahren (regulär)
  '§ 65 BauO Bln',    // Bauvorlageberechtigung
  '§ 66 BauO Bln',    // Bautechnische Nachweise
  '§ 68 BauO Bln',    // Bauantrag, Bauvorlagen
  // Federal (per scripts/legal-corpus/federal.json) — referenced by all states
  '§ 30 BauGB',
  '§ 31 BauGB',
  '§ 34 BauGB',
  '§ 35 BauGB',
  '§ 172 BauGB',
  '§ 1 BauNVO',
  '§ 3 BauNVO',
  '§ 4 BauNVO',
  '§ 4a BauNVO',
  '§ 6 BauNVO',
  '§ 9 BauNVO',
  '§ 12 BauNVO',
  '§ 16 BauNVO',
  '§ 19 BauNVO',
  '§ 20 BauNVO',
  '§ 23 BauNVO',
  '§ 10 GEG',
  '§ 48 GEG',
  '§ 80 GEG',
]

export const BERLIN_DELTA: StateDelta = {
  bundesland: 'berlin',
  bundeslandLabelDe: 'Berlin',
  bundeslandLabelEn: 'Berlin',
  postcodeRanges: ['10115-14199'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
