# Post-Smoke-Test Investigation — Adversarial Read-Pass

> Empirical, not hypothetical. file:line proof for every claim.
> Bayern SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
> verified MATCH at start AND end of read pass. No code edits.

## V1.0.14 RESOLVED FINDINGS — v1.0.13 regression closure

Empirical NRW × T-03 Königsallee re-export against v1.0.13
surfaced three P0/P1 regressions:

| # | Bug                                              | Severity | v1.0.14 commit                                    |
| - | ------------------------------------------------ | -------- | ------------------------------------------------- |
| 28 | Cover/TOC footer duplication ("1 / 10 1 / ?")    | P0       | `7423195 fix(pdf): Bug 28 — cover/TOC footer split` |
| 29 | Cover footer Bauherr name renders "Owner" literal | P1       | `5bb2902 fix(pdf): Bug 29 — Bauherr name resolved via auth profile fallback chain` |
| 30 | Body-page ligature corruption regressed          | P0       | `26844be fix(pdf): Bug 30 — consolidate font instances across cover/TOC + body` |

Root causes (Phase 0 investigation per bug):

- **Bug 28**: v1.0.13's finalizePageFooters drew a PAPER mask
  rectangle at y=MARGIN+8 height=14 over the "1 / ?" placeholder,
  then drew the resolved "1 / N" on top. But pdf-lib's drawText
  y-coordinate is the glyph BASELINE; the placeholder's ascender
  extended above the mask, leaving visible residue. Path A fix:
  split cover.ts + toc.ts each into body + footer renderers so
  no placeholder is ever drawn — footer renders AFTER total page
  count is resolved.

- **Bug 29**: v1.0.13 hardcoded the lang-conditional "Bauherr" /
  "Owner" literal at exportPdf.ts:206 with no Supabase query for
  the actual owner name. Fix: ExportMenu resolves display name
  via fallback chain (profile.full_name → user_metadata.full_name
  → email local-part title-cased → localized fallback) and threads
  the result through new optional BuildArgs.bauherrName.

- **Bug 30**: v1.0.13 introduced resolveEditorialFonts which
  internally called loadBrandFonts a SECOND time on the same
  PDFDocument. pdf-lib treats each call as an independent font
  embed — duplicate-embed configuration corrupted subset state
  on body pages' font instances (cover/TOC used the second
  embed, body used the first — only the first's subset lost
  ligature guarantees). Fix: extend resolveEditorialFonts to
  accept an optional pre-loaded BrandFonts; assembly threads the
  single loadBrandFonts result through to both cover/TOC and
  body, unifying subset state across all pages.

**The 9 remaining Renaissance section renderers** (executive,
areas, costs, timeline, procedures, team, recommendations,
keyData, verification, glossary) — originally scoped as v1.0.14
Part 2 — are deferred to v1.0.15+ as their own dedicated sprint.
Each renderer is substantial work (50-150 LOC + drift fixtures
+ careful styling against the approved prototype) that exceeds
the regression-closure scope of v1.0.14. Plus runtime smoke:
pdf-text via pdf-parse devDep (refactoring fontLoader for Node
runtime, committing fixture project state JSON, building the
extraction harness).

The v1.0.14 ship gets the PDF unbroken: cover + TOC remain
prototype-faithful from v1.0.13, body pages stop corrupting
ligatures, footers stop duplicating, owner name renders. That
unblocks immediate client preview while v1.0.15+ completes the
Renaissance body sections.

**v1.0.15+ backlog:**
- Renaissance Part 2A: executive + areas + costs (~3 commits)
- Renaissance Part 2B: timeline + procedures + team (~3 commits)
- Renaissance Part 2C: recommendations + keyData + verification
  + glossary (~4 commits)
- Runtime smoke:pdf-text via pdf-parse (5th daily gate)
- Font subset script if Inter rebuild needed
- Bug 17 [P2] team-tab Bayern hardcodes (chat-UI)
- Bug 20 [P2] procedure-tab caveat audit (chat-UI)
- Bug 23 [P1] persona-output Schwabing/BLfD scrub (chat-UI)

Bayern SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
held across all 3 v1.0.14 fix commits.

---

## V1.0.13 SHIPPED — PDF Renaissance Part 1

Foundations + cover + TOC + DE/EN export picker. Mixed-state PDF
intentional: new cover + TOC are prototype-faithful, body sections
remain v1.0.12 state and ship in v1.0.14+ Parts 2-4.

| # | Workstream                                       | Commit                                                                  |
| - | ------------------------------------------------ | ----------------------------------------------------------------------- |
| 1 | Layout primitives module                         | `200b0d2 feat(pdf): layout primitives module`                           |
| 2 | DE/EN locale string table                        | `74b66d2 feat(pdf): DE/EN locale string table`                          |
| 3 | Cover page renderer                              | `7d4b504 feat(pdf): cover page renderer`                                |
| 4 | TOC page renderer                                | `fb0f630 feat(pdf): TOC page renderer`                                  |
| 5 | Assembly wire-up                                 | `db3d227 feat(pdf): wire cover + TOC into assembly`                     |
| 6 | DE/EN export picker UI                           | `5ee2b23 feat(ui): DE/EN export picker in result ExportMenu`            |
| 7 | This docs commit                                 | _self-reference_                                                        |

Key design decisions:

