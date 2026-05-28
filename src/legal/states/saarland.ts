// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Saarland minimum stub
//
// MBO-default + "in Vorbereitung" framing. No persona content.
//
// C11 batch (2026-05-28) — eighth and last Flächenland. Completes
// Bucket C Pass A+C across all 11 thin states. allowedCitations
// populated from scripts/legal-corpus/states/saarland.json (LBO Saarland
// 2004-02-18 i.d.F. Gesetz v. 27.08.2025 Amtsbl. I S. 854, 855). 0
// primary + 100 mirror via baunormenlexikon.de. NB: § 12a/§ 12b/§ 12c
// PV-§§ are SL-unique (most comprehensive PV-Pflicht across corpus).
// systemBlock REMAINS skeleton — Pass A + Pass C only (Path 2'').
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'
import { buildAntiBayernLeakBlock } from './_antiBayernLeak.ts'

const ANTI_LEAK = buildAntiBayernLeakBlock({
  labelDe: 'Saarland',
  labelEn: 'Saarland',
  codePrefix: 'LBO',
  isSubstantive: false,
})

const SYSTEM_BLOCK = `${ANTI_LEAK}══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: SAARLAND — Mindest-Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis: Detail-Spezifika für das Saarland werden in einer späteren
Bearbeitungsphase ergänzt. Bis dahin gelten die MBO-Defaults als
Arbeitsgrundlage. Aussagen zu konkreten Paragraphen oder Verfahren
sind ohne ausdrückliche Verifikation durch eine/n bauvorlage-
berechtigte/n Architekt:in nicht belastbar.

LBO. LBO Saarland (Landesbauordnung des Saarlandes).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.

DEFAULT-FALLBACK. MBO als Referenzrahmen, soweit projektrelevante
Saarland-Spezifika nicht vorliegen.
`

// SL allow-list — every § the C11 SL cell addendums cite, sourced from
// scripts/legal-corpus/states/saarland.json. SHIFTED numbering: § 7
// Abstand, § 13 Standsicherheit, § 15 Brandschutz, § 47 Stellplätze,
// § 63 Freistellung, § 64 vereinfacht, § 65 regulär, § 69 Bauantrag.
// UNIQUE SL features captured: § 12a/§ 12b/§ 12c PV-Pflicht (most
// comprehensive in any corpus).
// Enforcement / admin omits: § 78 (Bauüberwachung — oversight admin),
// § 81 (Einstellung Arbeiten — work-stoppage), § 82 (Beseitigung/
// Nutzungsuntersagung — classic enforcement; NB: corpus tags it
// `nutzungsaenderung` but the heading is enforcement-side, so cell-side
// discipline omits per consistent enforcement-omit pattern).
// Skipped: § 5 (Bebauung Grundstücke — programmatic), § 62 ("Vorhaben
// des Bundes und der Länder" — public bodies), § 68 (Abweichungen),
// § 70 (Behandlung Bauantrag), § 71 (Nachbar/Öffentlichkeit), § 76
// (Vorbescheid), § 77 (Fliegende Bauten).
// 4-§ brandschutz spread (§ 15 + § 27 + § 30 + § 33) — all four corpus-
// tagged (CLEAN tagging, unlike SächsBO/MV/Thüringen under-tag pattern).
const ALLOWED_CITATIONS: readonly string[] = [
  // LBO Saarland core §§ (per scripts/legal-corpus/states/saarland.json)
  '§ 2 LBO Saarland',     // Begriffe (Gebäudeklassen)
  '§ 7 LBO Saarland',     // Abstandsflächen, Abstände
  '§ 12a LBO Saarland',   // PV-Pflicht gewerbliche Gebäude/Stellplätze (SL-unique)
  '§ 12b LBO Saarland',   // PV-Pflicht öffentliche Gebäude/Stellplätze (SL-unique)
  '§ 12c LBO Saarland',   // PV-Vorbereitungspflicht (SL-unique)
  '§ 13 LBO Saarland',    // Standsicherheit
  '§ 15 LBO Saarland',    // Brandschutz
  '§ 27 LBO Saarland',    // Brandverhalten Baustoffe/Bauteile
  '§ 30 LBO Saarland',    // Brandwände
  '§ 33 LBO Saarland',    // Erster und zweiter Rettungsweg
  '§ 47 LBO Saarland',    // Stellplätze und Garagen, Abstellplätze für Fahrräder
  '§ 51 LBO Saarland',    // Sonderbauten
  '§ 54 LBO Saarland',    // Entwurfsverfasser/Fachplaner
  '§ 61 LBO Saarland',    // Verfahrensfreie Vorhaben, Beseitigung von Anlagen
  '§ 63 LBO Saarland',    // Baugenehmigungsfreistellung
  '§ 64 LBO Saarland',    // Vereinfachtes Baugenehmigungsverfahren
  '§ 65 LBO Saarland',    // Baugenehmigungsverfahren (regulär)
  '§ 66 LBO Saarland',    // Bauvorlageberechtigung
  '§ 67 LBO Saarland',    // Bautechnische Nachweise
  '§ 69 LBO Saarland',    // Bauantrag und Bauvorlagen
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

export const SAARLAND_DELTA: StateDelta = {
  bundesland: 'saarland',
  bundeslandLabelDe: 'Saarland',
  bundeslandLabelEn: 'Saarland',
  postcodeRanges: ['66001-66996'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
