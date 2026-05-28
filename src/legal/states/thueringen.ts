// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Thüringen minimum stub
//
// MBO-default + "in Vorbereitung" framing. No persona content.
//
// C9 batch (2026-05-28) — sixth Flächenland. allowedCitations populated
// from scripts/legal-corpus/states/thueringen.json (ThürBO Fassung
// 02.07.2024, in Kraft ab 19.07.2024 — current 2024 numbering audit-
// confirmed per corpus _meta). 0 primary + 102 mirror via
// baunormenlexikon.de. systemBlock REMAINS skeleton — Pass A + Pass C
// only (Path 2'').
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'
import { buildAntiBayernLeakBlock } from './_antiBayernLeak.ts'

const ANTI_LEAK = buildAntiBayernLeakBlock({
  labelDe: 'Thüringen',
  labelEn: 'Thuringia',
  codePrefix: 'ThürBO',
  isSubstantive: false,
})

const SYSTEM_BLOCK = `${ANTI_LEAK}══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: THÜRINGEN — Mindest-Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis: Detail-Spezifika für Thüringen werden in einer späteren
Bearbeitungsphase ergänzt. Bis dahin gelten die MBO-Defaults als
Arbeitsgrundlage. Aussagen zu konkreten Paragraphen oder Verfahren
sind ohne ausdrückliche Verifikation durch eine/n bauvorlage-
berechtigte/n Architekt:in nicht belastbar.

LBO. ThürBO (Thüringer Bauordnung).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.

DEFAULT-FALLBACK. MBO als Referenzrahmen, soweit projektrelevante
Thüringen-Spezifika nicht vorliegen.
`

// TH allow-list — every § the C9 TH cell addendums cite, sourced from
// scripts/legal-corpus/states/thueringen.json. SHIFTED numbering of
// current ThürBO 2024 (audit-confirmed per corpus _meta): verfahrensfrei
// = § 63, Freistellung = § 64, vereinfacht = § 65, regulär = § 66.
// Bauvorlage = § 67, Nachweise = § 72, Bauantrag = § 74. Enforcement /
// admin omits: § 86 (Baueinstellung — work-stoppage), § 87 (Beseitigung/
// Nutzungsuntersagung — classic enforcement), § 88 (Bauüberwachung —
// oversight admin), § 96 (Technische Baubestimmungen — admin meta,
// BW § 73a precedent). Skipped: § 4 (Anwendungsbereich), § 68-§ 71
// (EU recognition Bauvorlageberechtigung sub-§§ + Ausgleichsmaßnahmen),
// § 75 (Behandlung Bauantrag), § 76 (Nachbar/Öffentlichkeit-Beteiligung),
// § 82 (Vorbescheid), § 83 (Fliegende Bauten), § 84 (Bauaufsichtliche
// Zustimmung), § 98 (Bestehende bauliche Anlagen — Phase-B caution),
// § 99 (Windenergie — narrow). 4-§ brandschutz spread (heading-evident:
// § 14 + § 29 + § 33 + § 36) — only § 14 corpus-tagged (under-tag
// pattern, mirroring SächsBO/MV).
const ALLOWED_CITATIONS: readonly string[] = [
  // ThürBO core §§ (per scripts/legal-corpus/states/thueringen.json)
  '§ 2 ThürBO',     // Begriffe (Gebäudeklassen)
  '§ 6 ThürBO',     // Abstandsflächen, Abstände
  '§ 12 ThürBO',    // Standsicherheit
  '§ 14 ThürBO',    // Brandschutz
  '§ 29 ThürBO',    // Allg. Anforderungen Brandverhalten Baustoffe/Bauteile
  '§ 33 ThürBO',    // Brandwände
  '§ 36 ThürBO',    // Erster und zweiter Rettungsweg
  '§ 52 ThürBO',    // Notwendige Stellplätze, Abstellplätze für Fahrräder
  '§ 54 ThürBO',    // Sonderbauten
  '§ 57 ThürBO',    // Entwurfsverfasserin oder Entwurfsverfasser
  '§ 63 ThürBO',    // Verfahrensfreie Bauvorhaben, Beseitigung von Anlagen
  '§ 64 ThürBO',    // Genehmigungsfreistellung
  '§ 65 ThürBO',    // Vereinfachtes Baugenehmigungsverfahren
  '§ 66 ThürBO',    // Baugenehmigungsverfahren (regulär)
  '§ 67 ThürBO',    // Bauvorlageberechtigung
  '§ 72 ThürBO',    // Bautechnische Nachweise
  '§ 74 ThürBO',    // Bauantrag, Bauvorlagen
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

export const THUERINGEN_DELTA: StateDelta = {
  bundesland: 'thueringen',
  bundeslandLabelDe: 'Thüringen',
  bundeslandLabelEn: 'Thuringia',
  postcodeRanges: ['07318-07919', '36304-36469', '98527-99998'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
