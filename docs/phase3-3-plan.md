# Phase 3.3 — PLAN.md

> **Disposition:** uncommitted while Rutik reviews. Moves to `docs/phase3-3-plan.md` in the final commit (#51). Same pattern as `DESIGN_NOTES.md → docs/phase3-2-design-notes.md`.
>
> **Status:** Pre-flight survey done (chat workspace re-walked live, current state of the four target surfaces enumerated, decision points flagged). Awaiting Rutik's sign-off on §6 questions before commit #47.
>
> **One sentence:** the atelier vocabulary is locked; this plan describes how I apply it to dashboard / wizard / auth / wordmark over five commits, with eight precise points where my judgment wants to differ from the brief and a clear path to start the moment you say "go."

---

## 1 · Pre-flight findings

Surveyed before writing this plan. Key facts that shape the build:

### 1a — Dashboard is more "placeholder" than I assumed

Current `src/features/dashboard/DashboardPlaceholder.tsx` (its filename is honest) renders a full-bleed atmospheric photo (`domain-a-aerial`, 94% overlay), an "in Aufbau" eyebrow, and a single CTA → `/projects/new`. **There is no project list yet — not styled badly, simply absent.** This means commit #47 is *building*, not refactoring: I write a new dashboard, plus the `useProjectsList` hook (none exists today — only `useProject(id)` for the chat workspace).

### 1b — Wizard already has its own blueprint logic

`src/features/wizard/components/WizardShell.tsx` has an inline `BlueprintReveal()` component (220px radial mask, 4.5% ink hairlines) — different geometry from chat's `BlueprintSubstrate` (320px lens, two-grid layered, drift loop, table-breath). Two implementations diverging is exactly the inconsistency Phase 3.3 exists to fix. I will **extract `BlueprintSubstrate` to a shared component** parametrised by lens radius + grid intensity + drift amplitude, replace `BlueprintReveal` with it, and reuse the same on the dashboard. One source of truth.

### 1c — Auth inputs already match the chat user-message vocabulary

`EmailField` + `PasswordField` already render hairline-bottom-border inputs (`border-0 border-b`, transparent bg) — the same vocabulary I confirmed for the user message in #39. So the auth reskin is **headlines + photo caption + OAuth-style spacing + page-title pass**, NOT field rebuild. This shrinks commit #49 considerably.

There are **no OAuth buttons currently** (sign-in is email/password only). The brief says "OAuth buttons (if present)" — answering that with "they aren't, so this is a non-issue."

### 1d — TitleBlock + PaperCard are tightly coupled to `ProjectRow`

`TitleBlock` reads `project.intent`, `project.plot_address`, `project.created_at`. `PaperCard` takes a `project: ProjectRow` prop and renders the title block. **They are not reusable on the wizard or auth as-is.** Two paths:

- **(a)** Keep `PaperCard`/`TitleBlock` as the chat-specific composition, write a smaller `PaperSheet` shared primitive (just the chrome — paper bg + hairline border + paper-grain overlay + inset white-edge highlight + rounded-[2px] + responsive padding) and compose new wizard/auth title blocks on top. **Recommended.** This is what I'll do.
- (b) Genericise `TitleBlock` with optional fields. Adds noise to the chat code that's already locked.

I'll go with (a). It introduces one tiny new shared component (`PaperSheet`) and leaves the locked chat composition untouched.

### 1e — Wordmark is 4-square monogram + Inter "Planning" + Instrument Serif italic "Matrix"

`src/components/shared/Wordmark.tsx` lines 70–103. The monogram (4 squares, bottom-right filled clay) is exactly the "least-considered element" the brief calls out. The typography is fine but undersold (no OpenType features applied, no weight calibration). Replacing the glyph + tightening the lockup is one focused edit.

### 1f — Inputs in wizard Q2 (address) and auth use the same hairline-bottom pattern

So input vocabulary is already unified — visual jolts on data entry are not the problem. The jolts are:

- Wordmark glyph (every page, top-left)
- Dashboard hero photo + "in Aufbau" eyebrow (only the dashboard)
- Auth headline weight + photo-caption absence (auth only)
- Wizard absence of paper-card + Roman numeral progress (wizard only)
- Page titles (mixed across surfaces)

These are five visible deltas. Five commits, one delta each.

---

## 2 · Vocabulary inherited from Phase 3.2 (do not invent more)

For my own discipline and so this plan can be checked: the only vocabulary I will use in Phase 3.3 is already shipped and locked.

| Element | Source | Use in 3.3 |
|---|---|---|
| Paper grain overlay (4%, fixed, multiply) | `globals.css` `.grain-overlay-fixed` (#35) | Already global — verify present on every page |
| Blueprint substrate (cursor lens + drift + table breath) | `BlueprintSubstrate.tsx` (#35, #46) | Extract to shared, reuse on dashboard + wizard |
| Drafting-blue accent (cursor lens, focus borders, hairline accents) | tokens (#35) | Wizard Q1 chip selected state, auth focus state, wordmark glyph |
| Italic Serif running heads + drop-cap | `globals.css` `.role-running-head`, `.drop-cap` (#36) | Dashboard activity sentence, auth subhead, completion-style copy on dashboard empty state |
| OpenType stack (`ss01`, `cv05`, `case`, `calt`) | `body` rule (#36) | Already global — verify wordmark + project list inherit |
| Roman numerals (`I`, `II`, `III`, …) | left rail #41, right rail #40, overview binder #44 | Wizard progress (`I · II`), dashboard project list prefix |
| Schedule-row layout (24px Roman col + hairline divider + label/value/qualifier) | `ScheduleSection`/`ScheduleRow` (#40), `BinderSection` (#44) | Dashboard project list rows reuse the same grid |
| Hairline rules — `border-ink/12` primary, `border-ink/15` for cards, `bg-ink/15` 96px decorative | various | Hairline below welcome, between project rows, below tabs |
| Italic Serif clay timestamp | user message #39, audit timeline #44 | Dashboard activity meta on each project row |
| Hand-drawn axonometric SVG (1px stroke, drafting-blue 40–55%) | `IntentAxonometric` (#40), `AtelierIllustration` (#42) | Dashboard empty-state illustration; wordmark glyph |
| Folded-paper tab icon | `MobileTopBar` foldedTab (#45), user-message FoldMark (#39) | Wizard "I'm not sure" drawer trigger |
| North arrow rosette | `NorthArrow.tsx` (#37) | Wizard paper card top-right |
| Octagonal stamp (-8°) | `CompletionInterstitial` (#43) | NOT reused in 3.3 (kept exclusive to completion notices to preserve their weight) |
| Folded-corner tab on user card | #39 | NOT reused (would compete with the wizard chip vocabulary) |

**Things I will not introduce:**
- New colors beyond the locked palette
- New illustration tradition (no hand-painted heroes, no pictogram sets)
- New typography scale steps (the existing Inter + Instrument Serif sizes cover everything)
- New animation principles (the four shipped — fade, scale-from-handoff, table-breath, pen-trace — cover all 3.3 needs)

---

## 3 · The five commits

Same disciplined pattern as Phase 3.2. Each commit is one cohesive piece of unification work; I'll land them sequentially after sign-off on §6, push as a batch.

### Commit #47 · `feat(dashboard): atelier rebuild with project list as architectural-schedule index`

**Files**

- `src/features/dashboard/DashboardPage.tsx` — new (replaces `DashboardPlaceholder.tsx`; old file deleted in this commit)
- `src/features/dashboard/components/ProjectList.tsx` — new
- `src/features/dashboard/components/ProjectListEmpty.tsx` — new
- `src/features/dashboard/components/AtelierTableIllustration.tsx` — new (small empty-state SVG, ~280×180, drafting table + blank sheet + pen, drafting-blue 45%)
- `src/features/dashboard/hooks/useProjectsList.ts` — new (TanStack Query, `select * from projects where owner_id = auth.uid() order by updated_at desc limit 50`)
- `src/router.tsx` — swap `DashboardPlaceholder` import for `DashboardPage`
- `src/locales/{de,en}.json` — replace `dashboard.placeholder.*` keys with `dashboard.atelier.*` block
- `index.html` page title default unchanged

**Layout (desktop, ≥lg)**

```
┌─ <wordmark> [LanguageSwitcher | Sign out] ──────────────────────────────┐
│                                                                          │
│  ATELIER · WILLKOMMEN                                                    │
│  Willkommen, {firstName}.                                                │
│  ────────────                       (96px hairline rule)                 │
│  Drei laufende Projekte. Letzte Aktivität: heute, 11:31.                 │
│                                                                          │
│  PROJEKTE                                              [+ NEU]           │
│  ────────────────────────────────────────────────────────────            │
│   I    Neubau Einfamilienhaus                ●  AKTIV    →               │
│        Goethestraße 20, 91054 Erlangen                                   │
│        Letzte Aktivität: heute, 11:31  ·  5 Wendungen                    │
│  ────────────────────────────────────────────────────────────            │
│   II   ...                                                               │
└──────────────────────────────────────────────────────────────────────────┘
```

**Specifics**

- Eyebrow: Inter 11 tracking-`[0.22em]` uppercase clay → `dashboard.atelier.eyebrow` ("ATELIER · WILLKOMMEN" / "ATELIER · WELCOME"). The "in Aufbau" string is permanently retired.
- Welcome headline: Instrument Serif clamp(40px, 5.5vw, 56px) ink, trailing period in clay. `Willkommen, {firstName}.` — derived from `auth.user.user_metadata.full_name` first word, fallback `auth.user.email.split('@')[0]`. **See Q4.**
- 96px hairline (`bg-ink/15`) below the headline.
- Activity sentence: Inter 14 italic ink/65, locale-formatted. Numerals as German word forms 1–12 in DE (`Eins / Zwei / Drei / Vier / Fünf / Sechs / Sieben / Acht / Neun / Zehn / Elf / Zwölf`), digits ≥13. EN uses digits throughout. Formula: `{count_word} laufende{n} Projekt{e}. Letzte Aktivität: {relative_or_absolute}.` Relative time: `heute, HH:mm` if same day, `gestern, HH:mm` if yesterday, otherwise `DD. Monat YYYY` long form. EN: `today, HH:mm` / `yesterday, HH:mm` / `D MMM YYYY`.
- Background: paper grain (already global) + shared `<BlueprintSubstrate />` mounted scoped to dashboard main column. Cursor lens, drift, table breath all on. **Drop the `domain-a-aerial` photo entirely.**
- Project list:
  - Section heading row: `PROJEKTE` (DE) / `PROJECTS` (EN) eyebrow on the left, ghost-style `+ NEU` link on the right (Inter 12 clay underlined italic). Click → `/projects/new`.
  - Hairline `border-ink/12` below the heading row.
  - Each project row uses the schedule-row grid (`grid-cols-[40px_1fr_auto]` desktop, single-column stacked on mobile). Roman numeral in column 1 (Instrument Serif italic 18 clay-deep, baseline-aligned). Center column: project name (Instrument Serif 22 ink) + plot address (Inter 13 italic ink/65) + activity meta (Inter 11 ink/55 with italic Serif clay timestamp). Right column: state pill + arrow chevron.
  - State pill semantics from `project.status`: `active → ●  AKTIV`, `paused → ○  PAUSIERT`, `draft → ─  ENTWURF`, `completed → ✓  ABGESCHLOSSEN`, `archived → ✕  ARCHIVIERT` (if it exists in the enum — verify). Inter 10 tracking-`[0.20em]` uppercase ink (clay for ACTIVE, ink/45 for PAUSED, ink/35 for DRAFT/ARCHIVED, clay-deep for COMPLETED).
  - Hairline `border-ink/12` between rows.
  - Hover: ink darken 3% (translates to `bg-ink/[0.03]` on hover), arrow shifts +2px right via `transition-transform`, Roman numeral shifts +1px right. Reduced-motion gates the shifts (only ink darken). The whole row is the click target (`<Link to={`/projects/${id}`}>` wrapping the grid).
- Empty state: render `<ProjectListEmpty />` instead of `<ProjectList />` when `projects.length === 0`. Atelier table illustration (new, drafting-table + blank-sheet + pen + empty cup, ~280×180 SVG, drafting-blue 45%) above; Instrument Serif 28 ink/85 `Noch kein Projekt.` headline; Inter 14 italic ink/55 sub copy; primary `Neues Projekt →` CTA (existing CtaButton primary).

**Mobile**

Single column. Each project row stacks: Roman numeral + name on row 1, address on row 2, activity + state pill + arrow on row 3 (state pill left, arrow right, separated by `gap-3`).

**Page title**

`Atelier · Planning Matrix` (DE/EN both — the word "Atelier" reads internationally for our audience).

---

### Commit #48 · `feat(wizard): paper-card wrapper + extracted blueprint substrate + Roman progress + chip restyle`

**Files**

- `src/features/chat/components/BlueprintSubstrate.tsx` → renamed (or moved — see below) and parametrised
- `src/components/shared/BlueprintSubstrate.tsx` — new home (moved from chat)
- All Phase 3.2 imports of `'@/features/chat/components/BlueprintSubstrate'` → `'@/components/shared/BlueprintSubstrate'`
- `src/components/shared/PaperSheet.tsx` — new (the chrome-only primitive: paper bg + hairline-ink/12 border + paper-grain 8% overlay + inset white-edge highlight + rounded-[2px] + responsive padding props)
- `src/features/wizard/components/WizardShell.tsx` — drop inline `BlueprintReveal`, use shared substrate; wrap step area in `PaperSheet`; add `WizardTitleBlock` header inside the sheet
- `src/features/wizard/components/QuestionIntent.tsx` — chip restyle (paper-tab cards), italic clay "I'm not sure" link
- `src/features/wizard/components/QuestionPlot.tsx` — Yes/No paper-tab toggle, address input wrapper
- `src/features/wizard/components/ProgressDots.tsx` → renamed `WizardProgress.tsx` — Roman numerals
- `src/features/wizard/components/WizardTitleBlock.tsx` — new (wizard-specific header — eyebrow + Roman numeral + question + sub + hairline; uses `NorthArrow` top-right)
- `src/locales/{de,en}.json` — refresh `wizard.q1.eyebrow` from `… · Initialisierung · 1 / 2` to plain `… · Initialisierung` (the Roman numeral is now visual, not in copy)

**Specifics**

- `<BlueprintSubstrate />` extraction signature:
  ```ts
  interface Props {
    /** Cursor lens radius in px, default 320. Wizard wants 220 (current value). */
    lensRadius?: number
    /** Whether the table-breath animation runs (set false on dashboard). */
    breathing?: boolean
    /** Drift amplitude in px on x-axis, default 4. Set 0 to disable. */
    driftPx?: number
  }
  ```
  Three call sites: chat workspace (defaults — 320, breathing on, drift 4), dashboard (default — 320, breathing on, drift 4), wizard (220, breathing off, drift 0 — keeps the wizard calmer because the headline is the focal point).
- `<PaperSheet>` API:
  ```ts
  interface Props {
    children: React.ReactNode
    className?: string  // outer overrides
    padded?: 'lg' | 'md' | 'sm'  // px-12/py-14, px-8/py-10, px-6/py-8
  }
  ```
  Renders the chat workspace's PaperCard chrome but without the project-coupled TitleBlock. PaperCard becomes a thin wrapper of `<PaperSheet padded="lg"><TitleBlock project /> {children}</PaperSheet>`.
- Wizard paper-card layout (matches chat workspace center column width — `max-w-2xl`):
  ```
  ┌─ PaperSheet padded="lg" ─────────────────────────────────────────────┐
  │                                                                ⭕ N  │   ← NorthArrow top-right
  │                                                                       │
  │  PLANNING MATRIX · INITIALISIERUNG                                    │
  │  I  ──────────────────────────────────                                │   ← Roman numeral I/II + hairline
  │                                                                       │
  │  Was möchten Sie bauen?                                               │   ← Instrument Serif clamp(40,5vw,56), period in clay
  │                                                                       │
  │  Wählen Sie die Option, die Ihrem Vorhaben am nächsten kommt.         │   ← Inter 16 italic ink/65
  │                                                                       │
  │  [chip] [chip] [chip]                                                 │
  │  [chip] [chip] [chip]                                                 │
  │                                                                       │
  │  Ich bin mir nicht sicher  ·  ↗                                       │   ← italic clay underlined
  │                                                                       │
  └───────────────────────────────────────────────────────────────────────┘

                            I  ·  II                                          ← Roman progress, active=italic ink, idle=ink/30
                       ──────────────                                        ← hairline 64px
                                ←  Zurück                                     ← back link, italic clay underlined
  ```
- Chip restyle (paper-tab card):
  - Container: `border border-ink/15 rounded-[2px] bg-paper px-5 py-4 flex items-center gap-3`
  - Inset white-edge highlight via `box-shadow: inset 0 1px 0 hsl(0 0% 100% / 0.6)`
  - Paper-grain overlay tinted slightly stronger (8% vs the page's 4%) so the chip's substrate reads distinct
  - Hover: `bg-drafting-blue/[0.05]`, border darkens to `border-ink/30`, `translate-y-px`. Reduced-motion: drop the translate.
  - Selected: `bg-drafting-blue/[0.12]`, `border-drafting-blue/60`, no translate. Tiny clay dot (Polish-Move-1 vocabulary) prefixed flush-left to indicate selection.
  - Focus-visible: `ring-2 ring-ink/35 ring-offset-2`
- Q2 Yes/No: same paper-tab vocabulary, two cards side-by-side, `Ja` and `Nein` Inter 14 ink medium centered.
- Q2 address input wrapper: existing input keeps the hairline-bottom-border treatment, but the wrapping `<label>` block gets `<PaperSheet padded="sm">` chrome — emphasises "this is where you fill in real data."
- "I'm not sure" link → `Inter 12 italic clay/85 underlined`. Click opens an existing inline explanation drawer (already implemented in `QuestionIntent.tsx`); the drawer's panel adopts `<PaperSheet padded="sm">` chrome plus a left-edge clay hairline rule (matches assistant marginalia from #38).
- `WizardProgress`: Two Roman numerals `I · II`. Active = Instrument Serif italic 14 ink. Idle = ink/30. Centered, with a 64px hairline `bg-ink/15` directly below them. Replaces the existing breathing-dot pattern from `ProgressDots.tsx`. The `breath-dot` keyframe + animation can be removed if no other surface uses it (verify).
- Eyebrow copy update:
  - DE: `Planning Matrix · Initialisierung · 1 / 2` → `Planning Matrix · Initialisierung` (the count is now visual)
  - EN: `Planning Matrix · Initialization · 1 / 2` → `Planning Matrix · Initialization`

**Mobile**

`PaperSheet padded="md"` collapses to `padded="sm"`. Chips wrap to 2-per-row. Roman progress stays bottom-centered. NorthArrow shrinks to 24×28 (currently 32×36).

---

### Commit #49 · `feat(auth): atelier reskin across all flows + photo caption + page-title pass`

**Files**

- `src/features/auth/components/AuthCard.tsx` — eyebrow restyle (Inter 11 tracking-`[0.22em]`, was 0.18em or similar; verify), headline subhead spacing, hairline rule below subhead
- `src/features/auth/components/AuthPhotoPane.tsx` — add bottom-edge caption tab (Inter 9 italic clay/70 reading the photo's caption)
- `src/features/auth/components/AuthShell.tsx` — confirm grain overlay, no other change
- `src/features/auth/pages/SignInPage.tsx` — title pass + headline copy refresh
- `src/features/auth/pages/SignUpPage.tsx` — same
- `src/features/auth/pages/ForgotPasswordPage.tsx` — same
- `src/features/auth/pages/ResetPasswordPage.tsx` — same
- `src/features/auth/pages/CheckEmailPage.tsx` — same
- `src/features/auth/pages/VerifyEmailPage.tsx` — same
- `src/locales/{de,en}.json` — eyebrow + headline + subhead key set per page

**Specifics**

- **Form panel** content-side reskin (no structural change to the split-screen):
  - Eyebrow: existing pattern verified — Inter 11 tracking-`[0.22em]` uppercase clay. Adjust spec if any page is using a different tracking (audit during commit).
  - Headline: Instrument Serif clamp(36px, 5vw, 48px) ink, trailing period in clay. Existing pages already do this; copy refresh:
    | Page | DE | EN |
    |---|---|---|
    | Sign-in | `Willkommen zurück.` | `Welcome back.` |
    | Sign-up | `Konto anlegen.` | `Create account.` |
    | Forgot | `Passwort zurücksetzen.` | `Reset password.` |
    | Reset | `Neues Passwort.` | `New password.` |
    | Check email | `Prüfen Sie Ihren Posteingang.` | `Check your inbox.` |
    | Verify | `E-Mail bestätigt.` | `Email verified.` |
  - Subhead: Inter 16 italic ink/65 (was Inter 16 ink/70 — italic + 5% opacity drop unifies with the dashboard activity sentence and chat title-block address). Copy:
    | Page | DE | EN |
    |---|---|---|
    | Sign-in | `Setzen Sie Ihre Arbeit fort.` | `Resume your work.` |
    | Sign-up | (existing copy retained, italic styling applied) | (existing) |
    | Forgot | `Wir senden Ihnen einen Link.` | `We'll send you a link.` |
    | Reset | `Wählen Sie ein neues Passwort.` | `Choose a new password.` |
  - Hairline rule (`bg-ink/15`, w-12) below the subhead — sits between subhead and form. Matches dashboard welcome rule scaled down.
  - Inputs: already use the hairline-bottom-border pattern. **One change:** focus state's bottom-border switches from `clay/60` (current) → `drafting-blue/60` (matches chat workspace input bar focus). Inputs read across the product as the same component.
  - Forgot password link, "no account yet?" footer link — italic clay underlined Inter 12 (verify; if already, no change).
- **Photo pane** caption tab:
  - Add a tab-style annotation at the **bottom-LEFT** of the photo pane (not on the photo itself — overlaid as a small label sitting on the warm-paper gradient).
  - Inter 9 italic clay/70, copy: `Atelier · {Locale} · {Year}` per photo. Each `stem` (photo filename) gets a paired caption in `auth.photoCaption.{stem}`.
  - **See Q5** — captions are placeholder-fictional unless we have real attribution.
- **Page titles** (locale-aware):
  | Path | DE | EN |
  |---|---|---|
  | `/sign-in` | `Anmelden · Planning Matrix` | `Sign in · Planning Matrix` |
  | `/sign-up` | `Konto anlegen · Planning Matrix` | `Create account · Planning Matrix` |
  | `/forgot-password` | `Passwort zurücksetzen · Planning Matrix` | `Reset password · Planning Matrix` |
  | `/reset-password` | `Neues Passwort · Planning Matrix` | `New password · Planning Matrix` |
  | `/check-email` | `Posteingang prüfen · Planning Matrix` | `Check your inbox · Planning Matrix` |
  | `/verify-email` | `E-Mail bestätigen · Planning Matrix` | `Verify email · Planning Matrix` |

  Each page's `useEffect` sets `document.title` from a new `auth.{page}.docTitle` locale key.

- **No changes** to: form field validation, error alerts, submit button, language switcher, sign-up/check-email banner copy bodies, password show/hide toggle, caps-lock detector, honeypot.

**Mobile**

Auth already stacks photo-on-top, form-below at `<lg`. Caption tab moves to bottom-left of the photo strip on mobile (which becomes top of the page) — same visual logic.

---

### Commit #50 · `feat(brand): wordmark refinement — axonometric building glyph + tightened typographic lockup`

**Files**

- `src/components/shared/Wordmark.tsx` — replace `MatrixMonogram` with `AxonometricBuildingGlyph`, refine type weights + tracking + feature settings + size variants
- `src/components/shared/index.ts` — re-export refresh (if needed)
- `src/features/chat/components/LeftRail.tsx` — add small `<Wordmark size="xs" />` above the project header (per brief §2.4)
- All other call sites (`MobileTopBar`, dashboard header, wizard header, auth header, overview header, chat workspace) — pick up the new Wordmark automatically; no per-site edits

**Specifics**

- **AxonometricBuildingGlyph** — 16×16 SVG, 1.25px stroke, `currentColor` (so callers control color via `text-ink` / `text-drafting-blue/70`). Hand-drawn-feeling baked path data (deterministic wobble, no `feTurbulence` — same technique as the Phase 3.2 sigils).
  - Geometry: simple isometric cube viewed from above-left.
    ```
    Front face: parallelogram (3,8) (10,8) (10,14) (3,14)
    Right face: parallelogram (10,8) (13,5) (13,11) (10,14)
    Top face:    parallelogram (3,8) (6,5) (13,5) (10,8)
    Ground shadow: dashed line (1,15) → (12,15), strokeOpacity 0.35
    ```
  - Slight baked imperfection: `(13,5)` becomes `(12.85, 5.1)`, `(10,8)` becomes `(10.05, 7.95)` — sub-pixel deviations that read as hand-drawn at any zoom, do not blur on retina.
  - Default color: `text-ink`. In dashboard hero context (top-left), driver class `text-drafting-blue/85`. **See Q2.**
- **Typography refinement**:
  - "Planning" — Inter, weight 500 (was 500 already — verify), letter-spacing `-0.005em`, OpenType `ss01 cv05 case calt` inherited from body. Same size as currently shipped.
  - "Matrix" — Instrument Serif italic, weight 500 (currently `normal`). Letter-spacing 0 (Instrument Serif is generous-spaced by default). Italic stays.
  - The two halves visually balance: Inter 500 + Serif italic 500 sit at the same optical weight despite different proportions.
  - Glyph + 8px gap + wordmark. Wrap in a single `inline-flex items-center gap-2`.
- **Size variants**:
  - `xs` — 14px glyph + Inter 12 + Serif 12 (chat workspace left rail above project header)
  - `sm` — 16px glyph + Inter 14 + Serif 14 (mobile top bar centred title block)
  - `md` — 18px glyph + Inter 16 + Serif 16 (default; dashboard, wizard, auth, overview headers)
- **Hover**: very subtle ink darken (`hover:text-ink/90` from `text-ink`). No additional decoration.
- **Click target**: existing `<Link to="/dashboard">` wrap retained.
- **Mobile chat workspace top bar** — currently the centre column shows `PROJEKT / {project name}` as a mini title block (#45). This stays. The wordmark is added to the **left rail**'s top (above the project header) on desktop, NOT on mobile. Mobile keeps the folded-paper-tab triggers + title-block centre.

---

### Commit #51 · `feat(unification): consistency pass + page titles + docs`

**Files**

- All page-rendering components — audit `useEffect(() => { document.title = ... })` set, ensure locale-aware
- `src/components/shared/GrainOverlay.tsx` — verify mounted on every page (it likely is via `globals.css`'s body rule, but audit)
- `docs/phase3-decisions.md` — append D16 line
- `docs/phase3-3-plan.md` — moved from root `PHASE_3_3_PLAN.md`
- `docs/manager-demo-prep.md` — refresh demo script (start at dashboard)
- `README.md` — Phase 3 status line bumped

**Audit checklist** (each item below verified or fixed in this commit):

| Element | Required state | Fix scope |
|---|---|---|
| Paper grain (4%, fixed) | Visible on every page incl. auth | Should already be global; spot-check landing/legal too |
| `<BlueprintSubstrate />` | Mounted on dashboard + wizard + chat workspace; **NOT** on auth (photography handles atmosphere) | New mounts in #47 + #48; no other change |
| Italic German role labels | Already on every assistant tag | No-op, audit only |
| Drafting-blue accent rules | Cursor lens, ambient activity dot, focus-state input borders, user-card hairline, project-list arrows | Verify focus-state border switch from clay → drafting-blue did land in #49 |
| Roman numerals | Chat left rail, wizard progress (#48), dashboard project list (#47), overview binder | All landed in respective commits; audit line-up |
| Hairline weights | 0.5px grids, 1px primary dividers, 2px audit ticks only | Audit `border-border-strong/40` legacy classes for any 1.5px ambiguity |
| Eyebrow tracking | `0.20em` for tags (specialist, status pill), `0.22em` for sections (PROJEKTE, ATELIER, eyebrows above headlines). **Never `0.16em` anywhere.** | Grep for `tracking-[0.16em]` and replace site-by-site. (My survey saw `0.16em` on `StatusPill` — change to `0.20em`.) |
| North arrow | Chat paper card top-right, wizard paper card top-right (#48). NOT on dashboard or auth. | Verify #48 added it correctly |
| Title block convention | Eyebrow + Roman + headline + subhead + hairline | Verify chat / wizard / dashboard / overview all match |
| Page titles | Per the matrix in #49 + #47 | Spot-check live |

**Page title final matrix** (for reference, lifted into commit #51):

| Path | DE title | EN title |
|---|---|---|
| `/` | `Planning Matrix` | `Planning Matrix` |
| `/sign-in` | `Anmelden · Planning Matrix` | `Sign in · Planning Matrix` |
| `/sign-up` | `Konto anlegen · Planning Matrix` | `Create account · Planning Matrix` |
| `/forgot-password` | `Passwort zurücksetzen · Planning Matrix` | `Reset password · Planning Matrix` |
| `/reset-password` | `Neues Passwort · Planning Matrix` | `New password · Planning Matrix` |
| `/check-email` | `Posteingang prüfen · Planning Matrix` | `Check your inbox · Planning Matrix` |
| `/verify-email` | `E-Mail bestätigen · Planning Matrix` | `Verify email · Planning Matrix` |
| `/dashboard` | `Atelier · Planning Matrix` | `Atelier · Planning Matrix` |
| `/projects/new` | `Neues Projekt · Planning Matrix` | `New project · Planning Matrix` |
| `/projects/:id` | `{name} · Planning Matrix` | `{name} · Planning Matrix` |
| `/projects/:id/overview` | `Übersicht — {name} · Planning Matrix` | `Overview — {name} · Planning Matrix` |

**D16 entry** (`docs/phase3-decisions.md`):

```markdown
### D16 · Atelier unification across all surfaces (Phase 3.3 · 2026-04-28)

The chat workspace post-3.2 reads as a finished German atelier; the dashboard,
wizard, and auth flow had not received the same treatment. Phase 3.3 unifies
them — five commits (#47–#51) bringing the shared vocabulary (paper grain,
blueprint substrate, drafting-blue accent, Roman numerals, hairline rules,
italic running heads, hand-drawn axonometric SVGs, north arrows) to every
surface. No new vocabulary; one shared `<BlueprintSubstrate />` and one new
`<PaperSheet />` primitive cover the structural reuse.

Decisions confirmed in PHASE_3_3_PLAN.md §6 Q1–Q8 and locked in commits #47–#51.
```

---

## 4 · Volume estimate

| # | Title | LOC est. | Risk |
|---|---|---|---|
| 47 | Dashboard rebuild + project list + empty state + useProjectsList | ~480 | Medium — first surface to use `useProjectsList`, German number-word formatting, atelier-table SVG |
| 48 | Wizard paper card + extracted substrate + Roman progress + chip restyle | ~360 | Medium — extracting + parametrising `BlueprintSubstrate` touches Phase 3.2 imports; chips are visible-everywhere |
| 49 | Auth atelier reskin + photo caption + page titles | ~220 | Low — copy + style refinements only, no field changes |
| 50 | Wordmark refinement (axonometric glyph + tightened lockup) + LeftRail mount | ~140 | Low — single component edit + one new SVG |
| 51 | Unification audit + page titles + docs | ~120 | Low — mostly verification + small fixes |

**Total estimated LOC: ~1,320** across 5 commits. About 40% of Phase 3.2's volume — appropriate for a unification pass that reuses already-built primitives.

---

## 5 · Where I want creative authority — and where I'm checking with you first

Same discipline as Phase 3.2 §9. Ten flagged points becomes eight (this batch is smaller and the vocabulary is locked).

### 5a — `useProjectsList` paginates? Or hard-cap at 50?

The brief says "Cap at 50 visible projects in v1; add pagination in Phase 4 if needed." I agree — at the manager demo, no test account has more than 5 projects. Hard cap, sort `updated_at DESC`. **No flag.**

### 5b — Wordmark glyph color in dashboard hero context

Brief says "ink (or drafting-blue at 70% in the dashboard's hero context)." My read: drafting-blue at 85% in the dashboard hero context, ink elsewhere. The dashboard is the first surface a user sees post-sign-in; a touch of drafting-blue sells the atelier register immediately. **Q2 — confirm.**

### 5c — Welcome name source

`auth.user.user_metadata.full_name` is set on sign-up if the user filled it; `auth.user.email` is always present. Strategy:

- If `full_name` exists → first word (`"Rutik Erole" → "Rutik"`)
- Else → email's local part, capitalized first letter (`"vibecoders786@gmail.com" → "Vibecoders786"`)
- Edge case: numbers-in-local-part read poorly. Fallback to no name when local part starts with non-letter: `Willkommen.` (DE) / `Welcome.` (EN).

**Q4 — confirm strategy or override.**

### 5d — Atelier-table illustration on dashboard empty state — same family or new scene?

The brief says "different scene" from `atelier-empty.svg` (which is a drafting table with rolled-up plans + pen drawing scale line + ledger + cup; pen-tracing animated). My proposal:

- Same hand-drawn-feeling, same axonometric, same drafting-blue 45% — vocabulary identical.
- Different *content*: a closed sketchbook + an unsharpened pencil + a single rolled blueprint resting on the table. Reads as "atelier waiting to begin." No animation (the dashboard is calmer than the priming state). 280×180 viewBox.

**Q3 — confirm motif or veto.**

### 5e — Photo caption copy — fictional placeholder or real attribution

Brief shows `Atelier · Charlottenburg · 2024`. We don't have real attribution for the auth photos (they're stock-style atmospheric). Options:

- (a) Ship fictional captions in the same register: `Atelier · Berlin · 2024`, `Atelier · München · 2025`, etc., flagged in the locale file as `// FICTIONAL_PLACEHOLDER`. Removed when real captions ship.
- (b) Ship a generic caption: `Architektenatelier · Reference Image`. More honest but less premium.
- (c) Skip captions until real data — wait for Rutik to provide.

I lean (a) — premium feel, honest comment in the file flags it for replacement. **Q5 — confirm.**

### 5f — Wizard chip selected state — clay dot or just color shift?

Brief specifies drafting-blue 12% fill + drafting-blue 60% border. My addition: a tiny `size-1.5 rounded-full bg-clay shrink-0` dot prefixed flush-left in the chip when selected. Aligns with Polish-Move-1 specialist-tag vocabulary, makes selection state obvious without ARIA reliance.

**Q6 — confirm or strip the dot for cleaner read.**

### 5g — Project status enum — what's actually in the DB?

Survey didn't enumerate the `project.status` values. Brief assumes `active / paused / draft / completed`. If the DB enum doesn't include `archived` or `completed`, I either:

- (a) Render only the states that exist; planned states (e.g. `archived`) get a generic ink/35 ink-pill until the schema gets there.
- (b) Add the column values to the schema in #47. **Out of scope per §5 — schema changes are Phase 4.**

I'll go (a). I'll grep `supabase/migrations/` during commit #47 for the actual enum and document the status set. **Q7 — confirm not adding to the enum here.**

### 5h — Wordmark on chat workspace left rail — also on mobile?

Brief says desktop adds wordmark above project header in the left rail. **Mobile keeps the folded-paper-tab triggers + title-block centre.** I read this as "no Wordmark on mobile chat workspace" — desktop only. Confirming this is correct (otherwise mobile top bar gets crowded). **Q8 — confirm.**

---

## 6 · Confirmation list — please answer before commit #47

| ID | Question | My recommendation | Your call |
|---|---|---|---|
| **Q1** | Drop the `domain-a-aerial` rooftop photo on dashboard entirely, replace with paper grain + `<BlueprintSubstrate />`? (Brief says yes; flagging because the photo is a visible piece of the current dashboard.) | Drop, ship substrate | ☐ drop ☐ keep |
| **Q2** | Wordmark glyph color on dashboard hero — drafting-blue 85% (sells atelier immediately) vs ink (per default rule)? | Drafting-blue 85% on dashboard, ink elsewhere | ☐ drafting-blue dashboard ☐ ink everywhere |
| **Q3** | Empty-state dashboard illustration — different scene from `atelier-empty.svg` (closed sketchbook + pencil + rolled blueprint, no animation, ~280×180)? | Ship the new motif | ☐ new motif ☐ reuse atelier-empty |
| **Q4** | Welcome name strategy — `full_name` → first word, fallback `email local part` capitalized, fallback `Willkommen.` if local part is numeric? | Three-tier fallback as specified | ☐ ship ☐ tweak |
| **Q5** | Auth photo captions — fictional German atelier placeholders (a) flagged in locale file, or wait for real attribution (c)? | Ship (a) — placeholder + flag | ☐ ship placeholder ☐ wait for real |
| **Q6** | Wizard chip selected state — drafting-blue fill + border + small clay dot prefix, or fill+border only? | Add the clay dot — clearer state | ☐ with dot ☐ no dot |
| **Q7** | Project status pill set — render only the states that exist in the current enum (no schema changes)? | Render existing only; add coverage in Phase 4 | ☐ existing only ☐ extend enum here |
| **Q8** | Wordmark on chat workspace — desktop left-rail above project header only, not on mobile? | Desktop only | ☐ desktop only ☐ mobile too |

If you answer all eight, I'll lock them into this file and start commit #47. If you want to discuss any, we can. If you want to reject the batch direction, also fine — better now than after 1,300 lines.

---

## 7 · What I will NOT do without confirmation

- Touch any production file in `src/` until you sign off Q1–Q8.
- Change any chat workspace internals (Phase 3.2 is locked per brief §5).
- Change the brand color palette beyond inheriting locked tokens.
- Change copy on the landing page or legal pages.
- Touch any database schema, Supabase Edge Function, or Anthropic prompt.
- Add new features (the brief is unambiguous — unification only).
- Move `PHASE_4_PLAN.md` (Phase 4 still awaits manager Q1–Q16 walkthrough).
- Skip reduced-motion fallbacks on any animated surface.
- Ship a single "in Aufbau" or "in progress" string anywhere in the product.

---

## 8 · If you confirm — what happens next

1. I lock Q1–Q8 into this file (a quick edit in §6).
2. Commit #47 opens (dashboard rebuild + project list + empty state + `useProjectsList` hook). Each commit ends with `npx tsc --noEmit` clean and `npm run build` green before the next opens.
3. After commit #51, I push the batch and wait for Vercel deploy.
4. Live verification per brief §3 — full user journey from sign-in → dashboard → wizard → chat workspace, on the deployed URL. Same proof bar as Phase 3.2 (signature-string audit on the deployed bundle, plus an honest read on whether unification landed).
5. Batch report follows the same shape as Phase 3.2 — what shipped, what's verified, what's still gating on your eyes (screenshots + screen recording I cannot capture from this shell).

— End of PHASE_3_3_PLAN.md.
