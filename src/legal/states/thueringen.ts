// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Thüringen minimum stub
//
// MBO-default + "in Vorbereitung" framing. No persona content.
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'

const SYSTEM_BLOCK = `══════════════════════════════════════════════════════════════════════════
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

export const THUERINGEN_DELTA: StateDelta = {
  bundesland: 'thueringen',
  bundeslandLabelDe: 'Thüringen',
  bundeslandLabelEn: 'Thuringia',
  postcodeRanges: ['07318-07919', '36304-36469', '98527-99998'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: [],
}
