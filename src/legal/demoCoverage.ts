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

// ───────────────────────────────────────────────────────────────────────
// State-block depth — sibling helper to isSubstantiveBundesland.
//
// Phase B flipped isSubstantive=true for ALL 16 states (PDF readiness gate;
// stateCitations.ts:364 — makeCorpusPack). That is correct for PDF gating
// but useless as a banner trigger: the system-prompt-level state block in
// src/legal/states/{state}.ts is the 42-line "Mindest-Eckdaten" disclaimer
// for 11 states; only 5 carry a full systemBlock. The chat / result-page
// honesty banner needs the second classification, not the PDF one.
//
// Source: stateCitations.ts:79-182 — exactly these five states carry an
// inline-hardcoded StateCitationPack with isSubstantive: true PLUS the
// matching deep state file (bayern/, bw/, hessen/, nrw/, niedersachsen/).
// The other 11 states get their pack from makeCorpusPack() (line 364) and
// their state file is the disclaimer skeleton. The locale copy at
// de.json:861 / en.json:861 (wizard outsideMunich detail) already names
// this exact 5-state set as the substantive boundary — same source of
// truth, no drift.
// ───────────────────────────────────────────────────────────────────────

const STATES_WITH_FULL_STATE_BLOCK: ReadonlySet<string> = new Set([
  'bayern',
  'nrw',
  'bw',
  'hessen',
  'niedersachsen',
])

/**
 * True when the project's bundesland has a full state-block in
 * src/legal/states/{state}.ts (BY/BW/HE/NW/NI). False for the 11 thin
 * states whose systemBlock is the "Mindest-Eckdaten / nicht belastbar"
 * disclaimer. Use this to gate the chat-UI and result-page preliminary
 * banner — NOT isSubstantiveBundesland (which is Phase-B true for all 16).
 */
export function hasSubstantiveStateBlock(
  bundesland: string | null | undefined,
): boolean {
  if (!bundesland) return false
  return STATES_WITH_FULL_STATE_BLOCK.has(bundesland)
}
