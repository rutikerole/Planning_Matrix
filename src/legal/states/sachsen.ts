// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Sachsen minimum stub
//
// MBO-default + "in Vorbereitung" framing. No persona content.
//
// C4 batch (2026-05-28) — first Flächenland. allowedCitations populated
// from the scripts/legal-corpus/states/sachsen.json corpus capture
// (SächsBO i.d.F. Gesetz v. 01.03.2024 SächsGVBl. S. 169; tier: 1 primary +
// 94 mirror via baunormenlexikon.de). This closes the Layer-C citation-
// enforcement hole. systemBlock REMAINS the 32-line skeleton — Pass A +
// Pass C only (Path 2'').
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'
import { buildAntiBayernLeakBlock } from './_antiBayernLeak.ts'

const ANTI_LEAK = buildAntiBayernLeakBlock({
  labelDe: 'Sachsen',
  labelEn: 'Saxony',
  codePrefix: 'SächsBO',
  isSubstantive: false,
})

const SYSTEM_BLOCK = `${ANTI_LEAK}══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: SACHSEN — Mindest-Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis: Detail-Spezifika für Sachsen werden in einer späteren
Bearbeitungsphase ergänzt. Bis dahin gelten die MBO-Defaults als
Arbeitsgrundlage. Aussagen zu konkreten Paragraphen oder Verfahren
sind ohne ausdrückliche Verifikation durch eine/n bauvorlage-
berechtigte/n Architekt:in nicht belastbar.

LBO. SächsBO (Sächsische Bauordnung).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.

DEFAULT-FALLBACK. MBO als Referenzrahmen, soweit projektrelevante
Sachsen-Spezifika nicht vorliegen.
`

// Sachsen allow-list — every § the C4 Sachsen cell addendums cite, sourced
// from scripts/legal-corpus/states/sachsen.json. § 79 SächsBO (Einstellung
// von Arbeiten — work-stoppage / enforcement-adjacent admin) and § 80
// SächsBO (Beseitigung von Anlagen, Nutzungsuntersagung — classic
// enforcement; same heading as Berlin/Hamburg § 80) INTENTIONALLY not
// included. § 81 SächsBO (Bauüberwachung — oversight admin) and § 88a
// SächsBO (Technische Baubestimmungen — admin meta, BW § 73a precedent)
// also excluded (not owner-initiated procedure surface).
// NB: 4-§ brandschutz spread (§ 14 + § 26 + § 30 + § 33) is heading-evident
// — corpus archetype-tags only § 14, but §§ 26/30/33 headings are
// unambiguously brandschutz (Brandverhalten / Brandwände / Rettungswege).
// HBO § 14-alone precedent does NOT apply (different § numbering in HBO).
const ALLOWED_CITATIONS: readonly string[] = [
  // SächsBO core §§ (per scripts/legal-corpus/states/sachsen.json)
  '§ 2 SächsBO',     // Begriffe (Gebäudeklassen)
  '§ 6 SächsBO',     // Abstandsflächen, Abstände
  '§ 12 SächsBO',    // Standsicherheit
  '§ 14 SächsBO',    // Brandschutz
  '§ 26 SächsBO',    // Allg. Anforderungen Brandverhalten Baustoffe/Bauteile
  '§ 30 SächsBO',    // Brandwände
  '§ 33 SächsBO',    // Erster und zweiter Rettungsweg
  '§ 49 SächsBO',    // Stellplätze, Garagen, Abstellplätze für Fahrräder
  '§ 51 SächsBO',    // Sonderbauten
  '§ 54 SächsBO',    // Entwurfsverfasser
  '§ 61 SächsBO',    // Verfahrensfreie Bauvorhaben, Beseitigung von Anlagen
  '§ 62 SächsBO',    // Genehmigungsfreistellung
  '§ 63 SächsBO',    // Vereinfachtes Baugenehmigungsverfahren
  '§ 64 SächsBO',    // Baugenehmigungsverfahren (regulär)
  '§ 65 SächsBO',    // Bauvorlageberechtigung
  '§ 66 SächsBO',    // Bautechnische Nachweise
  '§ 68 SächsBO',    // Bauantrag, Bauvorlagen
  // Federal (per scripts/legal-corpus/federal.json)
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

export const SACHSEN_DELTA: StateDelta = {
  bundesland: 'sachsen',
  bundeslandLabelDe: 'Sachsen',
  bundeslandLabelEn: 'Saxony',
  postcodeRanges: ['01067-09648'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
