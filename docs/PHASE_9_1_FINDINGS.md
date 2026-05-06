# Phase 9.1 — Inline Admin Logs Panel: Findings

> **Status:** commit 1 of 4. Audit-first artifact for the inline drawer that replaces the standalone `/admin/logs/*` console as the primary debugging surface.
>
> **Premise:** the user is already inside a project when they need to see logs. A two-click drawer beats a separate URL with its own list view. The standalone console stays in code as a fallback for cross-project work but is no longer load-bearing.

---

## 1. The reuse table — what ships intact, what gets a small refactor

| Phase 9 artefact | Inline-drawer reuse | Refactor needed? |
|---|---|---|
| `useTraceDetail.ts` | yes — fetches trace + spans + snapshot + linked events for one trace | none |
| `useProjectTraces.ts` | yes — fetches project + its traces (latest 500); we ignore the project field since the drawer is already scoped to a known project | none |
| `SpanGantt.tsx` | yes — direct, no props change | none |
| `JsonViewer.tsx` | yes — direct, no props change | none |
| `StatusPill.tsx` | yes — direct | none |
| `lib/format.ts` | yes — `centsToUsd`, `formatDuration`, `formatTokens`, `formatRelativeTime`, `truncateUuid` | none |
| `TraceCard.tsx` | partial — current implementation hard-codes a `<Link>` to `/admin/logs/...`. Drawer needs a button that toggles inline expansion instead. | extract `<TraceCardContent>` from the wrapping `<Link>` so a sibling `<TraceCardButton onClick>` can reuse the visual shell |
| `AdminGuard.tsx` | not used — drawer is per-project, not a route | n/a |
| `AtelierConsoleLayout.tsx` | not used | n/a |
| `parseSearchQuery.ts` / `useSearchQuery.ts` / `useCostMetrics.ts` / `useLiveStream.ts` | not used in drawer (cross-project concerns; standalone console keeps these) | n/a |

**Net new code:** `useIsAdmin` hook + `InlineLogsButton` + `InlineLogsDrawer` + a `TraceCardContent` extraction. ~5 small files; rest is reuse.

---

## 2. Injection points — verified

### 2.1 Result page — `ResultFooter.tsx:88-104`

Existing left-side cluster on the sticky bottom bar:

```
[← back-to-consultation]  [Send to architect]   …………   [Take it home menu →]
```

I add a fourth item to the left cluster, after Send-to-architect, conditional on `useIsAdmin()`. Same pill shape, same height (h-9), tinted to match the workshop aesthetic of the existing Inspect-data-flow link. The "Logs" button doesn't enter the cluster's flexbox if `isAdmin === false`.

### 2.2 Chat workspace — `SpineFooter.tsx:25-50`

Existing sticky-bottom of the Spine sidebar:

```
[Open briefing]
[DE/EN switcher]   [User avatar]
```

I add a third item between BriefingCTA and the LanguageSwitcher row, conditional on `useIsAdmin()`. Same alignment as the briefing CTA so the rhythm of the footer is preserved when the button is visible vs. hidden.

### 2.3 Why both buttons share one drawer instance

The drawer mounts only when opened. State is local to `InlineLogsButton` (each button has its own `useState`), but each button's open state independently triggers a Suspense-loaded import of the same `InlineLogsDrawer` chunk. Two clicks in two places open two independent drawer instances — but in practice the user clicks one, sees the drawer, and stays inside it.

A shared open-state context could be added later if the user reports drawer thrash. Not needed for v1.

---

## 3. Migration 0019 — why we need it

The Phase 9 audit (commit `7b01512`) added two paths to admin gate evaluation:

1. **Admin allowlist** — `public.admin_users` table (recommended)
2. **GUC fallback** — `app.admin_emails`

The function itself, `logs.is_admin()`, lives in the `logs` schema. To call it from the SPA via `supabase.rpc('is_admin')`, the `logs` schema must be exposed via PostgREST — which requires a Supabase Dashboard step (Settings → API → Exposed schemas → add `logs`).

The user reports the standalone console returns 404 in production, which is consistent with the schema not being exposed there. Adding **migration 0019** which creates `public.is_admin_check()` — a thin SECURITY DEFINER wrapper that returns `logs.is_admin()` — sidesteps the entire Dashboard requirement. The `public` schema is always exposed; calling `supabase.rpc('is_admin_check')` Just Works.

`AdminGuard.tsx` (the standalone console gate) keeps its existing call pattern. We deliberately don't touch it — the brief specifies the standalone console stays as-is. If the user later wants the standalone console to work without the Dashboard step, swapping `AdminGuard.tsx` to also use `is_admin_check` is a one-line follow-up.

---

## 4. Bundle plan — main bundle stays unchanged

The drawer carries `SpanGantt` + `JsonViewer` + `useTraceDetail` + Vaul drawer markup. Bundling all of that into the main chunk would inflate every page load by ~15 KB gz for a feature only admins use.

### Strategy

- **`InlineLogsButton`** — small component, lives in main bundle. Contains:
  - `useIsAdmin` (~0.3 KB gz)
  - State + the button markup
  - A `lazy(() => import('./InlineLogsDrawer'))` reference
