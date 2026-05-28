// ───────────────────────────────────────────────────────────────────────
// Bucket B0 — per-(template, state) override registry.
//
// When `getTemplateBlock(templateId, bundesland)` finds a NON-NULL string
// override at TEMPLATE_STATE_OVERRIDES[templateId][bundesland], the
// resolver returns BLOCKS[templateId] + '\n\n' + override. When the
// cell is `null` or absent, the resolver returns BLOCKS[templateId]
// unchanged — preserving today's Bayern-shaped default behaviour for
// every state.
//
// Design: ADDITIVE addendum, not replacement (Bucket B0 design doc,
// /docs/B0_TEMPLATE_STATE_RAILS.md). Smallest blast radius; zero output
// change with no override registered; Bayern SHA invariant holds
// because Block 2 (this layer) is not in the Bayern SHA scope.
//
// ─── FABRICATION SAFETY (read before adding any non-null override) ───
//
// Overrides must contain only §§/Art. citations VERIFIED by legal review
// (architect with bauvorlageberechtigung, or licensed counsel) against
// primary sources. NEVER invent law for any state. The pre-Bucket-A
// audit (docs/COVERAGE_TRUTH_TABLE.md) exists precisely because silent-
// wrong content destroys trust faster than thin content. If unsure,
// leave `null`. The verify:template-tail-noop gate (scripts/verify-
// template-tail-noop.mts) requires every newly-authored cell to be
// explicitly listed in ACKNOWLEDGED_OVERRIDES — preventing accidental
// silent additions.
//
// ─── HOW TO ADD A VERIFIED CELL (Bucket B proper) ──────────────────
//
//   1. Replace the cell's `null` with the verified addendum string.
//   2. Add the (T, bundesland) key to ACKNOWLEDGED_OVERRIDES in the gate.
//   3. Re-run `npm run prebuild` (verify:template-tail-noop will pass).
//   4. Per-cell content should include verified §§ + procedure-typical
//      handling for that state × template. Use the corpus pack at
//      src/legal/stateCitations.ts as the source of truth, not the
//      Bayern-shaped base.
// ───────────────────────────────────────────────────────────────────────

import type { TemplateId } from '../../types/projectState.ts'
import type { BundeslandCode } from '../states/_types.ts'

export type StateOverride = string | null

export type TemplateStateOverrides = Partial<
  Record<TemplateId, Partial<Record<BundeslandCode, StateOverride>>>
>

/**
 * The (template × bundesland) → override-addendum registry.
 *
 * 28 SCAFFOLDED CELLS (BW/HE/NW/NI × T-02..T-08), all `null` = no-op.
 *
 * These cells are the Bucket B "deepen 5 substantive states" target
 * (SPRINT_PLAN.md §B). T-01 across the 4 substantive non-Bayern states
 * is NOT scaffolded because it is already smoke-pinned in
 * scripts/smoke-walk-matrix.mjs (those cells have asserted state-correct
 * output today; Bucket B will revisit them after the bigger gaps close).
 *
 * Bayern × T-01..T-08 is NOT scaffolded because BLOCKS[T] is the Bayern
 * default — no override needed for Bayern projects.
 *
 * The 11 stub-state cells (Stadtstaaten + Flächenländer ohne deep
 * systemBlock) are NOT scaffolded yet; they belong to Bucket C, which
 * is gated on real legal counsel.
 *
 * EACH null IS A TODO: replace with the verified §§ addendum string AND
 * add `'<T>:<bundesland>'` to ACKNOWLEDGED_OVERRIDES in
 * scripts/verify-template-tail-noop.mts. Until filled, the gate
 * confirms output stays byte-identical to BLOCKS[T].
 */
export const TEMPLATE_STATE_OVERRIDES: TemplateStateOverrides = {
  // ── T-02 Neubau MFH ──────────────────────────────────────────────
  'T-02': {
    // BUCKET-B-CONTENT: needs verified §§ from legal review (BW LBO).
    bw: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (HE HBO).
    hessen: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NW BauO NRW).
    nrw: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NI NBauO).
    niedersachsen: null,
  },
  // ── T-03 Sanierung ───────────────────────────────────────────────
  'T-03': {
    // BUCKET-B-CONTENT: needs verified §§ from legal review (BW LBO).
    bw: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (HE HBO).
    hessen: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NW BauO NRW).
    nrw: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NI NBauO).
    niedersachsen: null,
  },
  // ── T-04 Umnutzung ───────────────────────────────────────────────
  'T-04': {
    // BUCKET-B-CONTENT: needs verified §§ from legal review (BW LBO).
    bw: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (HE HBO).
    hessen: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NW BauO NRW).
    nrw: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NI NBauO).
    niedersachsen: null,
  },
  // ── T-05 Abbruch ─────────────────────────────────────────────────
  'T-05': {
    // BUCKET-B-CONTENT: needs verified §§ from legal review (BW LBO).
    bw: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (HE HBO).
    hessen: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NW BauO NRW).
    nrw: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NI NBauO).
    niedersachsen: null,
  },
  // ── T-06 Aufstockung ─────────────────────────────────────────────
  'T-06': {
    // BUCKET-B-CONTENT: needs verified §§ from legal review (BW LBO).
    bw: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (HE HBO).
    hessen: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NW BauO NRW).
    nrw: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NI NBauO).
    niedersachsen: null,
  },
  // ── T-07 Anbau ───────────────────────────────────────────────────
  'T-07': {
    // BUCKET-B-CONTENT: needs verified §§ from legal review (BW LBO).
    bw: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (HE HBO).
    hessen: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NW BauO NRW).
    nrw: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NI NBauO).
    niedersachsen: null,
  },
  // ── T-08 Sonstiges ───────────────────────────────────────────────
  'T-08': {
    // BUCKET-B-CONTENT: needs verified §§ from legal review (BW LBO).
    bw: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (HE HBO).
    hessen: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NW BauO NRW).
    nrw: null,
    // BUCKET-B-CONTENT: needs verified §§ from legal review (NI NBauO).
    niedersachsen: null,
  },
}
