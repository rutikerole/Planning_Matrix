# COVERAGE TRUTH TABLE — 16 × 8 (audit-only)

Branch: `audit/coverage-truth-table`. Date: 2026-05-28. Scope: read-only audit.
Bayern SHA at start: `cdf3c625…23f9daaf` (matches script baseline; the
`b18d3f7…` SHA quoted in the audit prompt is STALE — pre-Bau-Turbo re-baseline).
This document is the only artifact this turn produces. No feature code changed.

---

## 0 · First-pass surprises (the 10-liner)

1. **No 16×8 matrix exists in code.** `src/legal/templates/index.ts:24-33` exports
   `BLOCKS` keyed by `TemplateId` only; nothing is keyed by `(template, state)`.
2. **Templates are Bayern-flavoured text blocks.** `t01-neubau-efh.ts` cites
   BayBO and uses München exemplars (line 2 header `(München)`, line 87 cost
   example). They never branch by `bundesland`.
3. **State files alone carry per-Land specifics.** Bayern (`src/legal/bayern.ts`
   + `states/bayern.ts`), BW (418 LOC), Hessen (461), NRW (374), NI (349) are
   substantive — 25–45 verbatim §§ each. The other 11 states are 42–48 LOC
   stubs with `allowedCitations: []` and a "Mindest-Eckdaten / in Vorbereitung"
   disclaimer. The "matrix" is really a row-only object.
4. **Stadtstaat-bauordnungen are NOT specially handled.** Berlin/Hamburg/Bremen
   are pure stubs — no BauO Bln / HBauO / BremLBO content; same shape as the
   Flächenländer stubs. `cityBlock` is `null` for everyone except Bayern.
5. **Cache key is bundesland-safe today.** `composeLegalContext(bundesland)` at
   `src/legal/compose.ts:64-71` rebuilds the prefix per state. The historical
   Bayern→Hessen cache leak is closed at the prompt layer. (Bug 42, the legacy
   `city='muenchen'` frozen on old DB rows, is a data residual, not a code path.)
6. **`factLabels.de.ts` is the live, unconditional Bayern leak.** Lines 51, 52,
   67, 118, 136-148, 179, 194, 197, 200, 204, 246 hardcode `Art. 2 BayBO`,
   `Art. 6 BayBO`, `Art. 58/59/60 BayBO`, `BayDSchG Art. 6`, `BaumschutzV
   München`, `PV-Pflicht (Bayern)` etc. Whenever the model emits the
   corresponding fact key — and `Gebäudeklasse`/`Abstandsflächen` are
   pan-German concepts the model emits readily — non-Bayern projects render
   those Bayern §§ inside the chat Facts UI.
7. **Layer-C citation firewall is OFF for 11 states.** `chat-turn/citationLint.ts:597`
   early-returns when `state.allowedCitations.length === 0`. Stub states have
   no positive-list guard. Fabrication of e.g. `§ 65 BauO SACHSEN` is possible
   and historically observed (Bug 26).
8. **Smoke matrix exercises 14 of 128 cells.** `scripts/smoke-walk-matrix.mjs:135-150`
   pins Bayern × T-01..T-08 + (NW/BW/HE/NI/SN/BE) × T-01. The other 114 cells
   are unverified at runtime. CI does **not** run this script; prebuild only
   runs static gates (citation drift, locale parity, Bayern SHA).
9. **Bayern SHA in the prompt is wrong by ≥1 re-baseline.** Prompt cites
   `b18d3f7…`; current locked baseline is `cdf3c625…` (Phase 11 + 3 v1.0.34
   corrections per `scripts/lib/bayernSha.mjs:52-53`). Bayern is unchanged
   relative to its current baseline.
10. **PDF export already gates stub states** (`isPdfDemoReady` in
    `src/legal/demoCoverage.ts:53`, consumed at
    `src/features/result/components/ExportMenu.tsx:61`). That is the
    strongest honesty signal in the system. The chat UI has nothing
    comparable — no banner.

---

## 1 · Methodology

* Classification is from CODE, not from 128 live runs. For a cell to be
  CONFIDENTLY-substantive it would need both (a) substantive state content
  AND (b) a template path that does not contradict the state. The codebase
  doesn't allow the second — templates are Bayern-shaped — so the highest
  honest grade outside Bayern is **THIN**.
* "DANGEROUS" means the system can emit a silently-wrong artefact (wrong-state
  §, fabricated §, or a Bayern label) on that cell without the user being told.
