# Planning Matrix — Sprint Plan: 16 × 8 honest

**Living document.** Every number below is an ESTIMATE that will shift with
actual progress and learning. Update the Status column at every checkpoint.
The source-of-truth for findings + boundary is `docs/COVERAGE_TRUTH_TABLE.md`
(audit commit `85c0a16` on branch `audit/coverage-truth-table`).

## Goal

All 16 Bundesländer × 8 templates either **genuinely substantive** OR
**honestly labelled preliminary** — never silently wrong. Honest deferral is
acceptable; silent-wrong (wrong-state §, fabricated §, hardcoded Bayern leak
on a non-Bayern project) is not. The trust-killer is confident citation of
the wrong Land's law, not absence of content.

Order is A → B → C. D is "do not touch."

## Status — 2026-05-28 (updated)

| Bucket | Scope (one line)                                                                  | Status              | Estimate sprints | Gating                |
|--------|-----------------------------------------------------------------------------------|---------------------|------------------|-----------------------|
| A      | Kill silent-wrong paths; stub-state banners; de-München the calendar              | **DONE — live**     | ~1 (delivered)   | None (code-only)      |
| B0     | State-aware template-tail rails + 28 empty TODO scaffolds + golden noop gate      | **DONE (spike)**    | ~1 day actual    | None (code-only)      |
| B      | Deepen the 5 substantive states (BY/BW/HE/NW/NI) across T-02..T-08 → 40 cells     | TODO                | ~4–5 (revised down from 5–7 after B0) | Light legal review    |
| C      | Author the 11 thin states (Berlin → Saarland order below) → 88 cells              | TODO                | ~8–12            | **Real legal counsel**|
| D      | DO NOT TOUCH — Bayern, prompt-cache key, PDF renderer, smart suggestions, design  | LOCKED              | 0                | n/a                   |

**Bucket A merged to `main` and live on prod (commit `ce554ad`) on 2026-05-28.**
5 commits in `fix/bucket-a-honest-stubs` (`f2fbde0` → `41a66eb` → `1d79434` →
`7cc3f6f` → `65a8310`) + audit + sprint-plan docs.

**Bucket B0 spike on `spike/b0-state-aware-templates`** as of 2026-05-28. 3
commits (`8a562c4` → `7cd12ad` → this commit), not pushed, not merged. See
`docs/B0_TEMPLATE_STATE_RAILS.md` for the design + how to author a verified
cell + the fabrication-safety rule.

**Total estimate range revised: ~13–18 sprints** (was ~14–20 pre-B0). B0
absorbed the hidden infrastructure risk from open question #1 below; B's
revised 4–5 sprint estimate assumes open question #2 (corpus coverage of
T-02..T-08 §§) resolves favourably.

---

## Bucket A — kill silent-wrong + honest stubs (NOW)

**Status:** IN PROGRESS on `fix/bucket-a-honest-stubs`. **Estimate:** ~1 sprint.
**Legal help:** none required (code-only).

### Success criterion

Every non-Bayern cell moves from DANGEROUS (audit §3) to HONESTLY-STUBBED.
No new content authored; no legal §§ added; no design tokens introduced.

### Work items + status

| # | Item                                                                            | Status        | Commit (if landed) | Audit ref     |
|---|---------------------------------------------------------------------------------|---------------|--------------------|---------------|
| 1 | Strip Bayern §§ from `factLabels.{de,en}.ts` + regression gate                  | DONE (local)  | `f2fbde0`          | §3 L1         |
| 2 | Chat-UI preliminary banner on stub-state projects                               | DONE (local)  | `41a66eb`          | §4            |
| 3 | Result-page preliminary banner above the tab strip (sticky)                     | DONE (local)  | `1d79434`          | §4            |
| 4 | Gate `MUENCHEN_AUTHORITY_CLOSURES` to Bayern only                               | DONE (local)  | `7cc3f6f`          | §3 L5 / Bug 27|

### Carries forward to "A.5 / B preamble" (small code-only cleanups)

These were flagged during A but deferred for scope discipline:

- ~~**Rename `isSubstantiveBundesland()`** → `isPdfDemoReadyBundesland()`.~~
  **DONE 2026-05-28** on `chore/bucket-a5-cleanups` commit `4aa4491`.
  Zero external consumers; pure rename. No behaviour change.
