// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Hamburg minimum stub (Stadtstaat)
//
// MBO-default + "in Vorbereitung" framing. No persona content.
// Stadtstaat — cityBlock stays null per locked decision.
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'

const SYSTEM_BLOCK = `══════════════════════════════════════════════════════════════════════════
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

export const HAMBURG_DELTA: StateDelta = {
  bundesland: 'hamburg',
  bundeslandLabelDe: 'Hamburg',
  bundeslandLabelEn: 'Hamburg',
  postcodeRanges: ['20095-22769'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: [],
}
