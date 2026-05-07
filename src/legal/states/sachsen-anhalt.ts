// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Sachsen-Anhalt minimum stub
//
// MBO-default + "in Vorbereitung" framing. No persona content.
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'

const SYSTEM_BLOCK = `══════════════════════════════════════════════════════════════════════════
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

export const SACHSEN_ANHALT_DELTA: StateDelta = {
  bundesland: 'sachsen-anhalt',
  bundeslandLabelDe: 'Sachsen-Anhalt',
  bundeslandLabelEn: 'Saxony-Anhalt',
  postcodeRanges: ['06108-06928', '38820-39638'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: [],
}
