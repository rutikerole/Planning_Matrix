// ───────────────────────────────────────────────────────────────────────
// v1.0.33 C3 — SINGLE SOURCE OF TRUTH for the canonical Bayern citation
// allowlist.
//
// Until now this array existed byte-for-byte in TWO places — the LLM-prompt
// side (src/legal/states/bayern.ts → BAYERN_DELTA.allowedCitations) and the
// chat-turn citation firewall (supabase/functions/chat-turn/citationLint.ts) —
// with no link between them. A developer who corrected a § in one copy left
// the other stale (the prompt↔firewall drift Agent 3 flagged). Both now import
// from here, so the list is authored ONCE.
//
// Tokens are sourced from bayern.ts (BAYERN_BLOCK) + muenchen.ts (StPlS 926 /
// Erhaltungssatzungen) plus the federal-law tokens that legitimately appear
// next to Bayern citations. Order = order of appearance in bayern.ts.
//
// DRIFT GATE: scripts/verify-citation-drift.mjs (npm run verify:citation-drift,
// wired into prebuild) asserts (a) this is the only definition of the array and
// (b) every BayBO/BayDSchG citation the PDF engine emits (stateLocalization.ts /
// stateCitations.ts Bayern packs) is present here.
//
// NOTE — this file is NOT part of the Bayern composed-prefix SHA (that hashes
// bayern.ts / muenchen.ts / shared.ts / federal.ts / personaBehaviour.ts /
// templates/shared.ts). Editing this list does not move the SHA.
// ───────────────────────────────────────────────────────────────────────

export const BAYERN_ALLOWED_CITATIONS: readonly string[] = [
  // BayBO core articles
  'Art. 2 Abs. 3 BayBO',
  'Art. 2 Abs. 4 BayBO',
  'Art. 6 BayBO',
  'Art. 12 BayBO',
  'Art. 44a BayBO',
  'Art. 46 Abs. 6 BayBO',
  'Art. 47 BayBO',
  'Art. 57 BayBO',
  'Art. 57 Abs. 1 Nr. 1 a BayBO',
  'Art. 57 Abs. 1 Nr. 1 b BayBO',
  'Art. 57 Abs. 1 Nr. 3 b BayBO',
  'Art. 57 Abs. 1 Nr. 18 BayBO',
  'Art. 57 Abs. 3 Nr. 3 BayBO',
  'Art. 57 Abs. 4 BayBO',
  'Art. 57 Abs. 5 BayBO',
  'Art. 57 Abs. 7 BayBO',
  'Art. 58 BayBO',
  'Art. 59 BayBO',
  'Art. 60 BayBO',
  'Art. 61 BayBO',
  'Art. 62 BayBO',
  'Art. 64 BayBO',
  'Art. 65 BayBO',
  'Art. 66 BayBO',
  'Art. 69 BayBO',
  'Art. 76 BayBO',
  'Art. 81 Abs. 1 Nr. 4 b BayBO',
  'Art. 82c BayBO',
  // BayDSchG
  'BayDSchG Art. 6',
  // München-specific (StPlS 926, Erhaltungssatzungen via BauGB)
  'StPlS 926 Anlage 1 Nr. 1.1',
  'StPlS 926 § 3 Abs. 2',
  'StPlS 926 § 3 Abs. 4',
  'StPlS 926 § 4 Abs. 3',
  'BauGB § 172',
  // Federal-law tokens that legitimately appear next to Bayern citations
  'BauGB § 30',
  'BauGB § 34',
  'BauGB § 35',
  'BauGB § 246e',
  'BauNVO § 19',
  'GEG § 8',
  'BauGB § 31 Abs. 3',
  'BauGB § 34 Abs. 3b',
] as const
