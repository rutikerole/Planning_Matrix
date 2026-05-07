// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Mecklenburg-Vorpommern minimum stub
//
// MBO-default + "in Vorbereitung" framing. No persona content.
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'

const SYSTEM_BLOCK = `══════════════════════════════════════════════════════════════════════════
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

export const MV_DELTA: StateDelta = {
  bundesland: 'mv',
  bundeslandLabelDe: 'Mecklenburg-Vorpommern',
  bundeslandLabelEn: 'Mecklenburg-Western Pomerania',
  postcodeRanges: ['17033-19412', '23936-23999'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: [],
}
