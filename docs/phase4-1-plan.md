# Phase 4.1 — Code Hygiene Pass (PLAN ARCHIVE)

> **Status:** Closed 2026-04-29. All eight commits (#120–#127) shipped.
> ESLint clean (0 errors / 0 warnings). Final operational gate: Rutik
> applies migration 0008 + redeploys chat-turn (see commit #125 message
> for the steps).

This plan ships every code-able item from the §A.before-beta list in
`docs/phase4-readiness-audit.md`. Items requiring Rutik's environment
(Lighthouse runs, axe-core runs, real-device mobile walk, design
assets, legal docs, prod Supabase setup, custom domain, telemetry
signup) stay carved out and Rutik-owned.

---

## Commits shipped

| # | Commit | What it lands |
|---|---|---|
| 120 | `fix(hooks): C1 — extract inline component definitions in InputBar / AttachmentChip / MessageAttachment` | Hoists `Outer` shell + the `pickIcon`-derived `<Icon>` references to module scope so child components stop remounting per render. Real focus-loss risk on the chat input bar. |
| 121 | `fix(hooks): C2 — conditional hook violations in AttachmentPicker + ChatWorkspacePage` | Moves AttachmentPicker's useEffect above the `if (isMobile) return` early return and lifts ChatWorkspacePage's `useViewport` above its `if (!project) return null`. Both were real rules-of-hooks bugs. |
| 122 | `fix(hooks): C3/C4/C5 — lazy initial state + ref→state for Thread + Date.now via useState init + targeted disables` | 3 localStorage hydration sites → `useState(() => readFromStorage())`; EditableCell refactored to derive draft from editing flag; Thread's lazy ref-init → `useState(() => new Set(...))`; ChatWorkspacePage's `Date.now()` inside useMemo → `useState(() => Date.now())`; 5 legitimate "react to external signal" sites get targeted block-form disables with multi-line rationale comments. |
| 123 | `chore(lint): C6/C7 — extract StatusPill+RoleGlyphs constants, fix ExportMenu outputSize → 0/0` | StatusPill.helpers.ts + RoleGlyphs.helpers.ts hold the locale label maps + the title→glyph heuristic; component files only export components. ExportMenu's `outputSize` declared without initial — TS infers definite assignment from the if/else if/else over three exhaustive kinds. **ESLint state hits 0 errors / 0 warnings — the §A.before-beta gate.** |
| 124 | `feat(seo): per-route titles + descriptions via React 19 native metadata (S3)` | New `<SEO />` component using React 19's native metadata hoisting (no react-helmet-async dependency). Per-route titles for all 17 named routes via `seo.title.*` keys + descriptions for the four public/share-facing routes via `seo.description.*`. SessionGuard also syncs `<html lang>` to `i18n.resolvedLanguage`. ESLint config also pinned `argsIgnorePattern: '^_'` so the `_props` / `_var` convention is honored. |
| 125 | `feat(security): application-level rate limit on chat-turn (SEC2)` | Migration 0008 adds `chat_turn_rate_limits` + `increment_chat_turn_rate_limit` SECURITY DEFINER RPC + cleanup helper. chat-turn Edge Function enforces 50 turns/hour per user, returns 429 with a structured rateLimit envelope. Client carries the envelope through ChatTurnError; new RateLimitBanner surfaces the reset time in the user's locale. |
| 126 | `test(smoke): Playwright suite (4 specs) + GitHub Actions CI wiring` | 4 specs (landing / auth / seo / i18n) covering the highest-value happy paths. CI runs against `vite preview` on port 4173 with stubbed Supabase calls. Full coverage matrix tracked in `tests/smoke/README.md` for Phase 4.2. |
| 127 | `chore(docs): D23 + phase4-1 plan archive + audit doc updates + README` | This commit. |

---

## ESLint trajectory across the batch

| Checkpoint | Errors | Warnings |
|---|---|---|
| Phase 4.0 close | 19 | 1 |
| After #120 | 16 | 1 |
| After #121 | 14 | 1 |
| After #122 | 3 | 0 |
| After #123 | **0** | **0** |
| After #124–#127 | 0 | 0 |

Bundle stayed green throughout: index 138.9 → 140.2 KB gzipped
(ceiling 250). Locale parity gate: 617 → 640 keys (+21 SEO,
+2 rate-limit banner), ✓.

---

## Operational gates Rutik must complete

These are the only items in `docs/phase4-readiness-audit.md`
§A.before-beta that aren't closed by this batch — they require
Rutik's Supabase Dashboard or external accounts.

### Immediate (before redeploying chat-turn)

1. **Apply migration 0008** in Supabase SQL Editor:
   `supabase/migrations/0008_chat_turn_rate_limits.sql`.
2. **Redeploy chat-turn**: `supabase functions deploy chat-turn`.
3. *(Optional)* Wire the cleanup cron — see migration header.

### Before invited beta

4. Run Lighthouse mobile + desktop on the live URL (item 7).
5. Run axe-core on landing / sign-in / dashboard / chat / result /
   share view (item 9).
6. Real-device walk: 6 viewports × 9 pages on iPhone + Android
   (item 7).
7. Design or commission a 1200×630 PNG OG image (item 12).

### Before public launch

8. Privacy policy + ToS + DSGVO cookie consent banner (item 20).
9. Production Supabase project (item 21).
10. Custom domain (item 22).
11. Sentry / PostHog + cookie consent integration (item 17).

---

## What's deferred to Phase 4.2 (or later)

Per `tests/smoke/README.md`, the full Playwright coverage matrix
(wizard, chat round-trip with stubbed Anthropic, file upload,
result page section asserts, share token anon access, mobile
horizontal-scroll asserts, axe-core integration) ships when (a)
the operational gates above are clear OR (b) a dedicated test
Supabase project with seed data exists. Either approach exceeds
the scope of an autonomous-mode batch.

— End of Phase 4.1 plan archive.
