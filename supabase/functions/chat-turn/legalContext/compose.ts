// ───────────────────────────────────────────────────────────────────────
// Phase 5 — legalContext/compose.ts (München-active)
//
// Cache-Bust marker — Phase-10.1 (2026-05-06).
// bayern.ts + personaBehaviour.ts + every T-01..T-08 tail were
// rewritten to remove the "Anlage 1 BayBO" anchor and add the
// Bundesland-Disziplin block. Anthropic's prompt cache hashes the
// prefix content, so changing those strings naturally invalidates
// every prior cache entry — no separate cache-busting payload is
// needed. This marker exists so future prefix-debugging ("which
// commit changed the cached prefix?") can grep for it.
//
// Single composition point for the four ordered slices. The composed
// prefix is what carries `cache_control: { type: 'ephemeral' }` in
// systemPrompt.ts → buildSystemBlocks. Live state still lives AFTER
// the cache marker; only this prefix is cached.
//
// Order: shared → federal → bayern → muenchen.
// federal-most-stable to city-most-specific. The model reads the
// Eigennamen + tone rules first, then federal law, then Bayern
// specifics, then München anchors.
//
// ACTIVE CITY: München (Phase 5 — pivoted from Erlangen).
// SLEEPING: Erlangen — `legalContext/erlangen.ts` is parked, not
// deleted. To re-enable as city #2, switch this composer to a
// multi-slice mode in a future phase.
// ───────────────────────────────────────────────────────────────────────

import { SHARED_BLOCK } from './shared.ts'
import { FEDERAL_BLOCK } from './federal.ts'
import { BAYERN_BLOCK } from './bayern.ts'
import { MUENCHEN_BLOCK } from './muenchen.ts'
import { PERSONA_BEHAVIOURAL_RULES } from './personaBehaviour.ts'
import { TEMPLATE_SHARED_BLOCK } from './templates/index.ts'
// import { ERLANGEN_BLOCK } from './erlangen.ts'  // sleeping — re-enable when adding city #2

const SLICE_SEPARATOR = '\n\n---\n\n'

/**
 * Phase 10 — composed system-prompt PREFIX (Block 1 of the two-block
 * cache architecture). Cache-eligible (ephemeral, 5-min TTL).
 *
 * Two-block cache architecture (Phase 10 audit § 2):
 *
 *   Block 1 (this constant, cached): SHARED + FEDERAL + BAYERN +
 *     MUENCHEN + PERSONA_BEHAVIOURAL_RULES + TEMPLATE_SHARED_BLOCK.
 *     Warms ONCE across all templates and all projects.
 *
 *   Block 2 (cached separately, sourced via getTemplateBlock from
 *     templates/index.ts): the per-template tail. Warms per template,
 *     hits cache on second+ turns within a template.
 *
 * Why two blocks instead of rebuilding the whole prefix per template:
 * Anthropic's prompt cache supports up to 4 cache breakpoints per
 * request. Splitting prefix from template tail means the long stable
 * prefix stays hot regardless of which template is active — cache
 * economics dominate.
 *
 * Total size of Block 1: ~9–13k tokens (was ~9–12k pre-Phase 10;
 * +TEMPLATE_SHARED_BLOCK adds ~700 tokens).
 *
 * Followed at runtime by:
 *   2. getTemplateBlock(templateId)  (cached, Phase 10 commit 10)
 *   3. buildLocaleBlock(locale)      (NOT cached)
 *   4. buildLiveStateBlock(state)    (NOT cached)
 */
export const COMPOSED_LEGAL_CONTEXT = [
  SHARED_BLOCK,
  FEDERAL_BLOCK,
  BAYERN_BLOCK,
  MUENCHEN_BLOCK,
  PERSONA_BEHAVIOURAL_RULES,
  TEMPLATE_SHARED_BLOCK,
].join(SLICE_SEPARATOR) +
  // Tail: PROJEKTKONTEXT marker — the per-template block + dynamic
  // state block follow in the multi-block system array. The model
  // expects this label so it knows where the stable prefix ends.
  '\n\n══════════════════════════════════════════════════════════════════════════' +
  '\nPROJEKTKONTEXT' +
  '\n══════════════════════════════════════════════════════════════════════════' +
  '\n\nEs folgt: Template-Kontext (T-XX), Locale-Hinweis, aktueller Projektzustand' +
  '\n(Grundstück, A/B/C-Bereiche, jüngste Fakten, Top-3-Empfehlungen, zuletzt' +
  '\ngestellte Fragen, jüngste Bauherreneingabe, letzte sprechende Fachperson).\n'
