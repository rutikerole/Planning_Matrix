// ───────────────────────────────────────────────────────────────────────
// Phase 10 — Template barrel + getTemplateBlock dispatcher.
//
// Two-block cache architecture (Phase 10 audit § 2):
//   Block 1 (cached): joined prefix INCLUDING TEMPLATE_SHARED_BLOCK
//   Block 2 (cached): per-template tail returned by getTemplateBlock
//
// systemPrompt.ts builds the multi-block array; this file owns the
// template dispatch.
// ───────────────────────────────────────────────────────────────────────

import type { TemplateId } from '../../../../../src/types/projectState.ts'
import { T01_NEUBAU_EFH_BLOCK } from './t01-neubau-efh.ts'
import { T02_NEUBAU_MFH_BLOCK } from './t02-neubau-mfh.ts'
import { T03_SANIERUNG_BLOCK } from './t03-sanierung.ts'
import { T04_UMNUTZUNG_BLOCK } from './t04-umnutzung.ts'
import { T05_ABBRUCH_BLOCK } from './t05-abbruch.ts'
import { T06_AUFSTOCKUNG_BLOCK } from './t06-aufstockung.ts'
import { T07_ANBAU_BLOCK } from './t07-anbau.ts'
import { T08_SONSTIGES_BLOCK } from './t08-sonstiges.ts'

export { TEMPLATE_SHARED_BLOCK } from './shared.ts'

const BLOCKS: Record<TemplateId, string> = {
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
 */
export function getTemplateBlock(templateId: TemplateId): string {
  return BLOCKS[templateId] ?? T08_SONSTIGES_BLOCK
}