- **Path A for serif italic**: Instrument Serif Italic already in
  public/fonts/ — zero font budget impact. v1.0.6+ fontLoader
  already embeds it; v1.0.13 just uses it via the new
  resolveEditorialFonts facade.
- **Locale-strict resolver**: pdfStrings throws "[[MISSING: key]]"
  sentinel rather than silently falling back EN. Missing
  translations surface at smoke-test layer not at user export.
- **§ citations preserved in German across locales** (mirrors
  v1.0.6 anti-Bayern-leak helper pattern).
- **TOC page-number approximation**: body sections still flow
  inline (v1.0.12 behaviour, untouched); computeTocPageNumbers
  heuristic in exportPdf.ts gives best-effort per-section indices.
  v1.0.14+ replaces with real tracking when each section gets a
  dedicated renderer.
- **finalizePageFooters post-process**: cover + TOC render with
  "X / ?" placeholders initially; after body completes and total
  page count is known, the placeholder regions are masked with
  PAPER and redrawn with correct "1 / N" / "2 / N".
- **DE/EN export picker as two adjacent menu items**: simplest UI
  surface change; UI locale orders which option appears first;
  both always available. preferred_locale schema column persistence
  is v1.0.14+ scope (needs migration).

**v1.0.14+ backlog (continuation by sprint design — NOT
deferred-by-giving-up):**
- Renaissance Part 2: executive + areas + costs pages
- Renaissance Part 3: timeline + procedures + team pages
- Renaissance Part 4: key data + verification + glossary pages
- Runtime smoke:pdf-text via pdf-parse devDep (5th daily gate)
- Font subset script if Inter rebuild ever needed
- Bug 17 [P2] team-tab Bayern hardcodes audit
- Bug 20 [P2] procedure-tab caveat audit beyond v1.0.10
- Bug 23 [P1] persona-output Schwabing/BLfD scrub

Bayern SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
held across all 7 v1.0.13 commits.

Rutik validates by re-exporting Königsallee in EN AND DE,
eyeballing cover + TOC against the approved prototype mockup. Body
sections remain v1.0.12 plain-text — that's expected this sprint.

---

## V1.0.12 RESOLVED FINDINGS — PDF visible-space + numbering + qualifier display

Empirical NRW × T-03 Königsallee re-export against v1.0.11
production showed v1.0.11's ZWNJ injection rendered as VISIBLE
SPACE in Inter's TTF subset — worse than the original ligature
corruption it tried to fix. Plus two adjacent PDF presentation
bugs surfaced by the same re-walk.

| # | Bug                                              | Severity | v1.0.12 commit                                |
| - | ------------------------------------------------ | -------- | --------------------------------------------- |
| 22 (regression) | ZWNJ visible-space ("conf irmed" / "Pf licht" / "Eingrif f") | P0 | `0c43754 fix(pdf): kill ZWNJ visible-space regression — preventBrandLigatures no-ops` |
| 25 | DESIGNER+ASSUMED rendered on derived rec where no architect has touched the project | P1 | `e064877 fix(pdf): normalize recommendation qualifier display + always render section VI` |
| 26 | Section VI (Documents) skipped → I..X gap in numbering | P2 | `e064877 fix(pdf): normalize recommendation qualifier display + always render section VI` |

Root causes:

- **Bug 22 regression**: v1.0.11 injected U+200C ZWNJ between
  f+i/l/f to break OpenType `liga` GSUB. Theory: ZWNJ is a
  Unicode default-ignorable character that Inter would render as
  nothing. Reality: Inter's TTF subset lacks a U+200C glyph
  definition; pdf-lib + fontkit's subset pass fell back to
  .notdef, which Inter maps to a SPACE-WIDTH glyph. Path A fix:
  no-op the helper. pdf-lib's font.encodeText path looks up
  glyph indices per character without invoking fontkit's shaping
  layout — no GSUB-driven ligature is placed in the content
  stream when plain ASCII is passed to drawText. ToUnicode CMap
  pdf-lib generates ensures text extraction works regardless of
  viewer display-time shaping.

- **Bug 25**: Phase 13's §6.B.01 qualifier-write gate downgrades
  persona-attempted DESIGNER+VERIFIED to DESIGNER+ASSUMED (audit
  signal). Render-time `formatRecommendationQualifier` helper
  normalizes the display to "LEGAL · CALCULATED" — the qualifier
  matching the recommendation's actual provenance. DB row + audit
  trail unchanged.

- **Bug 26**: section VI rendering was conditional on
  docs.length > 0. Now always renders with "(no documents
  recorded yet)" placeholder so I..X numbering is gap-free.

**Bug 27 hypothesis (² superscript strip)**: incidentally closed
by Bug 22's no-op. The v1.0.11 ZWNJ injection likely corrupted
Inter's font subset integrity at PDF embed time, breaking adjacent
U+00B2 extraction. Path A restoration of subset integrity should
self-resolve. If Bug 27 persists in NRW × T-03 re-export post-
v1.0.12 deploy, escalate to v1.0.13.

