# Phase 8.1 + 8.2 + 8.3 — Data Integrity, Substance, AEC-grade Features · Findings

**HEAD at audit:** `3f81b88 fix(result): Phase 8 hardening pass — back-nav + share-mode gates + last orphan`
**Goal:** close the gap between Phase 8 v1 ("structurally complete") and AEC-industry-grade ("the numbers agree, the prose says something, the page tells how it computed").

Audit-first, before any code. Commit 1 of the sweep is this file.

---

## 1. Brief vs. reality — files that don't exist

The brief's §0 reading list assumes two helper files exist that were never created in Phase 8:

| Brief reference | Reality | Resolution |
|---|---|---|
| `src/features/result/lib/composeCostRange.ts` | **Doesn't exist.** Cost engine is `costNormsMuenchen.ts` (`buildCostBreakdown`). | Refactor that file in-place per A.4; don't create a new wrapper. |
| `src/features/result/lib/composeTimeline.ts` | **Doesn't exist.** Phase data is duplicated as a hardcoded `PHASES` const inside `CostTimelineTab.tsx` AND `ProcedureDocumentsTab.tsx`. | Create `composeTimeline.ts` as a single source of truth; update both tabs to read from it. Pure dedup before any feature work. |

Also note: §2.1 brief proposes `useResolvedRoles.ts`, `useResolvedProcedures.ts`, `useLastViewed.ts`, `RiskRegisterCard.tsx`, `SinceLastViewPill.tsx`, `SendToArchitectModal.tsx`, `InspectDataFlowModal.tsx`, `ComparableProjectsSlot.tsx` — none exist. All to be created. Fine.

---

## 2. Bug claims — root causes verified

### Part A — data integrity

| ID | Claim | Verified | Root cause |
|---|---|---|---|
| A.1 | Specialists count = 0 while Cost tab shows 5 roles | ✓ | Cost tab's `COST_LINES` is a hardcoded 5-row constant (architekt / tragwerksplanung / vermessung / energieberatung / behoerdengebuehren) inside `CostTimelineTab.tsx`. AtAGlance reads `state.roles.filter(needed).length`. Persona emits `state.roles` only mid-conversation; until then, AtAGlance shows 0 while cost rows render 5. **One source of truth needed.** |
| A.2 | Open questions = 6 vs Verify = 4 points | ✓ | Both surface from the same source (`assumedFacts`). AtAGlance counts `assumed + pendingAreas`. ActionCards "Verify" slices the same array to 4. Same data; the user can't see they're related. **Make the relationship explicit: "top 4 of 6 open."** |
| A.3 | Procedure pick empty while Cost tab shows phases | ✓ | Cost tab's `PHASES` is hardcoded; same in Procedure tab. Procedure pick reads `state.procedures.find(erforderlich) ?? procedures[0]`. Both read from project state for the *pick* but render hardcoded *phases* unconditionally. **Same fix as A.1: baseline procedure inferred from intent + bundesland.** |
| A.4 | Cost ranges might be hardcoded | ✓ partial | They DO compute, but the inputs are minimal: `BASE × procedureMultiplier × klasseMultiplier`. No floor area, no Honorarzone factor, no regional rate. **Refactor `buildCostBreakdown` to accept area + Honorarzone + region, with the existing call signature kept as a default-args overload.** |
| A.5 | Suggestions only fires 2 of N templates | ✓ partial | The matcher has **no threshold** — it accepts all filter-matching templates up to `limit: 8`. So "lower threshold" doesn't translate to a code change. What's actually broken: (a) no relevance scoring, so order is data-file order, not best-match-first; (b) some templates require both `intents` + `bundeslaender` + `scopeMatch`, which over-restricts; (c) no always-visible reasoning per card. **Fix: add relevance scoring, broaden fire conditions selectively, ship B.2 reasoning together.** |
| A.6 | Confidence = 86% with empty sections | ✓ | `computeConfidence.ts` weights only fact-quality mix. Doesn't factor section completeness. **Two-factor formula: 65% fact-quality + 35% section completeness.** |
| A.7 | Do Next empty when other state exists | ✓ | `ActionCards` renders recommendations OR an EmptyHint. If `state.recommendations.length === 0` but assumptions or baseline next-steps exist, the card stays empty. **Merge from 3 sources: recommendations + open-items-cast-as-actions + baseline.** |
| A.8 | Legal Landscape rule body is empty bars/dashes | ✓ | `RelevanceBar` is the placeholder. **Replace with plain-language rule-snippet interpretation** + `?` icon → tooltip with formal cite + external public-source link. |
| A.9 | Send to architect is a stub | ✓ | Brief's deferral; minimum viable flow is mailto + share-link copy. |

### Part B — substance pass