* Bayern is the only state with template parity (templates ARE its content).
* All file-line evidence below was read this turn.

### Cell vocabulary

| Code | Content depth | Demo-safety |
|---|---|---|
| **S** | SUBSTANTIVE — 10+ verbatim §§ in state file AND template aligns with state law | SAFE unless overridden |
| **T** | THIN — state file has 10+ §§ but template tail still cites BayBO. Persona is steered, but no hard gate. | AMBIGUOUS |
| **U** | STUB — state file is the 42-LOC disclaimer skeleton. PDF blocked by `isPdfDemoReady`. Chat relies on system prompt's "Mindest-Eckdaten" deferral. | SAFE if disclaimer holds, DANGEROUS if a Bayern-leak surface fires |
| **B** | BAYERN-LEAK SURFACE active — at least one cell-reachable code path hardcodes Bayern §§ | DANGEROUS |

---

## 2 · The 128-cell truth table

Templates: `01=Neubau EFH`, `02=Neubau MFH`, `03=Sanierung`, `04=Umnutzung`,
`05=Abbruch`, `06=Aufstockung`, `07=Anbau`, `08=Sonstiges`.

Cell payload: `depth/safety`. `safety` is SAFE (✓), AMBIGUOUS (~), DANGEROUS (✗).

| State \ Tpl  | 01    | 02    | 03    | 04    | 05    | 06    | 07    | 08    |
|---           |---    |---    |---    |---    |---    |---    |---    |---    |
| BY Bayern    | S/✓   | S/✓   | S/✓   | S/✓   | S/✓   | S/✓   | S/✓   | S/✓   |
| BW B-Württ.  | S/✓†  | T/~   | T/~   | T/~   | T/~   | T/~   | T/~   | T/~   |
| HE Hessen    | S/✓†  | T/~   | T/~   | T/~   | T/~   | T/~   | T/~   | T/~   |
| NW NRW       | S/✓†  | T/~   | T/~   | T/~   | T/~   | T/~   | T/~   | T/~   |
| NI Nieders.  | S/✓†  | T/~   | T/~   | T/~   | T/~   | T/~   | T/~   | T/~   |
| BE Berlin    | U/~‡  | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   |
| HH Hamburg   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   |
| HB Bremen    | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   |
| BB Brandenb. | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   |
| MV Meckl-V.  | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   |
| RP RLP       | U/~§  | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   |
| SL Saarland  | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   |
| SN Sachsen   | U/~‡  | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   |
| ST Sachs-Anh.| U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   |
| SH Schl-Hol. | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   |
| TH Thüringen | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   | U/✗   |

### Cell footnotes

- **† BW/HE/NW/NI × T-01:** SUBSTANTIVE + smoke-pinned at
  `smoke-walk-matrix.mjs:135-150` (anti-Bayern-leak detector active). Allow-list
  populated (`bw.ts:370-408`, `hessen.ts:419-449`, `nrw.ts:336-364`,
  `niedersachsen.ts:309-339`, all >25 entries). The "✓†" is conditional on the
  smoke pin holding, which it currently does.
- **BW/HE/NW/NI × T-02..T-08:** THIN+AMBIGUOUS. State file is correct; template
  tail still cites BayBO inside Block 2 of the cache. Persona instructions tell
  the model to suppress the BayBO content, but no automated gate verifies this.
  These 28 cells are the largest "model-discipline-only" risk surface.
- **‡ BE × T-01, SN × T-01:** smoke-pinned with `stub: true` flag at
  `smoke-walk-matrix.mjs:148-149` — the assertion is that they DON'T leak Bayern,
  not that they say anything useful. Demo-safety is AMBIGUOUS because no banner
  warns the user that the state is empty.
- **§ RP × T-01:** RLP got a structural-cert override (`§ 5 BauuntPrüfVO`) at
  `stateCitations.ts:389` (commit 10bc12f). One real citation; otherwise still
  stub. Slightly less-bad than Sachsen-equivalent stubs.
- **All 88 stub cells (11 stubs × 8 templates):** `allowedCitations: []` →
  Layer-C bypass at `citationLint.ts:597` → no positive-list guard. The only
  defences are (a) the anti-Bayern-leak block prepended to each stub state's
  systemBlock by `_antiBayernLeak.ts:1-89` and (b) the PDF-export gate.

### Tally

