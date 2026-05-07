# DIAGNOSTICS.md

Captured 2026-05-07 against branch `main` head `940b6ec` (post Tasks 1-2).
Numbers only. No recommendations.

---

## A. Bundle size

**Summary.** Single largest gz chunk (`index-BLFhrt8n.js`) is **263.9 KB
gz** (897.8 KB raw). The 300 KB gz ceiling enforced by
`scripts/verify-bundle-size.mjs` passed with 36.1 KB of headroom (12 %).
Total gz across all 19 JS chunks + 2 CSS files (computed by summing the
`gzip:` column) is **~1.04 MB gz**; the SPA only loads a subset on first
paint (lazy chunks for `PlotMap`, `AdminRoutes`, `InlineLogsDrawer`,
`exportPdf`, `fontkit.es`, etc.).

```
> npm run build   →   build OK in 790ms

dist/index.html                              5.09 kB │ gzip:   1.75 kB
dist/assets/PlotMap-DWye7P4G.css            17.73 kB │ gzip:   7.11 kB
dist/assets/index-D7sOgtgU.css             103.54 kB │ gzip:  19.67 kB
dist/assets/rolldown-runtime-BYbx6iT9.js     0.82 kB │ gzip:   0.47 kB
dist/assets/resolveProcedures-Dn3Ya98p.js    2.42 kB │ gzip:   1.17 kB
dist/assets/resolveRoles-C2OLPfFu.js         2.86 kB │ gzip:   1.24 kB
dist/assets/lucide-Cp4p48_N.js               5.71 kB │ gzip:   2.48 kB
dist/assets/TraceCard-D3E1p5XL.js            9.44 kB │ gzip:   3.50 kB
dist/assets/InlineLogsDrawer-Vlrz4Hvi.js    22.45 kB │ gzip:   5.65 kB
dist/assets/vaul-CR09F0si.js                28.68 kB │ gzip:   8.62 kB
dist/assets/tanstack-query-hfWccqpm.js      29.07 kB │ gzip:   8.96 kB
dist/assets/pako-BMBgnuA4.js                45.21 kB │ gzip:  14.40 kB
dist/assets/AdminRoutes-PqqVITD6.js         49.92 kB │ gzip:  11.72 kB
dist/assets/i18n-bG9ZHSoM.js                61.86 kB │ gzip:  20.14 kB
dist/assets/zod-B8jsFeDQ.js                 86.57 kB │ gzip:  25.67 kB
dist/assets/radix-4n8jwmtr.js              123.83 kB │ gzip:  37.42 kB
dist/assets/motion-N8RaL4-a.js             132.93 kB │ gzip:  43.64 kB
dist/assets/PlotMap-CEnylyTh.js            162.33 kB │ gzip:  48.52 kB
dist/assets/supabase-39Obu2Vi.js           186.18 kB │ gzip:  48.32 kB
dist/assets/react-vendor-CGym89l_.js       295.67 kB │ gzip:  95.86 kB
dist/assets/exportPdf-R_Izhsqk.js          384.90 kB │ gzip: 164.77 kB
dist/assets/fontkit.es-pAJJQD0J.js         711.17 kB │ gzip: 329.72 kB
dist/assets/index-BLFhrt8n.js              919.32 kB │ gzip: 271.96 kB
```

```
> node scripts/verify-bundle-size.mjs

[verify:bundle] OK — index-BLFhrt8n.js 897.8 KB raw / 263.9 KB gzipped (ceiling 300 KB)
```

Per-chunk top-3 by gz weight:

1. `fontkit.es-pAJJQD0J.js` — 329.72 KB gz (lazy-loaded; `pdf-lib` dep)
2. `index-BLFhrt8n.js` — 271.96 KB gz (main; ceiling-tracked)
3. `exportPdf-R_Izhsqk.js` — 164.77 KB gz (lazy-loaded; briefing PDF export)

Build emitted four `class is ambiguous` warnings on Tailwind utilities
(`duration-[160ms]` × 1, `duration-[240ms]` × 1, `duration-[320ms]` × 1,
`ease-[cubic-bezier(0.16,1,0.3,1)]` × 1). One Vite reporter warning on
chunks > 800 kB raw (`fontkit.es` and `index`). All are warnings, not
errors; build exited 0.

**Headroom vs MEMORY.md ceiling claim (300 KB gz):** **+36.1 KB** (12 %).

---

## B. i18n DE/EN null-count (static audit)

