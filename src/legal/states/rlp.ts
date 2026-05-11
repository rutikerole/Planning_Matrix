// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Rheinland-Pfalz minimum stub
//
// MBO-default + "in Vorbereitung" framing. No persona content.
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

export const RLP_DELTA: StateDelta = {
  bundesland: 'rlp',
  bundeslandLabelDe: 'Rheinland-Pfalz',
  bundeslandLabelEn: 'Rhineland-Palatinate',
  postcodeRanges: ['54290-56869', '55116-55776', '67059-67829'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: [],
}
