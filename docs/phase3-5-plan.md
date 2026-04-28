# Phase 3.5 — PLAN.md

> **Disposition:** uncommitted while Rutik reviews. Moves to `docs/phase3-5-plan.md` in the final commit (#66).
>
> **Status:** Pre-flight survey done (routing, ProjectGuard, schema, all reusable components, export module, edge functions, locale structure all read live). References scanned for what to take from each. Awaiting Rutik's sign-off on §6 questions before commit #60.
>
> **One sentence:** the Result Page is the largest and highest-stakes single batch in Phase 3 — twelve sections, the one new permitted primitive (confidence radial), a print stylesheet, a share-token system with public route, and a single bar that decides whether the whole product earns its keep ("would a serious German Bauherr print, share, or frame this within 30 seconds of opening it?").

---

## 1 · Pre-flight findings

### 1a — All major chat components are reusable verbatim

Survey confirmed: `IntentAxonometric`, `BereichePlanSection`, `NorthArrow`, `BinderTabStrip`, `AuditTimeline`, `Top3`, `ScheduleSection`/`ScheduleRow`, all 7 `SpecialistSigils` — every one takes either no props or pure data props, with no chatStore dependency. **The result page is largely composition, not invention.** The disciplined consequence: the only NEW visual work that must ship is (a) the cover-hero composition + animations, (b) the upgraded XL axonometric for the cover, (c) custom circled numerals (① ② ③) for Top-3 hero, (d) hatched-band relevance map (extends BereichePlanSection's hatch patterns), (e) custom checkbox SVGs, (f) 6–8 new role sigils for Section VI, (g) the confidence radial (the one permitted primitive). Everything else assembles from existing parts.

### 1b — Schema gap: effort + responsible-party on recommendations

The brief's Top-3 hero treatment (Section III) shows "Geschätzter Aufwand: 1–3 Werktage · Verantwortlich: Bauherr" per recommendation. Today the `respond` tool schema's `recommendations_delta` carries `id, rank, title_de/en, detail_de/en, ctaLabel_de/en` — no effort, no owner. **The brief proposes an extra Anthropic call per recommendation** ("a small post-processing model call") to derive these fields. I'd push back: extra calls cost money, latency, and complexity. **Recommended alternative — extend the existing `respond` tool with two optional fields per recommendation upsert:**

```ts
recommendation_delta upsert: {
  id, rank, title_de, ..., ctaLabel_de,
  estimated_effort?: enum '1d' | '1-3d' | '1w' | '2-4w' | 'months'
  responsible_party?: enum 'bauherr' | 'architekt' | 'fachplaner' | 'bauamt'
}
```

Same model call, full context, zero extra latency. Recommendations without these fields render with a calm `—` placeholder, so retroactive on existing rows is graceful. **See Q1.**

### 1c — Recommendations also lack a qualifier

Survey caught a long-standing gap: `recommendations` carries no `qualifier {source, quality}` field, while `procedures`, `documents`, `roles`, and `facts` all do. The result page's Section IX (confidence radial) wants to aggregate qualifier counts across the whole project state — recommendations being qualifier-less is a hole. **Add an optional `qualifier?: { source, quality }` to the recommendations upsert** in the same migration as 1b. Both fields are optional; the model can populate them as it gains confidence. **See Q2.**

### 1d — `ProjectGuard` doesn't have a token-bypass mode

Currently `ProjectGuard` (`src/components/shared/ProjectGuard.tsx`) checks `project.owner_id === user.id` and renders `ProjectNotFound` on mismatch. The public share route at `/result/share/:token` has no authenticated user. **Strategy:** add a new `<TokenGuard token={token}>{children}</TokenGuard>` component that calls a new public Edge Function (`get-shared-project`) which validates the token server-side and returns the project shape. The result page, when mounted under `TokenGuard`, reads from the token-fetched data rather than from `useProject()`. Both contexts ultimately render the same `<ResultPage />` body — only the data source differs. **See Q3.**

### 1e — No print stylesheet exists

`src/styles/globals.css` has zero `@media print` rules today. Phase 3.5 #65 adds them — and they apply to the result page surface only (other pages like chat workspace shouldn't accidentally print "atelier" register on Cmd+P). **Recommended approach:** scope the print rules to a `[data-print-target="result-page"]` attribute on the result page root. Outside that root, an explicit `@media print { display: none }` on chrome (LeftRail, RightRail, navigation) keeps the rest of the product print-clean by default.

### 1f — No share-token table; new edge function needed

Migration 0006 adds `project_share_tokens (id, project_id, token, created_by, created_at, expires_at, revoked_at)`. Two new edge functions:

- `create-share-token` (authenticated): caller is the project owner; generates a 32-byte random token, inserts row, returns `{ token, url, expiresAt }`
- `get-shared-project` (anon): caller posts `{ token }`; function validates `expires_at > now() AND revoked_at IS NULL`, then queries projects + messages + events with service role and returns the shape the result page expects

**See Q4** — Edge function vs RLS-policy approach for the shared route.

### 1g — Role glyphs don't exist; need 6–8 new sigils

Section VI ("Das Team") wants role glyphs for Architekt, Tragwerksplaner, Energieberater, Vermesser, Brandschutzplaner, Bauamt, optionally Sachverständige. The 7 existing sigils in `SpecialistSigils.tsx` are domain-of-conversation glyphs (moderator, planungsrecht, etc.) — not role-of-person glyphs. **Recommended:** new file `src/features/result/components/RoleGlyphs.tsx` with 6 new 14×14 SVG glyphs, same hand-drawn-feeling baked-imperfection technique as the sigils. **See Q5** — gate count.

### 1h — Cover hero animation choreography is its own design problem

Brief asks for: (a) paper card fades in 320ms, (b) NorthArrow draws via stroke-dashoffset 1.6s, (c) typography 80ms-staggered fade-up per line, (d) axonometric draws line-by-line over 2.4s, (e) scale bar last. **One animation, runs ONCE per session.** Need a session-scoped flag (sessionStorage `pm-result-cover-animated-{projectId}=1`) so subsequent visits render statically. Reduced-motion: everything appears instantly.

The XL cover-hero axonometric (~480×320) needs to be a *separately drawn* component — `IntentAxonometric` is sized for the right rail at 240×160; just upscaling produces hairline-stroke aliasing. Recommend a new `IntentAxonometricXL` that re-uses the same path data but at the larger viewBox + thicker 1.25px stroke. **See Q6.**

### 1i — Document number generation

Spec says `Atelier-Briefing No. PM-2026-XXX` from project id. Recommend: `pm-${first-8-chars-of-uuid}` rendered uppercase, e.g. `PM-A3F2-91C7` (4-4 split for readability). Locale-independent; deterministic.

### 1j — Cost calculation: pure lookup, no model

The brief flags this as "a small client-side helper that takes procedure.type, building.gebaeudeklasse, floor area". For v1 this is a JSON file (`src/data/costNormsBayern.ts`) with HOAI-derived ranges per procedure × class. Confidence interval is fixed at `±25%` and rendered in the section copy. No external API. The model never produces these numbers (we don't want it to invent costs). The user is told explicitly these are orientation values.

---

## 2 · Vocabulary inheritance + the one permitted new primitive

The atelier vocabulary is fully locked across 3.2 / 3.3 / 3.4. Phase 3.5 reuses everything:

| Element | Source | Use on Result Page |
|---|---|---|
| Paper grain (`globals.css`) | #35 | Layered on result-page body |
| Blueprint substrate (shared) | #35, #48 | Behind cover hero + every section |
| Drafting-blue accent | tokens (#35) | Axonometric, north arrow, hatched bands, confidence radial slices |
| OpenType stack (ss01, cv05, case, calt) | body (#36) | Already inherited |
| Roman numerals I–XII | left rail #41, binder #44, schedule #40 | Section anchors |
| Hairline rules (0.5/1/2 px) | various | Section dividers, schedule blocks |
| Axonometric drawings | `IntentAxonometric` (#40) | Cover hero (upgraded XL variant) |
| Hatched bands | `BereichePlanSection` (#40) | Section IV's legal-landscape relevance map |
| Schedule blocks | `ScheduleSection`/`Row` (#40) | Sections III, V, VI, VII, X |
| Italic Serif running heads | `globals.css` (#36) | Section sub copy, qualifier badges |
| North arrow rosette | `NorthArrow` (#37) | Cover hero top-right |
| Title-block convention | `TitleBlock` / `WizardTitleBlock` | Section headers |
| Octagonal stamp (-8°) | `CompletionInterstitial` (#43) | NOT reused (kept exclusive to completion notices) |
| Specialist sigils | `SpecialistSigils` (#38) | Section X (conversation appendix) |
| Confidence radial | **NEW (Section IX, this batch)** | The one permitted new primitive |

### The one new primitive

A **confidence radial**: 240×240 SVG doughnut chart showing project-wide qualifier breakdown (DECIDED / CALCULATED / VERIFIED / ASSUMED). Slice colors all from the locked palette — ink (DECIDED), drafting-blue/60 (CALCULATED + VERIFIED), clay (ASSUMED), ink/30 (other). 1px paper-color stroke between slices for separation. Centre Inter 11 clay tracking eyebrow + Instrument Serif italic 14 ink ("52 Datenpunkte"). Reduced-motion: no entrance animation. Used **once on the result page only**; not re-purposed elsewhere.

**Two small visual additions** that are NOT new primitives but stretches of existing vocabulary:

- Custom circled numerals `① ② ③` for Top-3 hero (28×28 SVG, italic-Serif numeral inside a hand-drawn circle with baked-imperfection technique). Spec is explicit: "NOT a Unicode glyph — match the hand-drawn aesthetic."
- Custom checkbox SVG (square paper-tab with optional clay checkmark inside, ~16×16). Replaces native `<input type="checkbox">` on the document checklist.

Neither introduces new color or new motion language — they're just SVG variants of existing brand vocabulary.

**Things I will NOT introduce** (push back here if you disagree):

- New illustration tradition (no hand-painted heroes, no pictogram sets beyond the role sigils)
- New typography scale steps (existing Inter + Instrument Serif sizes cover everything)
- New animation principles (the four shipped cover all 3.5 needs; cover-hero choreography composes them)
- New colors

---

## 3 · The seven commits

### Commit #60 · `feat(result): route + cover hero + verdict section`

**Files**

- `src/app/router.tsx` — add `/projects/:id/result` (protected, ProjectGuard-wrapped); `/result/share/:token` lands in #65
- `src/features/result/pages/ResultPage.tsx` — new top-level page
- `src/features/result/components/CoverHero.tsx` — Section I composition with all animations
- `src/features/result/components/IntentAxonometricXL.tsx` — upgraded 480×320 axonometric variant
- `src/features/result/components/VerdictSection.tsx` — Section II
- `src/features/result/lib/documentNumber.ts` — `buildDocumentNumber(projectId)`
- `src/features/result/lib/sessionAnimationFlag.ts` — sessionStorage helper for one-time cover animation
- `src/locales/{de,en}.json` — new top-level `result` block

**Behaviour**

- ResultPage queries useProject + useMessages + useProjectEvents + uses i18n locale to render
- CoverHero animation choreography (paper card 320ms → north arrow 1.6s → typography 80ms-staggered → axonometric draw-in 2.4s → scale bar 200ms) runs once per session via sessionStorage flag
- Reduced-motion: everything renders instantly
- Page title: `Briefing · {project name} · Planning Matrix`

**Verdict (Section II)**

- Reads `state.procedures` for the highest-priority procedure (status `erforderlich`); renders procedure title + article reference (`nach Art. 58 BayBO`)
- Below: determining-factors sentence pulled from procedure's `rationale_de/en` + state.facts where `qualifier.source === 'LEGAL'`
- Inline confidence radial (small 64×64 variant) stub. The full 240×240 radial lands in #63.
- Edge case: no procedures yet → calm interstitial "Die Einordnung erfordert weitere Angaben…" with CTA back to `/projects/:id`

---

### Commit #61 · `feat(result): top 3 hero + legal landscape`

**Files**

- `src/features/result/components/TopThreeHero.tsx` — Section III hero treatment
- `src/features/result/components/CircledNumeral.tsx` — custom ①②③ SVG (3 variants)
- `src/features/result/components/LegalLandscape.tsx` — Section IV
- `src/features/result/lib/legalCitations.ts` — static lookup mapping common articles to public source URLs
- `supabase/migrations/0006_recommendations_metadata.sql` — extends recommendations JSON with optional `estimated_effort`, `responsible_party`, `qualifier` (no schema change to messages — recommendations live in `projects.state` JSONB)
- `supabase/functions/chat-turn/toolSchema.ts` — extend recommendation upsert
- `src/types/respondTool.ts` — Zod schema mirror
- `supabase/functions/chat-turn/systemPrompt.ts` — persona instr appended for the new fields
- `src/types/projectState.ts` — type extensions

**Behaviour**

- Top-3 hero: each rec gets a HUGE custom SVG numeral (28×28 hand-drawn circle with italic Serif numeral inside) + Instrument Serif 36 title + Inter 16 detail + two meta lines (effort + owner) at bottom in Inter 12 tracking-`[0.18em]` uppercase clay labels with Inter 13 ink/85 values
- Effort + owner come straight from the extended recommendation row when present; otherwise rendered as `—` (graceful for legacy rows)
- "Weitere Empfehlungen" `<details>` accordion below holds ranks 4-12

**Legal landscape (Section IV)**

- Three domain bands (A · PLANUNGSRECHT, B · BAUORDNUNGSRECHT, C · SONSTIGE VORGABEN), each ~120px tall
- Inside each: rows for each cited article/regulation in the project's facts/procedures, with hatched-bar relevance (full clay = HOCH, half = TEILWEISE, empty = NICHT) and right-side status text
- Click a row → small popover with article excerpt + link to gesetze-im-internet.de or Bayern law portal (`legalCitations.ts` lookup)
- Domain header row: Inter 12 0.20em uppercase clay (left) + relevance pill (right): HOCH RELEVANT / TEILRELEVANT / NICHT RELEVANT

**Migration 0006**

The `projects.state` is a JSONB blob; recommendations live inside it. **No schema migration is strictly required** — adding optional fields to the JSON shape is forward-compatible. The "migration file" is a no-op marker that exists only for documentation/sequencing. Alternative: skip the migration entirely. **See Q7.**

---

### Commit #62 · `feat(result): document checklist + specialists section`

**Files**

- `src/features/result/components/DocumentChecklist.tsx` — Section V
- `src/features/result/components/PaperCheckbox.tsx` — custom 16×16 SVG checkbox (square paper-tab + optional clay checkmark)
- `src/features/result/lib/hoaiPhases.ts` — maps document type keywords to LP 1-9 phases
- `src/features/result/lib/checklistStorage.ts` — localStorage `pm-doc-{projectId}-{docId}` boolean
- `src/features/result/lib/exportChecklistPdf.ts` — focused PDF (one page, just the checklist) reusing `pdf-lib` infrastructure
- `src/features/result/components/SpecialistsRequired.tsx` — Section VI
- `src/features/result/components/RoleGlyphs.tsx` — 6 new sigils: Architekt, Tragwerksplaner, Energieberater, Vermesser, Brandschutzplaner, Bauamt
- `src/features/result/lib/roleEffortLookup.ts` — typical hour ranges per role per project class

**Behaviour**

- Documents grouped by HOAI phase (LP 1-9) using `hoaiPhases.ts` heuristic mapping; LP labels render as italic Serif clay-deep
- Each doc as paper-card with `<PaperCheckbox>`, title in Inter 15 medium, info line ("Wer erstellt? Vermesser:in") + status pill in Inter 12 italic clay
- Checkbox toggles localStorage state per (project, doc) — persists across reload
- "Checkliste als PDF herunterladen" link triggers `exportChecklistPdf` (one-page A4)
- Specialists section reads `state.roles`; each role gets matching glyph from `RoleGlyphs.tsx` (or fallback ⛒ stub if unknown), Inter 14 0.20em title, Inter 12 italic clay qualification line, Inter 14 description, Inter 12 effort estimate from `roleEffortLookup.ts`

---

### Commit #63 · `feat(result): cost & timeline + risk flags + confidence radial`

**Files**

- `src/features/result/components/CostTimelinePanel.tsx` — Section VII
- `src/features/result/lib/costNormsBayern.ts` — HOAI-derived cost ranges per (procedure_type × gebaeudeklasse)
- `src/features/result/components/RiskFlags.tsx` — Section VIII
- `src/features/result/components/ConfidenceDashboard.tsx` — Section IX
- `src/features/result/components/ConfidenceRadial.tsx` — **the one new primitive**, 240×240 doughnut SVG
- `src/features/result/lib/qualifierAggregate.ts` — counts qualifier sources/qualities across project state

**Behaviour — Cost & Timeline (VII)**

- Timeline as horizontal bar chart with hatched bands per phase (Vorbereitung / Einreichung / Prüfung / Korrekturen) — reuses BereichePlanSection's hatch patterns
- Cost ranges as a paper-card schedule with right-aligned numerals (Inter `tnum`)
- Hard-coded `±25 %` confidence interval rendered in the section's italic Serif clay sub
- "Diese Werte sind Orientierungswerte basierend auf typischen Bayern-Honoraren…" footer — never quotes a single number

**Risk flags (VIII)**

- Aggregates: state.facts where `qualifier.quality === 'ASSUMED'` + procedures/documents/roles where status implies caveats + recommendations where detail contains explicit warning patterns
- Each as paper-card with hand-drawn `△` glyph (drafting-blue/60), Inter 11 0.20em uppercase clay tag, Inter 14 ink/85 body
- Tag taxonomy: `ANNAHME · NICHT VERIFIZIERT` / `HINWEIS` / `WICHTIG ZU PRÜFEN`

**Confidence radial (IX) — THE NEW PRIMITIVE**

- 240×240 doughnut SVG, paper-color outer ring (separates slices)
- Slices ordered by count, colors: ink (DECIDED), drafting-blue/60 (CALCULATED + VERIFIED), clay (ASSUMED), ink/30 (other/unknown)
- Centre Inter 11 0.22em uppercase clay number ("52") + Instrument Serif italic 14 ink "Datenpunkte"
- Below: hatched-square legend with each slice's pattern + count percentage
- Footer: italic Serif clay "13 davon als Annahme markiert" + "Annahmen werden in der Beratung mit Architekt:in verifiziert."
- Reduced-motion: instant render, no entrance animation

---

### Commit #64 · `feat(result): conversation appendix + smart suggestions + export hub`

**Files**

- `src/features/result/components/ConversationAppendix.tsx` — Section X (collapsed by default)
- `src/features/result/components/SmartSuggestions.tsx` — Section XI
- `src/data/smartSuggestionsBayern.ts` — static lookup (intent × bundesland × scope keywords) → 3-5 suggestions
- `src/features/result/components/ExportHub.tsx` — Section XII
- `src/features/result/lib/smartSuggestionsMatcher.ts` — composes suggestions from project state

**Behaviour — Conversation appendix (X)**

- Closed `<details>` by default. Inside: every assistant + user message in compact form (specialist tag + role label + timestamp + body)
- User messages right-aligned smaller cards (reuses `MessageUser` styling at smaller scale)
- Specialist handoffs marked with hairline rules
- Browser-native Cmd+F searchable

**Smart suggestions (XI)**

- 3-5 generated client-side from `smartSuggestionsBayern.ts` lookup
- Bayern-specific entries: PV-Pflicht 2025, KfW-Förderung, Bauherrenhaftpflicht, GEG-2024-Beratung, Stellplatzsatzung-Verifikation, Denkmalprüfung-Trigger
- Each suggestion has `[Zu Empfehlungen hinzufügen]` action — writes a new recommendation to `projects.state.recommendations` via supabase update (RLS keeps it owner-scoped)
- Optimistic update via TanStack Query

**Export hub (XII)**

- Five paper-card rows: Vollständiges PDF / Markdown-Checkliste / JSON-Datenexport / Link teilen / An Architekt:in senden
- First three reuse the existing `ExportMenu` from #55 (just visual variant — full-width primary cards instead of popover rows)
- Link teilen card triggers `create-share-token` Edge function (lands in #65 — for now stubbed with a "Folgt im nächsten Commit" placeholder)
- Send-to-architect card is the Phase 4 stub (`Bald verfügbar`)

---

### Commit #65 · `feat(result): print stylesheet + share token migration + public share view`

**Files**

- `supabase/migrations/0007_share_tokens.sql` — `project_share_tokens` table + RLS
- `supabase/functions/create-share-token/index.ts` — new Edge Function (auth required, owner-only)
- `supabase/functions/get-shared-project/index.ts` — new Edge Function (anon allowed, validates token)
- `src/components/shared/TokenGuard.tsx` — alternate to ProjectGuard for public share route
- `src/features/result/hooks/useSharedProject.ts` — TanStack Query against the new edge function
- `src/app/router.tsx` — add `/result/share/:token`
- `src/features/result/lib/shareTokenApi.ts` — client wrapper
- `src/styles/globals.css` — `@media print` rules scoped via `[data-print-target="result-page"]`
- `src/features/result/lib/exportPdf.ts` — extends the existing buildExportPdf for the result-page-aware variant

**Schema (0007)**

```sql
create table public.project_share_tokens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz
);

create index project_share_tokens_token_idx on public.project_share_tokens (token)
  where revoked_at is null;

alter table public.project_share_tokens enable row level security;

create policy "owner_can_manage_own_tokens" on public.project_share_tokens
  for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
```

The anon role can NOT select directly. Public share access goes through the `get-shared-project` Edge Function which uses the service role.

**`create-share-token` Edge Function**

- Auth required (Bearer token check + supabase auth)
- Validates owner of the project
- Generates 32-byte random token (`crypto.getRandomValues`); stores hex
- Inserts row, returns `{ token, url, expiresAt }` where `url = ${PUBLIC_SITE_URL}/result/share/${token}`

**`get-shared-project` Edge Function**

- No auth required (anon-allowed)
- Body: `{ token }`
- Validates: row exists AND `revoked_at IS NULL` AND `expires_at > now()`
- If valid: queries projects + messages + events with service role; returns shape matching what the result page expects
- If invalid: 404
- **Never returns owner email** or any PII beyond what's in the project shape itself (which is already user-supplied content)

**TokenGuard**

```tsx
<TokenGuard token={token}>
  <ResultPage source={{ kind: 'shared' }} />
</TokenGuard>
```

Renders `AuthSkeleton` while loading; renders `ProjectNotFound` (calm 404) on invalid token; otherwise renders children with the fetched project context.

**Read-only mode**

ResultPage gains a `source: { kind: 'owned' } | { kind: 'shared' }` prop. When `kind === 'shared'`:

- Hide `<ChatLink />` back-to-chat button
- Hide `[Zu Empfehlungen hinzufügen]` actions (read-only)
- Hide `Link teilen` row in export hub (don't generate tokens from a shared view)
- Show small "Schreibgeschützt · gültig bis DD. Monat YYYY" badge in the cover meta line
- Cover hero animation only runs once per browser (sessionStorage scoped to the share token, not the project id)

**Print stylesheet (`globals.css`)**

```css
@media print {
  /* Hide product chrome on every page */
  body { background: white !important; }
  nav, [data-no-print="true"] { display: none !important; }

  /* The result-page surface */
  [data-print-target="result-page"] {
    /* Section page breaks */
    & section { page-break-after: always; page-break-inside: avoid; }
    & section:last-child { page-break-after: auto; }

    /* Anchor + footer running heads */
    & [data-print-running-head] {
      position: running(head);
      font: italic 9pt 'Instrument Serif', serif;
    }
  }

  @page {
    size: A4 portrait;
    margin: 24mm 18mm;
    @top-right { content: element(head); }
    @bottom-left { content: 'Atelier-Briefing No. ' attr(data-document-no); }
    @bottom-right { content: 'Seite ' counter(page); }
  }
}
```

(Browser support for `@page` regions varies; we'll layer with explicit page-break classes as a fallback.)

---

### Commit #66 · `feat(result): polish + entry points + docs`

**Files**

- `src/features/chat/components/LeftRail.tsx` — add `Ergebnis ansehen →` button (replaces or duplicates the existing overview link; final decision in Q8)
- `src/features/dashboard/components/ProjectList.tsx` — add `Ergebnis` link below address on each row
- `src/app/router.tsx` — verify both routes mount cleanly with the existing Framer Motion crossfade
- `docs/phase3-5-plan.md` (moved from root)
- `docs/phase3-decisions.md` — append D18
- `README.md` — add Phase 3.5 line
- `docs/manager-demo-prep.md` — make the result page the climax of the demo (§7 or §8 added at the end)

**No new logic** — pure polish, mounts, and docs cleanup.

---

## 4 · Volume estimate

| # | Title | LOC est. | Risk |
|---|---|---|---|
| 60 | Route + cover hero + verdict | ~720 | Medium — first new route in Phase 3.5; cover-hero animation choreography is detailed |
| 61 | Top-3 hero + legal landscape + recommendations schema extension | ~640 | Medium — circled-numeral SVGs + persona instr extension |
| 62 | Document checklist + specialists + 6 role glyphs | ~620 | Medium — 6 new sigils + custom checkbox + focused PDF variant |
| 63 | Cost/timeline + risks + confidence radial (THE NEW PRIMITIVE) | ~700 | Medium-high — the radial is the most complex single SVG in Phase 3, qualifier aggregation needs care |
| 64 | Appendix + smart suggestions + export hub | ~560 | Low-medium — mostly composition |
| 65 | Print + share token migration + public route + read-only mode | ~880 | **High** — first public route, two new Edge Functions, schema migration, RLS policy, print stylesheet |
| 66 | Polish + entry points + docs | ~260 | Low |

**Total estimated LOC: ~4,380** across 7 commits + 1 schema migration + 2 new Edge Functions. Largest single Phase 3 batch by volume; commit #65 is a real architectural lift (public auth model + print).

---

## 5 · Where my judgment differs from the brief

### 5a — Recommendation effort + owner: extend the respond tool, not separate Anthropic call

Brief proposes per-recommendation "small Anthropic call, cached". I'd extend the respond tool with optional `estimated_effort` + `responsible_party` per recommendation. Single API call, no extra latency, model has full context. **Q1.**

### 5b — Add qualifier to recommendations

Survey caught a long-standing schema gap: recommendations don't carry `qualifier` while every other state object does. This affects the confidence radial (Section IX) directly. Adding optional `qualifier?: { source, quality }` makes the radial accurate. **Q2.**

### 5c — Public share auth: Edge function vs RLS policy

I prefer Edge Function `get-shared-project` with service role over an RLS policy granting anon SELECT on projects when a token row exists. RLS would couple the projects table to anon access in a way I'd rather not. **Q3.**

### 5d — Migration 0006 vs no migration

Survey clarified: recommendations live inside `projects.state` JSONB, not a normalized table. So extending the recommendation shape needs **no Postgres migration** — just Zod + persona changes. The schema migration that DOES need to ship in #65 is `0006_share_tokens.sql` (renumbered to 0006 — survey said "0007" earlier, but 0001-0005 are taken). **Q4.**

### 5e — Cover-hero XL axonometric — separate component

The `IntentAxonometric` is sized for the 240×160 right-rail context. Just upscaling produces aliased hairlines. Recommend `IntentAxonometricXL` as a separate component re-using the same path data with viewBox 480×320 + stroke 1.25px. **Q5 — confirm the duplication or pick a parametric route.**

### 5f — Role glyphs — 6 new sigils

Section VI needs role glyphs for 6 specialist types (Architekt, Tragwerksplaner, Energieberater, Vermesser, Brandschutzplaner, Bauamt). New file `RoleGlyphs.tsx` reuses the SpecialistSigils baked-imperfection technique. **Q6 — confirm the 6 chosen roles.**

### 5g — Smart suggestions — static lookup, not model-generated

Brief implies a static + Bayern-aware list. Recommend committing to that approach (`src/data/smartSuggestionsBayern.ts`) for v1; revisit in Phase 4 once we have data on which suggestions get "Zu Empfehlungen hinzufügen"-clicked. **Q7.**

### 5h — `Ergebnis` button placement vs existing overview link

Currently LeftRail has a "Vollständige Übersicht öffnen" link → `/projects/:id/overview`. Two options:

- (a) Replace with `Ergebnis ansehen →`. Overview becomes accessible via a tab inside the result page, OR via direct URL only.
- (b) Keep both. Overview is the architect's working view; Ergebnis is the briefing.

Recommend (b) — they serve different purposes. Add the new link below the existing one. **Q8.**

### 5i — Cost-norm lookup table source — placeholder vs realistic

The HOAI-derived ranges in `costNormsBayern.ts` need values. Two options:
- (a) Ship realistic numbers I draft from publicly-available HOAI 2021 §39 + Bayern Honorartabelle data
- (b) Ship placeholder ranges flagged `verifyBeforePublicLaunch: true`, same pattern as Phase 3.4 fact bank

Recommend (a) with the same flag. The numbers are public; flagging them keeps a single audit pattern. **Q9.**

### 5j — Print: pdf-lib export for share + browser print for owner

The owner has Cmd+P print available + the pdf-lib full-PDF export from #55. The share-token recipient also can print + has the same export hub. Recommend both work for both contexts; the print stylesheet covers Cmd+P; pdf-lib covers the formal export. **Q10.**

---

## 6 · Confirmation list — LOCKED 2026-04-28

| ID | Question | Locked answer |
|---|---|---|
| **Q1** | Effort + responsible-party for recommendations — extend the existing `respond` tool (1 model call), or separate Anthropic call per recommendation? | **extend respond tool** |
| **Q2** | Add optional `qualifier { source, quality }` to recommendations? | **add** |
| **Q3** | Public share view auth — Edge Function with service role, or RLS policy granting anon SELECT? | **edge fn** |
| **Q4** | Only ship 0006 for share tokens; recommendation extensions are JSONB (no migration in #61)? | **confirm — only 0006_share_tokens.sql, no migration in #61** |
| **Q5** | Cover-hero XL axonometric — separate `IntentAxonometricXL`, or parametric refactor? | **separate component** |
| **Q6** | 6 role glyphs — Architekt / Tragwerksplaner / Energieberater / Vermesser / Brandschutzplaner / Bauamt. | **ship the six** |
| **Q7** | Smart suggestions source — static lookup or model-generated? | **static** |
| **Q8** | LeftRail entry point — `Ergebnis ansehen` alongside Overview, or replace? | **both visible · Ergebnis primary, Overview secondary** |
| **Q9** | Cost norms — ship realistic HOAI-2021 + Bayern Honorartabelle values, flagged `verifyBeforePublicLaunch: true`? | **realistic + flag** |
| **Q10** | Print: ship `@media print` stylesheet AND keep pdf-lib export hub? | **both** |

Build proceeds.

---

## 7 · What I will NOT do without confirmation

- Touch any production file in `src/`, `supabase/functions/`, or `supabase/migrations/` until you sign off Q1–Q10.
- Add a third Edge Function beyond `create-share-token` + `get-shared-project`.
- Add new visual primitives beyond the confidence radial + the two minor SVG additions called out in §2 (circled numerals + paper checkbox).
- Add new color tokens, animation principles, or typography sizes.
- Touch Phase 3.2 / 3.3 / 3.4 locked surfaces (chat workspace internals, dashboard, wizard, auth, wordmark, export hub) beyond the explicit entry-point additions in #66.
- Call out to external services (no real geocoding, no third-party PDF generation, no analytics).
- Write to the database from public anon contexts. Only the authenticated owner can mutate.
- Skip reduced-motion fallbacks on any animated surface.
- Move `PHASE_4_PLAN.md` (Phase 4 still awaits manager Q1–Q16 walkthrough).

---

## 8 · If you confirm — what happens next

1. I lock Q1–Q10 into this file (a quick edit in §6).
2. Commit #60 opens (route + cover hero + verdict). Each commit ends with `npx tsc --noEmit` clean and `npm run build` green.
3. Migration 0006 ships as part of #65 — Rutik applies it via Supabase SQL Editor before that commit's Edge Functions deploy. Same convention as 0003-0005.
4. Two new Edge Functions deploy with #65: `create-share-token` (auth-required) + `get-shared-project` (anon).
5. After #66, push the batch and wait for Vercel deploy.
6. Live verification per brief §6 — full eight-check walkthrough on the deployed URL, including the print preview, the share-link round-trip in incognito, and reduced-motion check. Same proof bar as Phase 3.2 / 3.3 / 3.4.
7. Batch report follows the same shape — what shipped, what's verified via signature audit, what's still gating on your eyes (screenshots + screen recording I cannot capture from this shell).

— End of PHASE_3_5_PLAN.md.
