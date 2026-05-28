# B0 — State-aware template-tail rails

Branch: `spike/b0-state-aware-templates`. Date: 2026-05-28. Scope: infrastructure
only. **Zero output change today.** Bucket B proper fills the cells.

## Why this exists

Pre-B0 templates (`src/legal/templates/t0X-*.ts`) were single Bayern-shaped text
blocks — no state branching, no override hook. `docs/COVERAGE_TRUTH_TABLE.md`
§0 surprise #1 + `docs/SPRINT_PLAN.md` open question #1 flagged this as the
real blocker for Bucket B (deepen the 5 substantive states across T-02..T-08).

B0 builds the rail. Nothing more.

## What B0 changes

| File | Change | Output effect |
|---|---|---|
| `src/legal/templates/stateOverrides.ts` (new) | Typed registry `TEMPLATE_STATE_OVERRIDES: Partial<Record<TemplateId, Partial<Record<BundeslandCode, string \| null>>>>` | None — empty + 28 explicit `null` scaffolds |
| `src/legal/templates/index.ts` | `getTemplateBlock(T)` → `getTemplateBlock(T, bundesland?)`; resolver appends override when non-null, returns `BLOCKS[T]` otherwise | None — no override → base unchanged |
| `supabase/functions/chat-turn/systemPrompt.ts:263` | Pass `bundesland` to `getTemplateBlock` | None — bundesland already in scope at the call site |
| `scripts/verify-template-tail-noop.mts` (new) | Tsx gate asserting 8 + 128 = 136 byte-identical-to-base assertions | Catches future drift |
| `package.json` | Wire new gate into `prebuild` | None — gate green at B0 |

## Design — chosen: additive addendum

```ts
function getTemplateBlock(T, B?): string {
  const base = BLOCKS[T] ?? T08_DEFAULT
  if (!B) return base
  const override = TEMPLATE_STATE_OVERRIDES[T]?.[normalize(B)]
  if (!override) return base
  return base + '\n\n' + override
}
```

- The base block (Bayern-shaped) is **never replaced** — only optionally extended.
- `null` and `undefined` overrides are both no-ops (`!override` is `true` for both).
- Input bundesland is normalised with `.trim().toLowerCase()` matching the
  project-wide convention at `stateCitations.ts:406` and (after Bucket A.5)
  `demoCoverage.ts:hasSubstantiveStateBlock`.

## Designs rejected

| # | Design | Why rejected |
|---|---|---|
| B | Full replacement — override REPLACES base when present | High authoring cost: each per-cell override must duplicate the generic procedure-shape parts. Encourages copy-paste of Bayern text into states where the §§ are different. |
| C | Sectioned block — t0X-*.ts files restructure into `{ citations, examples, procedure_hints }` objects; override merges per-section | High blast radius: would require restructuring all 8 t0X-*.ts files and rewriting the BLOCKS map shape. Bayern SHA is unaffected (the SHA scope excludes per-template tails) but drift risk during the restructure is real. Defer to a future iteration if/when authoring duplication in (A) becomes a real bottleneck. |

Chose (A) because it preserves the Bayern-shaped base verbatim (zero output
change today), enables Bucket B authors to write only the state-correct delta,
and adds one new file + one signature change + one caller line. The override
is *additive on top of* the existing block, not a wholesale rewrite. Bucket B
can evolve toward (C) only if real authoring duplication is observed.

## How a Bucket B content author fills a cell

For each (template, state) cell that legal review has verified:

1. Open `src/legal/templates/stateOverrides.ts`.
2. Find the cell (e.g. `'T-02'.nrw`). It currently reads `null` with a
   `// BUCKET-B-CONTENT: needs verified §§ from legal review (NW BauO NRW).`
   comment above it.
3. Replace `null` with the verified addendum string. The addendum is appended
   *after* the existing Bayern-shaped base block — it should:
   - Override or contradict any Bayern §§ the base mentions, naming the
     state-correct §§ from the verified source.
   - Cite §§ that exist in `scripts/legal-corpus/{state}-*.json` (verified
     against primary sources). Cross-check `src/legal/stateCitations.ts:79-182`
     for the corpus pack's per-state citation fields.
   - Be self-contained (the model reads base + addendum together; the
     addendum gets the final word).
4. Open `scripts/verify-template-tail-noop.mts`.
5. Add the cell's key (e.g. `'T-02:nrw'`) to `ACKNOWLEDGED_OVERRIDES`.
6. Run `npm run prebuild`. The gate confirms green.
7. Commit. Include in the message: which primary sources verified each §.

**Anti-pattern.** Do not write a partial / placeholder string like `'TODO:
add NRW law'` or `''`. The gate cares about content drift, not intent. A
non-null override means "this cell has been authored and acknowledged"; a
null means "still TODO". The two states are deliberately disjoint.

## Fabrication-safety rule

This rule is in the registry header. Repeating here for emphasis:

> Overrides must contain only §§/Art. citations VERIFIED by legal review
> (architect with bauvorlageberechtigung, or licensed counsel) against
> primary sources. NEVER invent law for any state. The pre-Bucket-A audit
> (docs/COVERAGE_TRUTH_TABLE.md) exists precisely because silent-wrong
> content destroys trust faster than thin content. If unsure, leave `null`.