- ~~**Remove dead `src/data/factsMuenchen.ts`**~~ **DONE 2026-05-28** on
  `chore/bucket-a5-cleanups` commit `c821fdd`. 266 LOC removed. Linter
  exclusion list also cleaned.
- **Reword `src/legal/shared.ts:175`** — the quoted Bayern example
  „Das Verfahren wäre Art. 59 BayBO" inside the SHARED persona block.
  Replace with a state-neutral example. **DEFERRED — NOT autonomously
  safe:** SHARED_BLOCK is in Bayern SHA scope; rewording it
  re-baselines the SHA. Requires founder authorization for the
  intentional re-baseline. **ESTIMATE: 1 day** including the SHA
  re-baseline ceremony.

---

## Bucket B — deepen the 5 substantive states across all 8 templates

**Status:** TODO. **Estimate:** ~5–7 sprints. **Legal help:** light review per
template (an in-house architect or a paid hourly reviewer; not full counsel).

### Success criterion

For each of the 5 substantive states (BY, BW, HE, NW, NI), templates T-02
through T-08 emit state-correct §§ — not the Bayern-shaped tail that ships
today. 40 cells (5 × 8) become genuinely substantive. The remaining 88 stay
honestly-stubbed (Bucket A handles the honesty).

### Work breakdown

| # | Item                                                                              | Estimate      | Status | Notes |
|---|-----------------------------------------------------------------------------------|---------------|--------|-------|
| B0 | **Template-state infrastructure**: additive `getTemplateBlock(T, B?)` resolver + `TEMPLATE_STATE_OVERRIDES` registry + golden noop gate | < 1 day actual | **DONE** | Spike on `spike/b0-state-aware-templates`. See `docs/B0_TEMPLATE_STATE_RAILS.md`. Output unchanged for every state; gate proven to catch authoring drift. |
| B1 | Populate `allowedCitations` lists for BW/HE/NW/NI across T-02..T-08              | ~½ sprint     | TODO   | Decoupled from B0; just adds entries to allowedCitations arrays. |
| B2 | Author state-correct template tails: 4 states × 7 templates = 28 tails           | ~3–4 sprints  | TODO   | One §-set per cell, reviewed by an architect. Each cell ≈ ½–1 day. Drop into the 28 scaffolded `null` cells in `src/legal/templates/stateOverrides.ts`. |
| B3 | Extend `smoke-walk-matrix.mjs` to pin the 28 new cells                            | ~½ sprint     | TODO   | 28 new fixtures + assertions. Smoke harness already calls `getTemplateBlock(T, B)` via the new signature — no harness change needed beyond fixture additions. |
| B4 | De-München cost-engine framing (`costNormsMuenchen.ts`)                          | ~½ sprint     | TODO   | Audit §3 L4. Quantitative path already falls through; only framing leaks. |

### What B explicitly does NOT do

- Per-state authority closures (Bucket C work — closures are city-specific).
- Bayern non-München cities (separate, lower priority).
- Per-state form templates / Bauvorlagenverordnung file lists (Bucket C).

---

## Bucket C — author the 11 thin states (GATED on legal counsel)

**Status:** Pass A + Pass C **FULLY DONE** across all 11 thin states
(2026-05-28, push range `2793c08..93d694b` → live on prod). Pass B
(substantive `systemBlock` prose rewrite) **still legal-review-gated**
for all 11. **Estimate remaining:** ~4–7 sprints for 11 × Pass B (full
counsel per state, substantive prose) + smoke-walk pins + banner flips.
**Legal help:** REAL counsel per state for Pass B.

### Priority order (locked by founder) — ALL Pass A+C DONE

1. ~~Berlin — Pass A+C done, Pass B pending~~ (push `2793c08`)
2. ~~Hamburg — Pass A+C done, Pass B pending~~ (merge `e51c4d1`)
3. ~~Bremen — Pass A+C done, Pass B pending~~ (merge `a6388ca`)
4. ~~Sachsen — Pass A+C done, Pass B pending~~ (merge `fde3535`)
5. ~~Schleswig-Holstein — Pass A+C done, Pass B pending~~ (merge `bf62a27`)
6. ~~Rheinland-Pfalz — Pass A+C done, Pass B pending~~ (merge `223c009`)
7. ~~Mecklenburg-Vorpommern — Pass A+C done, Pass B pending~~ (merge `74cf5c3`)
8. ~~Sachsen-Anhalt — Pass A+C done, Pass B pending~~ (merge `fe1e866`)
9. ~~Thüringen — Pass A+C done, Pass B pending~~ (merge `d804508`)
10. ~~Brandenburg — Pass A+C done, Pass B pending~~ (merge `851cbf0`)
11. ~~Saarland — Pass A+C done, Pass B pending~~ (merge `93d694b`)

