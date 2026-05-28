// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Schleswig-Holstein minimum stub
//
// MBO-default + "in Vorbereitung" framing. No persona content.
//
// C5 batch (2026-05-28) — second Flächenland. allowedCitations populated
// from the scripts/legal-corpus/states/sh.json corpus capture (LBO SH
// Neubekanntmachung vom 05.07.2024 i.d.F. Gesetz vom 13.12.2024; tier:
// 0 primary + 94 mirror via baunormenlexikon.de). This closes the Layer-C
// citation-enforcement hole. systemBlock REMAINS the 32-line skeleton —
// Pass A + Pass C only (Path 2'').
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'
import { buildAntiBayernLeakBlock } from './_antiBayernLeak.ts'

const ANTI_LEAK = buildAntiBayernLeakBlock({
  labelDe: 'Schleswig-Holstein',
  labelEn: 'Schleswig-Holstein',
  codePrefix: 'LBO',
  isSubstantive: false,
})

const SYSTEM_BLOCK = `${ANTI_LEAK}══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: SCHLESWIG-HOLSTEIN — Mindest-Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis: Detail-Spezifika für Schleswig-Holstein werden in einer
späteren Bearbeitungsphase ergänzt. Bis dahin gelten die MBO-
Defaults als Arbeitsgrundlage. Aussagen zu konkreten Paragraphen
oder Verfahren sind ohne ausdrückliche Verifikation durch eine/n
bauvorlageberechtigte/n Architekt:in nicht belastbar.

LBO. LBO SH (Landesbauordnung für das Land Schleswig-Holstein).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.

DEFAULT-FALLBACK. MBO als Referenzrahmen, soweit projektrelevante
Schleswig-Holstein-Spezifika nicht vorliegen.
`

// SH allow-list — every § the C5 SH cell addendums cite, sourced from
// scripts/legal-corpus/states/sh.json. Enforcement / admin §§ excluded:
// § 79 (Einstellung von Arbeiten — work-stoppage), § 80 (Beseitigung/
// Nutzungsuntersagung — classic enforcement, Sachsen/Berlin/Hamburg § 80
// pattern), § 81 (Bauüberwachung — oversight admin), § 85a (Technische
// Baubestimmungen — admin meta, BW § 73a precedent). Narrow / admin §§
// also excluded: § 4 (Anwendungsbereich), § 70a (Beteiligung Öffentlich-
// keit), § 77 (Bauaufsichtliche Zustimmung).
// NB: § 58a "Bestehende Anlagen" INTENTIONALLY NOT INCLUDED — the corpus
// authors flagged this § for Phase-B confirmation (coincidental §-number
// overlap with a previously fabricated Bayern Art. 58a; genuine in this
// mirror but not officially re-verified). Path 2'' defers to the corpus's
// own self-doubt; cite only after Phase-B confirm.
// 4-§ brandschutz spread (§ 14 + § 26 + § 30 + § 33) — all four corpus-
// tagged in LBO SH (no under-tag like SächsBO; clean tag coverage).
const ALLOWED_CITATIONS: readonly string[] = [
  // LBO SH core §§ (per scripts/legal-corpus/states/sh.json)
  '§ 2 LBO SH',     // Begriffe (Gebäudeklassen)
  '§ 6 LBO SH',     // Abstandsflächen, Abstände
  '§ 12 LBO SH',    // Standsicherheit
  '§ 14 LBO SH',    // Brandschutz
  '§ 26 LBO SH',    // Allg. Anforderungen Brandverhalten Baustoffe/Bauteile
  '§ 30 LBO SH',    // Brandwände
  '§ 33 LBO SH',    // Erster und zweiter Rettungsweg
  '§ 49 LBO SH',    // Stellplätze, Garagen, Abstellanlagen für Fahrräder
  '§ 51 LBO SH',    // Sonderbauten
  '§ 54 LBO SH',    // Entwurfsverfasserin oder Entwurfsverfasser
  '§ 61 LBO SH',    // Verfahrensfreie Bauvorhaben, Beseitigung von Anlagen
  '§ 62 LBO SH',    // Genehmigungsfreistellung
  '§ 63 LBO SH',    // Vereinfachtes Baugenehmigungsverfahren
  '§ 64 LBO SH',    // Baugenehmigungsverfahren (regulär)
  '§ 65 LBO SH',    // Bauvorlageberechtigung
  '§ 66 LBO SH',    // Bautechnische Nachweise
  '§ 68 LBO SH',    // Bauantrag, Bauvorlagen
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

export const SH_DELTA: StateDelta = {
  bundesland: 'sh',
  bundeslandLabelDe: 'Schleswig-Holstein',
  bundeslandLabelEn: 'Schleswig-Holstein',
  postcodeRanges: ['22844-25997', '23552-23896'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
