# Backlog — v1.0.24+ (features-only)

> The v1.0.20 testing sweep surfaced 24 bugs. v1.0.21 + v1.0.22 +
> v1.0.23 closed all 24 across 21 commits (7 + 6 + 8). The remaining
> items below are FEATURE requests + carry-forward enhancements,
> not bugs. Each is scoped at the "dedicated sprint" level.

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

## v1.0.22 / v1.0.23 follow-ups

### Bug K root-cause persona-prompt fix

v1.0.22 added a runtime guard
(`sanitizeGermanContentOnEnglish`) that catches persona-emitted
German content on EN export and renders an honest placeholder. The
root-cause fix is a "respect lang context" instruction in the
chat-turn persona prompt
(`supabase/functions/chat-turn/*`). Land with empirical
validation that no Bayern fixture is regressed.

### Bug Q write-time gate extension

v1.0.22 added a read-time normalization (in `getQualifierLabel`) so
CLIENT+VERIFIED can never render. The write-time gate
(`src/lib/projectStateHelpers.ts:gateQualifiersByRole`) currently
catches only DESIGNER+VERIFIED — extend it to also block
CLIENT/USER/BAUHERR + VERIFIED at chat-turn boundary, with
empirical validation against the chat-turn fixtures.

### Bug I Path A — wire real regional BKI factors

v1.0.22's honest-baseline framing is Path B. Path A (real
state-keyed BKI factors) lands when authoritative source-cited
per-state values + validation evidence against real architect
quotes are available. Replace `REGION_MULT` in
`src/features/result/lib/costNormsMuenchen.ts` with the populated
table; revert `pdfStrings` / `costFactorLabel` / `docs/cost-formula.md`
to the "regional factor documented" content.

### Bug D wizard integration

v1.0.23 shipped `src/lib/addressParser.ts` as a tested helper. The
wizard (`src/features/wizard/components/QuestionPlot.tsx`) still
accepts the address blob verbatim. Wire `parseAddressBlob` into the
wizard's submission flow with the "Parsed: …, looks right?" inline
confirmation UI from the Bug D spec. Empirical validation: no
existing project with a stored `plot_address` blob is regressed
(parser falls back to the raw string on malformed inputs).

### Bug R Top-3 / Section VIII extension

v1.0.23's DESIGNER-source downgrade fires on the Key Data row only.
Extend to the Top-3 Executive page and Section VIII Recommendations
when a future smoke walk surfaces a DESIGNER-source leak there. The
gate function (`normalizeDesignerWithoutInLoop` in
`src/lib/qualifierNormalize.ts`) is ready; only the call-sites need
adding.

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
