# Phase 7.8 — Findings Report

> **Mode:** Audit before fix. First commit per the 7.6/7.7 protocol.
> **Scope:** Visual recomposition only — Spine stage row layout
> changes + new ConversationStrip + chapter-heading MessageAssistant
> + delete top-region (sigil row + 132 px astrolabe) + disable
> AmbientTint + reduce CursorParallax. Data layer + hooks +
> behavioral surfaces (LedgerTab/Peek, attachments, keyboard
> shortcuts, mobile drawer, StandUp, CapturedToast, recovery row,
> match-cut, magnetic focus, all 8 stage isDone heuristics) all
> stay frozen.
> **Repo HEAD at audit:** `7aa19fa chore(chat): final pass — Phase 7.7
> ship gates`.
> **Methodology:** Read the 2 attached screenshots in detail; walked
> the code at HEAD against §2 of the brief; identified what needs to
> change. CLI agent — live walkthrough + every visual regression
> check is deferred to Rutik on the Vercel preview. Render Gate rule
> from 7.7: every visual implementation commit either includes a
> screenshot of the rendered output OR explicitly marks
> `[render-check-deferred]` in the commit body.

---

## §3.1 What changes from 7.7 to 7.8 — file by file

### Spine

| File | Change | Reason |
|---|---|---|
| `Spine/SpineStage.tsx` | Rewrite. Drop the 56 px indicator column. Two-column grid `[sigil 14×14] [name + sub]`. Per-status visuals per §2.1: done = paper-card sigil disc + clay strike-through name, live = filled-clay sigil + paper glyph + 13 px ink + italic-serif "speaking now" sub-line + clay-tint row bg + 2 px clay left bar, next = hairline-clay-bordered sigil disc, future = no fill + ink/18 hairline. **No Roman numerals on done rows** (regression fix for the new sigil-only layout). **No halo pulse on the live sigil disc** — replaced by the row's clay-tint bg + 2 px left bar as the prominence. | Match Direction A (Reading Room). The sigil-only layout reads denser and quieter than the 7.7 dual-column. |
| `Spine/SpineRail.tsx` | **Delete file.** | The vertical clay rail is gone in this design. The sigils' presence + spacing carry the rhythm. |
| `Spine/SpineStageList.tsx` | Drop the `<SpineRail />` mount. Keep the `data-spine-stage-list="true"` data attribute (the ruled-paper substrate still attaches to it via globals.css). | Follows from rail deletion. |
| `Spine/SpineHeader.tsx` | Project name 14 → 14.5 px, plot 11 → 12 px, round caps 10.5 → 10 px, percent 13 → 13 px italic Georgia (already italic). The sizes the brief specs are within ±0.5 of what shipped in 7.7; minor tweaks. Drop any leftover border-radius. | Matches Screenshot 1's header proportions. |
| `Spine/SpineFooter.tsx` | Verify the BriefingCTA sidebar variant is at 6 px radius (currently rendered via Tailwind `rounded-lg` = 8 px). Switch to inline `rounded-[6px]`. The 7.7 paper-on-paper character + ready-state pulse stays. | Match Screenshot 1's footer button radius. |

### Chamber root

| File | Change | Reason |
|---|---|---|
| `ChamberLayout.tsx` | Drop the `<AmbientTint>` mount entirely (the file stays for potential future use). Mount `<ConversationStrip>` as the first child of `<main>`'s scroll context. Drop the `topRegion` prop + render block — the sigil row + 132 px astrolabe band is gone. | §2.2 / §2.7 of brief. The ambient hue wash breaks paper continuity; the Reading Room + Manuscript design has zero ambient hue. |
| `CursorParallax.tsx` | STRENGTH constant 18 → 9 (50 % reduction). Reduced-motion + touch-device gating untouched. | §2.8. The current parallax may contribute to "page feels off-center." |
| `AmbientTint.tsx` | File stays. Default-export tint values remain in `specialistTints.ts` for future re-enable. **Mount removed from ChamberLayout, file unused on chat page.** | Reversible kill. |

### Conversation column

