// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Bremen minimum stub (Stadtstaat)
//
// MBO-default + "in Vorbereitung" framing. No persona content.
// Stadtstaat — cityBlock stays null per locked decision.
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'
import { buildAntiBayernLeakBlock } from './_antiBayernLeak.ts'

const ANTI_LEAK = buildAntiBayernLeakBlock({
  labelDe: 'Bremen',
  labelEn: 'Bremen',
  codePrefix: 'BremLBO',
  isSubstantive: false,
})

const SYSTEM_BLOCK = `${ANTI_LEAK}══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: BREMEN (STADTSTAAT) — Mindest-Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis: Detail-Spezifika für Bremen werden in einer späteren
Bearbeitungsphase ergänzt. Bis dahin gelten die MBO-Defaults als
Arbeitsgrundlage. Aussagen zu konkreten Paragraphen oder Verfahren
sind ohne ausdrückliche Verifikation durch eine/n bauvorlage-
berechtigte/n Architekt:in nicht belastbar.

LBO. BremLBO (Bremische Landesbauordnung).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.
     Bremen umfasst die Stadtgemeinden Bremen und Bremerhaven; die
     BremLBO wirkt zugleich als Landes- und Kommunalrecht.

DEFAULT-FALLBACK. MBO als Referenzrahmen, soweit projektrelevante
Bremen-Spezifika nicht vorliegen.
`

export const BREMEN_DELTA: StateDelta = {
  bundesland: 'bremen',
  bundeslandLabelDe: 'Bremen',
  bundeslandLabelEn: 'Bremen',
  postcodeRanges: ['28195-28779', '27568-27580'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: [],
}
