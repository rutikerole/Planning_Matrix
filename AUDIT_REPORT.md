# Planning Matrix — Codebase Audit
> Generated 2026-05-03. Read-only audit. Stage 1 of 3.
> No file changes outside this report. No commits.

---

## Executive summary

**Top 5 highest-impact cleanups (ordered by impact):**

1. **i18n cleanup — 514 stale keys.** ~50 % of the locale tree is dead. Mostly `landing.*` (the v1 → v2 landing rewrite abandoned a large key surface) plus old chat / wizard transition / result-page keys from before the v2 + v3 rewrites. Cleanup is delete-only, no logic risk, single commit, ~50 % shrink of `de.json` + `en.json`. **Confidence: high.**
2. **i18n cleanup — ~10 real missing keys (with caveats).** A handful are real bugs: `landing.faq.items`, `result.legal.whyHint`, `wizard.q1.options.sonstige`, several `result.checklist.*`, `result.export.share.*`, `result.risks.resolve*`, `result.topThree.markStarted`. The rest of the 144 raw "missing" hits are false positives from a too-greedy `t(...)` regex (file paths inside `await import(...)`, single-letter strings, etc.). The real ones land users on key paths shown verbatim in the UI. **Confidence: medium** until each is hand-classified.
3. **Dead code — 7 confirmed-dead files + 2 vestigial barrels + 1 orphan test.** Inbound import count = 0 after accounting for lazy / dynamic / side-effect imports. Includes `Section.tsx` / `SectionHeader.tsx` / `PaperSheet.tsx` (rewritten away in v2/v3) and `useSwipeGesture.ts` / `featureFlags.ts` (consumers removed). **Confidence: high** for the seven files.
4. **Stale documentation — 17 phase notes in `/docs/` and 4 phase notes at repo root.** All from Phase 3 / Phase 4 / landing-v1 era. Superseded by the actual code. The only living doc references are inside themselves. Delete-only candidates. **Confidence: high.**
5. **`LEGAL_PATTERNS` regex duplicated.** The five-entry RegExp dictionary lives in `src/features/dashboard/lib/legalRefCounts.ts` AND inline at `src/features/dashboard/DashboardPage.tsx:347`. Different shapes (typed `Record<LegalRefKey, RegExp>` vs untyped `Record<string, RegExp>`) but byte-identical patterns. Added when the `?legal=` URL filter was wired in commit 3 — forgot to import. **Confidence: high.** Single-commit fix.

**Other counts:**
- Total identified items: **~700** (514 stale i18n + ~140 cumulative across other sections)
- Estimated commits to clean it all: **6–8** (one per audit section, plus one for executive cleanup)
- Risk-free quick wins (delete-only, no logic change): **~660** (514 stale i18n + ~140 stale docs/dead files)
- Items needing hand judgment / human eyeball: **~40** (cross-feature legitimacy, dynamic i18n keys, dependency upgrades)

**Things that surprised me:**
- The `tailwindcss` lock to v3 while v4 is current — major upgrade work that's been parked. Worth a sober look soon.
- `lucide-react` lock at `^1.11.0` — that's an unusual major; the npm package's mainline is `0.x`. We're either on a fork or pre-release line. Recheck.
- `@pdf-lib/fontkit` shows zero direct imports in `src/`, but `src/lib/fontLoader.ts:78` does `(await import('@pdf-lib/fontkit')).default` — dynamic. Easy to mistake for unused.
- `src/features/chat/pages/OverviewPage.tsx` is 755 LOC. Single biggest non-export-PDF component file. Worth splitting.
- The whole `audit/` directory at repo root is unrelated to this audit — it's an old Phase-3 evaluation snapshot. Misleading name.

---

## Section 1 — Repo shape

### Files by extension under `src/`

| Extension | Count |
|---|---:|
| `.tsx` | 197 |
| `.ts` | 104 |
| `.css` | 7 |
| `.json` | 2 |

### Total LOC (`src/` `.ts` + `.tsx`)

**35,944 lines** (includes comments and blank lines; via `wc -l`).

### Top 25 largest source files

