# Phase 8 — The Result Workspace · Findings

**HEAD at audit:** `7fd5539 chore: Phase 7.10 pre-merge audit + delete 4 orphan chamber files`
**Goal:** rebuild `/projects/:id/result` as a tabbed living workspace; absorb `/overview`; reuse existing infra wherever it already exists.

The audit follows the 7.6 → 7.10 protocol: enumerate findings before fixing, fix, then merge. This file is commit 1 of the 13-commit sweep.

---

## 1. Brief vs. reality — three deltas resolved

The brief was written without filesystem visibility. Three of its proposals were already built. **All three resolutions are user-confirmed in the kickoff turn — the existing infra wins.**

| Brief proposal | Reality | Resolution |
|---|---|---|
| §5.1 — new `result_shares` table | `project_share_tokens` (migration 0006) + edge fns `create-share-token` + `get-shared-project` + `useSharedProject` hook + `/result/share/:token` route already shipping | **Reuse**. No migration. |
| §5.3 — verify or build PDF | `chat/lib/exportPdf.ts` (340-line full-briefing pdf-lib renderer) + `result/lib/exportChecklistPdf.ts` (focused checklist) already shipping. Brand fonts pre-loaded via `fontLoader.ts`. | **Extend, don't replace**. Wire the existing `buildExportPdf` into the new ExportMenu. |
| §5.2 — extend `ProjectState` with `Suggestion[]` | `SmartSuggestions.tsx` + `smartSuggestionsMatcher.ts` + `data/smartSuggestionsMuenchen.ts` already match suggestions from intent / bundesland / scope regex; persona prompt untouched. | **Reuse**. No schema bump. Adapt the Tab 6 card design to the matcher's output shape. |

The brief also proposed `?share=token` query form — the existing path-form `/result/share/:token` is the truth. **Keep path form** (user-confirmed).

---

## 2. What this saves us

The audit-first protocol exists for moments like this. Concrete savings vs. a from-scratch implementation of the brief:

- **Reusing `project_share_tokens` saves**: a new migration, RLS policy authoring, token-collision handling, expiry-cleanup logic, owner-only revocation policy, anonymous-read edge function, and `useSharedProject`-equivalent hook. ~150 LOC + one Supabase deploy.
- **Reusing `SmartSuggestions` matcher saves**: the `Suggestion[]` schema migration on `ProjectState`, persona-prompt extension to emit suggestions, Zod tool schema bump, and the v1 5–8 hand-coded templates (the existing `SMART_SUGGESTIONS_MUENCHEN` data file already covers the corpus). ~200 LOC + zero touch to the locked persona/data layer.
- **Extending `exportPdf.ts` saves**: a second PDF stack, second brand-font load path, second WinAnsi unicode-sanitisation routine, and a parallel testing surface. ~400 LOC + bundle savings (avoiding two pdf-lib copies via dynamic import).
- **Reusing existing `result.*` locale namespace saves**: ~80 keys × 2 languages of duplicate translation work. New keys go under `result.workspace.*`; legacy `result.cover.*` / `result.verdict.*` etc. survive until the section's component is deleted in commit 13.
- **Reusing `BlueprintSubstrate` + `pm-*` tokens + `font-serif italic` Georgia + clay/ink/paper palette** saves the entire visual-language re-derivation. The atelier register is already in CSS variables; we only restructure layout.

Pattern reinforcement for future phases: **before proposing new tables, components, or schema fields, search the tree for existing equivalents.**

---

## 3. The mapping — 12 static sections → 6 tabs

The current `/result` page composes these sections sequentially in `ResultPage.tsx`:

| # | Static section | Component | Destination in v8 |
|---|---|---|---|
| I | Cover hero | `CoverHero.tsx` | **Drop**. New `ResultHeader` is text-only sticky band. CoverHero illustration (axonometric + scale bar) → keep in PDF only. |
| II | Verdict (Verfahren) | `VerdictSection.tsx` | **Salvage** the procedure-pick + rationale + DeterminingFactorsList → Tab 1 Overview executive read + Tab 3 Procedure pick card. |
| III | Top 3 next steps | `TopThreeHero.tsx` | **Salvage** the recommendation rendering + `Begonnen` flag → Tab 1 Overview "Do next" action card. Hero treatment shrinks to fit card. |
| IV | Legal landscape | `LegalLandscape.tsx` | **Promote whole component** → Tab 2. Already has A/B/C domain bands + citation expansion + heuristic composition. Just unwrap section chrome. |
| V | Document checklist (kanban) | `DocumentChecklist.tsx` | **Promote whole component** → Tab 3 second sub-section. Kanban + PDF link both stay. |
| VI | Specialists required | `SpecialistsRequired.tsx` | **Promote whole component** → Tab 4. Adds a Stakeholders section below it. |
| VII | Cost & timeline | `CostTimelinePanel.tsx` | **Promote whole component** → Tab 5. Already has phases + cost breakdown + ±25% confidence note. |
| VIII | Risk flags | `RiskFlags.tsx` | **Salvage** ANNAHME items + resolve drawer → Tab 1 Overview "Verify with architect" card (top 3–5). Drawer stays. |
| IX | Confidence dashboard | `ConfidenceDashboard.tsx` | **Salvage** the `aggregateQualifiers` engine → Tab 1 Overview Data Quality donut card (smaller, 50px instead of 240px). Full radial → expert-mode tab. |
| X | Conversation appendix | `ConversationAppendix.tsx` | **Drop from page**. Surface only in PDF + JSON exports. |
| XI | Smart suggestions | `SmartSuggestions.tsx` | **Promote whole component** → Tab 6, with adapted card layout (matcher output shape rules). |
| XII | Export hub | `ExportHub.tsx` | **Salvage** the engine + share-link UI → new `ResultFooter` + `ExportMenu`. Inline section vanishes. |

