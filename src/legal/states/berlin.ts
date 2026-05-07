// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Berlin minimum stub (Stadtstaat)
//
// MBO-default + "in Vorbereitung" framing. No persona content.
// Berlin is a Stadtstaat — its LBO is the municipal-level rule;
// per locked decision, cityBlock stays null and the LBO content
// lives entirely in systemBlock. No StateDelta.kind discriminator.
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'

const SYSTEM_BLOCK = `══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: BERLIN (STADTSTAAT) — Mindest-Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis: Detail-Spezifika für Berlin werden in einer späteren
Bearbeitungsphase ergänzt. Bis dahin gelten die MBO-Defaults als
Arbeitsgrundlage. Aussagen zu konkreten Paragraphen oder Verfahren
sind ohne ausdrückliche Verifikation durch eine/n bauvorlage-
berechtigte/n Architekt:in nicht belastbar.

LBO. BauO Bln (Bauordnung für Berlin).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.
     Berlin als Stadtstaat: die Bauordnung wirkt zugleich als Landes-
     und Kommunalrecht; Kollisionsfragen mit B-Plan-Festsetzungen
     werden im Einzelfall geklärt.

DEFAULT-FALLBACK. MBO als Referenzrahmen, soweit projektrelevante
Berlin-Spezifika nicht vorliegen.
`

export const BERLIN_DELTA: StateDelta = {
  bundesland: 'berlin',
  bundeslandLabelDe: 'Berlin',
  bundeslandLabelEn: 'Berlin',
  postcodeRanges: ['10115-14199'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: [],
}