**Summary.** Live-DB sampling unavailable from this audit shell.
Static-source counts: **223** total references to `*_en` fields across
`src/` + `supabase/functions/`. **9** code paths that compensate for
null/empty `_en` at runtime (`?? ''`, `?? null`, `?? <_de>`). **10**
type declarations marking `_en` fields as optional/nullable.

The schema-required `_en` field is **`message_en`** (Zod `.min(1)`,
`src/types/respondTool.ts:201`). All other paired `_en` fields
(`title_en`, `detail_en`, `rationale_en`, `ctaLabel_en`,
`thinking_label_en`, `likely_user_replies_en`) are
`.optional()` in Zod, so a model omission produces an emit-time
absence rather than a runtime error. The 9 fallback hits below show
where the SPA quietly handles the absence.

### Required `_en` fields (Zod-mandatory)

| Field          | File                           | Line | Required? |
| -------------- | ------------------------------ | ---- | --------- |
| `message_en`   | src/types/respondTool.ts       | 201  | ✓ (`.min(1)`)  |
| `label_en`     | src/types/respondTool.ts       | 71   | ✓ (per-row inside `inputOptionSchema`) |

### Optional `_en` field declarations (Zod or TS)

```
src/types/chatTurn.ts:135                    content_en
src/types/db.ts:39                           content_en
src/types/respondTool.ts:109                 ctaLabel_en
src/types/respondTool.ts:130                 title_en          (procedures_delta)
src/types/respondTool.ts:133                 rationale_en      (procedures_delta)
src/types/respondTool.ts:149                 title_en          (documents_delta)
src/types/respondTool.ts:168                 title_en          (roles_delta)
src/types/respondTool.ts:171                 rationale_en      (roles_delta)
src/types/respondTool.ts:209                 thinking_label_en
supabase/functions/chat-turn/persistence.ts:49  content_en
```

(10 declarations.)

### Runtime fallback compensations (places where `_en` null is silently turned into something else)

```
src/features/chat/hooks/useChatTurn.ts:286   thinking_label_en ?? null
src/features/result/lib/composeLegalDomains.ts:50  rationale_en ?? ''
src/lib/projectStateHelpers.ts:186           title_en ?? ''        (recommendations_delta upsert)
src/lib/projectStateHelpers.ts:188           detail_en ?? ''       (recommendations_delta upsert)
src/lib/projectStateHelpers.ts:254           title_en ?? ''        (procedures_delta upsert)
src/lib/projectStateHelpers.ts:257           rationale_en ?? ''    (procedures_delta upsert)
src/lib/projectStateHelpers.ts:303           title_en ?? ''        (documents_delta upsert)
src/lib/projectStateHelpers.ts:352           title_en ?? ''        (roles_delta upsert)
src/lib/projectStateHelpers.ts:355           rationale_en ?? ''    (roles_delta upsert)
```

(9 hits.)

### Sampled production / eval data

Two eval-harness reports exist on disk:

- `eval-results/2026-04-30T10-49-11Z.md` — 458 lines, 0 occurrences of any `*_en` token in the captured excerpt body.
- `eval-results/2026-05-04T06-58-33Z.md` — 454 lines, 0 occurrences. The harness samples the `Excerpt (DE)` column only; `_en` mirroring is not recorded.

A live message_en/title_en/etc. null-rate cannot be computed from the
artefacts in the repo. Two paths to a real number, not taken here
because they go beyond Task 3's scope:

1. `select count(*) filter (where content_en is null)::float / count(*) from public.messages where role = 'assistant' and created_at > now() - interval '7 days';`
2. Re-run the eval harness with the response body captured to JSON
   instead of just the DE excerpt (`scripts/eval-harness/run.mjs` would
   need a flag).

### Total `*_en` references

```
> grep _en pattern across src/ + supabase/, .ts/.tsx/.mjs only:
223
```

---

## C. Shadow-token blame

**Summary.** Lines 178-184 of `src/styles/globals.css` (the
`[data-mode='operating']` block declaring `--pm-shadow-input` and
`--pm-shadow-card` with non-zero values) were introduced by **commit
`8631bde`** on **2026-04-28** by **rutikerole**. The commit message is
`feat(chat): persistent input bar with attachments + suggestion-chip-above-input pattern`.
Lines 185-190 (the immediately following `Phase 3.7 #80` comment) were
added in commit `09112e3` on the same day, which carries the message
`fix(visual): typography legibility + softer-edge tokens (sweep across operating mode)` —
that's the "softer-edge" refactor the comment mentions, but the
underlying non-zero shadow values are from `8631bde` first.

