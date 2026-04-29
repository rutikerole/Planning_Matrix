// ───────────────────────────────────────────────────────────────────────
// Phase 3 — legalContext/compose.ts
//
// Single composition point for the four ordered slices. The composed
// prefix is what carries `cache_control: { type: 'ephemeral' }` in
// systemPrompt.ts → buildSystemBlocks. Live state still lives AFTER
// the cache marker; only this prefix is cached.
//
// Order: shared → federal → bayern → erlangen.
// federal-most-stable to city-most-specific. The model reads the
// Eigennamen + tone rules first, then federal law, then Bayern
// specifics, then Erlangen anchors.
// ───────────────────────────────────────────────────────────────────────

import { SHARED_BLOCK } from './shared.ts'
import { FEDERAL_BLOCK } from './federal.ts'
import { BAYERN_BLOCK } from './bayern.ts'
import { ERLANGEN_BLOCK } from './erlangen.ts'

const SLICE_SEPARATOR = '\n\n---\n\n'

/**
 * Composed system-prompt prefix. Cache-eligible (ephemeral, 5-min
 * TTL via Anthropic prompt cache). Total size ~9–12k tokens —
 * verify against the `scripts/dev/print-composed-prompt.mjs` count
 * after a substantive edit. The prefix is followed at runtime by:
 *
 *   1. buildLocaleBlock (locale-aware addendum, NOT cached)
 *   2. buildLiveStateBlock (per-turn state, NOT cached)
 *
 * — i.e. only this constant carries `cache_control` in the multi-
 * block system array.
 */
export const COMPOSED_LEGAL_CONTEXT = [
  SHARED_BLOCK,
  FEDERAL_BLOCK,
  BAYERN_BLOCK,
  ERLANGEN_BLOCK,
].join(SLICE_SEPARATOR) +
  // Tail: PROJEKTKONTEXT marker — the dynamic state block follows in
  // the multi-block system array. The model expects this label so it
  // knows where the static prefix ends and the live state begins.
  '\n\n══════════════════════════════════════════════════════════════════════════' +
  '\nPROJEKTKONTEXT' +
  '\n══════════════════════════════════════════════════════════════════════════' +
  '\n\nEs folgt der aktuelle Projektzustand: Template, Grundstück, A/B/C-Bereiche,' +
  '\njüngste Fakten, vorhandene Top-3-Empfehlungen, zuletzt gestellte Fragen,' +
  '\njüngste Bauherreneingabe und letzte sprechende Fachperson.\n'