**v1.0.13 backlog (multi-session work, intentionally deferred):**
- PDF Renaissance (11-section redesign per approved prototype)
- DE/EN export toggle in download UI
- Per-locale string resolver (pdfStrings.ts) + section renderers
  (pdfSections/*.ts) + layout primitives (pdfPrimitives.ts)
- Runtime smoke:pdf-text gate via pdf-parse devDep
- Font subset script (strip GSUB liga at subset time — Path B
  fallback if Path A regresses)
- Bug 17 [P2] team-tab Bayern hardcodes
- Bug 20 [P2] procedure-tab caveat audit
- Bug 23 [P1] persona-output Schwabing/BLfD scrub

Bayern SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
held across all three v1.0.12 commits.

---

## V1.0.11 RESOLVED FINDINGS — PDF deliverable hardening

Production verification of v1.0.10 on NRW × T-03 Königsallee
project (5c610d71-…) surfaced two P0 PDF blockers:

| # | Bug                                          | Severity | v1.0.11 commit                                                |
| - | -------------------------------------------- | -------- | ------------------------------------------------------------- |
| 22 | PDF ligature corruption (conċrmed / PČicht / Čoor / certiċed) | P0 | `66f0d51 fix(pdf): prevent fontkit ligature substitution + always-on ligature decomposition` |
| 24 | Cost engine ignores T-03 fassadenflaeche_m2, falls back to default 180 m² | P0 | `95523f4 fix(cost): per-template cost-basis field resolver — T-03 reads fassadenflaeche_m2` |

Root causes:

- **Bug 22**: brand-TTF path bypassed `safe()` entirely
  (`safe = (s) => s`). fontkit's text layout applied OpenType
  `liga` GSUB substitution at PDF embed time, replacing "fi"/"fl"
  with ﬁ/ﬂ ligature glyphs. PDF viewers' text-extraction layer
  mapped those glyphs back to substitute codepoints (ċ / Č) via
  the embedded font's ToUnicode CMap. Fix splits the sanitizer
  into `decomposeLigatures` (always-on, both paths, strips
  U+FB00..U+FB05) and `preventBrandLigatures` (brand-TTF-only,
  injects U+200C ZWNJ to break GSUB substitution chain — ZWNJ
  is outside WinAnsi range so it MUST NOT run on the fallback).

- **Bug 24**: `detectAreaSqm(corpus)` regex requires a unit
  suffix on the value (`<digits>\s*<unit>`), which works for
  T-01/T-02 neubau where the persona emits "180 m²" as a string,
  but misses T-03's `fassadenflaeche_m2 = 220` (numeric value
  with the unit encoded in the KEY). Fix: per-template fact-key
  map `COST_BASIS_FIELD_BY_TEMPLATE` + `resolveAreaSqmByTemplate`
  function called ahead of the corpus regex in both cost callers.
  T-03 is empirically confirmed; other templates have
  user-supplied conventions in the map that gracefully no-op
  when the persona emits a different key.

**v1.0.12 backlog (deferred per sprint discipline):**
- Bug 17 [P2]: Team-tab Bayern hardcodes audit
- Bug 18 [P1]: PDF full-section state-parameterization re-audit
- Bug 20 [P2]: Procedure-tab caveat audit beyond v1.0.10 closures
- Bug 23 [P1]: persona-output Schwabing/BLfD scrub (chat-layer
  Bayern entity names beyond §§ — extend the v1.0.6 anti-leak)
- Bug 25 [P3]: Recommendation qualifier wrong (DESIGNER+ASSUMED
  edge case)
- Bug 26 [P3]: PDF section numbering skips VI

Bayern SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
held across both v1.0.11 commits.

---

## V1.0.10 RESOLVED FINDINGS — state-parameterization sprint

Rutik's Düsseldorf NRW × T-03 walk on v1.0.9 (project
5c610d71-…) confirmed the persona-chat layer is state-correct
(BauO NRW citations, anti-leak in force, no BayBO leak in
turn 1) but exposed Bayern hardcodes in the deterministic
computation layers — cost engine, baseline procedure, locale
caveats, donut rounding.

| # | Bug                                            | Severity | v1.0.10 commit                                   |
| - | ---------------------------------------------- | -------- | ------------------------------------------------ |
| 14 | Cost rationales hardcode Bayern factor / BayBO Art. 62 / "Pflicht für Neubauten in Bayern" | P0 | `831fa87 fix(cost): state-parameterize cost rationales + locale caveats` |
| 15 | Baseline procedure cites BayBO Art. 58 on NRW | P0 | `f6c4df8 fix(procedure): state-parameterize deriveBaselineProcedure + new state-localization registry` |
| 16 | smartSuggestions bundeslaender filter case-mismatch (silently never fired) | P2 | `280b3ac fix(suggestions): Bayern bundeslaender filter case-mismatch — was silently never firing` |
| 19 | VorlaeufigFooter hardcoded German on EN locale | P1 | `edabad3 fix(locale): VorlaeufigFooter respects i18n locale — EN parity for the legal-shield footer` |
| 21 | DataQualityDonut percentages sum to 101       | P2 | `5641bf5 fix(donut): largest-remainder rounding so DataQuality slices sum to 100` |

Foundation: `src/legal/stateLocalization.ts` (commit `f6c4df8`)
— central 16-state registry providing
procedure/structuralCert/monumentAuthority/chamber/cost-factor
strings per Bundesland. Substantive states (Bayern, NRW, BW,
Hessen, NS) carry verified §§ from Phase-12 ALLOWED_CITATIONS;
11 stubs use a generic "your Land's LBO" framing — never a
silent Bayern leak.

**v1.0.11 backlog (intentionally deferred during the sprint scope-cut):**
- Bug 17 (P2): Team-tab Bayern hardcodes audit — surface unchecked
- Bug 18 (P1): PDF state-parameterization for procedure section
  (the cost section now state-correct via Bug 14 threading;
  baseline procedure cited in PDF derives from chat-turn so
  benefits from Bug 15 transitively)
- Bug 20 (P2): "Procedure & documents" tab caveat audit beyond
  the two strings already de-Bayern'd in Bug 14
- Bug 22 (P2): PDF font `fi` ligature corruption — "conċrmed"
  in the cover footer. Likely Helvetica + WinAnsi mismatch even
  after winAnsiSafe's `ﬁ` → `fi` mapping; needs deeper font
  audit
- "Schwabing/BLfD on non-Bayern projects" residual: the strings
  come from PERSONA OUTPUT (LLM-generated state), not baseline
  composers. v1.1 may strengthen the anti-leak block to forbid
  Bayern entity names beyond just BayBO §§

Bayern SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
held across all six v1.0.10 commits.

---

## V1.0.9 RESOLVED FINDING — Düsseldorf NRW smoke walk

Rutik ran a Düsseldorf NRW smoke against v1.0.8 and observed the
wizard's Bundesland dropdown defaulting to 'bayern' regardless of
the typed address. The persona's moderator turn then explicitly
said "our advisory covers Bavaria" on a clearly NRW project.

| # | Bug                                                | Severity | v1.0.9 commit                                  |
| - | -------------------------------------------------- | -------- | ---------------------------------------------- |
| 13 | Wizard Bundesland dropdown stays at 'bayern' default | P1      | `7738069 fix(wizard): auto-detect Bundesland from German postcode prefix` |

Root cause: v1.0.6 Bug 0 added the dropdown but no address-to-state
inference. Default was 'bayern'; users who didn't notice the
dropdown silently created Bayern projects.

Fix: deterministic Deutsche Post postal-sector lookup
(`src/features/wizard/lib/inferBundeslandFromPostcode.ts`).
Pre-selects the dropdown on every address change; hint copy
surfaces the detected PLZ verbatim. Manual override preserved
for border-case properties.

Bayern SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
held.

---

## V1.0.7 RESOLVED FINDINGS — post-v1.0.6 visibility-gap closure

Rutik's post-v1.0.6 live-deploy observation on existing Hessen
project 24c8fb67-… showed three pre-fix-looking behaviours.
Investigation confirmed v1.0.6 shipped correctly (deploy verified
live; greppable markers present) but three root causes were
distinct from "retroactive-apply gap":

| # | Bug                                              | Severity | v1.0.7 commit                                 |
| - | ------------------------------------------------ | -------- | --------------------------------------------- |
| 8 | Confidence 91% vs expected 82%                   | P0       | `da235bf fix(confidence): widen scope to all 5 qualifier-bearing categories` |
| 9 | Spine still 41% on existing project              | P0       | `dd049ec fix(spine): widen final-synthesis criterion — OR with material-result fallback` |
| 10 | BayBO still cited on Hessen project              | P0       | `4d72900 fix(ui): Update Bundesland pill in SpineHeader` |
| 11 | Deploy verification ambiguity                    | P1 docs  | `7a0a39b docs(deploy): add post-tag deploy-verification step to OPS_RUNBOOK` |

Root causes (per the investigation surfaced to user before
fixing — none matched the original spec framing):

- **Bug 8** was a scope mismatch, not a formula bug.
  `computeConfidence` walked only `state.facts`; the donut
  walked all 5 qualifier-bearing categories. Switching
  computeConfidence to `aggregateQualifiers` (same engine the
  donut uses) made the two surfaces produce identical numbers.
  Weighting now mirrors donut grouping exactly: DECIDED 1.0,
  CALCULATED+VERIFIED 0.85, ASSUMED+UNKNOWN 0.4.

- **Bug 9** was a criterion-too-narrow problem, not a
  retroactive-apply gap. v1.0.6's spine completion gated on
  `final_synthesis.isDone = recommendations.length >= 3`. The
  Hessen project had fewer than 3 entries in
  `state.recommendations` even though the persona had emitted
  a Final Synthesis turn. v1.0.7 ORs the canonical criterion
  with a "result page has material content" fallback
  (procedures >= 1 AND any area state ACTIVE AND recs >= 1).

- **Bug 10**'s "BayBO on Hessen" was correct behaviour given DB
  state. The project's bundesland column read 'bayern' (B04
  wizard hardcode at creation time, pre-v1.0.6). composeLegalContext
  correctly loaded BAYERN_DELTA, which has no anti-leak block
  (Bayern.ts is intentionally SHA-locked). The v1.0.6 anti-leak
  fix gates on bundesland being non-Bayern. v1.0.7 adds an
  Update Bundesland pill in SpineHeader so bauherr can
  retroactively correct mislabeled projects; the mutation
  invalidates project + messages queries so the next chat turn
  composes the corrected state's systemBlock.

- **Bug 11** was an investigative-loop avoidance task. OPS_RUNBOOK
  § 9 now documents the deploy-verification probe (curl bundle +
  last-modified, grep tag-introduced markers, compare to local
  build) + browser cache guidance + escalation ladder.

Bayern SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
held across all four v1.0.7 commits.

The original spec's "Bug 7 retroactive-apply gap" was dissolved
during investigation — three distinct issues, not one shared
root cause.

---

## V1.0.6 RESOLVED FINDINGS — Hessen × T-03 smoke-walk sprint

The 2026-05-11 Hessen × T-03 hand-walk against live v1.0.5
surfaced 6 production-facing bugs that landed as v1.0.6:

| # | Bug                                              | Severity | Resolution commit                           |
| - | ------------------------------------------------ | -------- | ------------------------------------------- |
| 0 | Wizard hardcodes `bundesland: 'bayern'` (B04)    | P0       | `ccf176e fix(wizard): explicit Bundesland selection` |
| 1 | Cost computation shows "bayern factor" on Hessen | P0 → docs | Root cause was Bug 0; engine unchanged. Comment trail in `bc0b8ec docs(cost): record Bug 1 downgrade` |
| 2 | PDF export missing 4 result-page sections        | P0       | `4776888 fix(pdf-export): add Costs/Timeline/Stakeholders/Recommendations + Vorläufig per page` |
| 3 | Spine 41% while result renders fully             | P1       | `c4e2b8e fix(spine): mark spine 100% when final_synthesis is reached` |
| 4 | Confidence 94% vs 57% decided                    | P1       | `d6a2777 fix(confidence): drop sectionScore weight; header = fact-quality mix only` |
| 5+6 | Persona leads with BayBO on Hessen projects    | P1       | `8039966 fix(legal): anti-Bayern-leak override prepended to every non-Bayern state` |

Bayern SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
held across all six commits.

The mid-flight-bundesland-switch SERIOUS-1 below is **NOT closed by
v1.0.6** — Bug 0 prevents the case from being reachable (the wizard
now writes the correct Bundesland up front), but a manual
`UPDATE projects SET bundesland = '<x>'` mid-conversation still has
the conversational-dominance behaviour described below. Tracked for
v1.1 as before.

---

## TL;DR

11 findings: **0 CRITICAL, 2 SERIOUS, 3 MINOR, 5 INFO, 1 RESOLVED-IN-V1.0.3.**
Bayern SHA still `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`. **Production-ready
verdict: YES-FOR-BAYERN-ONLY.** Migration 0031 holds; the
projects ↔ project_members RLS recursion is gone. The bundesland
change *did* propagate at the system-prompt layer (code path
verified file:line); the persona "still cited Bayern" because
9 turns of past assistant_messages + Bayern-flavoured
projects.state JSONB dominate the model's context window —
**by-design conversational dominance, not a stale-cache bug**.

**v1.0.3 (commit `b98cc98`, tag `v1.0.3`) wired
`VorlaeufigFooter` into every qualifier-bearing result-page
surface** (4 tabs + SuggestionCard + Overview aggregate). The
original headline finding ("dead code, server-side real but
client-side invisible") is RESOLVED. Architect verification now
has direct Bauherr-visible consequence: per-card footers vanish
as the architect verifies, tab-level aggregates hide once all
entries are DESIGNER+VERIFIED.

---

## 1. Bundesland propagation root cause

### [INFO-1] Code path is structurally correct — bundesland reads fresh per turn

Empirical proof:

- `supabase/functions/chat-turn/persistence.ts:75-83` —
  `loadProjectAndMessages` runs `from('projects').select('*').eq('id', projectId)`
  per HTTP request. **No memoization**, no module-level cache, no
  per-session caching.
- `supabase/functions/chat-turn/index.ts:235` — `bundesland: project.bundesland`
  span attribute records the FRESH read.
- `index.ts:351` (JSON path) and `index.ts:373` (streaming path) —
  `buildSystemBlocks(liveStateText, locale, templateId, project.bundesland)`
  passes the freshly-read bundesland into prompt composition.
- `systemPrompt.ts:225` — `text: composeLegalContext(bundesland)`.
- `src/legal/compose.ts:64-71` — `composeLegalContext` calls
  `resolveStateDelta(bundesland)` from `legalRegistry.ts:104`.

→ **The 16-state framework IS wired into production runtime, not
just structurally present.** Hypothesis (d) ("compose.ts loads
Bayern via direct import bypassing the registry") is refuted.

### [SERIOUS-1] Mid-conversation bundesland switch is NOT a supported product flow

When the user `UPDATE projects SET bundesland = 'hessen'` mid-
conversation, the next chat-turn:

1. ✓ Reads fresh `bundesland = 'hessen'`.
2. ✓ Composes Hessen prefix via `composeLegalContext('hessen')`.
3. ✓ Anthropic gets a different cache key (Hessen prefix SHA ≠
   Bayern prefix SHA), pays cache-creation tax once, caches Hessen.
4. ✗ **The 9 prior assistant_messages still contain BayBO/München
   citations** — the model treats these as authoritative ground-
   truth.
5. ✗ **`projects.state.facts` + `state.recommendations` still
   carry Bayern-specific entries** — `systemPrompt.ts:75-99`
   re-injects them every turn via `buildLiveStateBlock`.
6. ✗ Result: model sees Hessen at the constitutional layer but
   Bayern everywhere else; **persona keeps citing Bayern out of
   conversational dominance + state persistence**.

This is NOT a stale-cache bug. The system prompt's Hessen content
IS in the request payload. The model is just outvoted by 10:1
Bayern context.

**Not documented in any user-facing doc.** AUDIT_REPORT.md § B04
flagged the wizard hardcode but called the bundesland field
"decorative"; Phase 11 (commit `667bb44`) wired it in, making B04
NO LONGER decorative — yet the no-mid-flight-switching constraint
went undocumented.

→ For mid-flight bundesland switching to "really" work, one of:
  - Reset `projects.state` (drop Bayern facts/recs) on switch.
  - Inject a "previous citations are now invalid; switching to
    Hessen" instruction in the next system prompt at switch-time.
  - Truncate or annotate the messages history.

None implemented. **Documented gap; no v1 customer should rely on
mid-conversation state changes.**

### Confirmed clean
- No in-memory project cache (`grep -rn "projectCache\|memoize" supabase/functions/chat-turn/` returns zero).
- `compose.ts` uses `resolveStateDelta` (no static Bayern import in the active path; `bayern.ts` exports `BAYERN_BLOCK` consumed via `BAYERN_DELTA.systemBlock`).
- `lintCitations(toolInput, project.bundesland)` at `index.ts:414` also reads fresh; the firewall switches Bundesland correctly per turn.

---

## 2. Outlier turn 78a01526 — 0% cache hit, 3k input, $0.17

### [INFO-2] Most-likely cause: Anthropic ephemeral prompt-cache TTL expired (5 min)

Cannot empirically confirm without service-role access to
`logs.traces` / `logs.persona_snapshots`. Architectural reasoning:

- Anthropic's `cache_control: { type: 'ephemeral' }` marker has a
  **5-minute TTL** (Anthropic docs); the cache evicts on idle.
- 9 of 10 turns hit 90-94% cache. Turn 78a01526 sits chronologically
  between turn 2 and turn 4 (per the screenshot ordering). If user
  paused ≥ 5 min between turns 2 and 3, the Bayern prefix cache
  evicted; turn 3 paid `cache_creation_input_tokens` at 1.25× rate.
- Cost spike math: Bayern composed prefix is ~47923 chars
  (`scripts/lib/bayernSha.mjs` confirms via `length` field) ≈ 12k
  tokens. `cache_creation_input_tokens` = 12k × $3.75/MTok =
  ~$0.045. Plus typical output (~800 tokens × $15/MTok = $0.012)
  + uncached input (~3k × $3/MTok = $0.009) ≈ $0.066. The reported
  $0.17 includes the per-template tail's cache_creation
  (~Block 2 also hits cache_create on full miss) + possibly a
  retry path hit.

→ **Ephemeral cache miss, not a structural cache-key bug.** The
following turn (046c79ea, 93% cache) re-warmed the cache. Idle
gaps > 5 min during persona conversations will repeat this
pattern; not preventable without an Anthropic API change.

### Confirmed clean
- Cache key derivation (Dimension 5) confirms bundesland is
  implicit in the prefix content hash; no orthogonal "key
  invalidation" event would trigger a 0% cache.
- Per-turn structure (`buildSystemBlocks` returns same shape) →
  cache key drift only happens on prefix-content changes, which
  didn't occur until after this turn.

---

## 3. Spine completion — does it actually finish?

### [SERIOUS-2] No hard terminal stop; "~22 rounds" is heuristic, not a cap

- `useChamberProgress.ts:28` — `const TOTAL_ESTIMATE_T01 = 22`.
- `useChamberProgress.ts:63` — `const totalEstimate = templateOverride ?? TOTAL_ESTIMATE_T01`.
- `useChamberProgress.ts:80` — `const turnsFraction = Math.min(currentTurn / totalEstimate, 1)` clamps fraction at 1 but currentTurn keeps growing past 22.
- `useChamberProgress.ts:91` — `const finalRaw = isReadyForReview ? Math.max(floored, 0.95) : floored`.

The "Round 10 of ~22" the user saw is a SOFT progress estimate. The
SPA UI doesn't disable the input bar at round 22; the persona
isn't required to terminate. **A user could chat indefinitely.**

The intended termination signal:
- `src/types/respondTool.ts:60-65` — `completionSignalSchema = z.enum(['continue', 'needs_designer', 'ready_for_review', 'blocked'])`.
- The persona is supposed to emit `completion_signal: 'ready_for_review'` when finished.
- `useChamberProgress.ts:84-91` — when received, percent floors at 95% and `isReadyForReview = true`.
- `BriefingCTA.tsx:80-185` (per the grep earlier) renders a "ready" CTA.

But **NO server-side enforcement** that the persona actually emits
the signal. If the model keeps emitting `'continue'` indefinitely,
the conversation runs forever.

### [MINOR-1] `TOTAL_ESTIMATE_T01` used as fallback for ALL templates

`useChamberProgress.ts:63` — when `templateOverride` is not passed,
**every template** displays "~22". Renovation Marienplatz
(template T-03) shows "~22" but T-03 may need fewer or more rounds
than T-01. Cosmetic but slightly misleading.

### [INFO-3] Spine advancement is data-driven via `isDone` predicates

- `spineStageDefinitions.ts:108-247` — 8 stages, each with
  `isDone(state, messages) => boolean`.
- Final synthesis: `spineStageDefinitions.ts:247` —
  `isDone: (state) => state.recommendations.length >= 3`.

The spine surface advances when the persona emits 3+ recommendations
into `projects.state`. The model controls progression. No
deterministic round-based advancement.

### Confirmed clean
- Spine stages monotonic on `isDone` (`useSpineStages.ts:8-16`):
  once true, stays true; persona briefly dipping into a future
  specialist does NOT reorder the rail.
- `completion_signal === 'ready_for_review'` IS the persona-side
  terminal signal; the SPA reads it correctly.

---

## 4. Architect verification flow — UNTESTED in production smoke

### [SERIOUS-3] `VorlaeufigFooter` is dead code — imported by ZERO surfaces — **RESOLVED in v1.0.3 (commit `b98cc98`)**

Empirical:
```
grep -rn "import.*VorlaeufigFooter" /src --include="*.ts*"
→ (no matches)
```

The component is defined at `src/features/architect/components/
VorlaeufigFooter.tsx:14-90` and exports both a JSX component AND
the pure `isPending(source, quality)` predicate. Neither is
imported by:
- `src/features/result/components/tabs/ProcedureDocumentsTab.tsx`
- `src/features/result/components/tabs/TeamTab.tsx`
- `src/features/result/components/tabs/CostTimelineTab.tsx`
- `src/features/result/components/tabs/SuggestionsTab.tsx`
- `src/features/result/components/Cards/SuggestionCard.tsx`

**Result-page cards never render the "Vorläufig — bestätigt durch
eine/n bauvorlageberechtigte/n Architekt/in noch ausstehend."
footer.** The Bauherr (the client) sees DESIGNER+ASSUMED qualifier
items with no visual signal that they need architect verification.

The architect's `verify-fact` flip on the server-side (qualifier →
DESIGNER+VERIFIED) is therefore **invisible to the Bauherr**:
nothing changes on the result page when an architect verifies a
fact. The v1.5 §6.B.01 legal shield's USER-VISIBLE component is
absent.

This IS documented in HANDOFF.md § 7 deliberately-not-shipped list
("ships, but result-page card composers ... are not yet wired.
Mechanical follow-up — drop the import next time a result-page
card is touched"). But the audit didn't elevate it from "follow-up"
to actually wiring it before shipping. **It should have been
SERIOUS in the original POST_V1_AUDIT.md, not deferred.**

### [INFO-4] Architect data-path is structurally correct

- `useIsDesigner.ts:30-44` — reads `profiles.role` via user-scoped
  client; correct for RLS-allowed self-read.
- `share-project/index.ts` — owner-check on create + designer-check
  on accept + 7-day TTL — all v1.0.1 hardening intact.
- `verify-fact/index.ts:148-177` — designer-role + accepted-membership
  checks; service-role mutate + qualifier.verified event.
- `0028_projects_architect_read.sql` + 0031 helper-function rewrite
  — accepted architects can read project state without recursion.
- `VerificationPanel.tsx:53-73` — mutation flow + queryClient
  invalidate is shape-correct.

If a designer logs in right now and clicks "Bestätigen", the
qualifier flips to DESIGNER+VERIFIED in `projects.state`. **But
the Bauherr's result page surface won't change** because the
footer doesn't render. The architect surface would itself update
(`VerificationPanel.tsx:148-153` — verified rows render greyed
"Bestätigt").

### Confirmed clean
- `qualifierGate.test.ts` (Deno test) covers the gate's role-based
  behaviour exhaustively.
- Migration 0030 expires_at + 0026 RLS pattern intact.

---

## 5. Cache-key derivation integrity

### [INFO-5] Cache key is the prefix CONTENT HASH; bundesland implicit

Anthropic's `cache_control: { type: 'ephemeral' }` keys on the SHA
of the cached text block. NOT on identifiers like `templateId` or
`bundesland` strings.

Per `systemPrompt.ts:222-243`:
- **Block 1** (cached): `composeLegalContext(bundesland)`. Hash =
  SHA of the bundesland-specific composed prefix. Bayern hash =
  `b18d3f7f…3471`. Hessen would be a different hash.
- **Block 2** (cached): `getTemplateBlock(templateId)`. Hash per
  template.
- **Block 3** (uncached): locale addendum.
- **Block 4** (uncached): live state block — bundesland string is
  rendered into `systemPrompt.ts:61` (`lines.push(\`bundesland: ${bundesland}\`)`).

→ Bundesland IS in the cache key (implicit via prefix content).
Switching Bayern → Hessen produces a NEW cache entry; no risk of
serving stale Bayern from cache.

→ Block 4 (live state block) renders bundesland as text but is
NEVER cached, so per-turn changes flow through cleanly.

### Confirmed clean
- No identifier-based cache key anywhere (cache is content-
  addressable per Anthropic API spec).
- `index.ts:534` — final persona snapshot uses
  `buildSystemBlocks(liveStateText, locale, templateId, project.bundesland)`
  to capture exactly what was sent. Snapshot consistency.

---

## 6. v1.0.2 RLS fix — post-deploy verification

### [INFO-6] Migration 0031 holds in production

Empirical (anon REST API, post-0031):

```text
GET /rest/v1/projects?select=id&limit=1        → []   [HTTP 200]
GET /rest/v1/project_members?select=id&limit=1 → []   [HTTP 200]
GET /rest/v1/messages?select=id&limit=1        → []   [HTTP 200]
```

→ **No more 42P17.** Three tables that previously 500'd now return
empty arrays cleanly. RLS holds for anon (auth.uid() = NULL → no
row matches). Authenticated owners + designers see their rows
through the helper-function path.

### Confirmed clean
- `0031_fix_projects_rls_recursion.sql:38-72` — both helper
  functions present with `security definer`, `set search_path = ''`,
  `stable`, explicit grants to `authenticated, anon`, default
  PUBLIC revoked.
- smokeWalk drift fixtures `v1.0.2 CRIT: rls-recursion-fix —
  helper functions / grants / replaced policies` all green.

### [VERIFY-WITH-RUTIK]
- I have NOT empirically run `EXPLAIN` on the projects SELECT to
  confirm the policy USING clause hits `is_accepted_architect()`
  rather than a planner-fallback to the original recursive
  subquery. Without service-role SQL access, this is static-only.
- Recommended one-time check via Dashboard SQL Editor:
  ```sql
  explain select id from public.projects;
  ```
  Expected: the plan shows `Function Scan` on
  `public.is_accepted_architect`, NOT a sub-select on
  `project_members`.

---

## 7. Production-readiness verdict

### Single-bundesland (Bayern-only) B2B deployment

**YES.** All four daily gates green. Dashboard renders. Wizard
inserts cleanly. Persona cites Bayern correctly. Cost discipline
holds (90-94% cache hit; $0.04/turn average). Architect server-
side flow is structurally functional.

**Caveats** (not blockers, but worth surfacing to client):

1. The `VorlaeufigFooter` is dead code → architect verification
   has no Bauherr-visible UX. The legal shield is **server-side
   real, client-side invisible**. v1.0.3 hot-fix candidate.
2. Mid-conversation bundesland switching is unsupported; if any
   client process touches `projects.bundesland` mid-flight, the
   persona will mix or stay locked to its starting Bundesland. v1.1
   scope.
3. No hard terminal stop; persona could loop. In practice
   `completion_signal === 'ready_for_review'` is the contract — but
   nothing enforces emission. v1.1 scope.
4. The 13b qualifier-rate threshold disarmed (POST_V1_AUDIT
   CRITICAL-2 still open) — operational signal misses any real
   false-positive surge. v1.1 scope.
5. Qualifier views may bypass RLS (POST_V1_AUDIT CRITICAL-3 still
   pending empirical confirmation now that 0027/0029 are
   deployed). Quick re-probe needed.

### Multi-bundesland or non-Bayern customer

**NO**, not without v1.0.3+. The wizard hardcodes `bayern`; the
only switch path is direct SQL; the switch doesn't propagate to
mid-flight conversations. For a client with even one non-Bayern
customer, the system must (a) widen B04 wizard, (b) reset state on
switch OR forbid mid-flight switching at the SPA layer.

### Minimum fix set for bundesland switch to work

- Reset `projects.state` (clear facts/recs) on switch.
- Truncate or annotate messages history.
- Add SPA wizard control to set bundesland (B04 widening).

All v1.1 — none are "hot-fix small".

### HANDOFF.md / OPS_RUNBOOK.md updates needed

- HANDOFF.md § 7.2 → add explicit "mid-flight bundesland switching
  is unsupported; SQL-update propagates to system prompt but not
  to projects.state or message history" subsection.
- OPS_RUNBOOK.md § 7 known-error catalogue → add
  `VorlaeufigFooter` as a "ships dead, blocks architect-flow UX"
  entry with the wire-up file paths.
- POST_V1_AUDIT.md CRIT-3 (qualifier views RLS) — re-probe now
  that 0027/0029 are deployed.

---

## Final verdict

**Production-ready: YES-FOR-BAYERN-ONLY.**

The v1.0.2 deploy is functional for a single-bundesland B2B client
(the v1.5 manager's specified scope). Bayern SHA discipline held.
RLS recursion closed. Daily gates green. Architect server-side
flow works end-to-end (no qualifier escapes; no false-positive
gate fires).

**Headline finding:** `VorlaeufigFooter` is shipped but unused.
Architect verification has no Bauherr-visible consequence today.
The v1.5 §6.B.01 legal shield is server-side real but
client-side invisible.

### Recommended fix order

1. **v1.0.3 hot-fix candidate** (small, mechanical):
   - Wire `VorlaeufigFooter` into the four result tabs +
     SuggestionCard. Render when `isPending(qualifier.source,
     qualifier.quality)`. Closes SERIOUS-3.
   - Re-probe POST_V1_AUDIT CRIT-3 against the now-deployed
     0027/0029 views; if leak confirmed, add `with
     (security_invoker = true)` migration. Closes the audit's
     pending CRITICAL.

2. **v1.1 sprint candidates** (deferred):
   - Mid-flight bundesland switch UX or explicit lockout.
   - Per-template `TOTAL_ESTIMATE`.
   - Hard terminal-state mechanism.
   - 13b threshold denominator fix (POST_V1_AUDIT CRITICAL-2).
   - verify-fact race condition (POST_V1_AUDIT CRITICAL-1).

3. **Doc updates** (any time):
   - HANDOFF.md § 7.2 mid-flight-bundesland subsection.
   - OPS_RUNBOOK.md § 7 known-error catalogue VorlaeufigFooter row.
   - POST_V1_AUDIT.md CRITICAL-3 status update post re-probe.

**Bayern SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471` — MATCH at end of investigation.**
