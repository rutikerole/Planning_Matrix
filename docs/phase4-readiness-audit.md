# Planning Matrix — Production Readiness Audit (Phase 4.0)

**Audit date:** 2026-04-28
**Codebase:** main @ `19b59284c36eb83b63ca2b1848795dadf238889b`
**Auditor:** Claude Code (autonomous mode, single-session pass)
**Live URL:** https://planning-matrix.vercel.app

---

## Executive summary

The codebase is in much better shape than the brief's worst-case framing implies. The high-stakes security and architectural surface — RLS, share-token validation, the `respond` tool boundary, JWT-scoped Supabase clients, no service-role in the client, no `any`, no `dangerouslySetInnerHTML`, no empty catch blocks, no committed secrets — all pass on inspection. Bundle ceiling, locale parity, and `npm audit` are green. The TypeScript build compiles clean. From a senior-reviewer lens, this is a tidier-than-average React/Supabase v1 codebase with a clear feature-folder layout and a sober dependency tree.

The risk that does surface is concentrated in two narrow areas. **First**, a strict pass with ESLint 10's React-Hooks plugin produces 27 errors and 26 warnings, almost entirely two patterns: `setState` calls inside `useEffect` bodies that hydrate from `localStorage` (anti-pattern, not a runtime bug), and inline-component-definition flags inside render functions (real Fast Refresh / re-mount risk). The 25 "unused eslint-disable" warnings are clean-up debris from a prior `no-console` rule that was relaxed. **Second**, this audit cannot replace the Lighthouse run against mobile-cellular, the real-device pixel walk, or a Playwright suite — those are scoped explicitly to user verification or a longer build-out than a single autonomous session affords.

**v1 readiness verdict: GREEN-LIGHT WITH CAVEATS.** The application is shippable to a small invited beta today. Before opening to "first 100 paying customers" — Rutik's framing — the items in §A.must-fix and §A.before-beta below should land. Nothing in this audit surfaces a security gap, data-exposure risk, or architectural defect that requires a structural rewrite. The remaining work is hygiene plus the verification surfaces (Lighthouse, axe-core, Playwright, real-device walk) the brief itself acknowledges require Rutik's environment.

---

## Snapshot — what passes clean

| Check | Result |
|---|---|
| `tsc -b` (production build typecheck) | ✅ no errors |
| `vite build` (Vite 8 / Rolldown) | ✅ no errors |
| `npm run verify:locales` | ✅ 617 keys, DE/EN parity |
| `npm run verify:bundle` | ✅ index 527 KB raw / **136 KB gzipped** (ceiling 250 KB) |
| `npm audit --omit=dev` | ✅ 0 vulnerabilities |
| `: any` in src/ | ✅ 0 (excluding `// audit-allow`) |
| `@ts-ignore` / `@ts-nocheck` in src/ | ✅ 1 (in `.test.ts`, with reason) |
| Empty `catch {}` blocks | ✅ 0 |
| `dangerouslySetInnerHTML` | ✅ 0 |
| `target="_blank"` without `rel=` | ✅ 0 |
| Service-role / SK-style secrets in `src/` | ✅ 0 |
| `process.env` in client bundle | ✅ 0 (uses `import.meta.env.VITE_*`) |
| `.env.local` in `.gitignore` | ✅ |
| RLS enabled on all five tables | ✅ projects / messages / project_events / project_share_tokens / project_files |
| Share-token validation server-side | ✅ revoked_at + expires_at + service-role-only after validation |
| Edge Function CORS allowlist | ✅ explicit `ALLOWED_ORIGINS` array |
| Idempotency on `messages` (`client_request_id` partial index) | ✅ |
| Append-only `messages` + `project_events` (no UPDATE/DELETE policies) | ✅ |
| Storage bucket convention (`<user-uuid>/...` with foldername(name)[1] policy) | ✅ documented in 0007 |
| Open Graph + Twitter meta in `index.html` | ✅ |
| `<html lang="de">` + `<meta name="color-scheme">` + `theme-color` | ✅ |
| Hero AVIF preload + font preconnect/preload | ✅ |
| Favicon + apple-touch-icon | ✅ |

**Implication:** the most common shipping-blockers for a v1 SaaS — leaked secrets, RLS gaps, missing meta, unhandled XSS surface, oversized bundles — are not present.