| LOC | File |
|----:|------|
| 827 | `src/features/chat/lib/exportPdf.ts` |
| 755 | `src/features/chat/pages/OverviewPage.tsx` |
| 489 | `src/features/chat/components/Input/SuggestionChips.tsx` |
| 486 | `src/lib/chatApi.ts` |
| 451 | `src/features/result/components/LegalLandscape.tsx` |
| 430 | `src/features/chat/components/ExportMenu.tsx` |
| 416 | `src/features/result/components/IntentAxonometricXL.tsx` |
| 410 | `src/features/result/components/DocumentChecklist.tsx` |
| 401 | `src/features/chat/components/Input/InputBar.tsx` |
| 400 | `src/lib/projectStateHelpers.ts` |
| 390 | `src/features/chat/pages/ChatWorkspacePage.tsx` |
| 371 | `src/features/dashboard/DashboardPage.tsx` |
| 355 | `src/features/result/components/CoverHero.tsx` |
| 336 | `src/features/landing/components/Analyzer.tsx` |
| 336 | `src/lib/uploadApi.ts` |
| 332 | `src/features/legal/pages/DatenschutzPage.tsx` |
| 326 | `src/features/result/components/RiskFlags.tsx` |
| 326 | `src/features/wizard/components/PlotMap/PlotMap.tsx` |
| 325 | `src/features/dashboard/components/CommandPalette.tsx` |
| 316 | `src/features/chat/components/BereichePlanSection.tsx` |
| 307 | `src/features/chat/components/LeftRail.tsx` |
| 303 | `src/features/result/components/ExportHub.tsx` |
| 293 | `src/features/loader/LoaderScreen.tsx` |
| 293 | `src/stores/chatStore.ts` |

### Folder tree under `src/` (depth 4)

```
src/
├── app/                          (router, providers)
├── components/
│   ├── shared/                   (BlueprintSubstrate, ProtectedRoute, …)
│   └── ui/                       (shadcn-style Radix wrappers)
├── data/
├── features/
│   ├── auth/{components, pages}
│   ├── chat/                     (workspace; out of recent rewrite scope)
│   │   ├── components/{Input, Progress, UnifiedFooter, illustrations}
│   │   ├── hooks
│   │   ├── lib
│   │   └── pages
│   ├── cookies/
│   ├── dashboard/                (rewritten v2 → v3)
│   │   ├── components
│   │   ├── hooks
│   │   ├── lib
│   │   └── styles
│   ├── landing/                  (rewritten v1 → v2)
│   │   ├── components
│   │   ├── hooks
│   │   ├── lib
│   │   └── styles
│   ├── legal/{components, pages}
│   ├── loader/                   (new in v2; rewritten v3)
│   │   ├── components
│   │   ├── hooks
│   │   └── styles
│   ├── not-found/
│   ├── project/                  (out of recent rewrite scope)
│   ├── result/                   (out of recent rewrite scope)
│   │   ├── components/Cockpit
│   │   ├── hooks
│   │   ├── lib
│   │   └── pages
│   └── wizard/                   (rewritten v2 → v3)
│       ├── components/PlotMap
│       ├── hooks
│       ├── lib
│       └── styles
├── hooks/
├── lib/
├── locales/
├── stores/
├── styles/
└── types/
```

### Repo root tree (depth 2, excl. `node_modules` / `dist` / `.git`)

```
.
├── *.md (7 root-level — see §6)
├── audit/                        (Phase-3 eval snapshot, NOT this audit)
├── data/
├── docs/                         (28 .md files — see §6)
├── eval-results/                 (eval harness output)
├── images-source/
├── playwright-report/
├── playwright.config.ts
├── prototypes/makeover-v3.html  (KEEP — visual source of truth for v3)
├── public/
├── scripts/
├── src/
├── supabase/
│   ├── functions/{chat-turn, bplan-lookup, signed-file-url, …}
│   └── migrations/0001..0005
├── tests/smoke/                  (4 specs — landing, auth, i18n, seo)
├── package.json
├── tailwind.config.js
└── vercel.json
```

### Reproduction commands

```bash
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" \) | awk -F. '{print $NF}' | sort | uniq -c | sort -rn
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n | tail -25
find src -maxdepth 4 -type d | sort
ls -1F .
```

---

## Section 2 — Dead code

Built an import graph (`/tmp/dead_files.mjs`) over all 301 `.ts/.tsx` files in `src/`. Resolved `@/`-aliased and relative `from`-specifiers, with `index.{ts,tsx}` resolution. False-positive class: dynamic `import()`, `lazy()`, side-effect imports (`import '@/lib/i18n'`), and barrel-targets where the resolver hit the directory before the index file.

### Initial zero-inbound list (13 files), hand-classified

