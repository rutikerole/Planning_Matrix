// ───────────────────────────────────────────────────────────────────────
// v1.0.31 — PDF vertical-slice demo coverage.
//
// The v1.0.31 sprint hardens the architect PDF for THREE demo cells
// (T-01 × Bayern, T-05 × NRW, T-03 × Hessen) against the 12 PDF MUST checks
// (see docs/V1_0_31_PDF_SLICE_DIAGNOSIS.md). Every other template × state is
// frozen behind an honest "coverage in preparation" UI state until its own
// hardening pass — NOT because the renderer crashes, but because those cells
// have not yet passed the 12-check bar (template-blind cost/procedure for
// T-02/T-04/T-06/T-07/T-08; non-substantive §§ for the 11 stub states).
//
// This is a UI-layer gate ONLY. `buildExportPdf` is untouched, so the smoke
// gates (which call the renderer directly) keep exercising every fixture.
// ───────────────────────────────────────────────────────────────────────

import type { TemplateId } from '@/types/projectState'
import { getStateCitations } from './stateCitations'

/** Templates hardened to the 12 PDF MUST checks in v1.0.31. */
export const PDF_DEMO_TEMPLATE_IDS: readonly TemplateId[] = ['T-01', 'T-03', 'T-05']

/** True for the 5 substantive states (Bayern/NRW/BW/Hessen/Niedersachsen). */
export function isSubstantiveBundesland(
  bundesland: string | null | undefined,
): boolean {
  if (!bundesland) return false
  try {
    return getStateCitations(bundesland as never).isSubstantive === true
  } catch {
    return false
  }
}

/**
 * A project is "PDF demo ready" when its template is one of the three hardened
 * cells AND its state is substantive. Everything else renders the honest
 * "coverage in preparation" state in the export menus.
 */
export function isPdfDemoReady(
  templateId: string | null | undefined,
  bundesland: string | null | undefined,
): boolean {
  return (
    !!templateId &&
    (PDF_DEMO_TEMPLATE_IDS as readonly string[]).includes(templateId) &&
    isSubstantiveBundesland(bundesland)
  )
}