- 8 cells PROVEN-SAFE+SUBSTANTIVE (Bayern × all templates).
- 4 cells PROVEN-SAFE+SUBSTANTIVE (BW/HE/NW/NI × T-01) — smoke-pinned.
- 28 cells THIN/AMBIGUOUS (BW/HE/NW/NI × T-02..T-08) — template-tail BayBO not
  hard-gated.
- 88 cells STUB (11 × 8) — disclaimer-honest in chat-turn system prompt, soft
  honesty signal in UI ("Detail-Spezifika in Vorbereitung" pill at
  `composeLegalDomains.ts:244`), strong honesty in PDF (export blocked).
- **Total honest-and-non-broken under demo:** 12 fully-safe + 28 ambiguous-with-
  guardrails + 88 honestly-stubbed = 128, **IF** the `factLabels.de.ts` leak is
  treated as a known mitigation. **Without** that mitigation, 120 cells (every
  non-Bayern cell) are demo-dangerous on at least the Facts UI surface.

---

## 3 · Leak & fabrication surface (enumerated)

### L1 — `factLabels.de.ts` hardcoded Bayern law tokens (**live, high-impact**)
`src/locales/factLabels.de.ts` lines 51, 52, 67, 118, 136, 137, 138, 140, 143,
146, 148, 179, 194, 197, 200, 204, 246 carry Bayern-specific labels for fact
keys that are NOT Bayern-specific. `BUILDING.GEBAEUDEKLASSE` →
`"Gebäudeklasse (Art. 2 BayBO)"` regardless of `project.bundesland`. The same
fact key is emitted on a Sachsen project (Gebäudeklasse is also defined in
SächsBO). Result: a Sachsen Facts card reads `Gebäudeklasse (Art. 2 BayBO)`.
No bundesland guard exists in `src/lib/factLabel.ts:27` (the locale switch is
DE↔EN only). **Demo-dangerous on 120 cells.** Fixing this is mechanical —
either strip the parenthetical citation from every label or branch the label
table by state.

### L2 — Stub-state `allowedCitations: []` → Layer-C bypass (**known, gated by persona only**)
`supabase/functions/chat-turn/citationLint.ts:597` returns empty allow-list →
no positive enforcement. 11 states × 8 templates = 88 cells rely on:
(a) `_antiBayernLeak.ts` forbidding BayBO,
(b) the state's own "Mindest-Eckdaten / nicht belastbar" disclaimer block,
(c) the model not inventing plausible-looking `§ 65 BauO {CODE}` shorts.
Item (c) has historically failed (Bug 26). Fabrication risk is real but the
PDF gate currently absorbs most of the impact.

### L3 — Template tails carry BayBO on non-Bayern projects (**structural**)
Every `t0X-*.ts` template is Bayern-shaped (BayBO §§ inline, München examples).
For BW/HE/NW/NI × T-02..T-08 the state systemBlock corrects this, but the
template tail block is still concatenated in the cache (per `index.ts:24-33`
+ `systemPrompt.ts:248-276`). The persona is told the state block takes
precedence, but there is no hard filter on template-tail emissions. 28 cells
are exposed.

### L4 — Cost engine BASE is München-calibrated (**acknowledged debt**)
`src/features/result/lib/costNormsMuenchen.ts:64-81` keeps München-tuned BASE
fees and falls through `REGION_MULT=1.0` on non-Bayern projects. Quantitative
output is roughly correct; framing ("München practitioner +15-25% premium")
leaks to non-München users. Bug 35 tracking this is open. Affects 120 cells.

### L5 — Calendar / authority closures hardcoded München (**Bug 27**)
`composeCalendar` (referenced repeatedly in prior audits, NON_BAYERN_PROD_
FORENSICS.md §3) consumes `MUENCHEN_AUTHORITY_CLOSURES` regardless of
`bundesland`. Per FULL_GERMANY_AUDIT.md still live. Affects 120 cells.

### L6 — Landing demo addresses hardcoded München (**contained**)
`src/features/landing/lib/addresses.ts:24-124` is landing-only, not reachable
from chat or PDF. Acceptable as demo seed.

### L7 — Cache key (**SAFE today**)
`src/legal/compose.ts:64-71` rebuilds per state; `chat-turn/systemPrompt.ts:248-276`
sets the `cache_control: ephemeral` breakpoint on the state-keyed block.
Bayern→Hessen prompt-cache cross-contamination is closed in code. The
remaining Hessen-`city='muenchen'` rows are pre-fix DB residue, not a
recurring code path. **No code change needed here.**

