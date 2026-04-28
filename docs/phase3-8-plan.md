# Phase 3.8 — PLAN.md (Mobile First, Pixel Perfect)

> **The pivot the codebase needs.** Phases 1–3.7 shipped desktop-first; mobile got "responsive enough" and never a real audit. From this batch forward, **mobile is the primary surface.**
>
> **Same plan-first rhythm as 3.2 / 3.3 / 3.4 / 3.5 / 3.6 / 3.7.** Pre-flight → plan → confirm → execute → report. Move to `docs/phase3-8-plan.md` in commit #90; D21 in `docs/phase3-decisions.md`.
>
> **Two holds before commit #83 starts:**
> 1. Rutik runs the **§1.B Part B walk-through** on a real iPhone + Android and pings findings back. The plan §1.B then merges those findings.
> 2. Rutik signs off **Q1–Q12** in §6.
>
> **Do NOT touch `src/`, `supabase/functions/`, or `supabase/migrations/` until both holds clear.**

---

## §1 · Pre-flight survey

### §1.A · Static code audit (done — Claude solo)

The numbers grounded against `main` post-Phase-3.7:

```bash
$ grep -rEon "(sm|md|lg|xl|2xl):[a-z][a-zA-Z0-9_\-\[\]/.]*" src/ --include='*.tsx' --include='*.ts' | wc -l
283  # responsive-class applications

$ grep -rEoh "(sm|md|lg|xl|2xl):" src/ --include='*.tsx' | sort | uniq -c | sort -rn
102 lg:
 99 sm:
 78 md:
 14 xl:
```

**Top files by responsive density** (responsive-class count per file):

| Count | File | Pre-flight read |
|---|---|---|
| 9 | `landing/components/Problem.tsx` | Landing — Phase 1 locked, low risk |
| 8 | `landing/components/Domains.tsx` | Landing — Phase 1 locked |
| 7 | `landing/components/Footer.tsx` | Landing — Phase 1 locked |
| 6 | `chat/components/ChatWorkspaceLayout.tsx` | **High risk** — three-column grid collapses; needs verification under #84 |
| 5 | `wizard/components/WizardShell.tsx` | Wizard PaperSheet — needs #86 audit |
| 5 | `result/components/LegalLandscape.tsx` | Section IV — #85 rebuild target |
| 5 | `landing/visuals/DemoBrowser.tsx` | Landing — locked |
| 4 | `result/components/CoverHero.tsx` | Section I — #85 review (animation must survive) |
| 4 | `dashboard/components/ProjectList.tsx` | Dashboard — #86 swipe-gesture target |

**Existing mobile primitives (Phase 3.1 / 3.6 era):**

- `chat/components/MobileTopBar.tsx` — folded-paper-tab triggers; 44×44 hit areas (per file comment line 31); already mounts `ChatProgressBarMobile`
- `chat/components/MobileRailDrawer.tsx` — vaul wrapper used for left + right drawers
- `chat/components/MobileRightRailPeek.tsx` — peek surface that slides in when recommendations grow
- `chat/components/Progress/ChatProgressBarMobile.tsx` — compact progress band

**Existing isMobile / matchMedia checks:** **one** site only — `chat/pages/ChatWorkspacePage.tsx:173` uses `window.matchMedia('(max-width: 1023px)')` ad-hoc to gate the right-rail peek. Everything else relies on Tailwind responsive classes. **#83's `useViewport()` hook centralises this.**

**Viewport meta in `index.html`:**

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

❌ **Missing `viewport-fit=cover`** — without it, `env(safe-area-inset-*)` always returns 0 on iOS. **#83 fixes this.** Also missing the modern `interactive-widget=resizes-content` hint for keyboard behaviour on Chrome Android.

**Existing safe-area usage:**

```bash
$ grep -rn "safe-area-inset" src/ --include='*.tsx' --include='*.css'
src/features/chat/components/Input/InputBar.tsx:202: paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.75rem)'
src/features/chat/components/UnifiedFooter/UnifiedFooter.tsx:48: paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.5rem)'
```

Two sites only. Both `bottom`. No `top` / `left` / `right` handling anywhere. **#83 introduces a `tailwind-safe-utilities` plugin pattern (`pt-safe`, `pb-safe`, `pl-safe`, `pr-safe`, `inset-safe`) so every fixed-position surface picks up insets cleanly.**

**Touch-manipulation / tap-highlight utilities:** **zero** in current code. Tap-highlight defaults to grey on iOS Safari, which makes hover-style UIs feel cheap. **#83 adds `-webkit-tap-highlight-color: transparent` globally + `touch-action: manipulation` on every button via the `<TouchTarget>` primitive.**

**Bundle baseline (post-3.7 build):**

```
$ ls -lh dist/assets/index-*.js
840 K   index-B0SDgTNB.js   (gzip ≈ 230 KB)
711 K   fontkit.es-*.js     (lazy — exports only)
375 K   fontLoader-*.js     (lazy — exports only)
```

Initial bundle is **840 KB raw / ~230 KB gzipped**. Cellular target per #88: <200 KB initial gzipped. Gap to close: ~30 KB. Achievable via route-level code-splitting + tree-shaking framer-motion's `LazyMotion`.

**Small-text density on potentially-tappable surfaces (text-[10/11/12px]):**

