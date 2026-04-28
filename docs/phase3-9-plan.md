# Phase 3.9 — PLAN.md (The Completion Pass)

> **The completion pass.** Phase 3.8 shipped the mobile foundation; Phase 3.9 closes every footnote without re-opening it. Twelve commits #91 → #102. ~5,200 LOC budget — actual ~300 LOC new behaviour + ~1,700 LOC cleanup.
>
> **Authority:** plan IS the sign-off. Autonomous execution from #91 through #102. Push each commit individually so Vercel auto-deploys; final batch report after #102.
>
> **Constraints:** no migrations · no new edge functions · no new dependencies · same atelier respect on deliverable surfaces · same operating-mode token discipline · same mode separation.

---

## §1 · The deliverables (twelve commits)

| # | Commit | What it ships |
|---|---|---|
| #91 | feat(mobile): MobileAuthShell + SignIn page mobile branch | Centered single-column register replaces split-screen photo on mobile for the six auth pages |
| #92 | feat(mobile): wizard polish — pt-safe + 48 px primary submit + thumb-stack | Targeted polish; chips already stacked via existing `grid-cols-1 sm:grid-cols-2` |
| #93 | feat(mobile): SwipeableProjectRow + dashboard archive/restore | Wires Phase 3.8 `useSwipeGesture` onto dashboard rows; new `useSetProjectStatus` mutation |
| #94 | feat(mobile): LegalLandscape vertical-stack rows on mobile | Row layout changes from `grid-cols-3` to `flex-col` on mobile |
| #95 | feat(mobile): DocumentChecklist collapsible columns + 36 px action targets | Native `<details>`/`<summary>` accordion on mobile; card action button h-7 → h-9 + full-width |
| #96 | feat(mobile): CostTimelinePanel vertical phase rows | Timeline rows stack label+range header / bar below on mobile |
| #97 | feat(mobile): MessageContextSheet + long-press wiring on chat bubbles | New vaul drawer; `useLongPress` wired onto MessageUser + MessageAssistant |
| #98 | fix(mobile): touch-target sweep across result + chat surfaces | RiskFlags / TopThreeHero / SuggestionChips / ScheduleSection / MessageAttachment / AttachmentChip ≥44 px |
| #99 | fix(mobile): zoom-on-focus floor + safe-area + hover audit | Inputs all ≥16 px on mobile so iOS Safari doesn't auto-zoom; DashboardPage gets `pt-safe` |
| #100 | fix(a11y): mobile audit pass — labels, dialog hits, drawer titles | SwipeableProjectRow aria-label; ConfirmDialog buttons h-10 → h-11; verifications |
| #101 | chore(cleanup): delete dead components left over from earlier phases | ~1,700 LOC removed: Phase-3.4 input shells, Phase-3.8 AdaptiveAnimation, shadcn scaffolds |
| #102 | docs(phase-3-9): D22 + plan archive + mobile-support.md | This commit |

---

## §2 · What changed vs. the original brief

The original brief listed twelve items at ~4,700 LOC. Two reductions were made during execution and documented in their commit messages:

- **#92 wizard "MobileWizardPage":** the wizard's `QuestionIntent` already used `grid-cols-1 sm:grid-cols-2` and `QuestionPlot` used `flex` for its yes/no toggle — both stacked naturally on mobile. The commit shipped 11 LOC of targeted polish (pt-safe, 48 px submit, flex-col-reverse for thumb-reach) instead of a ceremonial duplicate component.
- **#101 MobileTopBar removal:** the brief listed "MobileTopBar removal" but investigation showed it's still actively used in the desktop branch as a `lg:hidden` tablet-landscape fallback for `ChatWorkspacePage`. Deleting would have broken the 640–1023 px viewport range. Cleanup commit shipped without removing it; documented in commit message + `mobile-support.md` known-limitations.

The cleanup commit (#101) also went deeper than the brief requested — found 12 fully orphaned files via grep across the entire `src/` tree (~1,700 LOC). Each deletion has its archaeological provenance in the commit body so future archaeology has the breadcrumb.

---

## §3 · What did NOT change

- No migrations (`supabase/migrations/` untouched).
- No new edge functions (`supabase/functions/` untouched except for the Phase 3.8 streaming.ts unused-import lint warning, which is pre-existing).
- No new dependencies (`package.json` untouched).
- Bundle size: still 136 KB gzipped initial — no regression. Verified by the build-time gate.
- Locale parity: 611 → 617 keys, ✓. Two i18n adds caught by the gate (#93 `archive`/`restore`, #97 `contextSheet.*`).
- Operating-mode token separation preserved on every changed surface.
- Atelier vocabulary preserved on deliverable surfaces (LegalLandscape, DocumentChecklist, CostTimelinePanel kept their italic Serif + clay accents + Roman numerals).

---

## §4 · Verification (Rutik runs after the batch)

The 65-check verification matrix in `docs/phase3-8-plan.md` §8 is still the authoritative pre-deploy checklist. Phase 3.9 specifically wants real-device confirmation on:

1. **Dashboard swipe vs iOS edge-back:** swipe-left from the row interior reveals Archivieren; swipe-left from the outer 16 px should fire iOS browser back. The `useSwipeGesture(edgeBuffer 16)` setting handles this in code; needs a real iPhone to confirm.
2. **Long-press on chat messages:** 500 ms hold on a user OR specialist message should open the bottom sheet. Movement > 5 px during the hold should cancel — verified by trying to scroll the conversation while resting a finger on a bubble.
3. **Zoom-on-focus:** tap into the chat textarea, the wizard address input, and the cockpit search filter. Safari should NOT auto-zoom on any of them.
4. **Tablet-landscape fallback:** open the chat on a tablet at 768–1023 px. The `MobileTopBar` (folded-paper-tab triggers + center title block) should still render — Phase 3.9's #101 cleanup did NOT remove it.
5. **VoiceOver pass:** form fields announce coherently, drawer titles read on open, swipe-row action gets the contextual aria-label ("Archivieren: <project name>"). Still a known limitation flagged for human tester.

---

## §5 · Closing note

Phase 3.9 ships the completion pass — every Phase 3.8 footnote is now closed except the VoiceOver real-device pass and the iOS 14 100dvh edge case (both documented in `mobile-support.md` known-limitations). From this commit forward, mobile testing per `mobile-support.md` is the source of truth for what "good" feels like on a real device.

D22 in `docs/phase3-decisions.md` carries the long-form reasoning.