### L8 — PDF renderer (**SAFE today**)
`src/features/chat/lib/exportPdf.ts:261, 648, 665, 704` properly fans out by
bundesland. Bayern fallback fires only on `null`. PDF export is UI-gated by
`isPdfDemoReady` for non-substantive states. **No code change needed here.**

### L9 — Smart Suggestions München (**SAFE today**)
`src/data/smartSuggestionsMuenchen.ts` entries are all filtered by
`bundeslaender: ['bayern']` at the consumer site. Confirmed by inspection.
No code change needed.

---

## 4 · The stub-honesty gap

The single most important column. For each non-substantive cell, does the
user-facing output broadcast "preliminary — verify locally" loudly enough
that a stakeholder cannot mistake it for a finished legal analysis?

| Surface                          | Honesty signal                                                                       | Loud enough? |
|---|---|---|
| Chat-turn system prompt          | State systemBlock says `"Mindest-Eckdaten / nicht belastbar / lokale Verifikation"` (e.g. `sachsen.ts:17-32`) | Adequate (model-side) |
| Chat UI message stream           | None — model output is rendered raw. No "this state is stub" banner above the chat.  | **NO**       |
| Result Overview tab              | Generic `t('result.workspace.header.preliminary')` footer applies to every project   | Too generic  |
| Result Legal tab (Regional band) | `'Detail-Spezifika in Vorbereitung'` status pill at `composeLegalDomains.ts:244`     | Subtle pill — easy to miss  |
| Result Procedure tab             | Procedure citation may be `'landesrechtliche Detail-Spezifika in Vorbereitung'`     | Buried inline |
| Result Team / Cost / Suggestions | Nothing stub-aware                                                                  | **NO**       |
| PDF export                       | UI gated off entirely via `isPdfDemoReady` (`ExportMenu.tsx:61`)                    | **YES — strongest signal** |
| Facts UI cards                   | None; worse, can render Bayern labels (see L1)                                       | **NEGATIVE** |

### Cells where stub status is NOT loudly signalled

All 88 stub cells × every non-PDF surface. Specifically:
- The 11 stub-states have NO chat-UI banner.
- The Facts UI label leak (L1) can actively contradict the disclaimer by
  showing `Art. 2 BayBO` on a Sachsen project.
- The Overview/Team/Cost/Suggestions tabs are stub-blind.

### Cells where stub status IS adequately signalled

- PDF export — blocked entirely. The only place where stub status is
  unambiguous to the user.

---

## 5 · The real scope — what it takes to make all 128 honest-and-non-broken

Ordered by **trust-risk first, effort second**.

### Bucket A — must-fix, cheap, high-impact (≈ 1 sprint, ≤ 200 LOC)
1. **Strip or state-branch the Bayern citations in `factLabels.de.ts` / `factLabels.en.ts`**
   (L1). The minimum honest version drops every parenthetical `(Art. X BayBO)`
   and replaces with neutral wording (`'Gebäudeklasse'` instead of
   `'Gebäudeklasse (Art. 2 BayBO)'`). The luxe version branches by bundesland
   inside the label resolver `src/lib/factLabel.ts:27`. Without this fix, every
   non-Bayern project leaks Bayern §§ into the Facts UI — the single biggest
   silent-wrong-content surface.
2. **Add a chat-UI banner on stub states.** Above the message stream, render
   `"Diese Bundesland-Spezifika sind vorläufig. Aussagen sind nicht belastbar
    ohne lokale Verifikation."` Hook into `isSubstantiveBundesland()` at
   `demoCoverage.ts:37`. ≤ 30 LOC.
3. **Add a Result-page banner on stub states.** Same content, render above
   the tab strip when `!isSubstantive`. Reuse the `composeLegalDomains.ts:244`
   string. ≤ 40 LOC.
4. **Make the München calendar bundesland-aware (Bug 27).** Either skip
   calendar entirely on non-Bayern OR generalise authority closures. ≤ 80 LOC.

This bucket alone moves all 88 stub cells from DANGEROUS-via-Facts-leak to
HONESTLY-STUBBED. It also de-risks the 28 THIN cells partially.

### Bucket B — fix to lift THIN cells to genuine coverage (≈ 4-6 sprints, real legal work)
5. **Split the 8 template files into state-aware variants OR add a
   per-state template-tail.** Concretely: produce a `t0X-{bundesland}.ts` for
   each (template, substantive-state) pair so that BW × T-02 actually emits
   LBO §§ in the template tail, not BayBO. Lift to 5 substantive states first
   (BY, BW, HE, NW, NI). Cost: 4 templates × 4 states = 16 new template files,
   plus index plumbing. Real legal review required per file.
