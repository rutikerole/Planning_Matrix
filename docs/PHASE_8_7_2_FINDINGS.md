# Phase 8.7.2 — Atelier Opening · Roundtable Transition · Findings

> **Scope:** Replace the wizard → chat-workspace transition. The current
> "Setting the table." loader (drafting-board cinema + 3-segment stepper)
> becomes a roundtable assembling animation: 7 seats, 5-second waterfall,
> seamless cross-fade into `/projects/:id`.
>
> Commits: 1 findings · 2 AtelierOpening component · 3 wire-in + cleanup ·
> 4 locales + reduced-motion polish.
>
> Render Gate enforced on commits 2 + 4 at 1280×800 + 1440×900 + 375×812.

---

## 0. Audit summary

| Item | Status | Notes |
|---|---|---|
| Current transition file | Found | `src/features/loader/LoaderScreen.tsx` — drives `DraftingBoard` + 3-segment `Stepper` + 6 cycling status messages over an up-to-6s `useLoaderProgress` timer. |
| Mount point | Found | `src/features/wizard/pages/WizardPage.tsx:35` — when `useCreateProject().isInFlight === true`, returns `<LoaderScreen … />`. The wizard chrome falls away naturally. |
| Route handoff mechanic | Found | `LoaderScreen` itself owns `useEffect → navigate('/projects/'+projectId)` once `phase === 'completed' \|\| phase === 'failed'` (and `projectId` exists). Reduced-motion path skips the cinematic and navigates as soon as `primed`. |
| Project creation flow | Verified untouched | `useCreateProject` does INSERT → `postChatTurn(priming) → setStatus('primed')`. Hook remains unmodified. |
| Specialist labels | Resolved | The chat workspace's spine has 8 stages (`project_intent`, `plot_address` are both moderator-led, then 6 specialists). Atelier Opening collapses the two moderator stages to a single MODERATOR seat, giving exactly 7 seats per the brief. Live spine labels per locale are the canonical source. |
| Brief "specialist abbreviation" map | Honored | M, P, B, S, V, B, S — letters repeat (Bauordnungsrecht/Beteiligte both B, Sonstige/Synthese both S). Position around the table makes them unambiguous. |
| `DraftingBoard` reuse outside LoaderScreen | Found | `src/features/dashboard/components/EmptyState.tsx:3` imports it. Component stays. |
| `Stepper` + `useLoaderProgress` reuse | None | Only `LoaderScreen.tsx` imports them. Safe to delete in commit 3. |

---

## 1. Specialist labels (locked per locale)

The chat workspace surfaces these labels in `chat.spine.stages.{stage}.title`. The Atelier Opening seats use the same labels in CAPS (mono 11px tracked) so a user moving from this screen into the chat workspace sees identical names.

| Seat | DE label | EN label | Letter | Spine stage source |
|---|---|---|---|---|
| MODERATOR | MODERATOR | MODERATOR | M | `project_intent` + `plot_address` (both moderator-led, collapse to one seat) |
| PLANUNGSRECHT | PLANUNGSRECHT | ZONING LAW | P | `planungsrecht.title` |
| BAUORDNUNGSRECHT | BAUORDNUNGSRECHT | BUILDING CODE | B | `bauordnungsrecht.title` |
| SONSTIGE VORGABEN | SONSTIGE VORGABEN | OTHER REGULATIONS | S | `sonstige_vorgaben.title` |
| VERFAHREN | VERFAHREN | PROCEDURE | V | `verfahren.title` ("Procedure synthesis" → compact "PROCEDURE") |
| BETEILIGTE | BETEILIGTE | STAKEHOLDERS | B | `beteiligte.title` ("Stakeholders & roles" → compact "STAKEHOLDERS") |
| SYNTHESE | SYNTHESE | SYNTHESIS | S | `final_synthesis` (DE live label `Synthese · spricht`, EN `Synthesis · speaking`) |

Convention: the Atelier Opening labels live under `wizard.atelier.specialist.*` in both locale files; we don't reach into `chat.spine.stages` so the two surfaces stay independently overridable.

---

## 2. Geometry

The brief's table is built from these angles (0° = top, clockwise). I tightened the pair around 180° to symmetric ±15° offsets so the bottom row sits balanced under the top:

