// ───────────────────────────────────────────────────────────────────────
// Phase 10 — Template barrel + getTemplateBlock dispatcher.
//
// Two-block cache architecture (Phase 10 audit § 2):
//   Block 1 (cached): joined prefix INCLUDING TEMPLATE_SHARED_BLOCK
//   Block 2 (cached): per-template tail returned by getTemplateBlock
//
// systemPrompt.ts builds the multi-block array; this file owns the
// template dispatch.
//
// Bucket B0 (2026-05-28) — getTemplateBlock now accepts an optional
// `bundesland`. When the (template, state) cell has a non-null entry in
// TEMPLATE_STATE_OVERRIDES (src/legal/templates/stateOverrides.ts), the
// resolver appends `\n\n<override>` to the base block. When the cell is
// null or absent, output is byte-identical to today — preserving the
// Bayern-shaped default behaviour for every state until Bucket B fills
// the override with verified legal content. The verify:template-tail-
// noop prebuild gate enforces this invariant.
// ───────────────────────────────────────────────────────────────────────

import type { TemplateId } from '../../types/projectState.ts'
import { T01_NEUBAU_EFH_BLOCK } from './t01-neubau-efh.ts'
import { T02_NEUBAU_MFH_BLOCK } from './t02-neubau-mfh.ts'
import { T03_SANIERUNG_BLOCK } from './t03-sanierung.ts'
import { T04_UMNUTZUNG_BLOCK } from './t04-umnutzung.ts'
import { T05_ABBRUCH_BLOCK } from './t05-abbruch.ts'
import { T06_AUFSTOCKUNG_BLOCK } from './t06-aufstockung.ts'
import { T07_ANBAU_BLOCK } from './t07-anbau.ts'
import { T08_SONSTIGES_BLOCK } from './t08-sonstiges.ts'
import { TEMPLATE_STATE_OVERRIDES } from './stateOverrides.ts'

export { TEMPLATE_SHARED_BLOCK } from './shared.ts'
export { TEMPLATE_STATE_OVERRIDES } from './stateOverrides.ts'
export type { TemplateStateOverrides, StateOverride } from './stateOverrides.ts'

export const BLOCKS: Record<TemplateId, string> = {
  'T-01': T01_NEUBAU_EFH_BLOCK,
  'T-02': T02_NEUBAU_MFH_BLOCK,
  'T-03': T03_SANIERUNG_BLOCK,
  'T-04': T04_UMNUTZUNG_BLOCK,
  'T-05': T05_ABBRUCH_BLOCK,
  'T-06': T06_AUFSTOCKUNG_BLOCK,
  'T-07': T07_ANBAU_BLOCK,
  'T-08': T08_SONSTIGES_BLOCK,
}

/**
 * Returns the per-template legal-context block for `templateId`. Used
 * as Block 2 in the multi-block system array (cache_control: ephemeral),
 * meaning each template's tail warms once and hits cache on every
 * subsequent turn within that template.
 *
 * Bucket B0 — when an optional `bundesland` is provided AND a non-null
 * override is registered at TEMPLATE_STATE_OVERRIDES[T][bundesland], the
 * override addendum is appended (`\n\n<override>`). When no override is
 * registered (or the override is `null`), the base BLOCKS[T] is returned
 * verbatim — byte-identical to pre-B0 behaviour. Input is normalised
 * (trim + toLowerCase) to match the project-wide bundesland convention
 * (stateCitations.ts:406).
 */
export function getTemplateBlock(
  templateId: TemplateId,
  bundesland?: string | null,
): string {
  const base = BLOCKS[templateId] ?? T08_SONSTIGES_BLOCK
  if (!bundesland) return base
  const code = bundesland.trim().toLowerCase()
  const override = (TEMPLATE_STATE_OVERRIDES[templateId] as
    | Record<string, string | null | undefined>
    | undefined)?.[code]
  if (!override) return base
  return base + '\n\n' + override
}