| File | Change | Reason |
|---|---|---|
| `Chamber/ConversationStrip.tsx` | **New file.** 56 px sticky-top inside `<main>`, paper-92 % bg + 8 px backdrop-blur, 0.5 px hairline-bottom. Right-aligned content: caps clay eyebrow `{specialistShort} · live` (or `· speaking` in DE) + 10 px gap + 38 px CompactAstrolabe. Whole strip is clickable → opens StandUp. Fades in on scroll engagement (240 ms + 4 px y-shift, reduced-motion snap). | §2.2. Manuscript treatment top-right strip. |
| `Chamber/CompactAstrolabe.tsx` | **New file.** 38 px stripped-down version of `Astrolabe.tsx`: outer hairline ring + clay progress arc + italic Georgia 11 px tabular percent. **No needle, no inner sigil ring, no halo.** Click → StandUp. Reads percent from the same `useChamberProgress().percent` source. | §2.2. Same single source of truth as the Spine; no chance of disagreement. |
| `Astrolabe.tsx` (the 132 px) | Stays in repo (used by StandUp overlay). Drops out of ChatWorkspacePage's render tree per topRegion deletion. | Reusable in StandUp. |
| `MessageAssistant.tsx` | Rewrite. **Active turn** (the most recent assistant message in the thread): chapter heading style — 28 px italic Georgia ink, letter-spacing -0.01em, line-height 1.1, no inline sigil, no caps eyebrow above (the sticky strip carries that). Body: Inter 15 px line-height 1.75 ink/92, 56 px left-indent on the body wrapper (chapter heading sits flush at the column's content edge, body indents 56 px to feel manuscript-like). **Past turns**: keep the existing italic-Georgia 16 px clay specialist label + small sigil — 7.7 styling. Both keep magnetic-focus past-turn fade. | §2.2. The chapter-heading-only-on-active rule prevents every past turn from looking like a new chapter. |
| `MessageUser.tsx` | Add `padding-left: 56px` on the wrapper to align with assistant body indent. Keep all other styling. | §2.2 alignment. |
| `SpecialistTeam.tsx` | File stays. **Don't mount on the chat page** (ChatWorkspacePage drops the `topRegion`). The strip remains available for use in the StandUp overlay. (Option A from §2.4 — preferred.) | §2.4. The active specialist already renders in 3 places (Spine live + ConversationStrip eyebrow + chapter heading); a 4th surface is redundant. |
| `MatchCut.tsx` | Stays. Verify it still fires correctly on the new chapter-heading swap (the previous-name-fade + hairline-sweep + new-name-slide-in sequence). | §5. |

### ChatWorkspacePage

| File | Change | Reason |
|---|---|---|
| `pages/ChatWorkspacePage.tsx` | Drop the `topRegion` prop pass. Drop `<SpecialistTeam>` mount. Drop the full-state `<Astrolabe>` mount with drag-to-scrub (keep the 38 px in ConversationStrip). Mount the new `<ConversationStrip>` inside the page (or via ChamberLayout slot). | Cleanup follows ChamberLayout deletion. |

### i18n

| Key path | DE | EN | Where used |
|---|---|---|---|
| `chat.chamber.strip.speaking` | `{{specialist}} · live` | `{{specialist}} · live` | ConversationStrip eyebrow |
| `chat.chamber.stage.speakingNow` | `spricht jetzt` | `speaking now` | SpineStage live sub-line |
| `chat.chamber.specialistShort.{moderator,planungsrecht,bauordnungsrecht,sonstige_vorgaben,verfahren,beteiligte,synthesizer}` | MODERATION / PLANUNGSRECHT / BAUORDNUNG / SONSTIGE / VERFAHREN / BETEILIGTE / SYNTHESE | MODERATOR / ZONING LAW / BUILDING CODE / OTHER RULES / PROCEDURE / STAKEHOLDERS / SYNTHESIS | ConversationStrip eyebrow + chapter heading text |

These are siblings to the existing `chat.specialists.*` longer-form keys. The longer keys stay in place (used elsewhere in the codebase). Run `verify:locales` and `verify:hardcoded-de` after.

---

## §3.2 Spec-vs-reality audit at HEAD `7aa19fa` (entering 7.8)

Per the 7.7 protocol — every visual promise made in 7.7, current status:

| 7.7 promise | Status |
|---|---|
| Progress floor at turnsFraction | **kept** — `useChamberProgress.ts:71` |
| Gap above Spine killed | **kept** — AppHeader is fixed; ChamberLayout has paddingTop: 48 |
| project_intent + plot_address widening | **kept** — `spineStageDefinitions.ts` |
| Ruled-paper substrate (stage list only) | **kept** — `globals.css` `[data-spine-stage-list]` |
| Roman numerals on done stages | **kept (will be removed in 7.8)** — `SpineStage.tsx` |
| Live-bar glow | **kept** — `globals.css` `[data-spine-status='live']::before` |
| Live sub-line italic-serif "spricht / speaking" | **kept (refined in 7.8)** — will become `speakingNow` key per §4 |
| SpineHeader card-outline removed | **kept** — paper-on-paper |
| InputBar edge-to-edge no card | **kept** |
| JumpToLatest paper pill not loading-spinner | **kept** |
| BriefingCTA paper-not-black for both variants | **kept** |
| LedgerPeek paper-pinned-card | **kept** |
| Sticky bordered top region with sigil tooltips | **kept (will be removed in 7.8)** — replaced by ConversationStrip |
| AmbientTint saturation bump | **kept (will be disabled in 7.8)** — reverts to "no ambient hue" per §2.7 |
| Popover drop shadows stripped | **kept** |

Deltas from 7.7 → 7.8 are all in §3.1.

---

## §3.3 Locked items (untouched)

Per §1 of the brief. Verified static:

- Edge Function, tool schema, Zod, RLS, migrations, persona — **untouched**.
- All hooks (`useProject`, `useMessages`, `useChatTurn`, `useChamberProgress`, `useSpineStages`, `useLedgerSummary`, `useCompletionGate`, `useMagneticFocus`, `useKeyboardShortcuts`, `useChamberMainRef`) — **untouched**.
- chatStore — **untouched**.
- `clientRequestId` idempotency, streaming/typewriter handoff — **untouched**.
- AppHeader, LedgerTab + LedgerPeek styling, attachment pipeline, "Stand up & look around" link, keyboard shortcuts, mobile drawer, StandUp overlay, CapturedToast, EmptyState, recovery row, BriefingCTA progress-scaled prominence logic — **untouched** (visual surfaces verified, logic locks honored).
- The 8 Spine stages, their owners, their `isDone` heuristics — **untouched**. Visual treatment of the rows changes.
- Astrolabe drag-to-scrub interaction — **moves** from the 132 px to the 38 px (CompactAstrolabe doesn't expose drag — too small to be useful at that scale; the only interaction is click → StandUp).

> **NOTE:** drag-to-scrub gets dropped from the chat page in this phase. Rationale: a 38 px circle is too small for a meaningful drag gesture, and the Spine click-to-scroll already provides the "go back" navigation. The drag handler stays on `Astrolabe.tsx` for the StandUp overlay's full-size mount.

---

## §3.4 Priority order — Phase 7.8 sprint plan

| Commit | Issue | Severity |
|---|---|---|
| 1 | `chore(audit): Phase 7.8 findings report` | meta |
| 2 | `feat(chat-i18n): add chamber.strip + stage.speakingNow + specialistShort keys` | high (blocking; everything else uses these keys) |
| 3 | `feat(chat-spine): rewrite SpineStage as sigil + name (Reading Room)` + delete SpineRail | high |
| 4 | `fix(chat-spine): SpineHeader typography per Screenshot 1` | medium |
| 5 | `fix(chat-spine): SpineFooter button 6 px radius + verify ready-state pulse` | low |
| 6 | `chore(chat-tint): disable AmbientTint mount in ChamberLayout` | high (visible) |
| 7 | `fix(chat-parallax): reduce CursorParallax magnitude 18 → 9` | low |
| 8 | `feat(chat-strip): new CompactAstrolabe (38 px stripped variant)` | high (blocking strip) |
| 9 | `feat(chat-strip): new ConversationStrip sticky top-right` | high (visible) |
| 10 | `chore(chat-page): drop topRegion (sigil row + 132 px astrolabe) + mount ConversationStrip` | high |
| 11 | `feat(chat-msg): chapter-heading MessageAssistant for active turn + 56 px body indent` | high (visible) |
| 12 | `fix(chat-msg): MessageUser 56 px left-indent for alignment` | medium |
| 13 | `chore(chat): edge-case sweep — match-cut on chapter swap, mobile strip overflow, reduced-motion` | medium |
| 14 | `chore(chat): final pass — lint + locales + hardcoded-de + bundle` | meta |

Status checks at commits 5 and 10.

---

## §3.5 Honest caveats

- **CLI-only — no browser.** Every visual claim is a code-side read. The "looks like the screenshot" verification is yours on the Vercel preview.
- **The chapter-heading active-turn-only rule needs care.** "Active turn" = the most recent assistant message. When a new assistant turn arrives, the previously-active turn must demote from chapter heading → small specialist label. That demotion needs to fire on cache update; verify magnetic-focus + thread re-render handle it without flash.
- **The 56 px body indent has user-side implications.** Wide messages (long German legal references) might feel cramped at `column max - 56`. If on the preview the body feels too narrow, the right call is to reduce to 32 px, not to remove the indent — the indent is what makes the manuscript feel work.
- **Removing the topRegion drops the user's previous "all 7 specialists in one line" overview.** §2.4 Option A is preferred per the brief; if Rutik finds users genuinely lose orientation, the fallback (Option B: SpecialistTeam in AppHeader's right side) is a one-commit follow-up.
- **The ruled-paper substrate stays via the existing `[data-spine-stage-list]` selector in globals.css.** That selector survives the SpineRail deletion.
- **Drag-to-scrub on the astrolabe is dropped from the chat page.** See §3.3 NOTE. Not a regression — a deliberate trade-off given the new 38 px scale. The full astrolabe + drag stays available in StandUp.

— End of findings. Fix commits start with #2.
