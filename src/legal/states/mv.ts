// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Mecklenburg-Vorpommern minimum stub
//
// MBO-default + "in Vorbereitung" framing. No persona content.
//
// C7 batch (2026-05-28) — fourth Flächenland. allowedCitations populated
// from scripts/legal-corpus/states/mv.json (LBauO M-V 15.10.2015 i.d.F.
// Gesetz v. 18.03.2025 GVOBl. M-V S. 130). 0 primary + 97 mirror via
// baunormenlexikon.de. systemBlock REMAINS skeleton — Pass A + Pass C
// only (Path 2'').
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'
import { buildAntiBayernLeakBlock } from './_antiBayernLeak.ts'

const ANTI_LEAK = buildAntiBayernLeakBlock({
  labelDe: 'Mecklenburg-Vorpommern',
  labelEn: 'Mecklenburg-Western Pomerania',
  codePrefix: 'LBauO M-V',
  isSubstantive: false,
})

const SYSTEM_BLOCK = `${ANTI_LEAK}══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: MECKLENBURG-VORPOMMERN — Mindest-Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis: Detail-Spezifika für Mecklenburg-Vorpommern werden in einer
späteren Bearbeitungsphase ergänzt. Bis dahin gelten die MBO-
Defaults als Arbeitsgrundlage. Aussagen zu konkreten Paragraphen
oder Verfahren sind ohne ausdrückliche Verifikation durch eine/n
bauvorlageberechtigte/n Architekt:in nicht belastbar.

LBO. LBO MV (Landesbauordnung Mecklenburg-Vorpommern).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.

DEFAULT-FALLBACK. MBO als Referenzrahmen, soweit projektrelevante
Mecklenburg-Vorpommern-Spezifika nicht vorliegen.
`

// MV allow-list — every § the C7 MV cell addendums cite, sourced from
// scripts/legal-corpus/states/mv.json. Enforcement / admin omits: § 79
// (Einstellung von Arbeiten), § 80 (Beseitigung/Nutzungsuntersagung —
// classic enforcement), § 80a (Anpassungsverlangen — enforcement-
// adjacent), § 81 (Bauüberwachung — oversight admin), § 85a (Technische
// Baubestimmungen — admin meta, BW § 73a precedent). Narrow / out-of-
// scope: § 4 (Anwendungsbereich), § 65a/65b/65c/65d (EU recognition
// Bauvorlageberechtigung sub-§§), § 69 (Behandlung Bauantrag — admin),
// § 70 (Nachbar/Öffentlichkeit-Beteiligung), § 75 (Vorbescheid), § 76
// (Fliegende Bauten), § 77 (Bauaufsichtliche Zustimmung).
// 4-§ brandschutz spread (§ 14 + § 26 + § 30 + § 33) — heading-evident
// discipline; corpus archetype-tags § 14 + § 26 cleanly but § 30 +
// § 33 are UNDER-TAGGED (mirroring SächsBO pattern). Future corpus re-tag
// flagged in SPRINT_PLAN.md open-question #9.
const ALLOWED_CITATIONS: readonly string[] = [
  // LBauO M-V core §§ (per scripts/legal-corpus/states/mv.json)
  '§ 2 LBauO M-V',     // Begriffe (Gebäudeklassen)
  '§ 6 LBauO M-V',     // Abstandsflächen, Abstände
  '§ 12 LBauO M-V',    // Standsicherheit
  '§ 14 LBauO M-V',    // Brandschutz
  '§ 26 LBauO M-V',    // Allg. Anforderungen Brandverhalten Baustoffe/Bauteile
  '§ 30 LBauO M-V',    // Brandwände
  '§ 33 LBauO M-V',    // Erster und zweiter Rettungsweg
  '§ 49 LBauO M-V',    // Stellplätze, Garagen, Abstellplätze für Fahrräder
  '§ 51 LBauO M-V',    // Sonderbauten
  '§ 54 LBauO M-V',    // Entwurfsverfasser
  '§ 61 LBauO M-V',    // Verfahrensfreie Bauvorhaben, Beseitigung von Anlagen
  '§ 62 LBauO M-V',    // Genehmigungsfreistellung
  '§ 63 LBauO M-V',    // Vereinfachtes Baugenehmigungsverfahren
  '§ 64 LBauO M-V',    // Baugenehmigungsverfahren (regulär)
  '§ 65 LBauO M-V',    // Bauvorlageberechtigung
  '§ 66 LBauO M-V',    // Bautechnische Nachweise
  '§ 68 LBauO M-V',    // Bauantrag, Bauvorlagen
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

export const MV_DELTA: StateDelta = {
  bundesland: 'mv',
  bundeslandLabelDe: 'Mecklenburg-Vorpommern',
  bundeslandLabelEn: 'Mecklenburg-Western Pomerania',
  postcodeRanges: ['17033-19412', '23936-23999'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