| Seat | Angle | Position |
|---|---|---|
| MODERATOR | 0° | top center |
| PLANUNGSRECHT | 60° | upper right |
| BAUORDNUNGSRECHT | 120° | lower right |
| SONSTIGE VORGABEN | 165° | bottom-right of center |
| VERFAHREN | 195° | bottom-left of center |
| BETEILIGTE | 240° | lower left |
| SYNTHESE | 300° | upper left |

Pairs symmetric across the vertical axis: 60↔300, 120↔240, 165↔195. MODERATOR at 0° anchors the apex.

**SVG coordinate math:**

```
seatX = cx + rx * sin(angle)
seatY = cy − ry * cos(angle)
```

with `rx = 220, ry = 90` on desktop, `rx = 130, ry = 56` on mobile. Seat radius `22` (desktop) / `18` (mobile). Label sits 28px outside the seat, oriented to stay readable (top seats above, bottom seats below, sides outside).

---

## 3. Animation timing

Master sequence locks at 5.00s. Each seat lighting is a 240ms `cubic-bezier(0.16, 1, 0.3, 1)` ease that runs three properties simultaneously (stroke fades out, fill fades in, letter color flips). Caption cross-fades 200ms between lines.

| t (s) | Event | Caption |
|---|---|---|
| 0.00 | Mount. MODERATOR lit. Headline + eyebrow fade in (300ms). | DE: "1 von 7 sitzt · das Team versammelt sich" / EN: "1 of 7 seated · the team is gathering" |
| 0.40 | PLANUNGSRECHT lights. | "2 of 7 seated · Zoning law reading § 34 BauGB" |
| 1.10 | BAUORDNUNGSRECHT lights. | "3 of 7 seated · Building code checking BayBO" |
| 1.80 | SONSTIGE VORGABEN lights. | "4 of 7 seated · Other regulations reviewing local rules" |
| 2.50 | VERFAHREN lights. | "5 of 7 seated · Procedure composing the path" |
| 3.20 | BETEILIGTE lights. | "6 of 7 seated · Stakeholders mapping required specialists" |
| 3.90 | SYNTHESE lights. | "All seated · opening the workspace" |
| 4.30 | Hold all 7 lit (700ms). | (held) |
| 5.00 | Cross-fade page (300ms opacity + 4px y-shift) → `navigate('/projects/' + id)`. | — |

**API gate:** the navigation only fires when `t ≥ 5.00 AND primed === true`. If the priming call is slower than the animation, hold on "All seated" and rotate to a `wizard.atelier.caption.oneMoreTouch` line at `t = 5.5`. If the call is faster, the animation still runs the full 5s for visual integrity — we never rush the moment.

**Center pulsing ring:** outer ring grows 14px → 28px and fades from 0.6 → 0 opacity, 2.4s loop. Pauses when `prefers-reduced-motion: reduce`.

---

## 4. Reduced motion

- All 7 seats render lit at mount (no waterfall).
- Caption renders directly as the "All seated" line.
- Progress hairline renders at 100%.
- Page holds for 1500ms.
- Then routes (or holds until `primed`, whichever is later).
- Pulsing ring is a static dot.
- Cross-fade collapses to a 0ms instant nav.

---

## 5. Mobile (<lg, 375×812)

- Eyebrow stays 11px; headline drops `clamp(2rem, 4.4vw, 3rem)` → `clamp(1.6rem, 7vw, 2rem)`.
- Ellipse `rx/ry` scales `220/90 → 130/56`.
- Seat radius `22 → 18`.
- Sub-line wraps to 2 lines if address is long; max-width 28rem.
- Progress hairline narrows from 240px to 200px.
- iPhone SE (375×667) target: total composition height ~ eyebrow+headline (~110) + sub (~32) + ellipse box (~150) + caption (~22) + progress (~24) + flex breathing (~80) ≈ **418px** vs 667px viewport. Fits.

Specialist labels stay full text — at 18px seat radius + 28px stand-off + 11px label, the 7 labels around a 130×56px ellipse fit without truncation. No abbreviations needed.

---

## 6. File plan

