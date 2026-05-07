// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Brandenburg minimum stub
//
// MBO-default + "in Vorbereitung" framing. No persona content.
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'

const SYSTEM_BLOCK = `══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: BRANDENBURG — Mindest-Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis: Detail-Spezifika für Brandenburg werden in einer späteren
Bearbeitungsphase ergänzt. Bis dahin gelten die MBO-Defaults als
Arbeitsgrundlage. Aussagen zu konkreten Paragraphen oder Verfahren
sind ohne ausdrückliche Verifikation durch eine/n bauvorlage-
berechtigte/n Architekt:in nicht belastbar.

LBO. BbgBO (Brandenburgische Bauordnung).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.

DEFAULT-FALLBACK. MBO als Referenzrahmen, soweit projektrelevante
Brandenburg-Spezifika nicht vorliegen.
`

export const BRANDENBURG_DELTA: StateDelta = {
  bundesland: 'brandenburg',
  bundeslandLabelDe: 'Brandenburg',
  bundeslandLabelEn: 'Brandenburg',
  postcodeRanges: ['01968-01998', '03044-03253', '14467-16949'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: [],
}
