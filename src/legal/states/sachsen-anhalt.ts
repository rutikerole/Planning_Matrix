// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Sachsen-Anhalt minimum stub
//
// MBO-default + "in Vorbereitung" framing. No persona content.
//
// C8 batch (2026-05-28) — fifth Flächenland. allowedCitations populated
// from scripts/legal-corpus/states/sachsen-anhalt.json (BauO LSA
// 2013-09-10 i.d.F. Gesetz v. 13.06.2024 GVBl. LSA S. 150). 0 primary +
// 97 mirror via baunormenlexikon.de. systemBlock REMAINS skeleton —
// Pass A + Pass C only (Path 2'').
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'
import { buildAntiBayernLeakBlock } from './_antiBayernLeak.ts'

const ANTI_LEAK = buildAntiBayernLeakBlock({
  labelDe: 'Sachsen-Anhalt',
  labelEn: 'Saxony-Anhalt',
  codePrefix: 'BauO LSA',
  isSubstantive: false,
})

const SYSTEM_BLOCK = `${ANTI_LEAK}══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: SACHSEN-ANHALT — Mindest-Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis: Detail-Spezifika für Sachsen-Anhalt werden in einer späteren
Bearbeitungsphase ergänzt. Bis dahin gelten die MBO-Defaults als
Arbeitsgrundlage. Aussagen zu konkreten Paragraphen oder Verfahren
sind ohne ausdrückliche Verifikation durch eine/n bauvorlage-
berechtigte/n Architekt:in nicht belastbar.

LBO. BauO LSA (Bauordnung des Landes Sachsen-Anhalt).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.

DEFAULT-FALLBACK. MBO als Referenzrahmen, soweit projektrelevante
Sachsen-Anhalt-Spezifika nicht vorliegen.
`

// LSA allow-list — every § the C8 LSA cell addendums cite, sourced from
// scripts/legal-corpus/states/sachsen-anhalt.json. SHIFTED numbering vs
// the standard ladder (verfahrensfrei = § 60, Freistellung = § 61,
// vereinfacht = § 62, regulär = § 63). § 14 BauO LSA absorbs Baustoffe-
// Brandverhalten per official heading. Enforcement / admin omits:
// § 78 (Einstellung Arbeiten), § 79 (Beseitigung/Nutzungsuntersagung —
// classic enforcement), § 80 (Bauüberwachung — oversight admin),
// § 85a (Technische Baubestimmungen — admin meta, BW § 73a precedent).
// Narrow / scope: § 4 (Anwendungsbereich), § 64a-§ 64e (EU recognition
// Bauvorlageberechtigung sub-§§), § 68 (Behandlung Bauantrag), § 69
// (Nachbar-/Öffentlichkeit-Beteiligung), § 74 (Vorbescheid), § 75
// (Fliegende Bauten), § 76 (Bauaufsichtliche Zustimmung). § 86
// ("Bestehende bauliche Anlagen") SKIPPED — heading-evident relevance
// but unclear scope from heading alone; defer to Phase B (same caution
// as SH § 58a).
// 3-§ brandschutz (§ 14 + § 29 + § 32) — fewer than standard 4-§ because
// § 14 LSA heading bundles Brandschutz + Baustoffe-Brandverhalten.
const ALLOWED_CITATIONS: readonly string[] = [
  // BauO LSA core §§ (per scripts/legal-corpus/states/sachsen-anhalt.json)
  '§ 2 BauO LSA',     // Begriffe (Gebäudeklassen)
  '§ 6 BauO LSA',     // Abstandsflächen, Abstände
  '§ 12 BauO LSA',    // Standsicherheit
  '§ 14 BauO LSA',    // Brandschutz (incl. Baustoffe-Brandverhalten per heading)
  '§ 29 BauO LSA',    // Brandwände
  '§ 32 BauO LSA',    // Erster und zweiter Rettungsweg
  '§ 48 BauO LSA',    // Notwendige Stellplätze, Garagen, Abstellplätze für Fahrräder
  '§ 50 BauO LSA',    // Sonderbauten
  '§ 53 BauO LSA',    // Entwurfsverfasser
  '§ 60 BauO LSA',    // Verfahrensfreie Bauvorhaben, Beseitigung von Anlagen
  '§ 61 BauO LSA',    // Genehmigungsfreistellung
  '§ 62 BauO LSA',    // Vereinfachtes Baugenehmigungsverfahren
  '§ 63 BauO LSA',    // Baugenehmigungsverfahren (regulär)
  '§ 64 BauO LSA',    // Bauvorlageberechtigung
  '§ 65 BauO LSA',    // Bautechnische Nachweise
  '§ 67 BauO LSA',    // Bauantrag, Bauvorlagen
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

export const SACHSEN_ANHALT_DELTA: StateDelta = {
  bundesland: 'sachsen-anhalt',
  bundeslandLabelDe: 'Sachsen-Anhalt',
  bundeslandLabelEn: 'Saxony-Anhalt',
  postcodeRanges: ['06108-06928', '38820-39638'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