```
> git blame -L 178,190 src/styles/globals.css

8631bde8 (rutikerole 2026-04-28 17:27:25 +0530 178)   [data-mode='operating'] {
8631bde8 (rutikerole 2026-04-28 17:27:25 +0530 179)     --pm-radius-input: 0.75rem;
8631bde8 (rutikerole 2026-04-28 17:27:25 +0530 180)     --pm-radius-card: 1rem;
8631bde8 (rutikerole 2026-04-28 17:27:25 +0530 181)     --pm-radius-pill: 9999px;
8631bde8 (rutikerole 2026-04-28 17:27:25 +0530 182)     --pm-shadow-input: 0 1px 2px hsl(220 15% 11% / 0.04);
8631bde8 (rutikerole 2026-04-28 17:27:25 +0530 183)     --pm-shadow-card: 0 1px 3px hsl(220 15% 11% / 0.06);
8631bde8 (rutikerole 2026-04-28 17:27:25 +0530 184)     --pm-tracking-body: 0.005em;
09112e38 (rutikerole 2026-04-28 19:25:32 +0530 185)
09112e38 (rutikerole 2026-04-28 19:25:32 +0530 186)     /* Phase 3.7 #80 — typography uplift + softer-edge tokens.
09112e38 (rutikerole 2026-04-28 19:25:32 +0530 187)      * Eyebrows, timestamps, qualifier badges all bump 1 px and the
09112e38 (rutikerole 2026-04-28 19:25:32 +0530 188)      * clay opacity floor lifts from 55–65 % to 72 % so the small text
09112e38 (rutikerole 2026-04-28 19:25:32 +0530 189)      * actually reads at viewing distance. Buttons + cards in operating
09112e38 (rutikerole 2026-04-28 19:25:32 +0530 190)      * mode get rounded corners (atelier defaults at :root stay sharp). */
```

```
> git log --pretty="%h %ad %an %s" --date=short 8631bde -1

8631bde 2026-04-28 rutikerole feat(chat): persistent input bar with attachments + suggestion-chip-above-input pattern
```

Recent file history (top of `git log --all -- src/styles/globals.css`,
truncated):

```
8eacdb7 2026-05-06 feat(chat): atelier-at-work thinking indicator
7ffb8b0 2026-05-05 feat(result): Phase 8 commit 12 — tab cross-fade + print stylesheet + reduced-motion
e1090b4 2026-05-05 chore(chat-spine): width 300 px + sidebar typography +1 px scale
15a2397 2026-05-05 chore(chat): --spine-width 252 → 272 px (breathing room)
2474f82 2026-05-05 feat(chat): --spine-width 240 → 252 px
7ac9390 2026-05-05 feat(chat): past-turn label simplified, fade flat 0.5
c292cf2 2026-05-05 feat(chat): conversation column 720 → 820 px max-width
5effb13 2026-05-04 fix(chat-spine): SpineHeader paper-on-paper, no card outline
c32494c 2026-05-04 feat(chat-spine): ruled-paper substrate + Roman numerals + live-bar glow
69873e7 2026-05-04 feat(chat-spine): live-stage halo pulse + transition animations
2025a47 2026-05-04 feat(chat-spine): scaffold Spine container and CSS tokens
f695c5b 2026-05-04 feat(chat-tokens): add chamber design tokens
81423dd 2026-05-04 feat(chat): right-rail liveness — Top3/Eckdaten fresh + areas pulse (Move 10)
534b74b 2026-05-04 chore(tokens): add Phase 7 Living Drafting Table tokens
fc4b30a 2026-05-01 feat(launch): a11y skip-link + 404 dual CTA + CSP/security headers + secret rotation doc
7d5a7ed 2026-05-01 feat(privacy): self-host Instrument Serif + Inter fonts (remove Google Fonts CDN — DSGVO LG München 2022)
f2b51e6 2026-04-28 feat(mobile): cockpit card-list + result-page section spacing + radial scale-down
f056ea4 2026-04-28 feat(mobile): viewport-aware token system + global mobile primitives
09112e3 2026-04-28 fix(visual): typography legibility + softer-edge tokens (sweep across operating mode)
8631bde 2026-04-28 feat(chat): persistent input bar with attachments + suggestion-chip-above-input pattern
```

No Linear / Jira / phase-ticket reference in either commit message
beyond the inline `Phase 3.7 #80` annotation in the file comment block.
The `09112e3` "softer-edge tokens" commit message is the closest to a
design-review reference; no linked ticket id.