### Bucket C Pass A+C final outcome (2026-05-28)

* **116 / 128** (template × state) cells now substantive on main (was 36
  pre-Bucket-C = 28 B2 + Bayern T-01..T-08 implicit via BLOCKS[T]).
  Math: 28 B2 (NRW/NI/BW/HE × T-02..T-08) + 88 C-cells (11 states × 8) =
  116. Remaining 12 = 8 Bayern cells (inherit BLOCKS[T] by design) + 4
  B2 T-01 cells (NRW/NI/BW/HE × T-01 — Bayern-default baseline is OK).
* **2442** corpus-verified citations across the 116 authored cells.
* **All 11 allowedCitations** populated → Layer-C positive-list
  enforcement live for every thin state (was `[]` bypass at
  `citationLint.ts:597`).
* **All 11 banners stay ON** (`hasSubstantiveStateBlock = false` for
  every thin state) — Pass B is the gate.
* **Bayern SHA** `cdf3c625…23f9daaf` unchanged end-to-end across all
  9 batch merges.

### What Pass A+C taught us (corpus-side learnings flagged)

Three patterns of §-numbering divergence surfaced during authoring:

* **Standard ladder** (8 states): § 61-§ 64 verfahrensfrei/Freistellung/
  vereinfacht/regulär; § 65/66/68 Bauvorlage/Nachweise/Bauantrag. Used
  by Berlin/Hamburg/Bremen/Sachsen/SH/MV/Thüringen-headings/Brandenburg-
  mostly.
* **Shifted ladder** (3 states): Sachsen-Anhalt § 60-§ 63 (down-1);
  Thüringen § 63-§ 66 (up-2); Saarland § 61/63/64/65 (off-by-1
  Freistellung-shift); RLP § 62/67/66/61+70 (unique 1998 LBauO numbering).
* **Unique institutes**: BW § 51 Kenntnisgabe (B2), HE § 64a Erweiterte
  Freistellung (B2), Brandenburg § 62 Bauanzeigeverfahren, SL § 12a/§ 12b/
  § 12c Photovoltaikpflicht (most comprehensive PV in corpus).

Brandschutz tagging quality varies — see open-question #9 for the
under-tag pattern (SächsBO/MV/Thüringen tag only § 14; § 26/30/33 are
heading-evident but not corpus-tagged). Future re-tag pass recommended
for: SächsBO, LBauO M-V, ThürBO.

Corpus self-flags handled: SH § 58a "Bestehende Anlagen" (Phase-B
confirm pending — SKIPPED); LSA § 86 same heading (SKIPPED for same
reason); Thüringen § 98 + § 99 (Bestehende + Windenergie — SKIPPED).

### What was deferred per Path 2'' discipline

* Pass B (substantive `systemBlock` rewrite) — needs real legal counsel
  per state. Skeleton remains the per-state "Mindest-Eckdaten / nicht
  belastbar" framing.
* C-s.4 calendar / authority closures (per the per-state work template).
* C-s.5 smoke-walk pins for all 11 states.
* C-s.6 banner flip (locked OFF until Pass B done).
* Out-of-corpus law families: every state's DSchG, PV-Pflicht (except
  Brandenburg § 32a + Saarland § 12a-c which ARE in corpus), and
  BauVorlVO — flagged in cells as "geltende Vorschrift referenzieren,
  nicht erfinden".

### Gate regex hardening (2026-05-28, surfaced by Saarland)

Two surgical fixes to `scripts/verify-template-tail-citations.mts`:
1. Added "Saarland" before "Saar" in state-suffix alternation so the
   regex doesn't truncate "LBO Saarland" → "LBO Saar".
2. Added `normalizeLaw()` to collapse internal whitespace (newlines from
   prose word-wrap) before law-name comparison.

Both fixes are general-purpose hardening — they protect all future
multi-word law-name citations.

### Per-state work template

