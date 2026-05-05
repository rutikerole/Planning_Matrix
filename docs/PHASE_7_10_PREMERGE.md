# Phase 7.10 — Pre-merge audit

**HEAD at audit:** `7a89b4a fix(chat): Stand-up independent + LedgerTab handle no longer stretches`
**Origin/main behind by:** 99 commits (the entire 7.5 → 7.10 sweep)
**Goal:** push the local branch to `origin/main` only after main is production-clean.

The audit follows the 7.6/7.7/7.8/7.9 protocol: enumerate findings before fixing, fix, then merge.

---

## 1. Gates run

| Gate | Result |
|---|---|
| `tsc -b --noEmit` | ✓ clean |
| `eslint .` | ✓ clean |
| `verify:locales` | ✓ 1204 keys, parity |
| `verify:hardcoded-de` | ✓ 0 hits |
| `vite build` + `verify:bundle` | ✓ index 838.3 KB raw / **241.6 KB gz** (ceiling 300) |
| Smoke specs `chamber.spec.ts`, `spine.spec.ts` | not executed (no Playwright runtime in agent), assertions reviewed manually — no references to dropped chrome |

---

## 2. Orphaned components (delete)

These four files have **zero imports** anywhere in the source tree after the 7.7 → 7.10 sweep. They were dropped from the chat surface and have no consumers on dashboard, wizard, result, loader, or auth either.

| File | Why orphaned |
|---|---|
| `src/features/chat/components/Chamber/AmbientTint.tsx` | mount removed in Phase 7.8 §2.7; never re-mounted |
| `src/features/chat/components/Chamber/CursorParallax.tsx` | mount removed in Phase 7.10 (asymmetric hue caused right-side gray) |
| `src/features/chat/components/Chamber/AstrolabeStickyHeader.tsx` | unmounted from chat in Phase 7.8 §2.4 (replaced by ConversationStrip); not used elsewhere |
| `src/features/chat/components/Chamber/MobileAstrolabeSheet.tsx` | unmounted from chat in Phase 7.8 §2.4 (38 px dial → StandUp now); not used elsewhere |

**Surviving cousins** (kept — these still have consumers):
- `Astrolabe.tsx` — used by `StandUp.tsx`
- `SpecialistTeam.tsx` — used by `StandUp.tsx`
- `MatchCut.tsx` — used by `MessageAssistant.tsx`

---

## 3. Console statements

`grep` over `src/` finds 30+ console statements. All but two are appropriate `console.error`/`console.warn` for caught network or persistence failures; safe to keep.

| Location | Type | Disposition |
|---|---|---|
| `src/features/chat/hooks/useChatTurn.ts:271` | `console.log('[pm-cost]', …)` | gated by `isAdminEmail(user.email)` — only Rutik sees it. **Keep**. |
| `src/features/chat/components/Chamber/Spine/SpineDebugPanel.tsx:68–71` | `console.log` for `progress` / `counts` / `areas` / `factKeys` | wrapped in `if (!enabled) return` and `enabled = ?debug=spine`. **Keep** — explicit debug surface, behind a URL param. |

No bare `console.log` in production code paths.

---

## 4. TODO / FIXME / commented blocks

| Location | Note | Disposition |
|---|---|---|
| `src/lib/cn-feature-flags.ts:11` | `// TODO(phase-4): replace with role check when admin role lands` | pre-existing, not from this sweep. **Keep** (out of scope). |

No FIXMEs. No commented-out code blocks left from Phase 7.x churn.

---

## 5. Duplicate logic check

| Concern | Status |
|---|---|
| Specialist label maps | Single source: i18n keys `chat.specialists.*`, `chat.chamber.specialistShort.*`, `chat.chamber.specialistDisplay.*`. After Phase 7.10 the in-component `SPECIALIST_RUNNING_HEAD` record was deleted from `MessageAssistant.tsx`. ✓ |
| Progress derivations | Single source: `useChamberProgress`. All consumers (StandUp, SpineDebugPanel, ConversationStrip via prop) read from one hook. ✓ |
| Stage status derivation | Single source: `useSpineStages`. SpineMobileTrigger consumes the same array as the desktop SpineStageList. ✓ |
| Sticky-bottom band bg | Solid `bg-paper` only in `ChamberLayout`. Pill bg is `bg-paper-card`. No competing layers. ✓ |

