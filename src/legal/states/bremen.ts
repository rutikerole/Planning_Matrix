// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Bremen minimum stub (Stadtstaat)
//
// MBO-default + "in Vorbereitung" framing. No persona content.
// Stadtstaat — cityBlock stays null per locked decision.
//
// C3 batch (2026-05-28) — allowedCitations populated from the
// scripts/legal-corpus/states/bremen.json secondary-mirror capture
// (BremLBO-Neufassung vom 29.05.2024 / Brem.GBl. S. 380). This closes the
// Layer-C citation-enforcement hole. systemBlock REMAINS the 35-line
// skeleton — Pass A + Pass C only (Path 2'').
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'
import { buildAntiBayernLeakBlock } from './_antiBayernLeak.ts'

const ANTI_LEAK = buildAntiBayernLeakBlock({
  labelDe: 'Bremen',
  labelEn: 'Bremen',
  codePrefix: 'BremLBO',
  isSubstantive: false,
})

const SYSTEM_BLOCK = `${ANTI_LEAK}══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: BREMEN (STADTSTAAT) — Mindest-Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis: Detail-Spezifika für Bremen werden in einer späteren
Bearbeitungsphase ergänzt. Bis dahin gelten die MBO-Defaults als
Arbeitsgrundlage. Aussagen zu konkreten Paragraphen oder Verfahren
sind ohne ausdrückliche Verifikation durch eine/n bauvorlage-
berechtigte/n Architekt:in nicht belastbar.

LBO. BremLBO (Bremische Landesbauordnung).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.
     Bremen umfasst die Stadtgemeinden Bremen und Bremerhaven; die
     BremLBO wirkt zugleich als Landes- und Kommunalrecht.

DEFAULT-FALLBACK. MBO als Referenzrahmen, soweit projektrelevante
Bremen-Spezifika nicht vorliegen.
`

// Bremen allow-list — every § the C3 Bremen cell addendums cite, sourced
// from scripts/legal-corpus/states/bremen.json (secondary-mirror tier).
// § 79 BremLBO (Beseitigung von Anlagen, Nutzungsuntersagung) is
// INTENTIONALLY not included — heading is enforcement (consistent with
// NI § 79 / Berlin § 80 / Hamburg § 80 / BW § 65 / HBO § 82 omissions).
// Bremen's § 80 is "Bauüberwachung" (oversight during construction), which
// is also excluded here since it is administrative meta, not an owner-
// initiated procedure.
const ALLOWED_CITATIONS: readonly string[] = [
  // BremLBO core §§ (per scripts/legal-corpus/states/bremen.json)
  '§ 2 BremLBO',     // Begriffe (Gebäudeklassen)
  '§ 6 BremLBO',     // Abstandsflächen, Abstände
  '§ 12 BremLBO',    // Standsicherheit
  '§ 14 BremLBO',    // Brandschutz
  '§ 26 BremLBO',    // Allg. Anforderungen Brandverhalten Baustoffe/Bauteile
  '§ 30 BremLBO',    // Brandwände
  '§ 33 BremLBO',    // Erster und zweiter Rettungsweg
  '§ 49 BremLBO',    // Stellplätze, Garagen, Abstellplätze für Fahrräder
  '§ 51 BremLBO',    // Sonderbauten
  '§ 54 BremLBO',    // Entwurfsverfasser
  '§ 61 BremLBO',    // Verfahrensfreie Bauvorhaben, Beseitigung von Anlagen
  '§ 62 BremLBO',    // Genehmigungsfreistellung
  '§ 63 BremLBO',    // Vereinfachtes Baugenehmigungsverfahren
  '§ 64 BremLBO',    // Baugenehmigungsverfahren (regulär)
  '§ 65 BremLBO',    // Bauvorlageberechtigung
  '§ 66 BremLBO',    // Bautechnische Nachweise
  '§ 68 BremLBO',    // Bauantrag und Bauvorlagen
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

export const BREMEN_DELTA: StateDelta = {
  bundesland: 'bremen',
  bundeslandLabelDe: 'Bremen',
  bundeslandLabelEn: 'Bremen',
  postcodeRanges: ['28195-28779', '27568-27580'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
