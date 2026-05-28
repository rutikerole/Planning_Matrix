// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Rheinland-Pfalz minimum stub
//
// MBO-default + "in Vorbereitung" framing. No persona content.
//
// C6 batch (2026-05-28) — third Flächenland. allowedCitations populated
// from scripts/legal-corpus/states/rlp.json (LBauO RP 1998-11-24 i.d.F.
// Gesetz v. 19.11.2025 GVBl. S. 672, 673 — freshest C-state amendment).
// Tier: 0 primary + 103 mirror via baunormenlexikon.de. NB: RLP's 1998
// LBauO uses non-MBO §-numbering — see ALLOWED_CITATIONS for the actual
// RP-specific § numbers (e.g., verfahrensfrei = § 62 not § 61).
// systemBlock REMAINS skeleton — Pass A + Pass C only (Path 2'').
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'
import { buildAntiBayernLeakBlock } from './_antiBayernLeak.ts'

const ANTI_LEAK = buildAntiBayernLeakBlock({
  labelDe: 'Rheinland-Pfalz',
  labelEn: 'Rhineland-Palatinate',
  codePrefix: 'LBauO',
  isSubstantive: false,
})

const SYSTEM_BLOCK = `${ANTI_LEAK}══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: RHEINLAND-PFALZ — Mindest-Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis: Detail-Spezifika für Rheinland-Pfalz werden in einer späteren
Bearbeitungsphase ergänzt. Bis dahin gelten die MBO-Defaults als
Arbeitsgrundlage. Aussagen zu konkreten Paragraphen oder Verfahren
sind ohne ausdrückliche Verifikation durch eine/n bauvorlage-
berechtigte/n Architekt:in nicht belastbar.

LBO. LBauO RLP (Landesbauordnung Rheinland-Pfalz).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.

DEFAULT-FALLBACK. MBO als Referenzrahmen, soweit projektrelevante
Rheinland-Pfalz-Spezifika nicht vorliegen.
`

// RLP allow-list — every § the C6 RLP cell addendums cite, sourced from
// scripts/legal-corpus/states/rlp.json. Citation prefix is bare "LBauO"
// (corpus law_short — no state suffix). Enforcement triple omitted:
// § 80 (Baueinstellung — work-stoppage), § 81 (Beseitigungsanordnung +
// Benutzungsuntersagung — classic enforcement), § 82 (Abbruch verfallender
// Anlagen — state-mandated demolition; RP-specific second enforcement §).
// Admin omits: § 78 (Bauüberwachung), § 87a (Technische Baubestimmungen —
// BW § 73a precedent), § 65 (Behandlung Bauantrag), § 68 (Nachbar-
// Beteiligung), § 72 (Vorbescheid). Narrow / out-of-scope: § 4 (Soziale/
// ökologische Belange), § 9 (Übernahme Abstandsflächen Nachbar),
// § 64a/64b/64c/64d (EU recognition Bauvorlageberechtigung sub-§§), § 76
// (Fliegende Bauten), § 83 (Bundesvorhaben). 2-§ brandschutz (§ 15 + § 30)
// — RLP's 1998 LBauO has no Baustoffe-Brandverhalten or Rettungsweg §§.
const ALLOWED_CITATIONS: readonly string[] = [
  // LBauO core §§ (per scripts/legal-corpus/states/rlp.json) — RP-specific
  // numbering, NOT post-MBO standard ladder.
  '§ 2 LBauO',      // Begriffe (Gebäudeklassen)
  '§ 8 LBauO',      // Abstandsflächen
  '§ 13 LBauO',     // Standsicherheit (auch Anker für bautechnische Nachweise)
  '§ 15 LBauO',     // Brandschutz
  '§ 30 LBauO',     // Brandwände
  '§ 47 LBauO',     // Stellplätze und Garagen
  '§ 50 LBauO',     // Sonderbauten
  '§ 56 LBauO',     // Entwurfsverfasser
  '§ 61 LBauO',     // Genehmigungsbedürftige Vorhaben (reguläres Verfahren, Teil 1)
  '§ 62 LBauO',     // Genehmigungsfreie Vorhaben (verfahrensfrei)
  '§ 63 LBauO',     // Bauantrag
  '§ 64 LBauO',     // Bauvorlageberechtigung
  '§ 66 LBauO',     // Vereinfachtes Genehmigungsverfahren
  '§ 67 LBauO',     // Freistellungsverfahren
  '§ 70 LBauO',     // Baugenehmigung (reguläres Verfahren, Teil 2)
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

export const RLP_DELTA: StateDelta = {
  bundesland: 'rlp',
  bundeslandLabelDe: 'Rheinland-Pfalz',
  bundeslandLabelEn: 'Rhineland-Palatinate',
  postcodeRanges: ['54290-56869', '55116-55776', '67059-67829'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: ALLOWED_CITATIONS,
}