The 8 cockpit tabs from `chat/pages/OverviewPage.tsx` map as:

| Cockpit tab | v8 destination |
|---|---|
| project (meta) | Tab 1 Overview header band + At-a-glance |
| facts (Daten) | Tab 1 At-a-glance top facts + Tab 2 Legal rule rows. **No standalone Facts tab.** |
| areas (Bereiche) | Tab 2 Legal landscape domain status |
| procedures | Tab 3 Procedure pick |
| documents | Tab 3 Documents grid |
| roles | Tab 4 Team |
| recommendations | Tab 1 Do-next + Tab 6 Suggestions |
| audit | **Expert mode only** (`?expert=true` 7th tab + footer overflow link "Inspect data flow / Datenfluss prüfen"). Not on the casual surface. Included in PDF/JSON exports. |

`/projects/:id/overview` redirects to `/projects/:id/result?tab=overview`.

---

## 4. File plan

### 4.1. Create

| Path | Purpose |
|---|---|
| `src/features/result/components/ResultWorkspace.tsx` | Top-level page; mounts header + tabs + body + footer; replaces `ResultPage`'s body. |
| `src/features/result/components/ResultHeader.tsx` | Sticky top band — breadcrumb, title, plot, confidence%, back-pill. |
| `src/features/result/components/ResultTabs.tsx` | Tab bar with URL-synced state; supports 6 base tabs + 7th expert tab. |
| `src/features/result/components/ResultFooter.tsx` | Sticky bottom action bar; wraps ExportMenu. |
| `src/features/result/components/ExportMenu.tsx` | "Take it home" dropdown + footer button row; reuses ExportHub engine. |
| `src/features/result/components/ShareLinkBuilder.tsx` | Footer subcomponent; thin wrapper over `createShareToken` + clipboard + toast. |
| `src/features/result/components/tabs/OverviewTab.tsx` | Tab 1 — executive read + at-a-glance + 3 action cards. |
| `src/features/result/components/tabs/LegalLandscapeTab.tsx` | Tab 2 — wraps `LegalLandscape` minus section chrome. |
| `src/features/result/components/tabs/ProcedureDocumentsTab.tsx` | Tab 3 — procedure pick + documents grid + timeline. |
| `src/features/result/components/tabs/TeamTab.tsx` | Tab 4 — wraps `SpecialistsRequired` + stakeholders. |
| `src/features/result/components/tabs/CostTimelineTab.tsx` | Tab 5 — wraps `CostTimelinePanel`. |
| `src/features/result/components/tabs/SuggestionsTab.tsx` | Tab 6 — adapted suggestion cards from `pickSmartSuggestions`. |
| `src/features/result/components/tabs/ExpertTab.tsx` | Hidden 7th tab — audit log + raw state JSON; gated by `?expert=true`. |
| `src/features/result/components/Cards/ExecutiveRead.tsx` | OverviewTab subcomponent — `composeExecutiveRead` consumer. |
| `src/features/result/components/Cards/AtAGlance.tsx` | OverviewTab subcomponent — 6-row stat grid. |
| `src/features/result/components/Cards/ActionCards.tsx` | OverviewTab subcomponent — 3-card row (DoNext / Verify / DataQuality). |
| `src/features/result/components/Cards/DataQualityDonut.tsx` | Small (50px) donut for the action card; reuses `aggregateQualifiers`. |
| `src/features/result/components/Cards/SuggestionCard.tsx` | SuggestionsTab subcomponent. |
| `src/features/result/lib/composeExecutiveRead.ts` | Pure helper, locale-aware paragraph composer. |
| `src/features/result/lib/computeConfidence.ts` | Pure helper for header confidence%. |
| `src/features/result/hooks/useTabState.ts` | URL-synced tab state via `useSearchParams`. |
| `src/features/result/hooks/useResultData.ts` | Aggregator over `useProject` + `useMessages` + `useProjectEvents`. |