For each state, in priority order:

| # | Item                                                                                | Estimate    |
|---|-------------------------------------------------------------------------------------|-------------|
| C-s.1 | Author the state's `systemBlock` (procedures, §§, exemption thresholds, authorities) | ~1 sprint  |
| C-s.2 | Populate `allowedCitations` (Layer-C positive-list enforcement turns on)         | ~½ sprint  |
| C-s.3 | Author per-state template tails for T-01..T-08 (reuses B0 infrastructure)         | ~1 sprint  |
| C-s.4 | Per-state authority closure data + calendar wiring (Bug 27 follow-through)        | ~½ sprint  |
| C-s.5 | Smoke-pin the 8 new cells in `smoke-walk-matrix.mjs`                              | ~¼ sprint  |
| C-s.6 | Flip `isSubstantive` / banner predicate to acknowledge the new substantive state  | ~¼ sprint  |

**~3–3.5 sprints per state × 11 states = 33–38.5 sprints raw work.** Compressed
to ~8–12 sprints by running 2–3 states in parallel (different reviewers) and
re-using B0/B1 infrastructure.

### What C explicitly does NOT do

- Re-litigate Bucket D (Bayern, PDF, cache key, design tokens — locked).
- Author 16 cities × 8 templates × authority-by-authority closures — that's
  Phase 14+ territory. Cities within a state inherit the state's baseline.

---

## Bucket D — DO NOT TOUCH

| Item                              | Reason                                                                     |
|-----------------------------------|----------------------------------------------------------------------------|
| `src/legal/bayern.ts`             | SHA-locked (`cdf3c625…23f9daaf`). The verify script is the truth.          |
| `src/legal/states/bayern.ts`      | Bayern wrapper. Same lock.                                                 |
| `src/legal/compose.ts` Bayern path| Cache prefix is bundesland-keyed; closing the Bayern-cache leak required surgical work — do not regress. |
| Prompt-cache key                  | Already includes bundesland (`composeLegalContext(bundesland)`). SAFE.     |
| PDF renderer (`exportPdf.ts`)     | Already state-branched. SAFE.                                              |
| `src/data/smartSuggestionsMuenchen.ts` | Filtered by `bundeslaender: ['bayern']` at every consumer site. SAFE. |
| DESIGN_DNA tokens                 | Locked by founder. New honesty UI reuses existing tokens (Bucket A proven).|
| Phase 7.9 surfaces                | Locked.                                                                    |

---

## Open questions

The user explicitly asked me to question my own judgment. Here are the
honest doubts about the plan above.

### 1. ~~Bucket B has a hidden prerequisite that may bend the estimate~~ **RESOLVED 2026-05-28**

~~B currently assumes templates can branch by bundesland. They **cannot today**.~~
**Status: closed by B0 spike on `spike/b0-state-aware-templates`.** The chosen
design (additive addendum, not full replacement, not sectioned restructure) was
implemented with zero output change for every state, Bayern SHA preserved, 136
gate assertions green. Spike took < 1 day actual vs ~1 sprint estimated. See
`docs/B0_TEMPLATE_STATE_RAILS.md` for the design + authoring workflow. B1–B4
estimates can now firm up — Bucket B revised from ~5–7 to ~4–5 sprints in the
status table.

### 2. "Light legal review" in Bucket B is fuzzy

If T-02 × NRW must emit `§ 64 BauO NRW` and that § doesn't already exist in
the corpus, someone has to verify it against a primary source. That's not
"light" review — it's the same diligence as Bucket C. If the corpus already
covers it (the `verify:citations` gate suggests broad NW/BY/HE/NI/BW coverage
exists in `scripts/legal-corpus/`), B's per-cell cost is closer to "snippet
selection" than "legal research". **I cannot tell from the repo which.**

**Suggestion:** before locking B's estimate, audit corpus coverage of the
T-02..T-08 §§ for BW/HE/NW/NI. If the §§ exist, B is ~5 sprints. If many
have to be researched, B is ~7-9 sprints and approaches C's cost.

### 3. Bucket C priority order — Sachsen vs SH

Sachsen has Leipzig + Dresden + Chemnitz (high project volume; Leipzig
diagnosis doc `V1_0_30_T04_LEIPZIG_DIAGNOSIS.md` already lists known gaps).
Schleswig-Holstein has Kiel + Lübeck (smaller volume). On project-volume
grounds I'd push Sachsen ahead of SH; on geographic-coverage grounds (north
+ south balance) the current order makes sense. The founder owns this call —
I just want it flagged.