| ID | Claim | Notes |
|---|---|---|
| B.1 | Executive Read is recap, not synthesis | ✓ — and **also broken**: the `describeIntent` map uses i18n slugs (`neubau_efh`) but `project.intent` is the DB enum (`neubau_einfamilienhaus`). Fix the map alongside the rewrite. |
| B.2 | Suggestion reasoning hidden | ✓ — add always-visible "Why we think this" sub-line per card; reasoning lives in the data file. |
| B.3 | Legal rule body empty | Same as A.8 — implement together. |
| B.4 | Cost rows + timeline phases lack rationales | ✓ — curate ~15 cost row + ~5 phase rationales. |

### Part C — AEC features

| ID | Claim | Notes |
|---|---|---|
| C.1 | No "since last view" surface | ✓ — `useProjectEvents` already exposes the audit trail; localStorage stores last-view timestamp. |
| C.2 | Risk register missing | ✓ — curate `riskCatalog.ts`; computed risk score from state evidence × catalog impact. |
| C.3 | No calendar math | ✓ — `muenchenAuthorityCalendar.ts` (Christmas closure, summer slowdown) + composer. |
| C.4 | Inspect Data Flow buried | ✓ — promote to per-tab footer link. |
| C.5 | No comparable projects | ✓ — placeholder card only in v1. |

---

## 3. What this saves us — reuse-existing-infra opportunities

Same audit-first dividend as Phase 8. Concrete reuse:

| Need | Existing infra | Saves |
|---|---|---|
| Last-view diff source | `useProjectEvents()` already returns the audit trail with `created_at`, `event_type`, `triggered_by`, `reason` | a new events table + sync logic |
| Confidence breakdown maths | `aggregateQualifiers()` already counts by quality | re-implementing the quality counter |
| Cost engine | `buildCostBreakdown` extends — keep the call signature backward-compatible | a parallel cost stack |
| Suggestion data | `SMART_SUGGESTIONS_MUENCHEN` already has 9 templates with intent/bundesland/scope filters | new templates from scratch (just augment with `category` + `reasoningDe/En`) |
| Phase timeline | hardcoded twice — extracting once also fixes a dedup bug | the brief's `composeTimeline.ts` path |
| Public share link for Send-to-Architect | `useShareLink` / `createShareToken` already work | re-creating the share flow |
| Audit-modal data | the existing `ExpertTab` already renders events + raw state | rebuilding the inspector |

**Pattern reinforcement:** every Phase 8.x sweep should expect 1–2 brief proposals to overlap with existing infra. Audit before building.

---

## 4. Cross-cutting fixes — fix once, propagate

Two fixes in this sweep are cross-cutting and should land **before** the per-bug commits:

1. **Intent-key mismatch in `composeExecutiveRead.describeIntent`.** The map keys (`neubau_efh`, `neubau_mfh`) are i18n slugs, not DB enum values. So every real EFH/MFH project falls through to `sonstige` and the executive read says "Ein Bauvorhaben..." instead of "Ein Neubau eines Einfamilienhauses...". This affects B.1's rewrite — fix the map first.

2. **PHASES const duplicated** in `CostTimelineTab.tsx` and `ProcedureDocumentsTab.tsx`. Extract to `lib/composeTimeline.ts` before A.3, A.4, B.4, C.3 work.

These land as commits 2 + 3 before Part A proper.

---

## 5. File plan

### Create

| Path | For | Purpose |
|---|---|---|
| `src/features/result/lib/composeTimeline.ts` | dedup pre-fix | Single source of truth for procedure phases. |
| `src/features/result/lib/deriveBaselineRoles.ts` | A.1 | Intent + bundesland → baseline `Role[]` with assumed-quality qualifier. |
| `src/features/result/lib/deriveBaselineProcedure.ts` | A.3 | Intent + bundesland → baseline `Procedure[]`. |
| `src/features/result/lib/computeOpenItems.ts` | A.2 | Single open-items selector with topPriority subset. |
| `src/features/result/lib/computeSectionCompleteness.ts` | A.6 | 6 booleans + percentage; consumed by `computeConfidence` and Header tooltip. |
| `src/features/result/lib/composeDoNext.ts` | A.7 | Merge recommendations + topPriority openItems + baseline next-steps. |
| `src/features/result/lib/composeRisks.ts` | C.2 | Score risks from state evidence × catalog impact. |
| `src/features/result/lib/composeCalendar.ts` | C.3 | Today + procedure duration + closure windows → calendar prose. |
| `src/features/result/lib/composeLastViewedDiff.ts` | C.1 | Diff between current state + events vs last-view timestamp. |
| `src/features/result/hooks/useResolvedRoles.ts` | A.1 | Memoized selector — persona roles or baseline. |
| `src/features/result/hooks/useResolvedProcedures.ts` | A.3 | Same pattern for procedures. |
| `src/features/result/hooks/useLastViewed.ts` | C.1 | localStorage read/write of last-view timestamp. |
| `src/features/result/components/Cards/RiskRegisterCard.tsx` | C.2 | 4th overview action card. |
| `src/features/result/components/Cards/SinceLastViewPill.tsx` | C.1 | Below-breadcrumb pill. |
| `src/features/result/components/Cards/ComparableProjectsSlot.tsx` | C.5 | Footer placeholder card. |
| `src/features/result/components/SendToArchitectModal.tsx` | A.9 | mailto + share-link copy modal. |
| `src/features/result/components/InspectDataFlowModal.tsx` | C.4 | Per-tab modal version of the expert view. |
| `src/data/legalRuleSnippets.ts` | A.8 | ~20 plain-language rule interpretations. |
| `src/data/riskCatalog.ts` | C.2 | ~10 risks with un-risk notes. |
| `src/data/costRationales.ts` | B.4 | ~5 cost row rationales. |
| `src/data/timelineAnnotations.ts` | B.4 | 5 phase annotations. |
| `src/data/muenchenAuthorityCalendar.ts` | C.3 | Closure windows for München Bauamt. |