| Count | File | Risk on mobile |
|---|---|---|
| 12 | `chat/pages/OverviewPage.tsx` | #85 rewrite target |
| 8 | `result/components/LegalLandscape.tsx` | #85 stack-vertical fix |
| 8 | `chat/components/ExportMenu.tsx` | #84 sheet redesign |
| 7 | `result/components/ExportHub.tsx` | #85 cards-stack redesign |
| 7 | `chat/components/LeftRail.tsx` | Left drawer body — #84 |

Phase 3.7 #80 already lifted clay/55–65 → clay/72; #83 mobile token bumps `text-[11px]` → `text-[13px]` only when `[data-pm-viewport="mobile"]` is active, leaving desktop unchanged.

**Touch-target risks (size-9 / 36 px buttons in tappable contexts):**

`SendButton.tsx:41,60` — 36 px circle. Below the 44×44 minimum on mobile. **#83 wraps in `<TouchTarget>` (44×44 hit area, 36×36 visual)** so the visual stays unchanged but the tap area grows.

**Conclusion of Part A:** the codebase's mobile foundation is thinner than it should be — vaul drawers + a sticky input bar got us through demos but every fixed-position surface, every <44 px button, every 10–12 px label is a candidate for #83–#89. Volume estimate confirmed at ~5,800 LOC.

### §1.B · Live device walk-through (ON HOLD pending Rutik)

**The script — Rutik runs this on his iPhone (and ideally an Android too) while screen-recording. ~60–90 minutes total. After each step, capture: pass/fail + screenshot if fail. Send recordings + notes back; this section gets filled in before sign-off.**

Open the app at https://planning-matrix.vercel.app on the phone in the device's primary browser (Safari on iPhone, Chrome on Android). Sign out first if currently signed in.

#### Walk 1 — Auth (Use Case 4) · target ~5 min

1. Open the URL. Landing page renders. ✅ if no horizontal scroll. Capture screenshot of the hero.
2. Tap "Anmelden" / sign-up CTA. Sign-up form appears.
3. Tap email field. **Capture:** does the page zoom in? Does the keyboard's email-shaped layout (with @ key) appear?
4. Type email. **Capture:** does the form scroll up so the field stays visible above the keyboard?
5. Tap password. Type password. iOS may offer to suggest a strong password — note whether the Suggest dropdown overlaps the form.
6. Submit. **Capture:** does the form clearly show a loading state?
7. Land on dashboard or wizard.

#### Walk 2 — Wizard · target ~5 min

8. Click "+ Neu" / "+ New project". Wizard Q1 appears.
9. **Capture:** does the question card fit the viewport without inner scrolling?
10. Tap an intent chip ("Sanierung"). **Capture:** is the chip's tap area generous (≥44 px tall)? Does the selected state read clearly?
11. Continue → Q2 (plot address).
12. Tap address input. **Capture:** does the keyboard's text-with-suggestions layout appear? Is `street-address` autocomplete offered?
13. Type "Goethestraße 20, 91054 Erlangen". Submit.
14. **Capture:** transition into chat workspace — is the cinematic "Der Tisch wird gedeckt" intro visible on phone?

#### Walk 3 — Chat workspace (Use Case 1) · target ~20 min

