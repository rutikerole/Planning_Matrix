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