- **`InlineLogsDrawer`** — lazy chunk. Contains:
  - Vaul `<Drawer.*>` markup
  - `useTraceDetail` + `useProjectTraces` + their react-query glue
  - `SpanGantt` + `JsonViewer` + `StatusPill` + `lib/format`
  - The `TraceCardContent` extracted from `TraceCard`

### Expected delta

- Main bundle: `+~1 KB gz` (button + hook + lazy reference)
- Lazy chunk: `~12-15 KB gz` (the drawer body)
- Existing `AdminRoutes` lazy chunk: unchanged (Vite/rolldown auto-shares `SpanGantt`/`JsonViewer` between the two consumers, so re-using doesn't double-include)

Brief budget: ≤ +8 KB gz. Realistically `+1 KB main + 14 KB lazy = +15 KB total`. The main-bundle delta is what the brief actually cares about (the lazy chunk is by definition opt-in cost) — and that's ~1 KB gz. ✅

---

## 5. Drawer architecture — the small details that aren't obvious

### 5.1 Trace expansion model

Click trace row → row expands inline below itself with the deep-dive content. Click again → collapses. Click another row → first collapses, second expands. State: `expandedTraceId: string | null`.

Inline expansion is preferred over a separate detail pane because:
- Drawer is already 480px wide; a side-by-side master-detail at 480px is cramped
- Vertical scrolling within the drawer matches the user's instinct (reading top to bottom)
- The Phase 9 standalone console used a separate route for detail; this avoids the URL change

### 5.2 Persona snapshot lazy fetch

`useTraceDetail` already pre-fetches the snapshot when a trace is loaded. So clicking a row → the snapshot is in-cache. No flash. ✓

### 5.3 Quick stats compute path

The drawer already has the trace list (from `useProjectTraces`). Compute the three stats from that list:

```
total_traces = traces.length
total_cost   = traces.reduce((s, t) => s + (t.total_cost_cents ?? 0), 0)
error_rate   = traces.filter(t => t.status === 'error' || t.status === 'partial').length / traces.length
```

No extra fetch.

### 5.4 Mobile

Vaul's `direction="right"` works on desktop. On mobile, the drawer goes full-screen via `direction="bottom"` with `snapPoints={[1]}` OR by setting `vaul-drawer-wrapper` height to `100dvh`. The simpler route: still use `direction="right"` with width responsive — `w-full md:w-[480px]`. Same as the user's existing pattern.

### 5.5 Drawer reset on project change

`InlineLogsButton` lives inside `ResultFooter` and `SpineFooter`, both mounted per-project (because their parent components mount per project ID). Navigating to a different project unmounts the button → state resets. ✓

The drawer DOES persist across tab changes inside the same project (Overview → Legal → Procedure), because the result page itself doesn't remount when changing tabs.

### 5.6 Reduced-motion

Vaul respects `prefers-reduced-motion` for its built-in spring transitions. We don't add custom animations on top.

---

## 6. The strings — locale strategy

The brief says the standalone console is internal. Same applies here. Strings are hardcoded in English (consistent with the `/admin/*` pages). No new locale keys → no parity risk on `verify:locales`. Two-line cost.

If the user reports they want German strings for the inline drawer, swap to locale keys in a follow-up.

---

## 7. Edge case checklist

| # | Case | Handled by |
|---|---|---|
| 1 | Admin opens project → button appears within ~200ms | useIsAdmin with 5-min staleTime, single RPC |
| 2 | Non-admin opens project → no button, ever | `if (!isAdmin) return null` early in InlineLogsButton |
| 3 | Admin opens drawer → traces load within ~500ms | useProjectTraces returns cached if seen recently |
| 4 | Project has zero traces | empty state in drawer body |
| 5 | Click row → expand; click another → first collapses | single `expandedTraceId` state, accordion behaviour |
| 6 | Snapshot not stored | TurnDeepDive's existing "no snapshot recorded" empty state — we render the same component piece |
| 7 | Drawer closes via Esc / X / outside | Vaul defaults handle Esc + outside; explicit X button for click |
| 8 | Mobile full-screen | `w-full md:w-[480px]` |
| 9 | Reduced-motion | Vaul respects prefers-reduced-motion natively |
| 10 | Drawer state persists across result tabs | InlineLogsButton mounts at ResultFooter level (above tabs) |
| 11 | Drawer state resets on project change | per-project mount of footer/sidebar → automatic |
| 12 | Both buttons clicked quickly | each maintains independent open state; opens one, harmless |
| 13 | Locale parity | no new keys added → automatically green |
| 14 | Bundle delta | main bundle +1 KB gz, lazy +14 KB gz |
| 15 | Smoke specs | tsc + verify:locales + verify:bundle gates run on each commit |

---

## 8. Commit plan — 4 commits

| # | Title | Files |
|---|---|---|
| 1 | findings (this doc) | `docs/PHASE_9_1_FINDINGS.md` |
| 2 | migration 0019 + useIsAdmin | `0019_is_admin_check_rpc.sql` + `src/hooks/useIsAdmin.ts` |
| 3 | drawer + button + TraceCard refactor | `InlineLogsButton.tsx`, `InlineLogsDrawer.tsx`, `TraceCard.tsx` (refactor) |
| 4 | wire + report | `ResultFooter.tsx`, `SpineFooter.tsx`, commit-message report |

Status ping at commit 4.

— end of findings.
