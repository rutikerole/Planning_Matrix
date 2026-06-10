# Runtime citation heading gate — scope / handoff (#1 campaign)

**Status:** SCOPED, NOT IMPLEMENTED. This is the handoff for a future sprint — do
**after** the Saarland thin walk. Author: T-04 citation-coverage diagnosis (2026-06).

## Why this exists
The confirming T-04 NRW/Düsseldorf walk had the persona cite **§ 33 BauO NRW** for
Rettungswege mid-consultation. Diagnosis verdict: **§ 33 is CORRECT** — the corpus
heading (`scripts/legal-corpus/states/nrw.json`) is *"Erster und zweiter Rettungsweg"*.
So there was **no instance bug**. But proving it surfaced a **latent CLASS-4 hole**:
the persona could just as easily have cited an *existing-but-wrong-topic* § (e.g.
"§ 49 BauO NRW" — Barrierefreies Bauen — for Stellplätze) and **nothing would have
caught it**, because heading-match (does § X actually govern topic Y) is enforced only
at build time on authored content, never on runtime persona emission.

Two small, in-scope parts were already fixed (branch `fix/nrw-allowlist-rettungsweg`):
- **#2 NRW allowlist completeness** — added `§ 33 BauO NRW` to NRW's allowlist (it was
  omitted while 7 other states allowlist their § 33). Edge-fn (chat-turn redeploy).
- **#3 build-time authoring guard** — `verify:allowlist-headings` asserts every
  authored allowlist § resolves to a corpus heading. Frontend, in prebuild.

This doc is **#1**: the runtime gate that neither of those closes.

## Citation-surface gate-coverage map (as of this diagnosis)
| Surface | §-existence | Heading-match (§ ↔ topic) |
|---|---|---|
| Authored StateCitationPack concept fields | `verify-citations --strict` | ✅ `verify-concept-citations` |
| Authored `allowedCitations` §§ | ✅ `audit-allowlist-existence` + `verify-allowlist-headings` (heading-presence) | ❌ existence/presence only |
| Authored `src/legal/*` prose | ✅ `verify-citations --strict` | ❌ |
| **Persona runtime STRUCTURED citations** (toolInput facts/procedures rationale) | `enforceCitationAllowList` (runtime, downgrade-only, **(law,number) membership only**) | ❌ **none** |
| **Persona runtime CHAT PROSE citations** | `citationLint` regex (runtime, **observability-only, never blocks**) | ❌ **none** |

## The exact hole
- `supabase/functions/chat-turn/citationLint.ts` — header `:7-8`: *"the response itself
  is NEVER blocked — the linter is observability."* Regex-based (forbidden laws,
  cross-state leak, format). No heading-match.
- `enforceCitationAllowList` (same file) — downgrades the qualifier of a structured
  toolInput citation whose **(law, number)** is not in the active state's
  `allowedCitations`. Comment `:441`: topic/sub-section correctness is **"NOT caught at
  this granularity — Art. 57 IS in the allow-list."** So an allowlisted § cited for the
  wrong topic passes clean.
- Net: **a persona-emitted § is never checked against its corpus heading.**

## Candidate fix (for the next sprint to design)
Add runtime heading-match to persona **structured** citations (the tractable subset —
facts/procedures/documents/roles rationale carry a clear (law, §) + the field's topic):
1. In the edge fn, for each emitted structured citation, resolve (law, §) → corpus
   `heading_de_official`.
2. Compare the heading against the asserted topic (the surrounding rationale / the
   field's semantic role). On mismatch → **downgrade** the qualifier (mirrors the
   existing allowlist downgrade) or **flag** as a `citation.heading_mismatch` event.

## Known risks / decisions to make
- **Fuzzy prose matching → false positives.** Free-text §↔topic matching is not exact;
  a naive keyword check will misfire. Decide the matching strategy (curated topic↔§
  table vs heading-token overlap vs LLM-judge) and the **block-vs-downgrade** policy.
  Strong lean: **downgrade/flag, do not hard-block** — preserve the "observability,
  never block the response" design; a false positive must not eat a correct turn.
- **Chat-prose citations** (vs structured) are harder still (no field topic) — likely
  out of scope for v1; structured-citation heading-match is the high-value 80%.
- The corpus headings must be available at runtime in the edge fn (the corpus pack is
  already generated to `src/legal/corpusCitations.generated.ts`; confirm the edge-fn
  bundle can import the headings without bloating the cold start).

## Deploy / verification reality
- **Edge-fn change** (`citationLint.ts` is bundled into chat-turn) → requires
  `supabase functions deploy chat-turn`.
- **Bayern SHA**: `citationLint.ts` is not part of the composed prompt prefix, so a pure
  lint change should not move `45aea17a…209231` — confirm at implementation time.
- **Not verifiable offline.** Like CLASS-2 capture, the only real proof is a confirming
  live walk after deploy (cite a wrong-topic § on purpose, confirm it downgrades/flags).
- Pair with a drift guard: a build-time fixture that feeds a known wrong-topic citation
  through the heading-match logic and asserts it is caught.
