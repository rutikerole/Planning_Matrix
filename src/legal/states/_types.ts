// ───────────────────────────────────────────────────────────────────────
// Phase 11 — StateDelta interface
//
// One typed wrapper per Bundesland. The interface emerged from the real
// content of the existing bayern.ts + muenchen.ts (~900 LOC combined),
// not the shorter audit §14 sketch — the sketch underweighted city-level
// content (München) and the per-state token allowlist (citation lint
// firewall). This shape preserves both.
//
// Composition order at runtime (legalRegistry.composeLegalContext):
//
//   SHARED + FEDERAL + state.systemBlock + state.cityBlock?
//          + PERSONA_BEHAVIOURAL_RULES + TEMPLATE_SHARED_BLOCK
//
// state.cityBlock is optional. Bayern carries MUENCHEN_BLOCK there
// (today's only active city slice). Other states carry null until per-
// state city handling lands in Phase 14+.
// ───────────────────────────────────────────────────────────────────────

/**
 * Canonical Bundesland code. The 16 German Bundesländer plus a fallback
 * sentinel so unknown values from `projects.bundesland` don't crash the
 * registry (they resolve to the Bayern slice with a warning logged).
 *
 * Lower-case + ASCII only. Matches the `projects.bundesland` text values
 * (today the wizard only writes 'bayern'; Phase 11 commits 2 + 3 add the
 * other 15).
 */
export type BundeslandCode =
  | 'bayern'
  | 'nrw'
  | 'bw'
  | 'niedersachsen'
  | 'hessen'
  | 'sachsen'
  | 'sachsen-anhalt'
  | 'thueringen'
  | 'rlp'
  | 'saarland'
  | 'sh'
  | 'mv'
  | 'brandenburg'
  | 'berlin'
  | 'hamburg'
  | 'bremen'

export interface StateDelta {
  /** Stable lower-case identifier — matches `projects.bundesland`. */
  bundesland: BundeslandCode

  /** Human-readable label, German + English. */
  bundeslandLabelDe: string
  bundeslandLabelEn: string

  /**
   * PLZ ranges that belong to this Bundesland, used for the bundesland-
   * sanity heuristic in the persona prompt (e.g. Bayern-PLZ heuristic
   * in bayern.ts:374-385). Format: ["NNNNN-NNNNN", ...] inclusive.
   */
  postcodeRanges: ReadonlyArray<string>

  /**
   * The full Bundesland-specific system-prompt slice. Composed AFTER
   * federal in the cached prefix.
   *
   * Phase 11 commit 1: Bayern carries the legacy BAYERN_BLOCK content
   * verbatim. Phase 11 commits 2 + 3: stub content for the other 15
   * (article numbers + Verfahrenstypen + Architektenkammer + a small
   * "Detail-Spezifika in Vorbereitung" disclaimer). Phase 12 expands
   * the four top stubs to full persona-grade content.
   */
  systemBlock: string

  /**
   * City-level slice composed AFTER state. Bayern carries MUENCHEN_BLOCK
   * (the only active city slice today). Other states have null until
   * per-state city handling lands. Null-safe in compose.
   */
  cityBlock: string | null

  /**
   * Token allowlist for the citation firewall. Reference list of
   * canonical citation strings the persona is encouraged to use for
   * this Bundesland. Used by citationLint.ts (Phase 11+) to resolve
   * the per-state allowlist.
   *
   * Phase 11 commit 1 keeps Bayern's existing allowlist content here;
   * the firewall behavior (forbidden patterns) is unchanged in commit
   * 1. Per-state firewall switching ships in commits 2/3.
   */
  allowedCitations: ReadonlyArray<string>
}