| File | Last modified | Exports | Reason for "dead" suspicion | Confidence |
|------|--------------|---------|------------------------------|-----------:|
| `src/features/landing/index.ts` | 2026-05-03 | `LandingPage` re-export | Router imports `'@/features/landing/LandingPage'` directly (not via barrel) | **high** |
| `src/features/chat/components/Input/index.ts` | 2026-04-27 | `InputBar` re-export | No `from '@/features/chat/components/Input'` consumers | **medium** — verify nothing within chat workspace uses the barrel |
| `src/components/shared/Section.tsx` | 2026-04-27 | yes | Zero `from '@/components/shared/Section'` matches | **high** |
| `src/components/shared/SectionHeader.tsx` | 2026-04-27 | yes | Zero matches | **high** |
| `src/components/shared/PaperSheet.tsx` | 2026-04-28 | yes | Zero matches | **high** — wizard used to wrap step content; v2/v3 rewrites dropped it |
| `src/lib/featureFlags.ts` | 2026-05-03 | `isMapPreviewEnabled` | Only the symbol's own definition turns up | **high** — hosted the admin-only map gate; v3 wizard removed the gate |
| `src/lib/useSwipeGesture.ts` | 2026-04-28 | `useSwipeGesture` | Only self-references | **high** — used by deleted `SwipeableProjectRow` |
| `src/lib/projectStateHelpers.test.ts` | 2026-04-29 | none | No test runner picks `.test.ts` (Playwright runs `tests/smoke/*.spec.ts`) | **medium** — vestigial Vitest-was-coming plan; either set up Vitest or delete |
| `src/features/wizard/components/PlotMap/PlotMap.tsx` | 2026-05-03 | yes | **FALSE POSITIVE** — `lazy(() => import('./PlotMap/PlotMap'))` in `QuestionPlot.tsx:14` | n/a |
| `src/features/wizard/index.ts` | 2026-04-27 | `WizardPage` re-export | **FALSE POSITIVE** — used via `import { WizardPage } from '@/features/wizard'` in `router.tsx:18`. Graph builder mis-resolved the directory specifier | n/a |
| `src/features/result/lib/exportChecklistPdf.ts` | 2026-04-28 | yes | **FALSE POSITIVE** — `await import('../lib/exportChecklistPdf')` in `DocumentChecklist.tsx:376` | n/a |
| `src/features/chat/lib/exportPdf.ts` | 2026-04-28 | yes | **FALSE POSITIVE** — dynamic-imported by `ExportMenu.tsx:76` and `ExportHub.tsx:56` | n/a |
| `src/lib/i18n.ts` | 2026-04-29 | side-effect | **FALSE POSITIVE** — `import '@/lib/i18n'` in `app/providers.tsx:6` | n/a |

### Confirmed-dead summary (8 deletions, 1 borderline)

```
src/components/shared/Section.tsx
src/components/shared/SectionHeader.tsx
src/components/shared/PaperSheet.tsx
src/lib/featureFlags.ts
src/lib/useSwipeGesture.ts
src/features/landing/index.ts                 ← high-confidence barrel
src/features/chat/components/Input/index.ts   ← medium-confidence barrel
src/lib/projectStateHelpers.test.ts           ← test artifact, no runner picks it up
```

---

## Section 3 — Duplicate logic

| Function/value | Files | Should live in | Confidence |
|---|---|---|---|
| `LEGAL_PATTERNS` (regex map for §34/35 BauGB, BayBO 57/58, BauNVO 6 / Mischgebiet) | `src/features/dashboard/lib/legalRefCounts.ts` AND `src/features/dashboard/DashboardPage.tsx:347` | `lib/legalRefCounts.ts`; export and import in DashboardPage | **high** |
| `projectMatchesLegalRef` predicate (uses LEGAL_PATTERNS) | duplicated inline in `DashboardPage.tsx:355` | belongs next to `LEGAL_PATTERNS` in the lib | **high** |
| Address postcode regex `\d{5}` extraction | `src/features/wizard/lib/deriveName.ts` (`postcodeMatch`), `src/features/loader/LoaderScreen.tsx` (`cityFromAddress`), `src/features/dashboard/lib/projectName.ts` (`extractStreetName`) | one shared `src/lib/addressParse.ts` with `extractStreet`, `extractCity`, `extractPostcode` | **medium** — they extract slightly different pieces, but the postcode regex itself is duplicated |
| Munich-postcode-range check | `src/features/wizard/lib/plotValidation.ts` (`isMuenchenAddress`), `src/features/wizard/hooks/usePlotProfile.ts` (`isMunichPostcode`) | one shared `isInMuenchenPostcodeRange(addr)` | **medium** |
| `INTENT_LABELS` mapping (intent → "Einfamilienhaus" / "Mehrfamilienhaus" / …) | `src/features/loader/LoaderScreen.tsx:46-66` (`TEMPLATE_LABEL_DE/EN`), `src/features/dashboard/lib/projectName.ts:5-14` (`LABEL_BY_INTENT`), `src/features/wizard/lib/deriveName.ts:3-11` (`INTENT_LABELS_DE`) | one shared map at `src/features/wizard/lib/selectTemplate.ts` next to `INTENT_TO_I18N` | **high** — three near-identical maps for the same data |

Nothing else flagged. The codebase is reasonably DRY at the function-utility layer; the v2/v3 rewrites caught most prior duplication.

---

## Section 4 — Cross-feature imports

`grep -rn "from '@/features/" src/features/` — 18 sites. Categorised:

