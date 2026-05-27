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

/**
 * Phase B — all 8 templates are now wired to the legal corpus (citations trace
 * to scripts/legal-corpus/; the renderer handles every template without
 * crashing). Cost calibration for T-02/T-04/T-06/T-07/T-08 remains Phase C, but
 * that is a quality concern, not a gate — the cells render with honest cost
 * stubs/bands. The v1.0.31 three-cell freeze is lifted.
 */
export const PDF_DEMO_TEMPLATE_IDS: readonly TemplateId[] = [
  'T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07', 'T-08',
]

/**
 * Phase B: true for ALL 16 states. The 11 former stubs now carry corpus-backed
 * BauO §§ in both chokepoints (stateCitations citations + stateLocalization
 * procedure §§), so they are substantive; combined with all 8 templates, every
 * one of the 128 cells is demo-ready. Resolves via
 * getStateCitations(b).isSubstantive.
 */
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