The audit (commit `85c0a16` on `audit/coverage-truth-table`) is the primary
record of why fabrication risk is the trust-killer. Re-read it before
authoring any non-null override.

## The gate's invariant

`scripts/verify-template-tail-noop.mts` asserts, on every `npm run prebuild`:

1. **No-bundesland controls (8):** for each `T-01..T-08`,
   `getTemplateBlock(T) === BLOCKS[T]`. The base path is unchanged.
2. **Per-cell assertions (128):** for each (`T`, `bundesland`) where
   bundesland ∈ `listRegisteredStates()`, `getTemplateBlock(T, bundesland)
   === BLOCKS[T]` UNLESS the cell key (`<T>:<bundesland>`) is in
   `ACKNOWLEDGED_OVERRIDES`.

Total: 136 assertions per prebuild. With the B0 commit landed,
`ACKNOWLEDGED_OVERRIDES` is empty — meaning no override is allowed to
change any cell yet. As Bucket B authors fill cells, each author appends
their (T, bundesland) key to `ACKNOWLEDGED_OVERRIDES` as part of the
same commit. Accidental authoring (someone partially fills a cell and
forgets the acknowledgement step) fails the gate at prebuild → build red →
no merge.

**Proven to catch regressions.** Injected `'T-02'.nrw = 'fake'` →
gate output:

```
[verify:template-tail-noop] FAIL — unacknowledged state override drift:

  T-02 × nrw
    resolver returned 8442 chars vs BLOCKS[T] 8395 chars; cell T-02:nrw
    not in ACKNOWLEDGED_OVERRIDES

Fix:
  • Either remove the override from src/legal/templates/stateOverrides.ts,
  • Or add the (template, state) key to ACKNOWLEDGED_OVERRIDES in this gate
    after verifying the addendum cites only §§ from primary-source review.

npm exit: 1
```

(Injection reverted; gate green again. The reproduction is in
`spike/b0-state-aware-templates` commit `8a562c4`'s commit message.)

## What B0 deliberately did NOT do

- **No legal content authored.** Zero new §§ for any state.
- **No `BLOCKS[T-X]` value changed.** All 8 t0X-*.ts files are untouched.
- **No Bayern path touched.** `src/legal/bayern.ts`, `states/bayern.ts`,
  `compose.ts`, DESIGN_DNA, Phase 7.9 — all untouched.
- **No section-restructure of t0X-*.ts.** The base blocks remain single
  text blocks. Bucket B may move toward sections later if needed.
- **No cells for the 11 stub states scaffolded.** Those belong to Bucket
  C, gated on real legal counsel. Scaffolding them now would invite the
  same fabrication risk Bucket A killed.
- **No content-authoring workflow tooling.** A future enhancement could
  parse `stateCitations.ts` and generate a per-cell skeleton with the
  state's `permitFormCitation` / `structuralCertCitation` etc.
  pre-filled. Skipped here; the rail is enough.

## Revised Bucket B estimate now that the rails exist

`docs/SPRINT_PLAN.md` previously estimated Bucket B at ~5–7 sprints with
B0 as the riskiest hidden prerequisite. With B0 landed:

| Item | Pre-B0 estimate | Post-B0 estimate | Notes |
|---|---|---|---|
| B0 — template-state infrastructure | ~1 sprint (discovery spike) | **done (this branch)** | < 1 day actual; clean design, no SHA drift |
| B1 — populate allowedCitations for BW/HE/NW/NI × T-02..T-08 | ~1 sprint | ~½ sprint | now decoupled from B0; just adds entries to allowedCitations arrays |
| B2 — author 28 verified template-tail overrides | ~3-4 sprints | ~3-4 sprints (unchanged) | this is the legal-review-gated bottleneck; corpus coverage check still needed (SPRINT_PLAN open question #2) |
| B3 — extend smoke matrix to 28 new cells | ~½ sprint | ~½ sprint (unchanged) | smoke pins call `getTemplateBlock(T, B)` already in B0's signature; no harness change needed beyond fixtures |
| B4 — de-München cost-engine framing | ~½ sprint | ~½ sprint (unchanged) | independent of B0 |
| **Bucket B total** | ~5-7 sprints | **~4-5 sprints** | B0 absorbed; corpus-coverage audit (open question #2) still pending |

The revised estimate assumes the SPRINT_PLAN open question #2 (corpus
coverage of T-02..T-08 §§ for BW/HE/NW/NI) resolves favourably. If many
§§ have to be researched from primary sources, B2 slides toward 5
sprints and the total to ~6.

## File:line index

- `src/legal/templates/stateOverrides.ts:46-93` — registry definition + 28 scaffolds
- `src/legal/templates/index.ts:23,38-39,55-72` — exports + new `getTemplateBlock(T, B?)`
- `supabase/functions/chat-turn/systemPrompt.ts:263-269` — caller threads bundesland
- `scripts/verify-template-tail-noop.mts:1-103` — golden gate
- `package.json:14-15,20` — wire to prebuild

## Status

- Branch: `spike/b0-state-aware-templates`, three commits.
- Bayern SHA: `cdf3c625…23f9daaf` ✓ at start, after every commit, at end.
- Prebuild: 9 gates green (added `verify:template-tail-noop`).
- TypeScript: clean. Build: 298.0 KB gz / 300 ceiling (unchanged).
- Not pushed, not merged. Ready for review.
