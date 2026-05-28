// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Hamburg minimum stub (Stadtstaat)
//
// MBO-default + "in Vorbereitung" framing. No persona content.
// Stadtstaat — cityBlock stays null per locked decision.
//
// C2 batch (2026-05-28) — allowedCitations populated from the
// scripts/legal-corpus/states/hamburg.json secondary-mirror capture
// (HBauO-Fassung 06.01.2025, gültig ab 01.01.2026). This closes the
// Layer-C citation-enforcement hole. systemBlock REMAINS the 42-line
// skeleton — Pass A + Pass C only (Path 2'').
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'
import { buildAntiBayernLeakBlock } from './_antiBayernLeak.ts'

const ANTI_LEAK = buildAntiBayernLeakBlock({
  labelDe: 'Hamburg',
  labelEn: 'Hamburg',
  codePrefix: 'HBauO',
  isSubstantive: false,
})

const SYSTEM_BLOCK = `${ANTI_LEAK}══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: HAMBURG (STADTSTAAT) — Mindest-Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis: Detail-Spezifika für Hamburg werden in einer späteren
Bearbeitungsphase ergänzt. Bis dahin gelten die MBO-Defaults als
Arbeitsgrundlage. Aussagen zu konkreten Paragraphen oder Verfahren
sind ohne ausdrückliche Verifikation durch eine/n bauvorlage-
berechtigte/n Architekt:in nicht belastbar.

LBO. HBauO (Hamburgische Bauordnung).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.
     Hamburg als Stadtstaat: die Bauordnung wirkt zugleich als Landes-
     und Kommunalrecht; Kollisionsfragen mit B-Plan-Festsetzungen
     werden im Einzelfall geklärt.

DEFAULT-FALLBACK. MBO als Referenzrahmen, soweit projektrelevante
Hamburg-Spezifika nicht vorliegen.
`

// Hamburg allow-list — every § the C2 Hamburg cell addendums cite, sourced
// from scripts/legal-corpus/states/hamburg.json (secondary-mirror tier).
// § 80 HBauO (Beseitigung von Anlagen, Nutzungsuntersagung, Anpassung
// bestehender baulicher Anlagen) is INTENTIONALLY not included — heading
// is enforcement (consistent with NI § 79 / BW § 65 / HBO § 82 / Berlin
// § 80 omissions).
const ALLOWED_CITATIONS: readonly string[] = [
  // HBauO core §§ (per scripts/legal-corpus/states/hamburg.json)
  '§ 2 HBauO',       // Begriffe (Gebäudeklassen)
  '§ 6 HBauO',       // Abstandsflächen
  '§ 12 HBauO',      // Standsicherheit
  '§ 14 HBauO',      // Brandschutz
  '§ 26 HBauO',      // Allg. Anforderungen Brandverhalten Baustoffe/Bauteile
  '§ 30 HBauO',      // Brandwände
  '§ 33 HBauO',      // Erster und zweiter Rettungsweg
  '§ 49 HBauO',      // Grundstücksbezogene Mobilität (Stellplätze etc.)
  '§ 51 HBauO',      // Sonderbauten
  '§ 54 HBauO',      // Entwurfsverfasserin bzw. Entwurfsverfasser
  '§ 61 HBauO',      // Verfahrensfreie Bauvorhaben, Beseitigung von Anlagen
  '§ 62 HBauO',      // Genehmigungsfreistellung
  '§ 63 HBauO',      // Vereinfachtes Baugenehmigungsverfahren
  '§ 64 HBauO',      // Baugenehmigungsverfahren (regulär)
  '§ 65 HBauO',      // Bauvorlageberechtigung
  '§ 66 HBauO',      // Bautechnische Nachweise
  '§ 68 HBauO',      // Bauantrag, Bauvorlagen
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

export const HAMBURG_DELTA: StateDelta = {
  bundesland: 'hamburg',
  bundeslandLabelDe: 'Hamburg',
  bundeslandLabelEn: 'Hamburg',
  postcodeRanges: ['20095-22769'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
