# Phase 7.9 — Match the Prototype: Findings

**HEAD at audit:** `ff64a09 fix(chat): edge-case sweep for ConversationStrip on 375 px`

The brief is "match the prototype." The prototype is a single-page screenshot of the chat workspace with a left sidebar, a chromeless conversation column with a tiny floating strip, and an edge-to-edge input bar. Words have failed; the prototype is the spec.

This doc inventories the gaps between the live build (post 7.8) and the prototype, names the files each change touches, and lists the commit sequence.

---

## 1. Visible deltas (live → prototype)

| # | Delta | What live shows | What prototype shows |
|---|---|---|---|
| 1 | Top bar | 48 px global `AppHeader` (wordmark + DE/EN + RE) above the Spine | No top bar at all. Sidebar starts at `top:0` of viewport. |
| 2 | Sidebar crown | None | Wordmark crown row at top: 18×18 glyph + "Planning Matrix" lockup, hairline-bottom |
| 3 | Sidebar auth zone | None — auth lives in the dead `AppHeader` band | DE/EN segmented switch (left) + RE avatar with chevron (right), below Open briefing button |
| 4 | Strip second line | "SYNTHESIS · LIVE" eyebrow + "Synthesis · speaking now" sub | One line: "{SPECIALIST} · LIVE" + 38 px dial. No sub. |
| 5 | Strip border | 0.5 px hairline-bottom + paper-92% bg | No border. Just bg + blur. Floats invisibly. |
| 6 | Conversation max-w | 720 px (`--chamber-col-max`) | 820 px |
| 7 | Past turn label | sigil + 13 px italic name + dot + clay running-head | No sigil. 16 px italic Georgia name only. |
| 8 | Active chapter | 28 px italic Georgia (correct since 7.8) | Same. Keep. |
| 9 | Body indent | ml-14 (56 px) on body + attachments | Same. Keep. |
| 10 | Past turn fade | `clamp(0.32, 1 - distance * 0.18, 1)` (0.46 at distance 3) | Flat 0.5 |
| 11 | Blueprint grid | Visible 4 % alpha behind chat | Killed entirely |
| 12 | Spine width | `--spine-width: 240px` | 252 px |
| 13 | Round caps | 10 px tracking 0.20em | 9.5 px tracking 0.22em |
| 14 | Stand-up link | mono caps 10.5 px clay/82 | italic Georgia 11.5 px clay dotted underline |

The `[render-check-deferred]` rule (Phase 7.7 / 7.8) applies to every visual commit below.

---

## 2. Files touched

| File | Why |
|---|---|
| `src/app/router.tsx` | Add `hideAppHeader` to the `/projects/:id` route. |
| `src/features/chat/components/Chamber/ChamberLayout.tsx` | `appHeaderHeight` becomes 0 — spine starts at viewport top. |
| `src/features/chat/components/Chamber/Spine/Spine.tsx` | Top offset `top-12 → top-0`. |
| `src/features/chat/components/Chamber/Spine/SpineHeader.tsx` | Add wordmark crown above project section. |
| `src/features/chat/components/Chamber/Spine/SpineFooter.tsx` | Add auth zone (LanguageSwitcher + UserMenuTrigger) below briefing CTA. |
| `src/features/chat/components/Chamber/Spine/SpineMobileTrigger.tsx` | Mobile drawer — auth zone goes inside. |
| `src/features/chat/components/Chamber/ConversationStrip.tsx` | Drop sub-line and border-bottom. |
| `src/features/chat/components/Chamber/MessageAssistant.tsx` | Past turn: 16 px italic Georgia, no sigil, no running-head. |
| `src/features/chat/components/Chamber/ChamberLayout.tsx` | Drop `BlueprintSubstrate` mount. |
| `src/features/chat/components/Chamber/Spine/SpineHeader.tsx` | Round caps 10 → 9.5 px, tracking 0.20em → 0.22em. |
| `src/features/chat/pages/ChatWorkspacePage.tsx` | Stand-up link → italic Georgia clay dotted underline. |
| `src/styles/globals.css` | `--spine-width: 240 → 252`, `--chamber-col-max: 720 → 820`, distance fade flat 0.5 floor. |
| `src/components/shared/AppHeader.tsx` | Export `UserMenu` so SpineFooter can reuse it. |

The shared `AppHeader.tsx` component itself is untouched as a top-bar (still mounted on `/dashboard`). Only its internal `UserMenu` becomes a named export.

---

## 3. Commit plan (≤ 12 commits)

| # | Commit | Render | Notes |
|---|---|---|---|
| 1 | docs: Phase 7.9 findings | n/a | This file |
| 2 | feat(chat): drop AppHeader on /projects/:id + spine top-0 | deferred | router + ChamberLayout + Spine |
| 3 | feat(chat-spine): wordmark crown in SpineHeader | deferred | + wordmark mix |
| 4 | feat(chat-spine): export UserMenu, mount auth zone in SpineFooter | deferred | LanguageSwitcher + UserMenu |
| 5 | feat(chat-spine): mobile drawer carries auth zone | deferred | **status check** |
| 6 | feat(chat): one-line ConversationStrip, no border | deferred | drop sub-line + border-b |
| 7 | feat(chat): conversation column 720 → 820 px max | deferred | `--chamber-col-max` |
| 8 | feat(chat): drop blueprint substrate from chat surface | deferred | unmount BlueprintSubstrate |
| 9 | feat(chat): MessageAssistant past turn 16 px italic Georgia | deferred | drop sigil + running-head |
| 10 | feat(chat): past-turn opacity flat 0.5 + spine width 252 | deferred | **status check** |
| 11 | feat(chat): SpineHeader caps + Stand-up link italic Georgia | deferred | typography polish |
| 12 | chore: Phase 7.9 final pass — lint/locales/grep/bundle | gate | green |

Status checks at commits 5 and 10. Beast mode through 12.

---

## 4. Honest caveats

1. **No browser rendering.** This agent has no DOM. Every visual commit ships behind `[render-check-deferred]`. Visual review by the user remains required.
2. **MobileAstrolabeSheet was dropped in 7.8.** The strip's 38 px dial is decorative (no click handler) on the chat page in 7.8. Brief §4.8 calls for "click 38 px dial → StandUp opens." This phase re-wires the dial as a button that calls the existing StandUp opener.
3. **AppHeader's internal `UserMenu` is a named function in the same file.** It's not currently exported. Exposing it as a named export is the smallest change that lets the SpineFooter reuse it without duplication.
4. **Spine's `top-12` is hard-coded.** Switching to `top-0` should not break anything but verify on first render that the wordmark crown does not collide with the Vercel banner / dev tools indicator.
5. **Blueprint substrate** is shared with the dashboard, wizard, result, loader. Dropping it ONLY from chat keeps the texture on those surfaces.

---

End of findings.