15. Land in chat. **Capture:** screenshot of the initial state. Note: header height, progress bar visibility, input bar position, what fraction of viewport is thread vs chrome.
16. Tap left drawer trigger. Drawer opens. **Capture:** can you swipe to dismiss it? Is the drawer's content readable at full width?
17. Tap right drawer trigger. Same checks.
18. Tap progress bar. **Capture:** does the top drawer with full progress open?
19. **Send a yes/no answer.** Tap "Ja" suggestion chip. **Capture:** does the chip fill the textarea? Is the textarea readable on phone?
20. Tap send. Wait for streaming. **Capture:** is the streaming response readable as it arrives? Is there any layout jump? Does the input bar remain fixed?
21. **Mid-stream, tap the stop button (drafting-blue square).** **Capture:** does it abort cleanly?
22. **Type a long free-text message** (3+ sentences). Watch the textarea grow. **Capture:** does the textarea cap at a sensible height? Does it push the input bar off-screen?
23. **Tap the paperclip.** **Capture:** what surface opens? Vaul drawer? Native action sheet? Is there a "take photo" option?
24. **Try uploading a photo from camera roll.** Capture full flow. Note any issues.
25. **Scroll up in the thread.** **Capture:** does the jump-to-latest FAB appear? Tap it — does it scroll smoothly to bottom?
26. **Open the address bar / browser chrome on iOS.** Note if any chrome eats into the safe-area or pushes the footer up.
27. **Rotate to landscape.** **Capture:** does the layout adapt or break?
28. **DevTools Network → Slow 3G** (only if you're testing on a desktop browser with mobile emulation). Reload. Time-to-first-message rendering. Note anything slow.

#### Walk 4 — Cockpit (Overview) · target ~10 min

29. From chat, tap the unified footer's "Cockpit öffnen". Land on `/projects/:id/overview`.
30. **Capture:** is the tab strip visible? Can you horizontally scroll it?
31. Tap "Daten". **Capture:** how does the table render at 375 px? Horizontal scroll? Squished columns? Both?
32. Try edit-in-place: tap a CLIENT-source fact value. **Capture:** does the inline editor appear? Does the keyboard work? Does Enter save?
33. Tap "Audit". **Capture:** are the timestamps + reason text legible?
34. Close (X) → back to chat.

#### Walk 5 — Result page · target ~15 min

35. From chat or footer, tap "Briefing ansehen". Land on `/projects/:id/result`.
36. **Capture:** cover hero — does it fill the viewport? Animation plays smoothly?
37. **Scroll** through Section II Verdict. **Capture:** is the typography legible at arm's length?
38. Section III Top 3. **Capture:** custom numerals scale OK? "Begonnen" toggle tappable?
39. Section IV Legal Landscape. **Capture:** how do the three hatched bands render? Stacked? Side-by-side and squished?
40. Section V Document Checklist. **Capture:** the 3-column kanban — does it stay 3 columns and force horizontal scroll, or does it stack? Either way, take a screenshot.
41. Section VI Specialists. Cards readable.
42. Section VII Cost & Timeline. **Capture:** how is the horizontal phase strip on 375 px width?
43. Section VIII Risk Flags. Tap "Diese Annahme klären" CTA. **Capture:** does the right-side drawer open correctly on mobile?
44. Section IX Confidence Radial. **Capture:** does it scale or stay at 240×240 forcing scroll?
45. Section X Conversation Appendix. Expand. Messages render mobile-friendly?
46. Section XI Smart Suggestions. Cards readable.
47. Section XII Export Hub. Tap "Vollständiges PDF". **Capture:** does the PDF download work on iOS Safari? (May require Files app workflow.)
48. Tap "Share link" → copy to clipboard. **Capture:** does the copy succeed? Toast shown?
49. Open the share link in a new private/incognito tab. **Capture:** read-only result page renders.

#### Walk 6 — Dashboard · target ~5 min

50. Navigate to `/dashboard`. **Capture:** project list — cards or rows? Tap targets adequate?
51. Tap a project. Goes to chat workspace. ✅
52. **Try to swipe a project row.** **Capture:** does anything happen? (Currently nothing — Phase 3.8 #86 will add swipe gestures.)

#### Walk 7 — Throttle + Lighthouse · target ~10 min

53. Open desktop Chrome → DevTools → device emulation iPhone 13 → throttle Slow 3G.
54. Navigate to `/`. **Capture:** Performance recording 0–5 s. Note FCP, LCP, TTI.
55. Run Lighthouse mobile audit on `/`, `/sign-up`, a project's chat workspace, and the result page. **Capture:** all four reports.

#### Walk 8 — Accessibility surfaces · target ~10 min

56. Enable VoiceOver (iOS Settings → Accessibility → VoiceOver). Open the app.
57. Swipe through the sign-up form. **Capture:** is each field announced clearly?
58. Open chat workspace. Swipe through messages. **Capture:** is the speaker (Bauherr / Moderator) announced before the content?
59. Disable VoiceOver. Enable "Reduce Motion" (Settings → Accessibility → Motion).
60. Open result page. **Capture:** does the cover hero animation play or skip? Do other animations respect reduced motion?

#### What §1.B should produce

A short doc / message-back to me containing:

- Per-walk: pass/fail for each step + screenshot/recording links
- Top 5 worst-feeling moments ranked
- Any unexpected breakage (white screen, JS error, layout collapse)
- Lighthouse mobile scores for the 4 pages
- VoiceOver impressions

I'll merge this into §1.B, adjust the per-commit scope in §4 if findings shift priorities, and re-circulate before commit #83 starts.

### §1.C · Reference research

**Mobile chat input + keyboard handling.** [Stream Chat React Native keyboard guide][stream-chat] and the [react-native-keyboard-controller chat-app build][rnkc] both converge on the same shape: a `100dvh` (dynamic viewport) container, `visualViewport` API to listen for keyboard show/hide, and the input bar absolutely positioned with `bottom: env(safe-area-inset-bottom)`. RN libraries don't apply directly to a web SPA, but the technique transfers: use `visualViewport.height` to compute keyboard offset, apply via CSS variable. **Borrowing:** the keyboard-aware sticky pattern.

**B2B mobile data tables.** Linear's mobile project list (researched Phase 3.6) is the canonical card-list-instead-of-table pattern. Row-based, each row tappable to open detail. **Borrowing:** the cockpit's mobile fallback in #85.

**Touch target sizing.** [WCAG 2.5.5 (Level AAA — Target Size)][wcag-target] mandates 44×44 CSS px minimum for primary targets; the [Smart-Interface-Design touch-target cheatsheet][sidp] and [LogRocket UX article][logrocket] both confirm 44 (Apple HIG) / 48 (Material) is the working consensus. **Borrowing:** `<TouchTarget>` enforces 44×44; visual stays whatever size the icon needs.

**Cellular performance.** Vercel's own production sites typically hit FCP <1.5s on Slow 3G via aggressive route-level code-splitting + Brotli static encoding. We're already on Vercel; the win is in our chunk strategy, not the host.

[stream-chat]: https://getstream.io/chat/docs/sdk/react-native/guides/keyboard/
[rnkc]: https://kirillzyusko.github.io/react-native-keyboard-controller/docs/next/guides/building-chat-app
[wcag-target]: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
[sidp]: https://smart-interface-design-patterns.com/articles/accessible-tap-target-sizes/
[logrocket]: https://blog.logrocket.com/ux-design/all-accessible-touch-target-sizes/

---

## §2 · Mode separation now has THREE dimensions

Phase 3.6 introduced two: **deliverable** (atelier defaults at `:root`) vs **operating** (`[data-mode="operating"]` opt-in). Phase 3.7 softened operating mode tokens. **Phase 3.8 adds a third dimension: viewport.**

```
                        :root  (deliverable atelier defaults)
                         │
                         ├── [data-mode="operating"]                     ← Phase 3.6
                         │      ├── desktop tokens (current 3.7)
                         │      └── [data-pm-viewport="mobile"]          ← Phase 3.8
                         │             └── mobile-scaled tokens
                         └── (deliverable + mobile)
                                └── [data-pm-viewport="mobile"]
                                       └── mobile-scaled atelier
```

The discipline: tokens cascade. Deliverable defaults stay sharp on every viewport. Operating + desktop = current 3.7 working surface. Operating + mobile = larger type, 44+ touch targets, vaul drawers, safe-area-aware fixed elements. Deliverable + mobile (cover hero, landing) = atelier with mobile-appropriate sizing — the cover hero's 56pt serif scales to ~36pt on phone, but the geometry stays atelier.

**`[data-pm-viewport="mobile"]` lives on `<html>`** (set by `<MobileFrame>` in `Layout.tsx`) — nestable inside any of `data-mode="operating"` or `data-mode="deliverable"`.

---

## §3 · Vocabulary inheritance + new primitives

**Reused unchanged:** every Phase 3.6 / 3.7 primitive (UnifiedFooter, SendButton, ChatProgressBar, AttachmentChip, AttachmentPicker, MessageAttachment, ChatDropZone, CockpitHeader/Tabs/Table, EditableCell, QualifierBadge, SaveFact, axonometric.ts, ScaleBar, formatRelativeShort, winAnsiSafe, telemetry, factLabel resolver). Existing `MobileTopBar` / `MobileRailDrawer` / `MobileRightRailPeek` / `ChatProgressBarMobile` reused with refinements.

**New primitives in Phase 3.8:**

| Primitive | Owns | Used by |
|---|---|---|
| `useViewport()` | `{ isMobile, isTablet, isDesktop, width, height, orientation }` | every page that branches |
| `useSafeAreaInsets()` | reads `env(safe-area-inset-*)` via CSS-var proxy | components that need pixel values (gestures, FABs) |
| `useKeyboardHeight()` | `visualViewport`-based keyboard offset on mobile web | MobileInputBar, modals |
| `useNetworkInfo()` | `navigator.connection` saveData / effectiveType | AdaptiveAnimation |
| `<MobileFrame>` | sets `[data-pm-viewport]` on `<html>`, applies global tap-highlight reset | Layout root |
| `<TouchTarget>` | 44×44 minimum hit area without changing visual | every <44 px interactive |
| `<AdaptiveAnimation>` | gates motion by `prefers-reduced-motion` + `saveData` + `slow-2g` | cover hero, sigil animations |
| `<MobileChatWorkspace>` | dedicated mobile orchestrator | ChatWorkspacePage branches into it |
| `<MobileTopHeader>` | collapsing on scroll (NYT-style) | replaces MobileTopBar's static layout |
| `<MobileInputBar>` + `<MobileAttachmentSheet>` | mobile-native chat input | replaces standalone InputBar layout on mobile |
| `<MobileThread>` | mobile message list (taller bubbles, faster typewriter, tap-to-share) | replaces Thread on mobile |
| `<MobileCockpit>` + `<MobileFactCard>` | card-list cockpit | branches OverviewPage |
| `<Mobile*>` per heavy result section | section-specific mobile layout | Section IV / V / VII / IX |
| `<MobileWizardPage>`, `<MobileSignIn/Up/...>`, `<MobileDashboard>` | mobile orchestrators per page | branches in respective routes |
| `useSwipeGesture()`, `useLongPress()` | gesture hooks (built on framer-motion drag) | DashboardRow, message context menus |
| `scripts/verify-bundle-size.mjs` | build-time guard on initial chunk size | npm prebuild (after locale parity) |

---

## §4 · The eight commits in detail

> Execution order: **#83 → #84 → #85 → #86 → #87 → #88 → #89 → #90.** Each commit ends with `npx tsc --noEmit` clean and `npm run build` green (locale parity gate from #81 stays in front; #88 adds bundle-size gate).

### Commit #83 · Foundational primitives + viewport-aware tokens

**Files (new unless noted)**

- `index.html` — extend viewport meta to `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content`
- `src/styles/globals.css` — add `[data-pm-viewport="mobile"]` token block (full set per brief §5), add `-webkit-tap-highlight-color: transparent` reset on `button, a, [role="button"]`
- `src/lib/useViewport.ts` — matchMedia-based, returns `{ isMobile (<640), isTablet (640–1023), isDesktop (≥1024), width, height, orientation }`
- `src/lib/useSafeAreaInsets.ts` — CSS-variable proxy reading `env(safe-area-inset-*)` → numeric pixel values via a `<style>` block + `getComputedStyle`
- `src/lib/useKeyboardHeight.ts` — listens to `visualViewport.resize` + `geometrychange`, returns the difference between layout viewport and visual viewport (= keyboard height when open). No-op on desktop. Throttled.
- `src/lib/useNetworkInfo.ts` — `navigator.connection` snapshot, defaults to `effectiveType = '4g'` when unsupported
- `src/components/MobileFrame.tsx` — small effect that adds/removes `data-pm-viewport` on `<html>` + listens to viewport changes. Single mount in `Layout.tsx`.
- `src/components/TouchTarget.tsx` — `<button>`/`<a>` with `min-w-[44px] min-h-[44px] inline-flex items-center justify-center select-none touch-manipulation`. Optional `asChild` via Radix Slot pattern (no new dep — repo already has `@radix-ui/react-slot`).
- `src/components/AdaptiveAnimation.tsx` — wraps a child motion element; reads `prefers-reduced-motion` + `useNetworkInfo` and either plays or renders the static end state.
- `tailwind.config.js` — add `safeBottom`, `safeTop`, `safeLeft`, `safeRight` utilities via `addUtilities` plugin pattern (5 lines, no new dep)
- `src/app/Layout.tsx` — wrap root once with `<MobileFrame>` + add `min-h-dvh` (uses dynamic viewport units instead of static `100vh` so iOS Safari address-bar collapse doesn't cause layout jump)
- `src/features/chat/components/Input/SendButton.tsx` — wrap the existing 36×36 button visual in `<TouchTarget>` so hit area becomes 44×44 (visual unchanged)

**Token block (added to `globals.css` after Phase 3.7 operating-mode block)**

```css
[data-pm-viewport="mobile"] {
  --pm-text-base: 1rem;          /* 16 px — no zoom on iOS focus */
  --pm-text-body: 1rem;
  --pm-text-eyebrow: 0.8125rem;  /* 13 px */
  --pm-text-timestamp: 0.8125rem;
  --pm-text-headline: 1.5rem;    /* 24 px */
  --pm-text-display: 2rem;       /* 32 px */
  --pm-touch-min: 44px;
  --pm-tap-padding: 0.5rem;
  --pm-stack-gap: 0.75rem;
  --pm-radius-input: 1.25rem;    /* 20 px */
  --pm-radius-card: 1rem;
  --pm-safe-top: env(safe-area-inset-top);
  --pm-safe-bottom: env(safe-area-inset-bottom);
  --pm-safe-left: env(safe-area-inset-left);
  --pm-safe-right: env(safe-area-inset-right);
  --pm-transition-tap: 100ms;
  --pm-transition-page: 250ms;
}
```

**Estimated LOC ~520. Risk: medium** — touches every render path via `<MobileFrame>` + token cascade. Mitigation: smoke-test on landing first (lowest-risk surface) before #84 ships.

---

### Commit #84 · Chat workspace mobile redesign

The most-used surface, highest user impact. Per §5 of the brief, this is the dedicated mobile orchestrator branch.

**Files**

- `src/features/chat/components/MobileChatWorkspace.tsx` — orchestrator: `<MobileTopHeader>` + `<MobileProgressBar>` + `<MobileThread>` + `<MobileInputBar>` + drawers
- `src/features/chat/components/MobileTopHeader.tsx` — collapsing-on-scroll header (NYT pattern). 48 px → 32 px transition over 80 px of scroll. Hamburger + project name + kebab. `position: sticky; top: 0` with `padding-top: env(safe-area-inset-top)`.
- `src/features/chat/components/MobileProgressBar.tsx` — compact 28 px-tall progress band, sticky below the header. Tap → opens the existing top-direction vaul drawer with full progress.
- `src/features/chat/components/Thread/MobileThread.tsx` — message list with mobile-appropriate widths (user 80% / assistant full width), faster typewriter (1.5×), tap-to-action-sheet. The jump-to-latest FAB lives here, anchored bottom-right with `bottom: calc(var(--pm-input-h) + env(safe-area-inset-bottom) + 12px)`.
- `src/features/chat/components/Input/MobileInputBar.tsx` — replicates `<InputBar>` semantics but mobile layout: 16 px base font (no iOS zoom), 40 px send button, paperclip wired to `<MobileAttachmentSheet>`. `useKeyboardHeight` drives a `padding-bottom` so the bar floats above the keyboard.
- `src/features/chat/components/Input/MobileAttachmentSheet.tsx` — vaul drawer with three rows: "Foto aufnehmen" (`<input type="file" accept="image/*" capture="environment">`), "Aus Galerie wählen" (`accept="image/*"`), "Datei wählen" (existing `accept` from #68). Single hidden `<input>` per row.
- `src/features/chat/components/Input/MobileSuggestionChips.tsx` — horizontal scroll with `scroll-snap-type: x mandatory`, fade-mask right edge, 44 px min height per chip
- `src/features/chat/pages/ChatWorkspacePage.tsx` — `useViewport()` branches: `if (isMobile) return <MobileChatWorkspace …>; else return <ChatWorkspaceLayout …>` (Q12 locked: separate components for major pages)

**Mobile layout (375 × 812)**

```
┌─────────────────────────────┐  ← env(safe-area-inset-top)
│ ☰  Sanierung · Erlangen   ⋮ │  ← 48 px collapsing → 32 px
├─────────────────────────────┤
│ ●━●━●━○━○━○━○      28 %     │  ← 28 px progress
├─────────────────────────────┤
│                              │
│   [Thread fills viewport]    │
│                              │
│                       [↓]    │  ← FAB above input + safe-area
├─────────────────────────────┤
│ [chip][chip][chip] →         │  ← snap-scroll
│ [📎  Reply…                ↑]│  ← input + paperclip + send
└─────────────────────────────┘  ← env(safe-area-inset-bottom)
```

**Edge cases (verification list)**

- Keyboard open → `useKeyboardHeight` adjusts; input bar stays visible; thread scrolls
- Streaming → stop button still tappable, abort works
- Long message (5+ lines) → textarea caps at 40 % of viewport height, internal scroll
- Photo capture → `capture="environment"` opens rear camera on iOS/Android
- Pull-to-refresh disabled on the chat workspace (`overscroll-behavior: contain` on the scroll container)
- Landscape rotation → switches to a two-column tablet variant if width ≥ 768 (Q2 locked: hybrid)
- `prefers-reduced-motion` → header doesn't collapse on scroll, FAB doesn't scale, typewriter renders instantly

**Estimated LOC ~1,200. Risk: high** — most-used surface. Mitigation: ship behind a feature flag `pm-mobile-chat-v2` initially? No — flagging adds branches to maintain. Just ship it, walk it on a real device before merging.

---

### Commit #85 · Cockpit + Result page mobile redesign

Splits naturally into two halves: the working cockpit (#85a, lighter) and the deliverable result page (#85b, heavier). Per Q10 the brief allows splitting if >2 k LOC; current estimate is 1,400 so single commit, but I'll commit-split internally if execution drifts past 1,800.

**Files (cockpit)**

- `src/features/chat/pages/MobileCockpit.tsx` — orchestrator: header + tab strip + search + card list per active tab
- `src/features/chat/components/Cockpit/MobileFactCard.tsx` — 1-column card with label / value / qualifier+pill row / inline expand-to-edit
- `src/features/chat/components/Cockpit/MobileTabStrip.tsx` — horizontal-scroll tab strip with snap; tab pills 44 px tall
- `src/features/chat/pages/OverviewPage.tsx` — `useViewport()` branch

**Files (result)**

- `src/features/result/components/Mobile/MobileLegalLandscape.tsx` — vertical-stack 3 hatched bands; click row → inline expand
- `src/features/result/components/Mobile/MobileDocumentChecklist.tsx` — kanban → vertical sections (Erforderlich · In Arbeit · Liegt vor stacked); cards full-width; click-to-move opens action sheet "Wohin verschieben?"
- `src/features/result/components/Mobile/MobileCostTimelinePanel.tsx` — vertical phase ribbon; tap phase to expand
- `src/features/result/components/Mobile/MobileConfidenceDashboard.tsx` — 200×200 radial; legend stacks below
- `src/features/result/components/Mobile/MobileTopThreeHero.tsx` — numerals scale ① 48 → 32; effort + party stack vertically
- `src/features/result/components/Mobile/MobileVerdictSection.tsx` — 24 pt headline; expandable Warum-block stays
- `src/features/result/components/Mobile/MobileExportHub.tsx` — full-width 88 px-tall cards
- Section I (CoverHero) gets typography scale-down via the existing CSS-var route — no new file, just `[data-pm-viewport="mobile"]` overrides
- `src/features/result/pages/ResultPage.tsx` — `useViewport()` branches per section (NOT a single mobile orchestrator — heavy sections branch individually so the desktop tree stays readable)

**Mobile result-page section flow (375 px)**

Cover hero → Verdict → Top 3 → Legal Landscape (vertical) → Document Checklist (vertical sections) → Specialists → Cost Timeline (ribbon) → Risk Flags → Confidence Radial 200×200 → Conversation Appendix → Smart Suggestions → Export Hub. Spacing tightens (`py-12` mobile vs `py-20` desktop) so vertical scroll length stays manageable.

**Edge cases**

- Cover hero animation choreography (the per-path stroke-dashoffset draw-in from Phase 3.5 + Phase 3.7 redraw) preserved on mobile but runs 1.6 s instead of 2.4 s
- Edit-in-place on cockpit fact card: tap value → modal sheet (vaul) with input + save/cancel; chosen over inline-replace because mobile inline editing competes with the keyboard
- Section V "Wohin verschieben?" action sheet uses vaul; entries: Erforderlich / In Arbeit / Liegt vor / Zurück; current state visually disabled
- Print stylesheet from Phase 3.5 still works; mobile-specific layout disabled in print via `@media print` overrides

**Estimated LOC ~1,400. Risk: high** — biggest single rewrite this batch.

---

### Commit #86 · Wizard + Auth + Dashboard mobile uplift

**Files**

- `src/features/wizard/pages/MobileWizardPage.tsx` — orchestrator
- `src/features/wizard/components/MobileQuestionShell.tsx` — 92 % viewport-width card, 32 px padding, Q1 chips stack vertically
- `src/features/auth/pages/MobileSignIn.tsx`, `MobileSignUp.tsx`, `MobileForgotPassword.tsx`, `MobileResetPassword.tsx`, `MobileVerifyEmail.tsx`, `MobileCheckEmail.tsx` — 6 small mobile orchestrators
- `src/features/auth/components/MobileAuthShell.tsx` — shared chrome (logo top, content centered, full-width button)
- `src/features/dashboard/pages/MobileDashboard.tsx` — list view with swipeable rows
- `src/features/dashboard/components/MobileProjectRow.tsx` — 88 px-tall row; project name + address + progress + last-active; framer-motion `drag="x"` with constraints for swipe gestures (delete left, archive right)

**Auth input attributes (every form)**

- Email: `type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck="false"`
- Password: `type="password" autoComplete="current-password"` (sign-in) or `"new-password"` (sign-up)
- Submit button: `type="submit"`, 48 px tall, full-width
- Form: `<form noValidate>` + Zod resolver from `react-hook-form` (already wired)

**Dashboard swipe semantics (Q11 locked: ship)**

- Drag left ≥ 80 px → row reveals red "Löschen" action; release → confirmation sheet "Projekt wirklich löschen?" with destructive button
- Drag right ≥ 80 px → row reveals clay "Archivieren" action; release → archive immediately, toast with undo
- Drag < 80 px → spring back to rest
- Reduced motion: drag still works but no spring physics; threshold tightens to 40 px

**Estimated LOC ~900. Risk: medium** — auth has zero room for failure (first impression).

---

### Commit #87 · Touch interactions + gesture system

**Files**

- `src/lib/useSwipeGesture.ts` — wraps framer-motion `drag` with directional thresholds + `prefers-reduced-motion`
- `src/lib/useLongPress.ts` — pointerdown / pointermove / pointerup, configurable hold duration (default 500 ms), cancels on movement >5 px
- `src/features/chat/components/Thread/MessageContextSheet.tsx` — vaul drawer triggered by long-press on message; entries: Kopieren / Teilen / Antwort melden
- Audit hover-only patterns and add tap fallbacks: `QualifierBadge` (tap → tooltip in popover), `LegalLandscape` row click (already tap), `RoleGlyphs` hover (add tap)
- Drawer dismiss: vaul handles swipe-down by default; verify all 8 drawers have explicit close buttons too (Q8 locked: both)

**Reduced motion**

Every gesture-triggered animation has a static fallback. The drag itself works (it's a tap-to-confirm pattern); only the spring physics + reveal animations gate.

**Estimated LOC ~520. Risk: medium** — gesture interactions are notoriously edge-case-heavy.

---

### Commit #88 · Performance: bundle, fonts, images, cellular

**Files**

- `vite.config.ts` — extend rollup output with manual chunks: `vendor` (react/react-dom), `framer` (framer-motion), `i18n` (i18next + react-i18next), `supabase` (supabase-js)
- `src/app/router.tsx` — wrap each top-level route in `React.lazy` (already partially done; verify per route)
- `src/components/AdaptiveAnimation.tsx` — see #83
- `index.html` — preload Inter / Instrument Serif for above-the-fold
- `scripts/verify-bundle-size.mjs` — new prebuild guard: fails build if `dist/assets/index-*.js` exceeds 220 KB gzipped (slack against 200 KB target)
- `package.json` — wire `verify:bundle` after `verify:locales` in `prebuild`

**Targets (Q4 locked: hit them)**

- Initial bundle (landing): <200 KB gzipped (current ~230 KB)
- Auth chunk: <50 KB
- Chat workspace chunk: <150 KB
- Result page chunk: <100 KB (illustrations lazy-imported)
- PDF export: stays lazy ✓ (Phase 3.4)

**Cellular handling**

- `useNetworkInfo` returns `{ effectiveType, saveData }`
- `<AdaptiveAnimation>` skips choreography when `effectiveType === 'slow-2g' | '2g'` or `saveData === true`
- Streaming SSE chunked rendering already works (Phase 3.4 #52); no change needed there

**Estimated LOC ~480. Risk: medium** — performance regressions are subtle; rely on Lighthouse run in #1.B.

---

### Commit #89 · Accessibility: VoiceOver / TalkBack / contrast / focus

**Audit checklist**

- Every icon-only button has `aria-label`
- Every form field has `<label>` (visible or `sr-only`)
- Every error message announces via `aria-live="polite"` (or `"assertive"` for blocking)
- Focus traps in vaul drawers: vaul handles by default, verify
- Skip-to-main-content link in `Layout.tsx` (`<a href="#main" className="sr-only focus:not-sr-only">Springe zum Hauptinhalt</a>`)
- Tab order matches visual order across cockpit tables and result-page sections
- VoiceOver pass on iPhone for sign-up + chat workspace + result page
- TalkBack pass on Android (or Chrome accessibility extension) for the same surfaces (Q5 locked: real device for chat + result, extension for the rest)

**Contrast**

- Lighthouse accessibility audit on each route
- Specific risk: `text-clay/72` on `bg-paper` — verify WCAG AA at 13 px (which is the post-3.7 mobile floor)
- Bright-sunlight simulation via Chrome extension — adjust to `clay/78` if contrast is borderline

**Focus management on drawers**

- Open drawer → focus moves to drawer content
- Close drawer → focus returns to trigger
- Escape key closes drawer (works on iPad with hardware keyboard)

**Reduced motion + meta theme-color**

- Every animation tested with reduced motion
- `<meta name="theme-color" content="hsl(38 30% 97%)">` for iOS browser-chrome tint matching paper
- Dark mode explicitly out of scope per §11 of brief

**Estimated LOC ~320. Risk: medium** — testing-heavy.

---

### Commit #90 · Documentation

**Files**

- `PHASE_3_8_PLAN.md` → `docs/phase3-8-plan.md`
- `docs/phase3-decisions.md` — append D21 (mobile-first pivot)
- `README.md` — Phase 3.8 line + "Mobile support" section
- `docs/manager-demo-prep.md` — append "Mobile demo walk" sub-section: Bauherr-on-train scenario from §10
- `docs/mobile-support.md` — **new** — list of supported devices, known limitations, escalation path

**Estimated LOC ~250.**

---

## §5 · Volume + risk summary

| # | Commit | LOC | Risk |
|---|---|---|---|
| 83 | Foundational primitives + tokens | 520 | Medium — touches everything |
| 84 | Mobile chat workspace | 1,200 | **High** — most-used surface, keyboard edge cases |
| 85 | Mobile cockpit + result page | 1,400 | **High** — biggest single rewrite |
| 86 | Mobile wizard + auth + dashboard | 900 | Medium — auth has no room for failure |
| 87 | Touch + gestures | 520 | Medium — gesture corner cases |
| 88 | Performance | 480 | Medium — subtle regressions possible |
| 89 | Accessibility | 320 | Medium — testing-heavy |
| 90 | Docs | 250 | Low |
| | **Total** | **~5,590** | Largest batch since 3.6 |

**Highest risk: #84.** Mobile keyboard / safe-area / streaming interactions all collide here. Diagnostic-first mitigation: walk #84 on Rutik's actual phone before #85 starts; if anything fundamental is wrong, fix in #84 hotfix not #85+.

---

## §6 · Questions for Rutik — **ALL 12 LOCKED 2026-04-29**

| ID | Question | **Locked** |
|---|---|---|
| **Q1** | Mobile detection strategy | **Viewport-based via `matchMedia`** |
| **Q2** | Tablet (640–1023 px) UI | **Hybrid two-column** |
| **Q3** | File upload via camera | **Yes** — `capture="environment"` |
| **Q4** | Bundle size targets | **Hit them** — <200 KB initial gzipped is the gate |
| **Q5** | VoiceOver / TalkBack | **Real device for chat + result; extension for the rest** |
| **Q6** | Mobile chat header | **Collapse on scroll** (NYT pattern) |
| **Q7** | Suggestion chip overflow | **Horizontal scroll with snap** |
| **Q8** | Drawer dismiss | **Swipe-down + tap-outside + explicit close button** |
| **Q9** | Cellular animation gating | **Defer on slow-2g + saveData** |
| **Q10** | Result sections II–XII split | **One commit (#85)** unless >1,800 LOC; then split Sections VII + IX |
| **Q11** | Dashboard swipe gestures | **Ship** in #86 |
| **Q12** | Mobile-specific routes | **Separate `Mobile*` components for major pages**; branching for small details |

Execution order locked: **#83 → #84 → #85 → #86 → #87 → #88 → #89 → #90.**

**Two holds before commit #83 still active:**
1. **§1.B device walk** — Rutik runs Walks 1–3 tonight on iPhone (Auth → Wizard → Chat); Walks 4–8 follow. Findings merge into §1.B before code starts.
2. **#84 walk-on-real-phone** before #85 starts — Rutik confirms mobile chat lands clean before the cockpit + result-page rewrite. If #84 has a fundamental issue, hotfix #84 not #85+.

---

## §7 · Operational gates

**No migrations.** No new edge functions. No new dependencies (Q12: leveraging `@radix-ui/react-slot` already in deps for `<TouchTarget asChild>`).

After commit #88, the new `verify:bundle-size` script joins `verify:locales` in the `prebuild` chain; if any future PR busts the 220 KB gzip ceiling, build fails fast.

---

## §8 · Verification matrix

The 65-check matrix in §8 of the brief governs the batch report. Categorised:

- General (every page): 7 checks
- Auth: 6 checks
- Wizard: 4 checks
- Chat workspace: 17 checks
- Cockpit: 5 checks
- Result page: 11 checks
- Dashboard: 5 checks
- Performance: 4 checks
- Accessibility: 6 checks

Total **65**. **Phase 3.8 isn't shipped until all 65 pass on a real device.**

---

## §9 · What I'd flag if I were reviewing this for someone else

1. **#84 is a one-shot bet.** The mobile chat workspace is high-touch + high-value. If I get it wrong, it taints everything. Mitigation: Rutik walks the live deploy before #85 ships; if anything feels off, hotfix.
2. **`useKeyboardHeight` via `visualViewport` is well-supported on iOS Safari + Chrome but has historical edge cases on Android Chrome with the address-bar collapse interfering.** Mitigation: feature-detect, fall back to a simple `transform: translateY(-keyboardHeight)` pattern.
3. **`100dvh` requires recent Safari (16+, late 2022).** Older iPhones might still hit `100vh` shrinking issues. Mitigation: most users on iPhone 11+; for iPhone X — accept slight layout jitter.
4. **The Phase 3.5 result-page animation choreography ran 2.4 s on desktop.** On mobile, 1.6 s might still feel slow on slow-2g. `<AdaptiveAnimation>` gates on `effectiveType` so users on really bad networks see the static end state immediately.
5. **Dashboard swipe gestures have a subtle conflict with browser back-swipe on iOS Safari.** We need to opt into the swipe only on the row's direct surface (not the full row width) so iOS's edge-swipe-back still works. Confirmed in framer-motion docs as a known pattern.
6. **VoiceOver pass is the most subjective check.** Plan to spend real time here in #89, not just lint-style audits.
7. **Bundle size gate at 220 KB** might be aggressive. If the gate fails on an unrelated future PR, the right fix may be to relax the threshold rather than refactor immediately. Document the rationale in `scripts/verify-bundle-size.mjs`.

---

## §10 · One-line summary

**Phase 3.8 inverts the priority — mobile is the primary surface from this batch forward. Eight commits, ~5,800 LOC, no migrations, no new dependencies. Held for two gates: Rutik's §1.B live-device walk + §6 Q1–Q12 sign-off. Plan-first discipline holds; #84 is the highest-risk commit and I'll walk it on a real phone before moving to #85.**

— End of PHASE_3_8_PLAN.md
