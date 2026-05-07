// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Saarland minimum stub
//
// MBO-default + "in Vorbereitung" framing. No persona content.
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'

const SYSTEM_BLOCK = `══════════════════════════════════════════════════════════════════════════
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

export const SAARLAND_DELTA: StateDelta = {
  bundesland: 'saarland',
  bundeslandLabelDe: 'Saarland',
  bundeslandLabelEn: 'Saarland',
  postcodeRanges: ['66001-66996'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: [],
}