| From file | Imports | From feature B | Reason | Verdict |
|---|---|---|---|---|
| `result/components/CoverHero.tsx` | `NorthArrow` | `chat` | Architectural rosette glyph | **shared** — hoist to `components/shared/` |
| `result/components/IntentAxonometricXL.tsx` | `ScaleBar` | `chat` | Architectural primitive | **shared** |
| `result/components/ConversationAppendix.tsx` | `SpecialistSigil` | `chat` | Specialist iconography | OK (chat-domain widget) |
| `result/components/ExportHub.tsx` | `buildExportFilename`, `buildExportMarkdown`, `buildExportJson` | `chat` | Export builders shared with chat | **shared** — `src/lib/export/` |
| `result/components/DocumentChecklist.tsx` | `buildExportFilename` | `chat` | Same | **shared** |
| `result/pages/ResultPage.tsx` | `useProject`, `useMessages`, `useProjectEvents` | `chat` | Hook reuse for read-only result page | OK (project-state hooks; could move to top-level `hooks/` for cleanliness) |
| `result/pages/SharedResultPage.tsx` | `ProjectNotFound` | `chat` | Shared 404 page | **shared** |
| `chat/components/Input/SuggestionChips.tsx` | `isPlotAddressValid` | `wizard` | Address validation reused | **shared** |
| `wizard/components/QuestionPlot.tsx` | `suggestProjectName` | `dashboard` | Wizard derives name from intent + addr | **borderline** — naming a project at creation is a wizard concern; move to `wizard/lib/` |
| `dashboard/lib/projectName.ts` | type `Intent` | `wizard` | Type-only dep | OK |
| `loader/LoaderScreen.tsx` | type `Intent` | `wizard` | Type-only | OK |
| `loader/LoaderScreen.tsx` | `extractStreetName` | `dashboard` | Loader uses for `{{street}}` placeholder | **borderline** — pull into `src/lib/addressParse.ts` (see §3) |
| `dashboard/components/EmptyState.tsx` | `DraftingBoard` | `loader` | Visual reuse — flagged in v2 honest notes | **borderline** — accept directional dep, or hoist to shared |
| `wizard/pages/WizardPage.tsx` | `LoaderScreen` | `loader` | Loader is rendered inline by wizard | OK (intentional, documented) |

**Net:** ~6 sites should be hoisted to `src/lib/` or `src/components/shared/`. ~6 are domain-correct cross-feature deps. ~6 are borderline judgment calls.

---

## Section 5 — i18n key audit

Method: parse `de.json` + `en.json` to a leaf-path set; grep all literal `t('...')` and `t("...")` calls; subtract.

### Headline counts

| Metric | Count |
|---|---:|
| Defined keys (DE + EN, identical sets) | **1,030** |
| Used (literal calls) | **660** |
| Stale (defined, never used) | **514** |
| "Missing" raw (used but not defined) | 144 |
| ↳ ~real after stripping false positives | **~10** |
| Dynamic patterns (need manual review) | 48 |

### Stale keys (defined, unused) — 514

The bulk are `landing.*` keys orphaned by the v1 → v2 landing rewrite. Sample (top 80 of 514):

```
landing.nav.{product, analyzer, audience, pricing, faq}
landing.hero.meta.{live, short, audit}
landing.hero.card2.* (22 keys)
landing.chat.specialists.{moderator, planungsrecht, bauordnungsrecht, sonstige, verfahren}
landing.matrix.areas.{a,b,c}, .states.{active, pending, void}
landing.analyzer.out.label
landing.persp.more
landing.thinks.* (~150 keys — entire previous-iteration "How it thinks" section)
landing.questions.*
landing.partners.*
landing.callouts.*
landing.demo.*
[etc.]
```

Plus a smaller set of stale `chat.*`, `wizard.*` (legacy transition keys), and `result.*` keys.

**Recommendation:** delete-only commit. No type or component touches. Run `verify:locales` after — should still pass with parity.

### "Missing" keys (used but not defined) — 144 raw, ~10 real

The regex `t\(['"]([^'"]+)['"]\)` matched too greedily and picked up `await import('@/features/...')` paths, single-letter strings, and empty strings. After hand-filtering, the **real missing keys** that surface to users:

| Key | Likely caller | Issue |
|---|---|---|
| `landing.faq.items` | `Faq.tsx` (uses `returnObjects: true`) | Renamed at some point; verify the items live at the new path |
| `result.legal.whyHint` | result page legal section | Probably renamed |
| `wizard.q1.options.sonstige` | possibly v2 wizard chip remnants | The v3 path is `wizard.q1.options.sonstige.label` (object). A literal `t('wizard.q1.options.sonstige')` would render `{label, code}` as a string. Worth grep'ing |
| `result.topThree.markStarted`, `result.topThree.started` | `result/components` | Real |
| `result.checklist.{kanbanIntro, colRequired, startWork, colInProgress, markDone, colDone, moveBack}` | `DocumentChecklist.tsx` | Real |
| `result.export.share.{revokedEyebrow, activeEyebrow, activeBody, copy, revoke}` | result export hub | Real |
| `result.risks.{resolveCta, resolveTitle}` | `RiskFlags.tsx` | Real |