### Modify

| Path | For |
|---|---|
| `src/features/result/lib/composeExecutiveRead.ts` | B.1 (synthesis) + intent-key fix |
| `src/features/result/lib/computeConfidence.ts` | A.6 (two-factor) |
| `src/features/result/lib/costNormsMuenchen.ts` | A.4 (extended `buildCostBreakdown`) |
| `src/features/result/lib/smartSuggestionsMatcher.ts` | A.5 (relevance scoring) |
| `src/data/smartSuggestionsMuenchen.ts` | A.5 + B.2 (add `category`, `reasoningDe`, `reasoningEn` per template) |
| `src/features/result/components/tabs/CostTimelineTab.tsx` | Use composeTimeline; A.4 row rationales; C.3 calendar |
| `src/features/result/components/tabs/ProcedureDocumentsTab.tsx` | Use composeTimeline; A.3 baseline procedure |
| `src/features/result/components/tabs/LegalLandscapeTab.tsx` | A.8 + B.3 |
| `src/features/result/components/tabs/TeamTab.tsx` | A.1 |
| `src/features/result/components/tabs/SuggestionsTab.tsx` | A.5 + B.2 |
| `src/features/result/components/Cards/AtAGlance.tsx` | A.1 + A.2 |
| `src/features/result/components/Cards/ActionCards.tsx` | A.2 + A.7 + 4-card grid for C.2 |
| `src/features/result/components/Cards/SuggestionCard.tsx` | B.2 |
| `src/features/result/components/ResultHeader.tsx` | C.1 + A.6 |
| `src/features/result/components/ResultFooter.tsx` | A.9 |
| `src/features/result/components/ResultWorkspace.tsx` | C.4 (per-tab inspect link) |
| `src/locales/de.json` + `en.json` | B + C strings |

---

## 6. Commit sequence

Target ~20 commits. Ordering enforces "fix cross-cutting first, ship per-bug after."

| # | Commit | Phase |
|---|---|---|
| 1 | docs(phase-8.1): findings | this file |
| 2 | fix(result): intent-key mismatch in describeIntent | cross-cutting (B.1 prep) |
| 3 | refactor(result): extract composeTimeline (single source of truth) | dedup pre-fix |
| 4 | feat(result): deriveBaselineRoles + useResolvedRoles selector | A.1 |
| 5 | feat(result): deriveBaselineProcedure + useResolvedProcedures selector | A.3 |
| 6 | feat(result): computeOpenItems + "top N of M" verify card | A.2 |
| 7 | refactor(result): cost engine accepts area + Honorarzone + region inputs | A.4 |
| 8 | feat(result): two-factor confidence + breakdown tooltip | A.6 — STATUS PING |
| 9 | feat(result): composeDoNext merges 3 sources | A.7 |
| 10 | feat(result): legalRuleSnippets + plain-language interpretations | A.8 |
| 11 | feat(result): suggestions relevance scoring + always-visible reasoning | A.5 + B.2 |
| 12 | feat(result): SendToArchitectModal (mailto + copy share link) | A.9 |
| 13 | feat(result): executive read synthesis rewrite (3 paragraphs) | B.1 — STATUS PING |
| 14 | feat(result): cost row + timeline phase rationales | B.4 |
| 15 | feat(result): risk register card | C.2 |
| 16 | feat(result): calendar math row | C.3 |
| 17 | feat(result): since-last-view pill + diff modal | C.1 |
| 18 | feat(result): inspect data flow per-tab modal + bottom link | C.4 — STATUS PING |
| 19 | feat(result): comparable projects slot | C.5 |
| 20 | chore(result): final verify + push | — |

Status pings at commits 8, 13, 18.

Render-gate: every visual commit either ships a screenshot or `[render-check-deferred]` in the body.

---

## 7. Out of scope (acknowledged)

- Server-side `last_viewed_at` table — localStorage in v1 per brief.
- Real architect email send — `mailto:` only per A.9.
- Real comparable-project data — placeholder card per C.5.
- Persona-emitted suggestion categories — derived client-side per the existing pattern.
- LLM-regenerated executive read — template-driven synthesis per brief §13 of Phase 8.

---

End of findings.
