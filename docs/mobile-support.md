# Mobile support

Planning Matrix is mobile-first as of Phase 3.8 (2026-04-29). This document captures the supported device matrix, known limitations, and how to escalate issues.

## Supported devices

### Tier 1 — must be perfect

| Device | Viewport | Browser |
|---|---|---|
| iPhone 13 / 14 / 15 | 375–393 × 812–852 | Safari 16+ |
| iPhone 13 mini / SE 3rd gen | 375 × 667 | Safari 16+ |
| Samsung Galaxy S22 / S23 | 360–412 wide | Chrome Android |
| Pixel 7 / 8 | 412 × 915 | Chrome Android |

### Tier 2 — must work well

| Device | Viewport | Browser |
|---|---|---|
| iPad Mini | 744 × 1133 | Safari |
| iPhone 15 Pro Max | 430 × 932 | Safari |
| Samsung Galaxy Z Fold (unfolded) | 768 × 1080 | Chrome Android |

### Tier 3 — must not break

| Device | Viewport | Browser |
|---|---|---|
| iPhone X / 11 | 375 × 812 | Safari 14+ |
| Android budget (320 × 568) | 320 × 568 | Chrome Android |

## Architectural baseline

- **Viewport meta:** `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content`
- **Token cascade:** `[data-mode="operating"]` (Phase 3.6) × `[data-pm-viewport="mobile"]` (Phase 3.8) — defaults at `:root`, mobile tokens scale type 13 → 16 px and bump radii.
- **Touch targets:** WCAG 2.5.5 + Apple HIG floor of 44 × 44 px enforced via `<TouchTarget>` primitive. Primary action buttons go to 48 px on mobile.
- **Safe-area:** `pt-safe` / `pb-safe` / `pl-safe` / `pr-safe` Tailwind utilities map to `env(safe-area-inset-*)`. iOS notch + home indicator + Android gesture bar all respected.
- **Keyboard handling:** `useKeyboardHeight` watches `visualViewport`; mobile input bar floats above the soft keyboard with a 120 ms transition.
- **Bundle size:** main entry chunk capped at 250 KB gzipped via `scripts/verify-bundle-size.mjs` (build fails on regression). Current: 136 KB gzipped.

## Known limitations

- **VoiceOver / TalkBack labels:** primitives in place, but real-device pass needs to be performed by a human tester. Flagged in Phase 3.8 #89's commit message.
- **Dashboard swipe gestures (Q11 locked):** `useSwipeGesture` hook ships in #87, but wiring onto the existing Link-wrapped project rows requires a row-shape refactor. Deferred to Phase 3.9 polish.
- **Long-press → message context sheet:** `useLongPress` hook ships, wiring deferred to Phase 3.9.
- **Result-page section vertical-stack rewrites (per-section Mobile* variants):** the spec-listed `MobileLegalLandscape`, `MobileDocumentChecklist`, `MobileCostTimelinePanel` were not built — the existing components already use `grid-cols-1 sm:grid-cols-N` patterns that stack naturally on mobile. If a specific section feels cramped on real-device testing, build the Mobile* variant in Phase 3.9.
- **iOS 100dvh on iPhone X (iOS 14):** `100dvh` requires Safari 16+. Older iPhones (X / 11 on stale iOS) might experience layout jitter on address-bar collapse. Acceptable for Tier 3.

## Testing protocol (Rutik)

After Phase 3.8 ships to `main`:

1. **iPhone walk** (~30 min): sign-up → wizard → chat (full conversation, file upload, suggestion chips) → cockpit (every tab) → result page (every section) → dashboard
2. **Android walk** (~20 min): same surfaces, watch for keyboard-bar conflict + edge-swipe-back interactions
3. **Lighthouse mobile audit:** run on `/`, `/sign-up`, a project's `/projects/:id`, `/projects/:id/result`. Target Performance ≥ 90.
4. **VoiceOver pass on iPhone:** sign-up form + chat workspace + result page. Each interactive element should announce coherently.
5. **Reduced motion:** enable iOS Settings → Accessibility → Reduce Motion. Verify all animations gracefully degrade.
6. **Slow 3G simulation:** DevTools → Network → Slow 3G. First Contentful Paint should land < 1.5 s on a desktop browser with mobile emulation.

Issues found go into a Phase 3.9 polish-pass plan, ranked by severity. The 65-check verification matrix in `docs/phase3-8-plan.md` §8 is the authoritative checklist.

## Escalation

- **Visual regression on mobile only:** comment with the device + browser + viewport + screenshot in the issue tracker.
- **Bundle size regression:** the build fails at >250 KB gzipped initial. To raise the ceiling intentionally: edit `MAX_GZIP_KB` in `scripts/verify-bundle-size.mjs` and commit with rationale.
- **Locale parity break:** `npm run verify:locales` runs as `prebuild`; the build fails if DE / EN keys diverge. Add the missing keys symmetrically.