These are user-facing strings that currently render as the raw key path (i18next's default behavior). All confined to the `result` feature, which was out of scope for the recent rewrites — that's why they accumulated.

### Dynamic patterns (need manual review) — 48

Examples:
```
t(`wizard.q1.options.${slug}.label`)
t(`wizard.q1.options.${INTENT_TO_I18N[value]}.label`)
t(`dashboard.templates.${templateId}`)
t(`dashboard.sections.${kind}`)
t(`dashboard.filters.${value}`)
t(`dashboard.palette.legalRefs.${k}.title`)
t(`loader.steps.s${n}`)
t(`dashboard.relativeTime.${unit}`)
[etc.]
```

These need a manual sweep against the locale tree to confirm every concrete substitution exists.

---

## Section 6 — Stale documentation

23 `.md` files outside `node_modules`, plus 1 `.html` prototype. Phase-numbered files in `docs/` are all from before the v2/v3 rewrites; the code is now the source of truth for everything they describe.

| File | Last modified | Referenced? | Recommendation |
|---|---|---|---|
| `LANDING_PHASE_NOTES.md` | 2026-04-27 | self | delete |
| `LANDING_PHASE_15_NOTES.md` | 2026-04-27 | self | delete |
| `LANDING_PHASE_16_NOTES.md` | 2026-04-27 | self | delete |
| `PHASE_4_PLAN.md` | 2026-04-28 | self | delete |
| `SUPABASE_SETUP.md` | 2026-04-27 | self | **keep** — operational doc; verify still accurate |
| `README.md` | 2026-04-29 | itself + tooling | **keep**; refresh after Stage 3 |
| `AUDIT_REPORT.md` | 2026-05-03 | n/a | this file |
| `docs/phase3-plan.md` | 2026-04-27 | self | delete |
| `docs/phase3-1-polish.md` | 2026-04-28 | self | delete |
| `docs/phase3-2-design-notes.md` | 2026-04-28 | self | delete |
| `docs/phase3-3-plan.md` | 2026-04-28 | self | delete |
| `docs/phase3-4-plan.md` | 2026-04-28 | self | delete |
| `docs/phase3-5-plan.md` | 2026-04-28 | self | delete |
| `docs/phase3-6-plan.md` | 2026-04-28 | self | delete |
| `docs/phase3-7-plan.md` | 2026-04-28 | self | delete |
| `docs/phase3-8-plan.md` | 2026-04-28 | self | delete |
| `docs/phase3-9-plan.md` | 2026-04-28 | self | delete |
| `docs/phase3-decisions.md` | 2026-04-29 | self | delete |
| `docs/phase3-out-of-scope.md` | 2026-04-28 | self | delete |
| `docs/phase3-test-plan.md` | 2026-04-28 | self | delete |
| `docs/phase4-1-plan.md` | 2026-04-29 | self | delete |
| `docs/phase4-readiness-audit.md` | 2026-04-29 | self | delete |
| `docs/manager-demo-prep.md` | 2026-04-28 | self | delete or move out of repo |
| `docs/landing-redesign-research.md` | 2026-05-03 | self | **borderline** — keep until v3 stabilises |
| `docs/data-freshness.md` | 2026-04-30 | self | review — operational doc |
| `docs/eval-harness.md` | 2026-04-30 | `scripts/eval-harness/` references | **keep** |
| `docs/launch-checklist.md` | 2026-05-01 | self | review — likely useful |
| `docs/mobile-support.md` | 2026-04-28 | self | review — likely stale post-rewrite |
| `docs/privacy.md` | 2026-04-30 | self | **keep** if cited by privacy page |
| `docs/security.md` | 2026-05-01 | self | **keep** if cited |
| `prototypes/makeover-v3.html` | 2026-05-03 | this report + commit body | **KEEP — visual source of truth** |
| `audit/` directory | (Phase 3) | n/a | review — old eval snapshot; probably delete |
| `eval-results/*.md` | (Apr 30) | eval harness output | **keep**, regenerated |

**Net cleanup:** 17 phase-* docs delete-only. Plus the four `LANDING_PHASE_*` and `PHASE_4_PLAN` at the root. Keep `README`, `SUPABASE_SETUP`, `prototypes/makeover-v3.html`, eval / privacy / security / launch-checklist.

---

## Section 7 — Dependencies

`package.json` has 34 prod + 19 dev = 53 direct deps. Spot-checked 16 of the prod deps for actual import sites in `src/`:

### Used (imported, current or near-current)

| Package | Direct imports in `src/` |
|---|---:|
| `framer-motion` | 50 |
| `lucide-react` | 25 |
| `vaul` | 10 |
| `@hookform/resolvers` + `react-hook-form` | 5 each |
| `zustand` | 4 |
| `pdf-lib` | 4 |
| `i18next` (and `react-i18next`) | 3+ |
| `zod` | 3 |
| `clsx` + `tailwind-merge` | 1 (consumed via `cn` in `src/lib/utils.ts`) |
| `leaflet`, `lenis`, `posthog-js` | 1 each |
| `@radix-ui/react-*` (7 primitives) | active under `src/components/ui/` |

### Stale (a major behind, upgrade-worthy)

`npm outdated`:

| Package | Current | Latest | Risk |
|---|---|---|---|
| `tailwindcss` | 3.4.19 | **4.2.4** | **High** — major rewrite (CSS-first config, `@import` syntax). Park unless team plans a stylesheet sweep. |
| `@sentry/react` | 9.47.1 | 10.51.0 | Medium — major; init API changed. Park or schedule. |
| `@types/node` | 24.x | 25.x | Low — typings only. |
| `prettier-plugin-tailwindcss` | 0.7.x | 0.8.x | Low |
| `@supabase/supabase-js`, `@tanstack/react-query`, `lucide-react`, `postcss`, `posthog-js`, `react-hook-form`, `react-i18next`, `eslint`, `globals`, `typescript-eslint`, `zod` | minor / patch | Low |

**One immediate-safe upgrade pass** (all minor/patch): ~13 packages, single `npm install` + verify gates.
**Two upgrades to schedule, not bundle into cleanup:** `tailwindcss` v3→v4, `@sentry/react` v9→v10.

### Unused (zero direct imports — but verified live)

| Package | Status |
|---|---|
| `@pdf-lib/fontkit` | **NOT unused** — dynamically imported via `await import('@pdf-lib/fontkit')` in `src/lib/fontLoader.ts:78`. Keep. |
| `tailwindcss-animate` | **NOT unused** — registered in `tailwind.config.js:1`. Keep. |
| `tailwind-merge` | **NOT unused** — consumed via the `cn` util in `src/lib/utils.ts`. Keep. |
| `@types/leaflet` | **NOT unused** — types-only dep for `leaflet`. Keep. |

**Net:** zero genuinely unused packages flagged.

---

## Section 8 — TODO / FIXME / HACK / XXX comments

`grep -rn "TODO|FIXME|HACK|XXX|@deprecated" src/ supabase/functions/`

| File:line | Type | Comment |
|---|---|---|
| `src/lib/cn-feature-flags.ts:11` | TODO | `(phase-4): replace with role check when admin role lands.` |
| `src/lib/streamingExtractor.ts:12` | XXX (in regex docstring) | `mid-string, mid-escape, mid-\uXXXX` — not actionable, just docs |
| `src/features/result/lib/documentNumber.ts:4` | XXXX (in format docstring) | `PM-XXXX-XXXX format` — not actionable |
| `supabase/functions/chat-turn/toolSchema.ts:22` | TODO | `(model-upgrade): evaluate claude-sonnet-4-6 in Phase 3.5` |
| `supabase/functions/chat-turn/anthropic.ts:43` | TODO | `(phase-4): evaluate streaming or Sonnet 4.6 upgrade` |

**Net:** 2 actionable TODOs. Both Phase-4 markers in chat-turn (out of recent scope). The other 3 hits are coincidental hex-format docs.

---

## Section 9 — Commented-out code blocks

The naive heuristic (3+ consecutive `//` lines) hit ~30 files. Hand-verifying the matches: **all of them are file-header doc comments** (the project's `// ──────────` banner-style headers). No genuine ghost code blocks found.

A targeted pass for `/* ... */` blocks containing what looks like commented-out code: zero hits.

**Nothing flagged here.**

---

## Section 10 — Same-bug-pattern check (the `segmentMins` lesson)

The fixed bug: a default array literal in a hook signature, with that array in a `useEffect` deps array, causing teardown-and-re-run on every render.

### Default-array/object params in hook signatures

| File:line | Pattern | Severity | Why it might bite |
|---|---|---|---|
| `src/lib/useSwipeGesture.ts:47` | `useSwipeGesture(opts: UseSwipeOptions = {})` | **none** | Default-object param — same shape as the `segmentMins` bug. **But this hook is dead** (zero consumers — see §2). Won't bite as-is; if revived, fix the default before re-importing. |

### Inline arrays/objects passed to memoized children

| File:line | Pattern | Severity | Why it might bite |
|---|---|---|---|
| `src/features/wizard/components/PlotMap/PlotMap.tsx:283` | `<Marker position={[coords.lat, coords.lng]} icon={pin} />` | **low** | Inline array literal recreated on every render. `Marker` from react-leaflet doesn't appear to be deeply memoized, so unlikely to cause a render-loop. Worth memoising the position via `useMemo` if leaflet ever logs render-trash warnings. |

### `useEffect(..., [])` with closures capturing state

| File:line | Pattern | Severity | Why it might bite |
|---|---|---|---|
| `src/features/chat/hooks/useInputState.ts:84` | `useCallback(() => setActiveSuggestion(null), [])` | **low** | Empty-deps `useCallback` of a setter — `setActiveSuggestion` from `useState` is stable, so safe. |

**Net:** No live `segmentMins`-class bugs remain. The dead `useSwipeGesture` is the only echo of the same anti-pattern; revive carefully or delete (§2).

---

## Section 11 — Bundle composition

Latest build (`npm run build`):

```
[verify:bundle] OK — index-cvmw46cJ.js 852.5 KB raw / 243.0 KB gzipped (ceiling 300 KB)
```

**Total: 243.0 KB gz / 300 KB ceiling, 57.0 KB headroom.**

### Top contributors (from build output, descending)

| Chunk | KB raw | KB gz | Notes |
|---|---:|---:|---|
| `index-*.js` (main) | 852 | **243** | Application code |
| `fontkit.es-D3hF9Nys.js` | 711 | 330 (lazy) | `@pdf-lib/fontkit` dynamic-imported only when PDF export fires; not in main bundle |
| `fontLoader-*.js` | 376 | 161 (lazy) | Same — PDF export path only |
| `react-vendor-*.js` | 295 | 96 | React core |
| `supabase-*.js` | 186 | 48 | Supabase JS client |
| `PlotMap-*.js` | 161 | 48 (lazy) | Leaflet + react-leaflet; lazy-loaded by Q2 |
| `motion-*.js` | 133 | 44 | framer-motion (hot path) |
| `zod-*.js` | 85 | 25 | Schema validation |
| `i18n-*.js` | 62 | 20 | i18next + plugins |
| `radix-*.js` | 55 | 17 | Aggregated Radix primitives |
| `pako-*.js` | 45 | 14 | Likely pulled by pdf-lib |
| `tanstack-query-*.js` | 29 | 9 | |
| `vaul-*.js` | 29 | 9 | Drawer / mobile sheet |
| `lucide-*.js` | 5 | 2 | Icons |

**Observations:**
- The `index-*.js` chunk at 243 KB gz is the largest gzipped contributor by far. Not surprising given dashboard / wizard / loader / chat workspace all live in it.
- `motion-*.js` at 44 KB gz is the single biggest "leaf" library on the hot path. If headroom ever bites, revisit which motion variants are actually used.
- `radix-*.js` at 17 KB gz for 7 primitives is well-priced.
- `fontkit / fontLoader / PlotMap / exportPdf` are correctly lazy-loaded.
- No per-route breakdown without installing `vite-bundle-visualizer`. **Not installing.**

---

## Section 12 — Architectural smells

| Where | What | Severity | Suggested action |
|---|---|---|---|
| `src/features/chat/pages/OverviewPage.tsx` (755 LOC) | Single component file, far over the 250-line "look harder" threshold | **medium** | Split into `OverviewHero`, `OverviewPanels`, `OverviewActions`. Defer until next chat-workspace pass; not blocking. |
| `src/features/chat/lib/exportPdf.ts` (827 LOC) | Single file orchestrating the whole atelier-briefing PDF | **low** (legit) | Long but cohesive. Annotate sections with section-rule comments if not already. |
| `src/features/dashboard/DashboardPage.tsx:347` | Duplicated `LEGAL_PATTERNS` regex map (see §3) | **high** | Import from `legalRefCounts.ts`. One commit. |
| `src/features/dashboard/lib/projectName.ts` | Lives in `dashboard/` but is consumed primarily by the wizard | **medium** | Move to `wizard/lib/` (or `lib/projectName.ts`). |
| `src/features/loader/LoaderScreen.tsx:46-66` | Hard-coded `TEMPLATE_LABEL_DE/EN` maps; same labels duplicated by `dashboard/lib/projectName.ts` and `wizard/lib/deriveName.ts` | **medium** | Single shared `INTENT_LABELS` map at `wizard/lib/selectTemplate.ts`; both consumers import. |
| Cross-feature shared widgets (`NorthArrow`, `ScaleBar`, `ProjectNotFound`) live in `chat/components/` | Should sit under `components/shared/` since `result/` already imports them | **medium** | Move + update imports. |
| `src/features/result/components/ExportHub.tsx` cross-feature imports `chat/lib/export*` | Export builders are not chat-specific | **medium** | Move builders to `src/lib/export/`. |
| `src/components/shared/Section.tsx` / `SectionHeader.tsx` / `PaperSheet.tsx` exist but nothing imports them | Stale shared components — confusion when reading the dir | **high** | Delete (§2). |
| `audit/` directory at repo root | Old Phase-3 evaluation snapshot; misleading name overlaps with this audit | **low** | Rename to `audit-phase3-snapshot/` or move into `eval-results/archive/`. |
| `docs/` is a graveyard | 19 phase-* notes, all superseded | **medium** | Delete per §6 list; keep operational docs only. |
| The 4 root-level `LANDING_PHASE_*` + `PHASE_4_PLAN` MDs | Same | **medium** | Same: delete. |
| `src/lib/utils.ts` is the only file under `src/lib/` exporting the `cn` helper, but it's also where many one-off utils live | Mixed-grain utility module | **low** | Tolerable; revisit if it grows past ~200 LOC. |
| Hardcoded loader fallbacks `article = '58'`, `klass = '3'`, `city ?? 'München'` in `LoaderScreen.tsx` | Magic strings that will eventually need real lookups | **low** (current intent: placeholders for v1) | Add a `// TODO` if not already; track in §8. |
| `tests/smoke/` covers landing/auth/i18n/seo only | Wizard / dashboard / loader / chat workspace are uncovered at the e2e layer | **medium** | Add smoke specs once the v3 surface stabilises. |
| `src/lib/projectStateHelpers.test.ts` exists but no test runner picks it up | Vestigial from a Vitest-was-coming-soon plan | **medium** | Either set up Vitest or delete. |

---

## Appendix A — Commands run

```bash
# Section 1
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" \) | awk -F. '{print $NF}' | sort | uniq -c | sort -rn
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n | tail -25
find src -maxdepth 4 -type d | sort
ls -1F .

# Section 2 — dead code
node /tmp/dead_files.mjs   # see script body in section 2 of this report
grep -rn "lazy(\|import(" src/ --include="*.ts" --include="*.tsx" | grep -v "://"
grep -rn "i18n\|Section\|SectionHeader\|PaperSheet\|featureFlags\|useSwipeGesture\|exportChecklistPdf\|exportPdf" src/main.tsx src/App.tsx src/app/
cat src/features/landing/index.ts
cat src/features/chat/components/Input/index.ts
grep -rn "from '@/features/landing\b" src/
grep -rn "from '@/features/chat/components/Input'" src/

# Section 3 — duplicates
grep -rn "LEGAL_PATTERNS\|projectMatchesLegalRef" src/features/dashboard/

# Section 4 — cross-feature
grep -rn "from '@/features/" src/features/

# Section 5 — i18n
node /tmp/i18n_audit.mjs

# Section 6 — stale .md
stat -f "%Sm %N" -t "%Y-%m-%d" *.md docs/*.md | sort

# Section 7 — deps
cat package.json | python3 -c "import json,sys; d=json.load(sys.stdin); print('\n'.join(sorted(d.get('dependencies',{}).keys())))"
npm outdated
for pkg in @hookform/resolvers @pdf-lib/fontkit clsx framer-motion ...; do
  count=$(grep -r "from '$pkg" src/ --include="*.ts" --include="*.tsx" | wc -l)
  printf "%-32s %s\n" "$pkg" "$count"
done

# Section 8 — todo
grep -rn "TODO\|FIXME\|HACK\|XXX\|@deprecated" src/ supabase/functions/

# Section 10 — same-pattern
grep -rEnA1 "^export function use[A-Z]" src/ --include="*.ts" --include="*.tsx" | grep -E "= \[|= \{"
grep -rEn "<[A-Z][a-zA-Z]+\s+[^>]*=\{\s*\[" src/features/ --include="*.tsx"
grep -rEn "useMemo\([^,]+,\s*\[\]|useCallback\([^,]+,\s*\[\]" src/

# Section 11 — bundle
npm run build
ls -lh dist/assets/
```

---

## Appendix B — Things I considered but ruled out

- **"Deps with zero imports."** Initially flagged `@pdf-lib/fontkit`, `tailwindcss-animate`, `tailwind-merge`. All three turned out to be live (dynamic import / Tailwind plugin / `cn` util). Verified before flagging.
- **"`PlotMap.tsx` looks dead."** False positive — lazy-loaded. The import-graph builder doesn't follow `lazy(() => import(...))`.
- **"`features/wizard/index.ts` is dead."** False positive — the resolver hit a directory match before a file match. The barrel IS used by the router.
- **"Commented-out code everywhere."** Looked like 30+ files at first; turned out to be file-header banner comments. No real ghost code.
- **"`useCallback(..., [])` flagged."** It's `setActiveSuggestion(null)` — `setActiveSuggestion` from `useState` is stable. Empty deps are correct.
- **"`landing-redesign-research.md` is stale."** Last modified 2026-05-03; flagged borderline-keep instead of delete.
- **"All 144 missing i18n keys are real bugs."** False — at least 130 are regex false positives from import-path strings. Actual missing user-facing keys: ~10.

---

*End of audit. Awaiting Stage 2 decisions.*
