// ───────────────────────────────────────────────────────────────────────
// Phase 11 commit 3 — Schleswig-Holstein minimum stub
//
// MBO-default + "in Vorbereitung" framing. No persona content.
// ───────────────────────────────────────────────────────────────────────

import type { StateDelta } from './_types.ts'
import { buildAntiBayernLeakBlock } from './_antiBayernLeak.ts'

const ANTI_LEAK = buildAntiBayernLeakBlock({
  labelDe: 'Schleswig-Holstein',
  labelEn: 'Schleswig-Holstein',
  codePrefix: 'LBO',
  isSubstantive: false,
})

const SYSTEM_BLOCK = `${ANTI_LEAK}══════════════════════════════════════════════════════════════════════════
BUNDESLAND-DISZIPLIN: SCHLESWIG-HOLSTEIN — Mindest-Eckdaten
══════════════════════════════════════════════════════════════════════════

Hinweis: Detail-Spezifika für Schleswig-Holstein werden in einer
späteren Bearbeitungsphase ergänzt. Bis dahin gelten die MBO-
Defaults als Arbeitsgrundlage. Aussagen zu konkreten Paragraphen
oder Verfahren sind ohne ausdrückliche Verifikation durch eine/n
bauvorlageberechtigte/n Architekt:in nicht belastbar.

LBO. LBO SH (Landesbauordnung für das Land Schleswig-Holstein).
     Strukturmarker: § (Paragraph) — wie Bundesrecht.

DEFAULT-FALLBACK. MBO als Referenzrahmen, soweit projektrelevante
Schleswig-Holstein-Spezifika nicht vorliegen.
`

export const SH_DELTA: StateDelta = {
  bundesland: 'sh',
  bundeslandLabelDe: 'Schleswig-Holstein',
  bundeslandLabelEn: 'Schleswig-Holstein',
  postcodeRanges: ['22844-25997', '23552-23896'],
  systemBlock: SYSTEM_BLOCK,
  cityBlock: null,
  allowedCitations: [],
}