| Path | Action | Notes |
|---|---|---|
| `src/features/loader/AtelierOpening.tsx` | **NEW** | Main component. SVG roundtable + framer-motion seat cascade + caption + progress + cross-fade nav. Consumes the same Props shape as LoaderScreen so the WizardPage swap is one-line. |
| `src/features/loader/hooks/useAtelierSequence.ts` | **NEW** | Drives the 7-step cascade timing + caption rotation + reduced-motion path. Pure hook, no DOM. |
| `src/features/wizard/pages/WizardPage.tsx` | Modify | Swap `<LoaderScreen … />` import for `<AtelierOpening … />`. The post-wizard chrome already falls away. |
| `src/features/loader/LoaderScreen.tsx` | **DELETE** | Retired. FailState moves into AtelierOpening. |
| `src/features/loader/components/Stepper.tsx` | **DELETE** | Used only by LoaderScreen. |
| `src/features/loader/hooks/useLoaderProgress.ts` | **DELETE** | Used only by LoaderScreen. |
| `src/features/loader/components/DraftingBoard.tsx` | Keep | Still used by `dashboard/EmptyState.tsx`. |
| `src/locales/de.json` + `en.json` | Modify | Add `wizard.atelier.*` strings (eyebrow, headline, sub-template, 7 captions + oneMoreTouch, 7 specialist labels). Remove `loader.*` strings (eyebrow, h, steps, cancel, cancelConfirm, fail) — no longer referenced. |

**Delta:** -3 files (LoaderScreen, Stepper, useLoaderProgress) + 2 files (AtelierOpening, useAtelierSequence) + locale rewrite of the loader → atelier namespace. Net -1 file, ~ -200 LOC.

---

## 7. Locks honored

- `useCreateProject` orchestrator unchanged (INSERT + priming pipeline intact).
- Edge Function, persona prompts, SQL — untouched.
- Wizard step 1, step 2, footer route allowlist, UserMenu Legal, Phase 7.10/8.5/8.6/8.7/8.7.1 — untouched.
- Chat workspace, result workspace — untouched.
- Cancel button removed per brief ("no in-page chrome on this 5-second moment"). Rationale: the user just clicked "Set the table"; a cancel within the moment breaks the contract. Browser back still works (no scroll trap, no history manipulation).

---

## 8. Render Gate plan

Commits 2 + 4 land with screenshots at:
- 1280×800 — primary target
- 1440×900 — breathing room
- 375×812 — iPhone baseline (no scroll, no horizontal overflow, all 7 seats visible)

Animation arc captured as 6 stills at t=0, 1, 2, 3, 4, 5 (or screen recording).

Gate fails if any viewport requires scroll, or if any seat label clips, or if the 5s sequence runs >5.3s in default-motion mode.

---

## 9. Things flagged for review (carried into the report commit)

1. **Animation duration.** Brief locks 5.00s. Most users have seen the prior 6s loader; 5s is brisker. If 4.5s feels too quick or 6s feels too long after stage testing, the master constant in `useAtelierSequence` is one number.
2. **Caption tone.** Brief copy is poetic-procedural ("the team is gathering" / "composing the path"). May read too literary against the rest of the app's tone. Two backup phrasings will be drafted in the en/de strings as `caption.alt.*` so the user can swap without code change.
3. **Pulsing ring on the center dot.** 2.4s loop. May read distracting on the second pass through the wizard (returning users). Easy to throttle to 0.4 opacity ceiling if it visually competes with the seat-lighting micro-animations.
4. **Cancel removal.** Phase 6/7's loader had a Cancel link with confirmation dialog. Phase 8.7.2 removes it per the brief's "unbreakable 5-second moment." If a stakeholder objects on accessibility grounds, the existing AlertDialog could return as a small `Esc` keyboard handler (no visible chrome, keyboard-only escape).

---

## 10. The standard

A user clicks "Set the table." The wizard chrome dissolves. They land on a calm paper-tone screen. Italic serif: *"The team is taking their seats."* The Moderator's seat is already lit. Below the headline: their address, their § 34 BauGB classification, their project type. Six more seats fill in clay over five seconds, each lighting a small deliberate moment. A caption updates as each specialist arrives. A single hairline tracks the time. At the end, all seven seats glow, the caption reads "All seated · opening the workspace," and the page cross-fades into the chat workspace. Five seconds. No scroll. No skip. The user knows the team is real.
