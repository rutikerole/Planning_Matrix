# Backlog — v1.0.25+ (features + 1 deferred technical item)

> The v1.0.20 testing sweep surfaced 24 bugs. v1.0.21 + v1.0.22 +
> v1.0.23 closed all 24 across 21 commits (7 + 6 + 8). v1.0.24 added
> root-cause closures for 4 of the 5 v1.0.22/23 follow-up items (Bug
> Q + Bug R extensions, Bug K root, Bug D wizard integration) across
> 4 commits — 28 closures across 25 commits total. The remaining
> items below are FEATURE requests + 1 deferred technical item
> (Bug I Path A) awaiting authoritative data + 3 sprint-deferred UI
> tasks (Bug D UI, Bug D lazy migration, Bug K guard-hit-rate
> validation).
>
> **Empirical validation gap**: v1.0.21 → v1.0.24 shipped 28 bug
> closures without an intervening end-to-end PDF walk-through. The
> next user-driven sweep is the recommended trigger for any further
> sprint scope. v1.0.25 should not ship until the empirical gate is
> struck.

Sprint anchor reminder:
- Bayern composeLegalContext SHA
  `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
  must MATCH at start AND end of every commit in any future sprint.

## Closed in v1.0.31 (PDF vertical slice — 3 demo cells × 12 MUST checks)

Pivot to PDF-hardening (see `docs/V1_0_30_STRATEGIC_RESEARCH.md` +
`docs/V1_0_31_PDF_SLICE_DIAGNOSIS.md`). **12/12 PDF MUST checks GREEN** on
T-01 × Bayern (München), T-05 × NRW (Köln), T-03 × Hessen (Frankfurt) across
11 commits (C1–C11), every commit green (Bayern SHA MATCH · matrix 16/16 ·
nrw-t05-bonn/hamburg-t02/sachsen-t04 green · smoke:pdf-text 359/0 ·
smoke:architect 281/0 · build 285 KB gz · lint net-zero). New fixtures
`bayern-t01-muenchen` / `nrw-t05-koeln` / `hessen-t03-frankfurt`; new
`src/legal/demoCoverage.ts` freeze gate; T-03 `isRenovation` cost stub; T-05
demolition suggestions floor; Bug 60 signature reflow; web↔PDF convergence gate.

Still deferred after v1.0.31:
- **Bug 78 / 105** — multi-page Key Data table. Confirmed it does NOT bite the
  demo cells (10/14/13 rows < ~17 T-04 overflow); bites T-04 + T-06/07/08. Candidate
  for the dedicated PDF-layout sprint.
- **C4 (dropped)** — Genehmigungsfreistellung label: the repo models Bayern as
  Art.57/58/59 with no `genehmigungsfreigestellt` kind; T-01 uses the repo-consistent
  vereinfachtes Art.58. Revisit only if a Bayern procedure-model refresh is scoped.
- **Phase 2 (v1.0.32)** — statute-XML citation grounding (gesetze-im-internet.de
  XML, kills Check-1's manual-verify dependency) + Destatis Baupreisindex API
  (kills identical-cost-across-states). See the strategic doc §7.
- **Phase 3 (v1.0.33+)** — template-parametric cost/procedure/risk/timeline refactor
  (closes T-06/07/08 in one pass). ONLY if the Phase-1+2 demo lands.
- **T-02 / T-04 / T-06 / T-07 / T-08 + 11 stub states** — frozen behind the
  honest "coverage in preparation" UI until each gets its own 12-check pass.
- Visual confirmation of the signature reflow (Bug 60) + the freeze UI state =
  operator smoke walk.

## Closed in v1.0.30 (T-04 Use-conversion Leipzig — template-blind pass)

CODE-COMPLETE + fixture/render-proven across 13 commits: Bug 88/99/100/± (T-04
cost stub + pdfStrings parity gate), 89 (web Domain B TA Lärm + Rettungsweg),
90/91/92 (vereinfachtes CALCULATED + web↔PDF converge, cross-surface asserted),
94/95/103 (T-04 suggestions floor + exec page + TOC), 96 (heritage ASSUMED-gating),
104 (T-04 labels both locales incl. umlaut key), 97/98/101 (role scrub + doc footer
+ procedure text), 106/107/108 (layout ellipsize), 102 (≥2-PENDING confidence),
93 (building class honest), **72 (wizard map honest non-München caption —
app-run verified, was deferred 3 sprints)**. New `sachsen-t04-leipzig.json` fixture
+ `runSaxonyT04` (smoke:architect 237/0) + T-04 PDF arms (smoke:pdf-text 289/0).
Diagnosis: docs/V1_0_30_T04_LEIPZIG_DIAGNOSIS.md.

Still deferred after v1.0.30:
- **Bug 60 / 109** — verification-page signature overlap + **Bug 78 / 105**
  multi-page Key Data table. Deep PDF layout; both confirmed still present on the
  T-04 walk. Candidate for a dedicated PDF-layout sprint.
- **Bug 63 (persona-side)** — `recommendations_delta` thin; the T-04 suggestions
  floor is the deterministic mitigation (no chat-turn this sprint).
- **`COST_BANDS_BY_TEMPLATE` Bayern-bleed** — only T-04's basis text was cleaned;
  the other 7 bands still cite München/BayBO on the web Cost tab for non-Bayern
  projects. Surgical follow-up.
- Per-state `legalRuleSnippets` + `COST_BANDS` per-state authoring; web
  Procedure-tab qualifier override (v1.0.29.1 carry).
- **T-06 / T-07 / T-08** — same template-blind pattern; T-02 + T-05 + T-04 are now
  three proofs of the fix-shape; propagate per the diagnosis docs.

## Closed in v1.0.29.2 (chat-UX hotfix)

Bug 84 (stream auto-scroll), Bug 85 (dynamic input-zone reserve), Bug 86 (hide
stale chips while composing), Bug 87 (sidebar "speaking now" single-sourced to
recentSpecialist). All wiring/behavior fixes in existing chat machinery; decision
logic gated by `smoke:chat-ux` (18 assertions); visual confirmed by operator
smoke walk. Diagnosis: docs/V1_0_29_2_CHAT_UX_DIAGNOSIS.md. Deferred: a
Playwright/jsdom chat-stream test harness (dedicated infra sprint, v1.0.31+).

## Closed in v1.0.29.1 (Bug 83 verfahren fact-key)

resolveProcedure + composeLegalDomains read `verfahren.typ`/`verfahren_typ` in
addition to `verfahren_indikation`/`PROCEDURE.TYPE`; nrw-t05 + hamburg-t02
fixtures corrected to the real key shape. Bug 52 re-audited. Deferred to v1.0.30:
web Procedure-tab qualifier override (resolveProcedures returns persona ASSUMED).

## Closed in v1.0.29 (T-02 MFH Hamburg — Stadtstaat + template-blind)

CODE-COMPLETE + fixture/render-proven: Bug 64 (cost key), Bug 65 (Bayern bleed —
15-state, highest impact), Bug 66 (web Domain B DIN 4109), Bug 67 (role floor +
version scrub), Bug 68 (T-02 suggestions), Bug 69+70 (progress + handoff),
Bug 71+81 (fact-key labels), Bug 75 (PDF "decided"), Bug 73+79 (procedure
vereinfacht + CALCULATED), Bug 80 (exec GK-1-3 contradiction), Bug 74 (neubau
docs baseline), Bug 82 (glossary version/path scrub), Bug 76+77 (PDF layout
clamps). Diagnosis: docs/V1_0_29_T02_HAMBURG_DIAGNOSIS.md.

Deferred to v1.0.30 (flagged):
- **Bug 72** — wizard map München-locked (Phase-5 geocoder + bounds boundary;
  nationwide recenter is deep, not surgical).
- **Bug 60** — verification-page signature overlap (carried from v1.0.28).
- Persona-side (chat-turn redeploy): thin role/suggestion/recommendations_delta
  emission; `wohnflaeche_gesamt_m2`/dotted-vs-snake fact-key naming alignment;
  inline synthesis-complete banner.
- **T-04 / T-06 / T-07 / T-08** — same template-blind pattern; T-02 + T-05 are
  the proofs of fix-shape; propagate per the diagnosis docs.
- Per-state `legalRuleSnippets` authoring (NRW / BW / Hessen / Niedersachsen) so
  non-Bayern Legal Landscape rows carry substantive (not just federal-neutral)
  interpretations.

## Closed in v1.0.28 (T-05 demolition pipeline — NRW exemplar)

CODE-COMPLETE + render/fixture-proven: Bug 52 (procedure verfahrensfrei),
Bug 53+30 (cost honest stub), Bug 54 (web Legal B — 15 states), Bug 55
(coverage warning), Bug 56 (do-next demolition), Bug 57 (risk template/fact
filter), Bug 58-PDF (timeline), Bug 59 (cover footer clamp), Bug 61
(Stadtarchiv city). Diagnosis: docs/V1_0_28_T05_DIAGNOSIS.md.

Deferred to v1.0.29 (persona-side / deep / out of scope):
- Bug 60 (verification-page signature overlap — deep PDF layout).
- Bug 62 (team specialist staleness — PERSONA-emitted state.roles; deterministic
  baseline is clean; needs chat-turn, not this sprint).
- Bug 63 (empty state.recommendations — persona never emits recommendations_delta;
  Do-Next deterministic baseline is the mitigation).
- Bug 58 web CostTimelineTab "Procedure duration" sub-detail.
- **T-02 / T-04 / T-06 / T-07 / T-08** — same template-blind pipeline pattern
  (cost 180-default, generic do-next, T-01 timeline/risks). T-05 is the proof
  of fix-shape; propagate per docs/V1_0_28_T05_DIAGNOSIS.md.

## Closed in v1.0.27 (C7 + C8 — architect verification flow)

- **Bug 29 — architect dead-end** — CLOSED. Owner-side share-project CREATE
  caller wired (architectInviteApi + InviteArchitectModal + result CTA).
- **Bug 32 — reactive owner footer + verification erosion** — CLOSED.
  Focus-poll + best-effort realtime (migration 0035) + server-side
  erodeVerificationOnEdit at the fact-upsert seam.
- **Bug 33 — aggregate Vorläufig rollup** — CLOSED. computeVerificationRollup
  + progress indicator + PDF footer flip (editorial-footer parity = noted
  follow-up).
- **Bug 34 — architect reject/un-verify** — CLOSED. verify-fact
  action:'verify'|'reject' overload + required reason.

Pending Rutik (UNVERIFIED until done): apply migration 0035 via SQL Editor +
redeploy verify-fact (Deno) + e2e legal-shield smoke walk. Realtime, reject,
and e2e are unvalidated by Claude (mock-only tests).

## Closed in v1.0.26 (C11)

- **Bug 11 — 16-state PDF matrix** — CLOSED. `scripts/smoke-pdf-matrix.mts`
  renders all 16 Bundesländer × DE/EN and gates fabrication + Bayern-leak +
  DE/EN parity + ligatures; wired into CI. 16/16 green.
- **Bug 48 — `verify:bayern-sha` into CI** — CLOSED. Now a CI step in
  `.github/workflows/test.yml` (+ `smoke:pdf-matrix` + `smoke:citations`).
- **Bug 26 — `§ 65 BauO {CODE}` fabrication** — FULLY CLOSED across all 16
  states (v1.0.25 fixed the 3 render sources; v1.0.26 proves it by render).

Still-open data gaps consciously NOT gated (need sourced data — see
`docs/C11_DATA_GAPS.md`): Bug 27 (München calendar), Bug 35 / Bug I (cost
multiplier), stub-state legal codes (generic "BauO {Land}" placeholders).

## Features

### Vorhabensbeschreibung — formal project description (v1.0.20 backlog)

Add a PDF section that mirrors the §-format Bauantrag uses to
describe the project (zweck, lage, ausführung, …). Currently the
Areas A/B/C body + recommendations carry the information but not in
the §-structured shape a Bauamt expects. Section would slot between
Areas (page 4) and Costs (page 5).

### Risk Register Section XII — dedicated PDF page (v1.0.20 backlog)

`composeRisks` already produces a state-aware list (v1.0.21 Bug 23c
closed the cross-state leak). What's missing: a dedicated PDF page
that renders the top-N risks as cards with title + likelihood +
impact + mitigation columns. Currently the risks surface only on the
result-page Risk Register card; the PDF doesn't include them.

### KfW BEG 458 funding specifics (v1.0.20 backlog)

Surface KfW BEG-458 + § 35c EStG + iSFP-Bonus as conditional rows
on the Cost & Timeline tab when the project's energy renovation
intent triggers them. Add a separate funding-program section to the
PDF cover or executive summary.

### Bebauungsplan ID / Flurstück / Gebäudeklasse fields (v1.0.20 backlog)

Three first-class identity fields that move Area A's qualifier from
ASSUMED → CALCULATED. Currently the wizard captures
plot.b_plan_designation as free text; structured fields plus a
validation step against the local Bauamt's b-plan registry (or an
honest-deferral when no registry is reachable) would lift Area A's
confidence materially.

### Bug 17 (carry-forward) — team-tab Bayern hardcodes (chat-layer)

Logged in v1.0.14 backlog. v1.0.21 Bug 23 made the result-page Team
tab state-aware; the chat-layer suggestion chips referenced in
this carry-forward are a separate surface that still references
Bayern hardcodes in some prompt paths. Audit and lift to
`stateCitations.ts` when v1.0.24+ wires the chat-side state-aware
prompt pass.

### Bug 20 (carry-forward) — procedure-tab caveat audit (chat-layer)

Logged in v1.0.14 backlog. The PDF procedure-tab caveat is now
state-aware (v1.0.21 Bug E + Bug 23d). The in-chat caveat copy is a
separate surface that ships from the persona prompt; the
chat-side audit is parked for the chat-side sprint that also
addresses Bug 17.

## v1.0.22 / v1.0.23 / v1.0.24 follow-ups

### Bug I Path A — wire real regional BKI factors (STILL DEFERRED)

v1.0.22 shipped Path B (honest-baseline framing). v1.0.24 re-checked
the codebase: no authoritative per-state BKI factor data has landed.
Path A lands when source-cited per-state values + validation evidence
against real architect quotes are available. Replace `REGION_MULT`
in `src/features/result/lib/costNormsMuenchen.ts` with the populated
table; revert `pdfStrings` / `costFactorLabel` / `docs/cost-formula.md`
to the "regional factor documented" content.

### Bug D wizard UI confirmation step (v1.0.25)

v1.0.24 shipped the programmatic integration: `parseAddressBlob` is
called on wizard submission and structured PLOT.ADDRESS.* facts are
seeded. The "Parsed: street=X, plz=Y — looks right? [Yes / Edit]"
inline confirmation UI in `QuestionPlot.tsx` is parked. Adding it
requires empirical wizard-flow validation; the v1.0.24 scope was
the minimal programmatic integration only.

### Bug D wizard lazy migration on legacy project load (v1.0.25)

Existing projects shipped with only the raw `plot_address` blob (no
structured PLOT.ADDRESS.* facts). v1.0.24 covers the new-project
path only. Lazy migration — run `parseAddressBlob` on first load of
a legacy project and write back structured facts as CLIENT/ASSUMED
— is a separate read-path change that needs its own commit, plus
empirical validation that no existing chat-turn flow is regressed.

### Bug K runtime guard hit-rate validation (post-empirical-walk)

v1.0.24 shipped the persona-prompt root-cause fix
(`buildLocaleBlock(en)` lead with OUTPUT LANGUAGE: ENGLISH). The
fixtures are pre-baked state JSON so the prompt fix is not exercised
in smoke. After the next user-driven walk-through, measure the
`sanitizeGermanContentOnEnglish` guard-hit count on EN exports;
expect a drop relative to v1.0.23. If the count does NOT drop, the
prompt fix did not reach the persona — investigate.

## Notes for the next sprint

- The runtime cross-state bleed guard
  (`src/legal/crossStateBleedGuard.ts`) is a belt-and-braces fallback.
  If a future commit introduces a new state-unique token leak, add
  the token to `TOKENS` AND fix the upstream source — do not rely on
  the guard alone.
- The `stateCitations.ts` substantive packs (Bayern / NRW / BW /
  Hessen / Niedersachsen) carry verified §§. The stub packs use
  honest-deferral phrases. When v1.0.24+ verifies a new state's
  citations, move the state from `makeStub` to a named substantive
  pack with `isSubstantive: true`.
- The Bayern SHA invariant (`b18d3f7f...3471`) must MATCH at start
  AND end of every commit. v1.0.21 + v1.0.22 + v1.0.23 were clean on
  this across all 21 commits.
- 24/24 of the v1.0.20 testing sweep bugs are now CLOSED. The next
  empirical sweep (a fresh user-driven walk against v1.0.23) is the
  recommended trigger for v1.0.24 scope.
