// ───────────────────────────────────────────────────────────────────────
// Phase 11 — composeLegalContext (was Phase 5 const-based compose.ts)
//
// Builds the cached system-prompt PREFIX as a function of `bundesland`,
// reading the per-state slices via the legal registry. Phase 11 commit
// 1 only registers Bayern; commits 2 + 3 add the other 15 states with
// stub content. The Bayern flow remains byte-for-byte identical to the
// pre-Phase-11 `COMPOSED_LEGAL_CONTEXT` const — that is the gate.
//
// Cache-Bust marker — Phase-10.1 (2026-05-06) + Phase-11 (2026-05-07).
// bayern.ts + personaBehaviour.ts + every T-01..T-08 tail were
// rewritten in 10.1 to remove the "Anlage 1 BayBO" anchor; in 11 the
// composer became a function. Anthropic's prompt cache hashes the
// prefix content, so changing those strings naturally invalidates
// every prior cache entry — no separate cache-busting payload is
// needed. This marker exists so future prefix-debugging ("which
// commit changed the cached prefix?") can grep for it.
//
// Order: shared → federal → state.systemBlock → state.cityBlock?
//        → personaBehaviour → templateShared → projektkontext-tail.
// federal-most-stable to city-most-specific. The model reads the
// Eigennamen + tone rules first, then federal law, then state-
// specifics, then (for Bayern) München anchors.
//
// ACTIVE CITY: München (Bayern's cityBlock = MUENCHEN_BLOCK).
// SLEEPING: Erlangen — `erlangen.ts` is parked, not deleted. To
// re-enable as city #2, the Bayern StateDelta would expose a
// city-resolver instead of a single cityBlock string.
// ───────────────────────────────────────────────────────────────────────

import { SHARED_BLOCK } from './shared.ts'
import { FEDERAL_BLOCK } from './federal.ts'
import { PERSONA_BEHAVIOURAL_RULES } from './personaBehaviour.ts'
import { TEMPLATE_SHARED_BLOCK } from './templates/index.ts'
import { resolveStateDelta } from './legalRegistry.ts'

const SLICE_SEPARATOR = '\n\n---\n\n'

const PROJEKTKONTEXT_TAIL =
  '\n\n══════════════════════════════════════════════════════════════════════════' +
  '\nPROJEKTKONTEXT' +
  '\n══════════════════════════════════════════════════════════════════════════' +
  '\n\nEs folgt: Template-Kontext (T-XX), Locale-Hinweis, aktueller Projektzustand' +
  '\n(Grundstück, A/B/C-Bereiche, jüngste Fakten, Top-3-Empfehlungen, zuletzt' +
  '\ngestellte Fragen, jüngste Bauherreneingabe, letzte sprechende Fachperson).\n'

/**
 * Phase 10 → Phase 11 — composed system-prompt PREFIX (Block 1 of the
 * two-block cache architecture). Cache-eligible (ephemeral, 5-min TTL).
 *
 * Returns a string that is the concatenation of:
 *   1. SHARED_BLOCK
 *   2. FEDERAL_BLOCK
 *   3. state.systemBlock
 *   4. state.cityBlock        (when non-null; today only Bayern → München)
 *   5. PERSONA_BEHAVIOURAL_RULES
 *   6. TEMPLATE_SHARED_BLOCK
 *   + the PROJEKTKONTEXT tail marker.
 *
 * Bayern invariant: composeLegalContext('bayern') is byte-for-byte
 * identical to the pre-Phase-11 `COMPOSED_LEGAL_CONTEXT` const. This
 * is the gate for Phase 11 commit 1 — verified by smokeWalk.
 */
export function composeLegalContext(bundesland: string | null | undefined): string {
  const state = resolveStateDelta(bundesland)
  const slices: string[] = [SHARED_BLOCK, FEDERAL_BLOCK, state.systemBlock]
  if (state.cityBlock) slices.push(state.cityBlock)
  slices.push(PERSONA_BEHAVIOURAL_RULES)
  slices.push(TEMPLATE_SHARED_BLOCK)
  return slices.join(SLICE_SEPARATOR) + PROJEKTKONTEXT_TAIL
}