### 4. Are Stadtstaaten really 3 separate buckets?

Berlin / Hamburg / Bremen are Stadtstaaten — one Bauordnung covers the
entire Land + only one city to model. Compared to a Flächenland (Sachsen,
NRW), each Stadtstaat should be cheaper per state. The current per-state
estimate (~3–3.5 sprints) is the average; Stadtstaaten likely run lighter
(~2 sprints each) and Flächenländer heavier (~4). The aggregate ~8–12 holds
either way, but the cadence will be uneven.

### 5. The "carries forward" trio in Bucket A.5

The 3 deferred items (rename, dead-code remove, shared.ts:175) are small and
unrelated. I parked them under "A.5" but they could equally be "open the new
session and clean them up before starting B0". They don't gate anything.
Flagging because they could otherwise sit forever.

### 6. Bayern non-München cities

Audit notes that Bayern's Nürnberg / Augsburg / Würzburg projects today
consume München authority closures because the closure data is München-only.
This is **not regressed** in Bucket A — pre-existing behavior. It's a
"Bayern regional refinement" item that doesn't fit any bucket cleanly. Park
as a B5 if Bayern gains regional cities later, otherwise leave.

### 7. The smoke matrix is sized for B+C from day one

`scripts/smoke-walk-matrix.mjs` currently pins 14 of 128 cells. As B/C land
new content, the matrix needs to grow to ≥40 cells (B) then ≥128 cells (C).
That growth is built into the per-state work template (C-s.5) but not into
B's estimates. **Add B3 = 28 new pin assertions if not already counted.**
(I added it above as ~½ sprint, just making the dependency explicit here.)

### 8. The estimates assume one engineer + part-time legal reviewer

If the team scales to 2–3 engineers + a dedicated legal reviewer, B can
compress to ~3 sprints and C to ~5–6. The 14–20 sprint total is a
single-engineer baseline. Do not present it as a fixed quote.

### 9. SächsBO corpus under-tags brandschutz §§ — future re-tag

`scripts/legal-corpus/states/sachsen.json` archetype-tags **only § 14** as
`brandschutz`. But §§ 26 ("Allg. Anforderungen Brandverhalten Baustoffe/
Bauteile"), 30 ("Brandwände"), 33 ("Erster und zweiter Rettungsweg") are
heading-evident brandschutz in SächsBO's § structure and were cited as
such across Sachsen × T-02/T-03/T-04/T-06 cells (heading-evident
discipline). v1.0.30 Leipzig T-04 walk also confirmed § 33 SächsBO as
real-walk persona citation.

**Action item (corpus side, NOT touched this turn):** add `"brandschutz"`
archetype to §§ 26, 30, 33 in `scripts/legal-corpus/states/sachsen.json`
so corpus tags align with the heading-evident reality. This is a one-line
JSON tweak per § + verifier re-run. **Defer until the broader corpus
re-tag pass** (also worth auditing whether HBO Hessen, Berlin, BW, NI,
NRW have the same under-tag pattern for any of their §§). Not blocking
Bucket C progress.

Filed during C4 Sachsen merge (commit `fde3535`); cells use heading-
evident citation discipline already, so the under-tag does not
operationally bite any current consumer.

---

## Maintenance

- **Edit this doc at every checkpoint.** Update the Status column. Add
  commit SHAs as work lands. Tighten estimates as items complete.
- **Bayern SHA discipline survives every bucket.** Any change touching
  `src/legal/bayern.ts`, `src/legal/states/bayern.ts`, or `src/legal/compose.ts`
  Bayern paths must be intentional and re-baselined per the `verify-bayern-sha.mjs`
  protocol.
- **The audit (`docs/COVERAGE_TRUTH_TABLE.md`) is the source of truth for
  the 5/11 boundary, the leak surfaces, and the demo-safety classification.**
  This doc planned the work; the audit owns the diagnosis.
- **Each bucket's success criterion is a precondition for the next.** A
  finishes when every non-Bayern cell is demo-safe. B finishes when 40 cells
  are substantive. C finishes when all 128 are substantive. D never finishes
  — it stays locked.