6. **Populate `allowedCitations` for the 4 non-Bayern substantive states
   across T-02..T-08 (currently the lists are T-01-shaped).** Mechanical once
   step 5 is done. Lift Layer-C enforcement on those 28 cells.
7. **Add T-02..T-08 cells to `smoke-walk-matrix.mjs` for BY, BW, HE, NW, NI.**
   That's an extra 4 × 7 = 28 smoke cells. Forces regression coverage.

### Bucket C — fix to lift STUB states to actual substance (≈ 8-12 sprints, gated on legal counsel)
8. **Author state systemBlocks for the remaining 11 states**, in priority
   order: Berlin → Hamburg → Bremen → Sachsen → SH → RLP → MV → ST → TH → BB → SL.
   This is the Phase 14 work that's already on the roadmap. Each state needs
   real §-citations + procedure list + allow-list. Each block is ≈ 200-300 LOC
   of researched legal copy.
9. **Per-state `t0X-{bundesland}.ts` for each new state** — see step 5.

### Bucket D — already-fine, do not touch
- Bayern (8 cells) — locked, SHA-gated.
- Prompt-cache key — already bundesland-keyed.
- PDF renderer — already state-branched.
- Smart Suggestions München — already Bayern-filtered.
- DESIGN_DNA tokens / Phase 7.9 surfaces — out of scope per discipline rules.

### Honest sprint estimate

- Bucket A alone: 1 sprint. Closes the demo-dangerous gap on every state.
- Bucket A + B: 5-7 sprints. Moves 5 states × 8 templates (40 cells) to
  genuine SUBSTANTIVE. Other 88 cells stay HONESTLY-STUBBED.
- Bucket A + B + C: 13-19 sprints. The "every cell substantive" target —
  realistic only with paid legal review per state.

**Recommendation:** Bucket A is the only ship-blocker for "demo-safe at 16×8".
Buckets B and C are the path to genuine 16×8 substance and should run in
parallel to ongoing client demos.

---

## 6 · Where I'd push back on the brief

You said "we have to be more accurate than ever … each state each city each
template should be 90 %+ accurate, no compromise". Two pieces of pushback:

**Push-back 1 — 90 %+ across 128 cells in any short horizon is not realistic
without legal counsel per state.** Each of the 11 stub states needs real
LBO research (procedures, §-citations, exemption thresholds, document lists)
— that's 11 × N hours of *legal* work, not code work. Claude can scaffold
each state file in an afternoon, but the §§ have to come from someone who
can stand behind them in a Bauantrag context. Buckets B and C above are the
realistic path; Bucket A is what makes the application honest in the
meantime.

**Push-back 2 — the trust-killer is silent-wrong content, not thin content.**
The current state-of-the-world has two distinct failure modes:
- **Honest-thin:** Sachsen says "Mindest-Eckdaten — bitte lokal verifizieren".
  An architect reading this knows it's preliminary. Trust = preserved.
- **Silent-wrong:** the Facts UI on a Sachsen project shows
  `Gebäudeklasse (Art. 2 BayBO)`. An architect reading this thinks the system
  is confidently citing the wrong Land's code. Trust = destroyed in one screen.

Bucket A is **entirely** about killing the silent-wrong paths. It buys more
trust per LOC than any Bucket B/C work. I would do Bucket A before *any*
further content authoring, even if the client's instinct is "more content
first". Telling the truth about gaps is cheaper than papering over them.

**Push-back 3 — the prompt's Bayern SHA is stale.** `b18d3f7…` was the
pre-Bau-Turbo baseline; the current locked baseline is `cdf3c625…`. Bayern
has been intentionally re-baselined 4 times since `b18d3f7`. The verify
script is the truth, not the prompt. If you want the doc to cite the SHA,
cite `cdf3c625ce195f8030dac6721f2087b46d05eae98e39030b370bb45c23f9daaf`.

---

## 7 · Final SHA gate

Bayern SHA at start of audit: `cdf3c625…23f9daaf` ✓
Bayern SHA at end of audit:   (verified at commit time) ✓ — see commit msg.

No source file under `src/legal/bayern.ts`, `src/legal/states/bayern.ts`,
`src/legal/compose.ts`, or any DESIGN_DNA / Phase 7.9 surface was touched
this turn. The only change in this commit is `docs/COVERAGE_TRUTH_TABLE.md`.