### 4.2. Modify

| Path | Change |
|---|---|
| `src/app/router.tsx` | Replace `/projects/:id/result` body with `<ResultWorkspace>`; add redirect from `/projects/:id/overview` → `/projects/:id/result?tab=overview`. |
| `src/features/result/pages/ResultPage.tsx` | Delete the static-section composition; delegate to `<ResultWorkspace>` for owned mode and re-export `ResultPageBody` shape for `SharedResultPage`. |
| `src/features/result/pages/SharedResultPage.tsx` | No content change — still calls `ResultPageBody` with `source.kind === 'shared'`. Workspace gates affordances on source.kind. |
| `src/locales/de.json` + `en.json` | Add `result.workspace.*` namespace (header / tabs / exec / ataglance / actions / footer / share / suggestions card / expert). Existing `result.*` keys stay until the section's owning component is deleted in commit 13. |

### 4.3. Delete (commit 13, after audits land)

These have callers right now and will be detached as the workspace absorbs their content:

| File | Detach trigger |
|---|---|
| `src/features/result/components/CoverHero.tsx` | Workspace ResultHeader replaces it; PDF still uses CoverHero-equivalent. |
| `src/features/result/components/IntentAxonometricXL.tsx` | Only used by CoverHero. PDF imports its own copy (or we keep this as PDF-only). Decide at commit 13 whether the SVG belongs in the page or in `lib/pdfAssets/`. |
| `src/features/result/components/ConversationAppendix.tsx` | Workspace drops it; PDF/JSON exports still surface the conversation. |
| `src/features/result/pages/ResultPage.tsx` (sequential body) | Replaced by `<ResultWorkspace>`. **Keep file** as the route entry; replace its body. |
| `src/features/chat/pages/OverviewPage.tsx` | Redirected. The cockpit tabs' tab data lives in the workspace's tabs + the expert tab. |

Cockpit components (`Cockpit/CockpitHeader`, `CockpitTabs`, `CockpitTable`, `EditableCell`, `QualifierBadge`, `StatusPill`, `saveFact`) — **review case-by-case in commit 13**. `EditableCell` and `saveFact` are likely needed by the expert tab. `CockpitTabs` is replaced by the new `ResultTabs`. `StatusPill` may be reusable in the new Procedure/Documents tab.

`IntentAxonometricXL`, `RoleGlyphs*`, `CircledNumeral`, `ConfidenceRadial` — keep; smaller surfaces still call into them or PDF does.

---

## 5. Computed values

| Helper | Source | Rule |
|---|---|---|
| `computeConfidence(state)` | `state.facts.qualifier.quality` mix | DECIDED+VERIFIED weight 1.0; CALCULATED 0.85; ASSUMED 0.4. Total normalised, rounded to integer 0–100. Returns 0 on empty. |
| `composeExecutiveRead(state, locale, project)` | facts/areas/procedures/recommendations/documents | 2–3 paragraphs of natural-language synthesis from locale templates with `${slot}` interpolation. No LLM call. |
| `composeCostRange` | reuse `costNormsMuenchen.ts` `buildCostBreakdown` | Already exists — return `cost.total` for header + per-role bars. |
| `composeTimeline` | static phase weights from `CostTimelinePanel` | Already exists in component — extract to `lib/composeTimeline.ts`. |
| `pickSmartSuggestions` | reuse from `smartSuggestionsMatcher.ts` | Already filters by intent/bundesland/scope/dedup. Tab 6 consumes directly. |
| Open-questions count | `state.facts.filter(quality === 'ASSUMED').length + areas.{A,B,C}.state === 'PENDING'` | Inline. |
| Specialists count | `state.roles.filter(needed === true).length` | Inline. |

---

## 6. Render-gate plan

Every visual commit (2–13) gets a screenshot or `[render-check-deferred]` in the body. Commit 1 (this doc) is doc-only, no screenshot.

Status pings to the user: after commit 5 (Overview tab live) and commit 10 (all 6 tabs live).

---

## 7. Out of scope (deferred / acknowledged)

- Designer / Engineer / Authority role surfaces — workspace already gates on `source.kind === 'shared'`; future role gates plug into the same component prop.
- Real architect-finder integration — Tab 4 stub only.
- Persona-emitted suggestions — system-driven matcher only (already shipped).
- LLM regeneration of executive read — template composition only.
- Real cost API — `costNormsMuenchen.ts` heuristic only (already shipped).
- Real-time collaboration on shares — read-only links only (already shipped).
- Mobile native app — responsive web only.

---

End of findings.