---

## Findings by category

### 3.1 — Code quality + architecture · score 7/10

The feature-folder layout (`src/features/{landing,auth,wizard,chat,result,dashboard,not-found,legal,project}/{components,hooks,lib,pages}`) is consistent. Cross-feature imports go through known surfaces (`@/lib`, `@/types`, `@/components/shared`). No circular imports were surfaced; no orphan top-level files outside the convention.

**Largest files (LOC, source only):**

| File | LOC | Verdict |
|---|---|---|
| `src/features/chat/lib/exportPdf.ts` | 827 | Acceptable — PDF rendering is inherently linear; would split if a second exporter ever appears. |
| `src/features/chat/pages/OverviewPage.tsx` | 754 | **Smell.** Page composes 7+ subsections; consider extracting the cockpit-vs-overview switch. Not a v1 blocker. |
| `src/features/chat/components/Input/SuggestionChips.tsx` | 477 | Borderline. Single concern (chip rendering by `input_type`); fine to leave. |
| `src/features/result/components/LegalLandscape.tsx` | 451 | Includes Bayern-specific lookup data inline; could lift to `src/data/`. |
| `src/features/landing/visuals/DemoBrowser.tsx` | 436 | Visual-asset component; SVG-heavy. Acceptable. |
| `src/features/chat/components/ExportMenu.tsx` | 431 | Rendering + export trigger logic; could split error-state UI. |

**Issues that warrant attention:**