---

## 6. Type drift / unused props

| File | Drift | Status |
|---|---|---|
| `ChamberLayout.tsx` | `appHeaderHeight`, `topRegion`, `activeSpecialist` removed in 7.8/7.9 | clean (verified by tsc) |
| `MessageAssistant.tsx` | `runningHead` local + `SPECIALIST_RUNNING_HEAD` map removed | clean |
| `ChatWorkspacePage.tsx` | `Specialist` type, `useViewport`, `useAuth`, `Link`, `MobileAstrolabeSheet`, `mobileAstroOpen` state, `handleSigilClick`, `handleScrubTo`, `contributions`, `onAstrolabeOpen`, `SignOutMenuItem` all removed | clean |

No `: any` or `as any` in `src/features/chat`. No unused props per tsc.

---

## 7. Locks held

| Lock | Status |
|---|---|
| Data layer (`useProject`, `useMessages`, `useProjectEvents`, `useChatTurn`, `useOfflineQueueDrain`) | untouched |
| Persona / tool schema / completion enum | untouched |
| Edge Function `chat-turn` | untouched |
| Hooks (`useChamberProgress`, `useSpineStages`, `useLedgerSummary`, `useCompletionGate`, `useKeyboardShortcuts`, `useAutoScroll`, `useMagneticFocus`) | untouched |
| Idempotency, streaming, attachment pipeline | untouched |
| Mobile drawer (vaul), Stand-up overlay | untouched |
| Match-cut, Captured toast, BriefingCTA progress logic | untouched |
| Language persistence + sign-out flow | untouched (LanguageSwitcher/UserMenu reused as-is) |

---

## 8. Smoke spec compatibility

Read both `tests/smoke/chamber.spec.ts` and `tests/smoke/spine.spec.ts` line-by-line.

| Assertion | Still passes after sweep? |
|---|---|
| `[data-mode="operating"]` visible | yes — ChamberLayout still sets it |
| EmptyState text "Atelier öffnet" / "atelier opens" | yes — EmptyState mount unchanged |
| `[data-spine-root="true"]` visible at desktop | yes |
| `aria-label` matches `/journey/i` | yes |
| 8 `[data-spine-stage]` rows | yes — useSpineStages still emits 8 |
| 1 `[data-spine-status="live"]` | yes |
| `a[href*="/result"]` inside SpineFooter | yes — BriefingCTA renders the Link |
| Mobile Spine collapses into trigger | yes — `lg:hidden` flip preserved |

No spec assertion targets dropped chrome (AppHeader on chat, AstrolabeStickyHeader, full Astrolabe topRegion, SpecialistTeam strip, MobileAstrolabeSheet). All assertions are about the persistent skeleton, which is intact.

**Caveat:** I cannot run Playwright in this agent. Manually re-running these is the user's responsibility before final push.

---

## 9. Browser-side things deferred

CLI agent has no DOM. The following remain user-verifiable:

- Reduced-motion gating on Typewriter, MatchCut, JumpToLatest, ConversationStrip dial transition, BriefingCTA pulse, chamber-breath
- Keyboard shortcuts (search `/`, help `?`, scroll `j`/`k`, escape)
- Mobile responsiveness at 375 / 768 / 1024 / 1440
- A11y: focus rings on wordmark crown, dial button, paperclip, send button, stand-up button, BriefingCTA, LedgerTab handle, language switch, user menu
- Console errors at runtime (none expected, but unverified)
- Lighthouse scores (perf / a11y / best practices / SEO)

---

## 10. Action plan (this commit)

1. Delete 4 orphan files: AmbientTint, CursorParallax, AstrolabeStickyHeader, MobileAstrolabeSheet.
2. Re-run all gates (typecheck + lint + locales + hardcoded-de + bundle).
3. Single commit `chore: Phase 7.10 pre-merge sweep — delete orphans + audit doc`.
4. Push `main` → `origin/main`.

No fix-and-symptom-patches; the only changes are removing dead code that the sweep already obviated.

---

End of audit.