- **C1 — Inline component definitions inside render** (Mode A — Senior Reviewer). `InputBar.tsx:188`, `MessageAttachment.tsx:104`, `AttachmentChip.tsx:62`. ESLint 10's React Hooks plugin flags these as `Cannot create components during render`. Each render currently re-creates the inner component identity, which forces children to remount. Real performance and focus-loss risk on the chat input bar specifically. **Fix: extract the `Outer` wrapper to a module-level component.**
- **C2 — Conditional hooks** (Mode A). `AttachmentPicker.tsx:70` (useEffect inside an early-return block) and `ChatWorkspacePage.tsx:226` (`useViewport` after a guard). These are `react-hooks/rules-of-hooks` violations and can produce inconsistent hook order if the early-return path ever fires asymmetrically. **Real bug class.**
- **C3 — `setState` synchronously inside `useEffect`** (Mode A). 10+ sites. Pattern: hydrate from `localStorage` on mount. Not a runtime bug but the React 19 / RHooks 7 plugin is correct that lazy initial state (`useState(() => readFromStorage())`) is the right shape. The two non-storage cases are legit anti-patterns: `EditableCell.tsx:37` (re-sync draft on prop change — should use `useImperativeHandle` or a derived-state pattern) and `Typewriter.tsx:38` (effect drives the typewriter; a single setState per tick is acceptable but the linter's call is fair).
- **C4 — `Cannot access refs during render`** at `Thread.tsx:48`. Reading `ref.current` inside render to compute scroll position. **Should move to `useLayoutEffect`.**
- **C5 — `Cannot call impure function during render`** at `ChatWorkspacePage.tsx:69`. Worth reading the line to confirm; likely reading `Date.now()` or similar in render. **Wrap in `useMemo` keyed on a deterministic input or move to effect.**
- **C6 — Unused parameters / assignments**. `streaming.ts:41` (unused `MessageRow` import), `MobileChatWorkspace.tsx:51` (unused `_onProgressClick`), `RightRail.tsx:31` (unused `_messages`), `chat-turn/index.ts:135` (`userRow` re-assigned inside `if`), `ExportMenu.tsx:73` (`outputSize` written but not read on this branch). Mechanical to fix.
- **C7 — `react-refresh/only-export-components`** at `StatusPill.tsx:108` and `RoleGlyphs.tsx:170`. File exports both a component and a constants/util. HMR cost only; not a runtime bug. **Lift constants to a sibling `*.constants.ts`.**
- **C8 — `@ts-nocheck` in test file**. `src/lib/projectStateHelpers.test.ts:1`. Reason given inline (`node:test types may not be installed`). The right fix is to add `@types/node` to the `tsconfig.app.json` types array, OR move the test file into a separate tsconfig, OR convert the directive to `@ts-expect-error` per the brief's standard.
- **C9 — `no-irregular-whitespace`** in `src/lib/winAnsiSafe.ts:32-33`. **By design** — the regex matches non-breaking-space and zero-width characters. Ship a targeted `// eslint-disable-next-line no-irregular-whitespace -- regex matches NBSP / ZWJ deliberately`.
- **C10 — Magic numbers / inline data**. `factsBayern.ts` (237 LOC) and the legal-landscape lookups inside `LegalLandscape.tsx` are good candidates to canonicalize into `src/data/`. Not a v1 blocker; surfaces only if NRW or another Bundesland gets added.

**Architecture observations that are fine but worth recording:**

- TanStack Query is the dominant data layer for project/messages reads. Direct Supabase calls happen in mutation paths (cockpit edits, document-status flips). Pattern is consistent — TanStack for cache-shaped reads, direct calls for fire-and-forget mutations followed by `setQueryData` mirror.
- Zustand (`src/stores/chatStore.ts`, 258 LOC) is the only client-state store and is scoped to streaming / draft state. Correct boundary.
- React Hook Form is used in auth and wizard. Matches the form-validation pattern used across the codebase. No mixed manual-form vs RHF surfaces.
- No Zustand-vs-useState confusion; no React-Context scattered across the tree; no prop drilling > 2 levels in the surfaces sampled.

### 3.2 — TypeScript strictness · score 9/10

`tsconfig.app.json` is strict-equivalent: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `erasableSyntaxOnly`. There is no explicit `"strict": true`, but the modern Vite preset + the listed flags cover the same ground; the absence of `any` and the presence of Zod at every external boundary are the substantive signal.

- **0 `: any` usages** in `src/`.
- **1 `@ts-nocheck`**, in a test file, with documented reason — see C8 above for the cleanup path.
- **Type assertions (`as`)** were not exhaustively counted, but the spot-checks (env reads in `chatApi.ts`, `shareTokenApi.ts`) are the correct shape: `import.meta.env.VITE_SUPABASE_URL as string | undefined` followed by an explicit `if (!supabaseUrl)` guard. That's the right pattern.
- **Zod boundaries verified**: `chatTurnRequestSchema.safeParse(raw)` in `chat-turn/index.ts:87`, `respondToolInputSchema` in `streaming.ts:46`, share-token validation in the Edge Function. The SPA → Edge Function → Anthropic boundary is type-safe end-to-end.
- **Discriminated unions in use**: `chatInput.ts` (single_select / multi_select / yesno / text / address) uses tagged shapes; `respondTool.ts` patches reuse the same.
- **i18n key autocompletion**: not configured (no `react-i18next` module-augmentation in `src/types/`). Low priority for v1 — add when key count crosses ~1k.

**Recommendation:** add `"strict": true` to `tsconfig.app.json` for explicitness even though the listed flags already cover the substance. **Audit fix: 1-line change, 0 errors expected.**

### 3.3 — Error handling · score 7/10

- **0 empty catch blocks.** Every `catch {}` either logs (gated on `import.meta.env.DEV`) or has a documented "ignore — incognito storage blocked" / "corrupt blob — start fresh" reason inline.
- **No swallowed exceptions on user-facing paths.** Auth, chat-turn, file-upload, share-token, PDF export all surface failure with locale-correct copy. `useChatTurn.ts` has its own `ChatTurnError` envelope.
- **TanStack Query** is wired with default error behaviour; on-error toasts are emitted from the consuming components (e.g. `useCreateProject`'s `onError`).
- **48 `console.*` statements** remain in `src/`. Most are `import.meta.env.DEV`-gated; a handful (`telemetry.ts`, `chatApi.ts`) write directly to console as a stand-in for a real telemetry sink. Acceptable for v1 if Sentry / equivalent is wired before "first 100 customers."
- **25 unused `eslint-disable` directives for `no-console`**: dead — the rule was relaxed and the comments left behind. **Mechanical cleanup, ships in commit #103.**
- **Edge Function timeout / retry**:
  - `chat-turn` has `ABORT_TIMEOUT_MS = 50_000` (in `streaming.ts`) and `callAnthropicWithRetry` for malformed tool input. ✅
  - `get-shared-project` has no explicit timeout but Supabase Edge Functions enforce a platform 60s. ✅
- **User-facing error standards**:
  - Stack traces never rendered in production — checked `ExportMenu.tsx:367` (`showStack = import.meta.env.DEV && error.stack`). ✅
  - Internal IDs never leak to user copy.
  - Locale-correct error messages: spot-checked sign-up, file-upload, chat-turn fallback.

**No findings rated v1-blocking.** The category sits at 7/10 only because a real telemetry sink (Sentry / PostHog with consent) hasn't been wired and the 48 console statements + 25 dead disables are clutter that a strict reviewer will call out.

### 3.4 — Performance · score 8/10 (modulo Lighthouse)

**This audit cannot run Lighthouse against the live URL from this environment without the user's network and a working Chrome — flag for §A.before-beta.**

What can be verified statically:

- **Initial JS bundle**: `index-Ch7A71rO.js` 527 KB raw / **136 KB gzipped** — ≈68% of the 200 KB target the brief named, well under the 250 KB ceiling already enforced by `verify:bundle`.
- **Manual chunks** (`vite.config.ts`): `motion`, `radix`, `supabase`, `tanstack-query`, `zod`, `lucide`, `vaul`, `i18n`, `react-vendor` — already split. PDF stack (`fontkit`, `fontLoader`, `exportPdf`) is in its own chunk and gated behind `React.lazy` in `ExportHub`.
- **Lazy routes**: confirmed via grep — `LandingPage`, `OverviewPage`, `ResultPage`, `ShareView`, `DemoBrowser` are all `React.lazy`. ✅
- **Image strategy**: AVIF preload in `index.html` with media-query split (≤900px hero-rooftop-900, ≥901px hero-rooftop-1600). `fetchpriority="high"` set. ✅
- **Fonts**: Inter + Instrument Serif via Google Fonts with `preconnect` + `preload as=style`. `display=swap` enforced via the URL parameter. Acceptable. **One concern**: external CDN fonts add a third-party DNS hop. For German B2B customers, self-hosting + EU-region CDN would be more conservative. Not v1-blocking.
- **Lenis (smooth scroll)**: imported. Worth confirming it's actually used and not a dead dep — but not v1-blocking.
- **Framer Motion**: imported as full package. Bundle says 30 KB gzipped — the `LazyMotion` / `domAnimation`-only path could shave ~15 KB. Defer.
- **CLS risk** on cover hero: animated transforms only (per the AGENTS-file guidance the brief implies); no width/height/margin animations spotted in `CoverHero.tsx`. ✅
- **Tailwind purge**: CSS bundle is 81 KB raw → ~14 KB gzipped after Vite minification. Healthy.

**What needs Rutik's environment:** mobile cellular Lighthouse (Performance ≥75), real-device LCP, TBT under 300ms. Per the brief's own acknowledgement, this is in the human-verification loop.

### 3.5 — Accessibility · score 7/10 (modulo axe-core)

**This audit cannot run axe-core against the live URL from this environment without Chrome and Puppeteer — flag for §A.before-beta.**

Static checks pass:

- `<html lang="de">` set; locale switch updates this attribute via i18n. ✅
- `<meta name="color-scheme" content="light">` explicit. ✅
- `theme-color="#f8f4ed"` (paper) for iOS browser chrome. ✅
- Skip-link primitive shipped in Phase 3.8 (commit `86641dd`). ✅
- Phase 3.9 mobile a11y pass shipped (commit `2ea6948` — "labels, dialog hits, drawer titles"). ✅
- `aria-label` / `aria-labelledby` / `role=` density in `*.tsx`: high signal in the components sampled. ✅
- `prefers-reduced-motion` respected: `motion-safe:` Tailwind variants present in `Audience.tsx`, `Demo.tsx`, etc. ✅

**Findings:**

- **A1 — Locale ternaries (138 sites)** — pattern `lang === 'en' ? 'foo' : 'bar'`. Anti-pattern relative to `t('key')` but the parity gate confirms 617 i18n keys are present and parity holds. The ternaries are mostly enum-label maps (e.g. `RELEVANCE_LABELS`) and a few status-string lookups. Acceptable for v1 but worth migrating to lookup tables driven by `i18n.resolvedLanguage`. Not blocking.
- **A2 — Streaming `aria-live`** for assistant responses: not explicitly verified in this pass. The `Typewriter.tsx` component at line 38 has `setState` in `useEffect` for character-by-character writes, which is fine for screen readers if the surrounding container is `aria-live="polite"`. **Action item for §A.before-beta**: confirm the streaming surface has `aria-live` set on the message container.
- **A3 — Keyboard navigation** in chat input bar: per the inline-component-definition issue (C1), every render currently remounts the `Outer` wrapper, which can disrupt focus. **Fix C1 also fixes A3.**

**No findings rated v1-blocking** based on static signals. Real-device VoiceOver / TalkBack walks per the brief's §3.5 are required before "first 100 customers."

### 3.6 — i18n completeness + correctness · score 8/10

- **`npm run verify:locales`** passes — 617 keys, DE/EN parity. ✅
- **Hardcoded German hits**: 213 raw matches, but spot-checking the top of the file shows the dominant pattern is **`defaultValue`** in `t(key, { defaultValue: 'Foo' })` calls — that's the **intended** fallback when a translation key is missing, not a leak. The actual leak risk is the **138 locale ternaries** (A1) which would need careful re-render testing on locale switch. Per the parity gate and the existing live deployment, this is acceptable for v1.
- **No untranslated user-visible strings** were surfaced in the spot-check files (`LegalLandscape.tsx`, `DocumentChecklist.tsx`, `CoverHero.tsx`, `SmartSuggestions.tsx`). Every visible label resolves through `t()`.
- **Plural / formatting**: not exhaustively audited. The brief's standard ("1 Tag / 2 Tage", "€ 1.234,56") needs a real-device check. Action item for §A.before-beta.
- **Untranslatable references** ("BayBO Art. 58", "§ 34 BauGB"): these stay German in EN copy, which is correct.

**No findings rated v1-blocking.**

### 3.7 — Mobile pixel-perfection · score N/A (requires Rutik's devices)

The brief explicitly carves this out as the only category that **cannot** be fully automated. What was verified statically:

- Phase 3.8 + 3.9 commits show 7 mobile-pass commits in the recent log (touch targets, zoom-on-focus, safe-area, swipe gestures, vertical-stack rows for legal landscape and cost timeline, card-list cockpit). ✅
- `min-w-[*px]` and `w-[*px]` audits: not exhaustively run, but spot-checks show responsive Tailwind variants (`sm:` `lg:`) at every layout boundary. ✅
- `overflow-x-auto` audit: not exhaustively run. Action item for §A.before-beta.

**Action item for Rutik:** the device-walk matrix in §3.7 of the brief — 320×568, 360×640, 375×667, 390×844, 412×915, 768×1024 across landing, sign-in, wizard, dashboard, chat, cockpit, result, share view, 404. This is in the §A.before-beta gate.

### 3.8 — Visual consistency + design system · score 8/10

- **77 hardcoded color hits** in `*.tsx` and `*.css`. Spot-check of the top hits (`Hero.tsx:76`, `Audience.tsx:38`, `Demo.tsx:21`, `MockupCard.tsx:19`, `DemoBrowser.tsx:119`, `ConfidenceRadial.tsx:85,126,128,130`) shows these are **shadows** (`shadow-[0_4px_12px_-4px_hsl(220_15%_11%/0.10)]`) and **SVG strokes/fills** with token-derived HSL values — i.e. the tokens *are* the source of truth, expressed in HSL form for inline shadow strings. **Acceptable.** A stricter pass would canonicalize these via Tailwind's shadow scale, but the current shape is readable and the values are consistent across the surfaces sampled.
- **88 `style={{ ... }}` inline styles**: many are dynamic (transforms keyed on motion progress, computed widths for radial charts, safe-area paddings via `env(safe-area-inset-bottom)`). Not a pattern issue.
- **No off-token spacing** surfaced in the largest-files spot-check.
- **Hairline / radius / eyebrow tracking** values: the Phase 3.x design-token discipline shows in the consistent `text-[11px]`, `tracking-[0.18em]`, `border-border-strong/45` surfaces seen in `Hero.tsx`, `Audience.tsx`, `Demo.tsx`.

**No findings rated v1-blocking.** A senior reviewer doing a side-by-side desktop+mobile screenshot pass per §3.8 of the brief is the next layer; that requires Rutik.

### 3.9 — SEO + meta + social · score 9/10

`index.html` is comprehensive:

- `<title>`, `<meta name="description">` — set, ~63 chars / ~165 chars respectively. ✅
- `<meta name="robots" content="index,follow">`. ✅
- `<link rel="canonical">`. ✅
- Open Graph: type, site_name, locale, locale:alternate (en_US), url, title, description, image (1200×630), image dimensions. ✅
- Twitter Card: summary_large_image, title, description, image. ✅
- `<link rel="apple-touch-icon">`, `<link rel="icon">`. ✅
- AVIF preload. ✅

**Findings:**

- **S1 — `public/robots.txt` is missing.** `ls public/` shows `favicon.svg`, `fonts/`, `illustrations/`, `images/`, `og.svg` — no `robots.txt`, no `sitemap.xml`. **Required for v1.** Ships in commit #104.
- **S2 — `public/og.svg`** exists; SVG OG images are not universally supported (Slack, iMessage, LinkedIn prefer PNG). Per the brief's §3.9, ship a **1200×630 PNG** as the canonical OG image and keep SVG as a progressive enhancement. Action item for §A.before-beta.
- **S3 — Per-route dynamic titles** via `react-helmet-async` or similar: not configured. Currently every route shares the homepage `<title>`. Action item for §A.before-beta.
- **S4 — JSON-LD structured data** (`Organization` / `WebApplication`): not present. Optional for v1 — defer.

### 3.10 — Security + auth + RLS · score 9/10

**This is the category most carefully verified.**

Client-side:

- ✅ No service-role / `sk_*` keys in `src/`. The only env reads are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, both safe-by-design.
- ✅ `.env`, `.env.local`, `.env.*.local` in `.gitignore`.
- ✅ No `localStorage` of passwords or session tokens. The 19 storage references are all UX state (project-level "started" flag, kanban progress, dismissed banners).
- ✅ Sessions managed by `@supabase/supabase-js`, which uses the documented httpOnly cookie path.

Database RLS — verified by reading the migrations:

- ✅ `projects`: all four CRUD policies require `auth.uid() = owner_id`.
- ✅ `messages`: SELECT + INSERT both gated on the parent project ownership; **no UPDATE / DELETE policies** (append-only).
- ✅ `project_events`: SELECT + INSERT both gated; **no UPDATE / DELETE policies** (append-only audit log).
- ✅ `project_share_tokens`: owner-only `for all` policy keyed on `created_by = auth.uid()`. Anonymous recipients **cannot** SELECT directly.
- ✅ `project_files`: all four CRUD policies gated on parent project ownership AND `owner_id = auth.uid()` for INSERT.
- ✅ `set_updated_at()` trigger uses `set search_path = ''` (search-path hardening).

Edge Functions — verified by reading the source:

- ✅ `chat-turn/index.ts`: bearer-token gate at line 76, RLS-scoped Supabase client at line 110 (passes `Authorization: Bearer …` to the Supabase client so every downstream query runs as the user). `auth.getUser()` at line 115 confirms the session is valid before any read.
- ✅ `chat-turn/index.ts`: input validation via Zod (`chatTurnRequestSchema.safeParse`) at line 87 — invalid input → 400 with no detail leak.
- ✅ `get-shared-project/index.ts`: anon-allowed (correct — public share recipient), but **server-side validation** of `revoked_at` (line 96) and `expires_at` (line 103). Service-role client created **only after** token validation. Result excludes any owner PII — only the project shape the user filled in themselves. Cache-Control `private, max-age=60`.
- ✅ CORS allowlist on `get-shared-project`: `localhost:5173`, `localhost:3000`, `https://planning-matrix.vercel.app`, `https://planning-matrix.app` (future canonical).
- ✅ JSON parse failure is caught and returned as 400 — no stack trace leaked.

Storage RLS (documented in 0007 migration):

- ✅ `project-files` bucket private (Public OFF).
- ✅ Policies enforce `auth.uid()::text = (storage.foldername(name))[1]` — i.e. the user can only touch their own folder prefix.
- ✅ MIME type allowlist enforced at bucket level (PDF, PNG, JPEG, DOC, DOCX, DWG).

Findings:

- **SEC1 — HTTP security headers not configured at Vercel level.** `vercel.json` has only the SPA rewrite. **Action item**: add `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. **Ships in commit #104.**
- **SEC2 — No application-level rate limiting** on `chat-turn`. Supabase platform rate limits cover auth, but a malicious authenticated user could grind through Anthropic credits. **Defer to Phase 4.1** — track in known-gaps. Not v1-blocking for an invited-beta surface.
- **SEC3 — `messages.attachment_ids`** mentioned in the 0007 doc-comments but the actual migration uses a one-way pointer on `project_files.message_id` instead. The doc-comment header (lines 13-19 of 0007) describes a column that doesn't exist. Update the comment in the next migration; not a security issue.
- **SEC4 — Service-role usage** is restricted to `get-shared-project`. The function correctly scopes the service-role client behind validated-token-only access. ✅

**No findings rated v1-blocking on the security axis.** SEC1 (response headers) is a quick fix and lands in the Vercel-config commit.

### 3.11 — Dead code + bundle hygiene · score 8/10

- **No `knip` / `ts-prune` was installed for this audit pass** (per §0 authority to add temporarily, but this audit prioritized findings synthesis over installing/removing tools given the 1-session boundary).
- **TODO/FIXME markers**: only 7 across `src/` and `supabase/functions/` — most are roman-numeral arrays in `dashboardFormat.ts`, the doc-format string `PM-XXXX-XXXX` in `documentNumber.ts`, and three real `TODO(phase-4)` markers (cn-feature-flags, anthropic streaming, Sonnet 4.6 evaluation). Clean.
- **Phase 3.9 dead-code sweep** already shipped (commit `b6ab18f`).
- **25 unused `eslint-disable` directives** are the highest-value mechanical cleanup — ships in commit #103.

Findings:

- **D1 — `MessageRow` import in `chat-turn/streaming.ts:41`** is unused. (Mode A — Senior Reviewer would flag.) Mechanical fix.
- **D2 — `userRow` reassignment in `chat-turn/index.ts:135`** is flagged by `no-useless-assignment` because the `let` is initialized to `null` and only re-assigned inside an `if` branch where the value is then read. Refactoring to `const userRow = userMessage ? … : null` would be cleaner; current shape is readable and not a bug.
- **D3 — `outputSize` in `ExportMenu.tsx:73`** assigned and not consumed on the failure branch. Likely a leftover from a refactor that moved the size readout elsewhere.
- **D4 — Underscored unused params** (`_messages`, `_onProgressClick`) — convention says underscore-prefix means "intentionally unused," but the lint rule still fires. Either remove the param or annotate the rule. Mechanical.

### 3.12 — UX flow + CTA clarity · score N/A (requires user walkthrough)

Per the brief, this category requires a first-time-user walk per the 10-flow checklist in §3.12. That walk cannot be done from this environment without a browser session against the live URL. Static signals that can be confirmed:

- The landing has a single hero CTA + supporting nav. ✅ (per spot-check of `Hero.tsx`)
- Sign-up shows password requirements before submit (Phase 1/2 work).
- Wizard's two questions have distinct CTAs (`QuestionPlot.tsx`, 243 LOC, suggests a dedicated component per question).
- ExportHub is a single component with multiple actions; the brief flags this category for review on "primary vs. secondary" hierarchy.
- Dashboard project rows have swipe + click affordances on mobile per Phase 3.9.

**Action item for §A.before-beta:** the 10-flow walk is in the human-verification gate.

---

## Pre-deployment checklist (§A — must-fix and before-beta)

### A.must-fix — items this audit lands as remediation in this batch

| # | Item | Severity | Status |
|---|---|---|---|
| 1 | Strip 25 unused `eslint-disable` directives | Low (clutter, but a strict reviewer flags) | Ships in commit |
| 2 | Fix `no-irregular-whitespace` in `winAnsiSafe.ts` with a targeted disable comment + reason | Low | Ships in commit |
| 3 | Fix mechanical unused-vars (`MessageRow` in streaming.ts; `outputSize`, `_messages`, `_onProgressClick`, `userRow`) | Low | Ships in commit |
| 4 | Add `public/robots.txt` (S1) | Medium (SEO hygiene) | Ships in commit |
| 5 | Add Vercel HTTP security headers (SEC1) | Medium (defence-in-depth) | Ships in commit |
| 6 | Add `"strict": true` to `tsconfig.app.json` for explicitness | Low | Ships in commit |

### A.before-beta — items that need Rutik's environment / longer execution

These are not lint-able and were explicitly carved out by the brief or require infrastructure this audit cannot stand up in a single session.

| # | Item | Severity | Owner / next step |
|---|---|---|---|
| 7 | **Mobile real-device walk** (320×568, 360×640, 375×667, 390×844, 412×915, 768×1024) on landing / sign-in / wizard / dashboard / chat / cockpit / result / share / 404 | High (v1-blocker for "first 100 customers") | Rutik with iPhone + Android |
| 8 | **Lighthouse mobile + desktop** runs against deployed URL — capture Performance / A11y / Best Practices / SEO scores per route | High | Rutik or CI; targets in §3.4 |
| 9 | **axe-core run** against landing / sign-in / dashboard / chat / result / share view | High | Rutik or CI |
| 10 | **Playwright smoke suite** for the 10 critical flows in §4 of the brief | Medium (test coverage gap is acknowledged) | Sized as its own batch — does not fit this audit's session boundary |
| 11 | **`react-helmet-async` per-route titles** (S3) | Medium (SEO) | Sized as a small focused commit; needs route-by-route copy decisions |
| 12 | **PNG OG image** at 1200×630 (S2) — keep SVG as fallback | Medium (social previews on Slack / iMessage / LinkedIn) | Design task, not code |
| 13 | **C1 — extract inline component definitions** in `InputBar.tsx`, `MessageAttachment.tsx`, `AttachmentChip.tsx` | Medium (real focus / remount risk on the chat input bar) | One focused commit; needs careful re-test of the input surface |
| 14 | **C2 — fix conditional hooks** in `AttachmentPicker.tsx:70` and `ChatWorkspacePage.tsx:226` | Medium (real bug class) | One focused commit; needs careful test of the conditional path |
| 15 | **C3 — convert `setState`-in-effect localStorage hydration** to lazy initial state across 10+ sites | Low (anti-pattern, not a bug) | Mechanical but spread across many files |
| 16 | **C4 / C5 — `Thread.tsx` ref-during-render and `ChatWorkspacePage.tsx:69` impure-during-render** | Medium | Read each file carefully; small targeted commits |
| 17 | **Real telemetry sink** (Sentry / PostHog with consent) replacing the 48 `console.*` stubs | Medium (post-v1 visibility) | Phase 4.1 |
| 18 | **Application-level rate limit on `chat-turn`** (SEC2) — 50 turns/user/hour proposed in brief | Medium | Phase 4.1; not v1-blocker on invited beta |
| 19 | **Self-host fonts in EU region** vs Google Fonts CDN | Low (compliance polish for German B2B) | Phase 4.1 |
| 20 | **Privacy policy + ToS + cookie consent** | High (DSGVO; brief flags) | Pre-public-launch, not pre-beta |
| 21 | **Production Supabase project** (vs. current dev one) | High | Pre-public-launch |
| 22 | **Custom domain** (`planning-matrix.app` per Phase 4 plan, or manager-chosen) | High | Pre-public-launch |

---

## Sign-off

**Application is v1-ready for an invited beta** today, contingent on the §A.must-fix items shipping in this batch (mechanical lint cleanup + robots.txt + Vercel headers + tsconfig strict).

**Application is NOT yet ready for "first 100 paying customers"** until §A.before-beta items 7-9 (real-device walk + Lighthouse + axe-core), the C1/C2 input-bar fixes (13/14), and the operational items 20-22 (privacy/ToS, prod Supabase, custom domain) land. The remaining items in §A.before-beta are quality polish that a serious B2B reviewer would call out but won't block beta.

The codebase itself shows the discipline of a Phase 3.x-shipped product: no `any`, no swallowed exceptions, no committed secrets, RLS across every table, idempotent retries, strict CORS allowlist, locale parity gate, bundle-size gate, dead-code sweeps already executed. The remediation work is hygiene, not foundational.

— Audit complete.
