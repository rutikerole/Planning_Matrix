# Phase 3.6 — PLAN.md (Operating Mode)

> **Disposition:** Same rhythm as 3.2 / 3.3 / 3.4 / 3.5. Pre-flight → plan → confirm → execute → report.
> Move to `docs/phase3-6-plan.md` in commit #74.
>
> **Do not touch `src/`, `supabase/functions/`, or `supabase/migrations/` until Rutik signs off §6 Q1–Q11.**

---

## §1 · Pre-flight survey (findings, not plans)

### §1.1 Repo state — gates

| Item | Status | Notes |
|---|---|---|
| Migration `0001` … `0006` | All present on disk | `0005_likely_user_replies.sql` and `0006_share_tokens.sql` exist locally — **need confirmation they've been applied to Supabase**. Verify before commit #67. |
| Edge functions deployed | `chat-turn`, `create-share-token`, `get-shared-project` | All three present. Phase 3.6 adds **two new**: `signed-file-url` (commit #68) + `delete-file` (commit #68 — for chip-remove cleanup). The `cleanup-orphan-files` cron is **deferred to Phase 4**. |
| Brand TTFs in `/public/fonts/` | **Missing** | Only `README.md` is committed. This is load-bearing for the PDF bug — see §1.5. |
| Routes | `/`, `/sign-up`, `/sign-in`, `/projects/new`, `/projects/:id`, `/projects/:id/overview`, `/projects/:id/result`, `/result/share/:token` | `/projects/:id/overview` is already a real page (not a modal). Brief said "currently it's a modal-style; turn into a real page" — that's already done. We rebuild *contents* in #71, not the routing. |

### §1.2 Chat input — current architecture

`InputBar.tsx` is a **swap component**. It reads `lastAssistant.input_type` and replaces the entire control:

- `text` → growing textarea (multi-row, Enter submits)
- `yesno` → 2 pills
- `single_select` → option pills
- `multi_select` → checkbox grid + Senden
- `address` → 4-field form
- `none` → **a single "Continue" button** (this is the dead-end Rutik flagged; the textarea disappears)

`SuggestedReplies` only renders when `inputType === 'text'` AND no completion_signal AND not disabled. It already mounts above the control — that pattern stays; we extend it to render above all input types.

`chatStore` has no `pendingAttachments` slice yet — needs to be added.

`ChatWorkspaceLayout` puts the inputBar in the main column footer. Good — no layout surgery needed for #67. For #69 (top-of-thread progress), we add a sticky band inside the `<main>` above the message-list scroll area — same column, no grid changes.

### §1.3 Overview + result pages

`OverviewPage.tsx` is the editorial register Rutik called "newspaper or blog":

- Huge `Sanierung · Projekt vom 28.04.2026` Instrument Serif headline (lines 105–119)
- 8 tab "binder strip" with Roman numerals
- Each fact rendered as a Roman-numeral schedule entry
- Fact `key` rendered raw — that's why Rutik sees `STRUCTURAL.EXECUTION_DRAWINGS_REQUIRED`

The page receives the right data already (`facts`, `procedures`, `documents`, `roles`, `recommendations`, `events` from `useProjectEvents`). #71 keeps the data wiring, replaces the renderer with a Linear-style cockpit.

`ResultPage.tsx` composes 12 sections in order: `CoverHero` → `VerdictSection` → `TopThreeHero` → `LegalLandscape` → `DocumentChecklist` → `SpecialistsRequired` → `CostTimelinePanel` → `RiskFlags` → `ConfidenceDashboard` → `ConversationAppendix` → `SmartSuggestions` → `ExportHub`. Cover hero is sacred (Section I). The other 11 sections get the operating-mode uplift in #72.

### §1.4 Fact label sites — the `factLabel(key, locale)` consumers (#70)

Sites that render fact keys raw (audit grep):

1. `src/features/chat/components/EckdatenPanel.tsx` line 98 — right rail
2. `src/features/chat/pages/OverviewPage.tsx` line 143 — Eckdaten section (will be replaced by cockpit in #71, but the labels have to be German there too)
3. `src/features/chat/lib/exportPdf.ts` line 212 — VII KEY DATA section in the PDF
4. `src/features/result/components/VerdictSection.tsx` line 113 — supporting facts list
5. `src/features/result/components/RiskFlags.tsx` line 135 — assumed-fact risk body
6. `src/features/result/components/CostTimelinePanel.tsx` line 107 — cost driver search
7. `src/features/result/components/ConfidenceDashboard.tsx` — already has its own `labelFor(key, lang)` helper — reuse / fold into the new resolver
8. Markdown export (`exportMarkdown.ts`, not yet read — audit during #70)

The model emits keys in `DOMAIN.SUBKEY` shape. From the system prompt, these domains exist: `PLOT.*`, `BUILDING.*`, `PROJECT.SCOPE.*`, `STRUCTURAL.*`, `ENERGY.*`, `PROCEDURE.*`, `PARTIES.*`, `STELLPLATZ.*`, `BRANDSCHUTZ.*`, `BAULASTEN.*`. Need ~80–100 keys in `factLabels.de.ts`. Live walk a T-01 conversation during #70 implementation will confirm coverage.

### §1.5 PDF export bug — diagnosis

**Hypothesis (high confidence):** WinAnsi can't encode the em-dash (U+2014) `—` that lives in literal export strings.

**Evidence:**

1. `/public/fonts/` contains only `README.md` — no TTFs are deployed. `fontLoader.ts` falls into `helveticaFallback` for every export (lines 64–75).
2. Helvetica's WinAnsi encoding is Latin-1-only. U+2014 is outside Latin-1.
3. `exportPdf.ts` line 387: `'— Vorläufige Zusammenfassung — bestätigt …'`. Line 493: `'— Preliminary; confirmation by a licensed architect required.'`. Line 269: ` · ` interpunct (OK; in WinAnsi). Line 173 in `ExportMenu.tsx`: ` → ` arrow (U+2192) used in trigger UI but **not in PDF** — safe. Inside PDF: `→` shows up nowhere in `exportPdf.ts`. So the immediate failure is the em-dash.
4. `pdf-lib` GitHub issues #217, #548, #1759 confirm the same failure mode — `Error: WinAnsi cannot encode 0x2014` is thrown synchronously from `drawText`.
5. `ExportMenu.triggerExport` catches via `console.error` (line 84) and resets state silently — exactly Rutik's "not able to download" symptom.

**Diagnostic plan during #73 (pre-fix):**

1. `npm run dev` — open a fresh project, walk to the synthesis turn, click Vollständiges PDF, capture the console error verbatim.
2. Confirm the throw is from `drawText` with U+2014 in the input.
3. Verify on the deployed app that `/fonts/Inter-Regular.ttf` returns 404.
4. Test the same flow on a project whose model output happens to contain other non-WinAnsi chars (smart quotes, ellipsis) — these will also fail and prove the path is brittle, not just the literal em-dashes.

**Two-pronged fix (#73):**

- **A. Sanitize on the Helvetica path.** New helper `winAnsiSafe(text)` replaces `—` → `-`, `…` → `...`, `“ ”` → `"`, `‘ ’` → `'`, `→` → `->`, `←` → `<-`, `·` stays (Latin-1), `§` stays. Apply in every `page.drawText` call when `fonts.usingFallback === true`. This makes the export work even with no TTFs deployed.
- **B. Optional: bundle a small subset font.** A 60–90 kB Inter Latin-Extended subset (`?url` import, no fetch) registered via fontkit unconditionally. Removes the WinAnsi limitation entirely. **Defer this to Phase 4** unless §6 Q9 says otherwise — sanitization is enough to ship clean.

Plus: an error boundary around the export path that surfaces a calm "PDF generation failed — try Markdown" UI (Rutik's brief, §6/Commit #73).

### §1.6 Reference applications studied (web research, Apr 2026)

**Chat input + attachments**

- **Claude.ai** — single rounded card (~16px radius), inline paperclip on left, `+` button for tools, send button on right. Multi-line auto-grow. Attached files preview as small chips above the textarea, with a remove-X. Drag-and-drop highlights the entire chat area with a soft tint. *Borrow:* the chip-above-textarea pattern, the rounded card, the inline paperclip placement.
- **ChatGPT** — model selector + attach + voice + send composition. Stop-generating affordance during streaming. Suggested-action chips during onboarding. *Borrow:* the disabled-during-streaming pattern; we already have `forceDisabled`.
- **Vercel v0 / shadcn-chatbot-kit `MessageInput`** — `allowAttachments` prop pattern. Auto-resize up to ~240px. Drop-zone overlays the entire textarea. *Borrow:* native HTML5 drag-and-drop, no third-party DnD library — `react-dropzone` etc. is unnecessary for our scope.
- **Notion AI** — restrained register, slash-menu for commands. Not borrowing — we don't need slash commands in v1.
- **Linear command palette** — small input that does a lot. *Borrow:* keyboard-first thinking; Cmd/Ctrl+Enter to send is already in the brief.
- **Slack composer** — file-type icons (PDF, image, doc). *Borrow:* lucide `FileText` / `Image` / `FileType` mapping by mime.

**Functional cockpits / overview pages**

- **Linear** — list view with sortable columns, status pills, filter chips, density-honest 32px row height. *Borrow heavily:* this is the visual reference for #71.
- **Stripe Dashboard** — ledger-grade tables, narrow column treatment for IDs/keys. *Borrow:* the CLIENT · DECIDED qualifier as a small pill, not literary text.
- **Notion database view** — inline-edit on click. *Borrow:* the inline editor for CLIENT-source facts.
- **Pitch / Personio / Granola** — calm B2B premium-but-functional. *Tone reference, no specific patterns.*

**Progress indicators**

- **Linear cycle progress** — small filled-segments bar with hover = label + percentage. *Borrow:* the segment + label + percentage trio.
- **Stripe checkout** — multi-step with current state highlighted. *Borrow:* the current-step emphasis.
- **GitHub PR review steps** — chunked with clear current state. *Tone.*

**File upload**

- **Slack** — drop-zone overlay + type icons + size in human format. *Borrow.*
- **GitHub PR comment** — markdown-aware drag-and-drop. Not relevant — we don't render markdown in messages.
- **Linear comment composer** — small, restrained, file chip after upload. *Borrow.*
- **Anthropic Workbench** — 25MB cap on attachments, type allowlist. *Borrow the cap and the allowlist.*

**Bottom line:** all patterns we need exist as established UI grammar. Phase 3.6 is composition, not invention.

### §1.7 Dependencies

- `pdf-lib` ✓ · `@pdf-lib/fontkit` ✓ · `vaul` ✓ · `framer-motion` ✓ · `lucide-react` ✓ · `react-i18next` ✓
- **No new third-party libraries proposed.** Specifically:
  - Drag-and-drop: native HTML5 `dragenter / dragover / drop` — no `react-dropzone`.
  - Storage path uniqueness: `crypto.randomUUID()` — no `nanoid`.
  - Date formatting in cockpit: existing `Intl.DateTimeFormat`.
  - Table sort/filter: ~80 LOC of in-component logic — no `@tanstack/react-table`.

If any of these turns out to be a wrong call during execution, I'll flag it before adding a dep.

---

## §2 · Mode separation — the discipline (sandboxed via CSS attribute)

Two modes share the same paper substrate, the same color palette, the same Inter + Instrument Serif stack. They differ in **register**.

```css
[data-mode="operating"] {
  --pm-radius-input: 0.75rem;
  --pm-radius-card: 1rem;
  --pm-radius-pill: 9999px;
  --pm-shadow-input: 0 1px 2px hsl(220 15% 11% / 0.04);
  --pm-shadow-card: 0 1px 3px hsl(220 15% 11% / 0.06);
  --pm-tracking-body: 0.005em;
}

[data-mode="deliverable"] {
  --pm-radius-input: 0;
  --pm-radius-card: 0;
  --pm-radius-pill: 0;
  --pm-shadow-input: 0 0 0 transparent;
  --pm-shadow-card: 0 0 0 transparent;
  --pm-tracking-body: 0;
}
```

### Mode assignment

| Surface | Attr | Why |
|---|---|---|
| Landing (`/`) | `deliverable` (or omit — defaults work) | Marketing |
| Auth (sign-in / sign-up / forgot / reset / verify) | `deliverable` | Brand register |
| Wizard (`/projects/new`) | `deliverable` | Ceremonial |
| Cover hero of result page (Section I) | `deliverable` | The payoff |
| PDF export build | n/a — the PDF is its own document register | |
| Share view (`/result/share/:token`) | mostly deliverable; sections II–XII inherit operating | |
| Chat workspace root | `operating` | Used dozens of times per session |
| Overview page | `operating` | Working surface |
| Result page sections II–XII container | `operating` | Below the cover hero |

**Why CSS-attribute scoping (and not a global flip):** atelier defaults are the safe baseline. Operating tokens only activate inside the `[data-mode="operating"]` subtree. If we forget to add the attribute somewhere, the component renders in atelier — a visible-but-recoverable error, not a silent regression on the landing page.

### What the operating mode actually changes

- Rounded corners on inputs, buttons, attachment chips, status pills (atelier was 0–2 px; operating is 12–16 px).
- Functional drop-shadows on the input bar + cockpit cards (atelier was flat; operating gets `shadow-sm`).
- Body tracking 0.005em (atelier was tighter — 0 to -0.02em on display).
- Inter dominant; italic Serif demoted to running heads only.
- Roman numerals retained only where they aid reference (table-of-contents anchors, section headers in cockpit), removed elsewhere.
- Density honest — 32 px row height in cockpit tables, no excess padding.

### What the operating mode does NOT change

- Color palette (paper, ink, clay, drafting-blue) — same.
- Typography stack (Inter + Instrument Serif) — same.
- Paper grain + blueprint substrate — same on both.
- The legal-shield `Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in` footer — same.
- Hand-drawn specialist sigils — same.

---

## §3 · Vocabulary inheritance + new primitives

### Reused without modification

- `<BlueprintSubstrate>` · `<PaperSheet>` · `<PaperCard>`
- `<SpecialistSigils>` (the 7 hand-drawn glyphs)
- `<Wordmark>`
- `<LanguageSwitcher>`
- `<StatusPill>` (will be re-skinned in operating mode but the API stays)
- `<Typewriter>` · `<StreamingCursor>` · `<StreamingAssistantBubble>`

### New primitives in this phase

| Primitive | Owns | Used by |
|---|---|---|
| `factLabel(key, locale)` resolver | label + unit lookup, fallback humanizer | EckdatenPanel, cockpit tables, exportPdf, exportMarkdown, RiskFlags, VerdictSection, ConfidenceDashboard |
| `<AttachmentChip>` | one attachment + status + remove-X | InputBar (pending) and MessageUser (sent) |
| `<AttachmentPicker>` | dialog + drop-zone + category hint | InputBar |
| `<SuggestionChips>` | row of chips above the textarea | InputBar |
| `<ChatProgressBar>` | top-of-thread loud progress | ChatWorkspaceLayout |
| `<CockpitTabs>` | Linear-style tab nav | OverviewPage |
| `<CockpitTable>` | sortable + filterable + edit-in-place | OverviewPage tabs |
| `<QualifierBadge>` | compact `CLIENT · D` pill with tooltip | OverviewPage tables |
| `winAnsiSafe(text)` | sanitizer for the Helvetica fallback path | exportPdf |

---

## §4 · The eight commits — concrete scope

> Execution order (per Appendix A of the brief):
> **#67 → #69 → #70 → #68 → #71 → #72 → #73 → #74**

> Each commit ends with `npx tsc --noEmit` clean, `npm run build` green, and a vercel deploy. The deployed `main` branch must always work; if a commit breaks the live deploy, push a hotfix immediately.

---

### Commit #67 · Persistent input bar with attachments + suggestion-chip pattern

**Files**

- `src/features/chat/components/Input/InputBar.tsx` — full rewrite
- `src/features/chat/components/Input/AttachmentPicker.tsx` — **new (stubbed in #67, fully wired in #68)**
- `src/features/chat/components/Input/AttachmentChip.tsx` — **new (stubbed)**
- `src/features/chat/components/Input/SuggestionChips.tsx` — **new** (composes existing InputYesNo, InputSelect, InputMultiSelect, InputAddress, SuggestedReplies internals as chip rows)
- `src/features/chat/hooks/useInputState.ts` — **new** (text + attachments + activeSuggestion store)
- `src/stores/chatStore.ts` — extend with `pendingAttachments: PendingAttachment[]` slice
- `src/features/chat/components/ChatWorkspaceLayout.tsx` — small adjustment: bottom padding on the message column to leave a permanent ~120 px space
- `src/features/chat/components/Thread/Thread.tsx` — small: ensure the new-message pill anchors above the (now taller) input bar

Existing `InputText`, `InputYesNo`, `InputSelect`, `InputMultiSelect`, `InputAddress`, `IdkPopover` — **kept; recomposed**, not deleted.

**State machine (`useInputState`)**

```ts
interface PendingAttachment {
  id: string                 // crypto.randomUUID
  file: File
  previewUrl: string | null  // object URL for images
  status: 'queued' | 'uploading' | 'uploaded' | 'failed'
  storagePath: string | null
  fileRowId: string | null   // project_files.id once inserted
  category: FileCategory     // optional, defaults to 'other'
  errorMessage: string | null
}

interface InputState {
  text: string
  attachments: PendingAttachment[]
  activeSuggestion: SuggestionId | null
}
```

`SuggestionId` is `{ kind: 'yesno', value: 'ja' | 'nein' } | { kind: 'select', value: string } | { kind: 'reply', text: string } | { kind: 'address' }`.

**Behavior**

- Input bar always visible; never replaced.
- `inputType: 'none'` → small italic clay note above the bar: `Klicken Sie *Weiter*, oder geben Sie eine Nachricht ein.` + a primary "Weiter" button rendered in the chip row (not replacing the textarea).
- `inputType: 'yesno' | 'single_select' | 'multi_select' | 'address'` → those affordances render as chips above the textarea. Click → fills text via the resolver below; user can edit before send.
- `likely_user_replies` → reply chips (existing SuggestedReplies pattern) render in the same chip row.
- Send: combines `text + attachment_ids + active_suggestion` into the existing chat-turn payload. No protocol change — `chat-turn` continues to receive `userMessage: string` + `userAnswer: UserAnswer`.

**Chip → text resolver (Q1 default: append)**

When user clicks a chip with text already in the textarea: append a newline + chip text. Rationale: a Bauherr who's typing a clarifying note shouldn't lose it because they tapped a "Ja" chip. The chip text typically stands on its own; appending is rare but recoverable. Q1 confirms.

**Visual register (operating mode)**

- Outer card: `rounded-[var(--pm-radius-input)]` → 12px in operating, 0 in deliverable. 1 px clay/20 border. `box-shadow: var(--pm-shadow-input)`.
- Paperclip icon: lucide `Paperclip`, 18 px, ink/60. Hover ink. Active (any pending attachments): drafting-blue.
- Send button: 36×36 rounded, ink fill, paper foreground; disabled = ink/15 fill.
- Disabled-during-thinking: subtle clay overlay text "Team antwortet…", input still mounted (so user's draft is preserved); paperclip greyed; chip click disabled.
- Reduced motion: no chip stagger, instant render.

**Mobile**

- Same component. Vaul drawer for AttachmentPicker on mobile (existing pattern from Phase 3.1).
- Chip row scrolls horizontally with right-edge fade-mask if overflow.
- Safe-area inset on padding-bottom.

**Edge cases verified during implementation**

- Text + attachment + chip → chip appends with newline (Q1 default).
- Attachment only, no text → submit allowed; sends `(Datei angehängt)` as message body.
- Multi-line: Shift+Enter newline; Enter sends; Cmd/Ctrl+Enter sends.
- Streaming response in flight → input disabled but mounted; user can still remove an attachment chip.
- `completion_signal === 'needs_designer'` → input bar stays; a contextual banner above (existing `Banners.tsx`) suggests "Architekt:in einladen" with a stub CTA.
- Reduced motion → no chip stagger.

**Estimated LOC ~720**

---

### Commit #69 · Loud progress indicator at top of thread

**Files**

- `src/features/chat/components/Progress/ChatProgressBar.tsx` — **new** (desktop)
- `src/features/chat/components/Progress/ChatProgressBarMobile.tsx` — **new**
- `src/features/chat/lib/progressEstimate.ts` — extend with `computeSegmentProgress(state, currentSpecialist, turnCount)` returning `{ segments: SegmentState[], percent, currentIdx }`
- `src/features/chat/components/ProgressMeter.tsx` — **kept**; demoted to "secondary, decorative" in left rail (Q8)
- `src/features/chat/pages/ChatWorkspacePage.tsx` — mount `<ChatProgressBar>` above `<Thread>`
- `src/features/chat/components/MobileTopBar.tsx` — replace the meter trigger with the condensed mobile bar; the existing top-drawer Progress overlay stays as-is

**Visual register**

```
┌──────────────────────────────────────────────────────────────┐
│  ●━━━━●━━━━●━━━━●━━━━○━━━━○━━━━○                  42 %       │
│  Init   Plot   Code   Sonst.  Verf.   Beteilig.  Synth.      │
└──────────────────────────────────────────────────────────────┘
```

- 7 segments mapping to the 7 conversation gates (moderator → planungsrecht → bauordnungsrecht → sonstige_vorgaben → verfahren → beteiligte → synthesizer).
- Filled = clay solid; current = drafting-blue/65; upcoming = paper.
- 1 px hairline connectors between segments, filled when visited.
- Labels Inter 11 tracking `[0.10em]` ink/65; current label ink/100 medium.
- Right side: percent in italic Serif 14 + total turns Inter 11 italic clay.
- ~52 px tall, sticky to top of thread (z-30, paper bg, hairline-bottom).

**Algorithm**

Each segment `complete` when state has at least N facts contributed by that specialist's domain (heuristic, not exact). Current segment = current specialist. Percent = `(completedSegments × 14) + (currentSegmentProgress × 14)` where current segment progress is 0..1 from facts/turns within. Better roughly-right than fight-to-be-exact.

**Mobile**

- In the existing `MobileTopBar`, render a condensed segment row + percent. Tap → opens the existing top-direction vaul drawer with the full bar + labels.

**Estimated LOC ~420**

---

### Commit #70 · Translate KEY DATA labels to natural German + English

**Files**

- `src/locales/factLabels.de.ts` — **new**
- `src/locales/factLabels.en.ts` — **new**
- `src/lib/factLabel.ts` — **new** resolver: `factLabel(key, locale): { label, unit? }`
- Consumers: `EckdatenPanel.tsx`, `OverviewPage.tsx` (will be replaced in #71 but keep coverage), `exportPdf.ts`, `exportMarkdown.ts`, `VerdictSection.tsx`, `RiskFlags.tsx`, `CostTimelinePanel.tsx`, `ConfidenceDashboard.tsx` (fold its private `labelFor` into the resolver)

**Coverage**

Build the table from these sources, in order:

1. The brief's table (PLOT/BUILDING/PROJECT.SCOPE/STRUCTURAL/ENERGY/PROCEDURE/PARTIES/STELLPLATZ/BRANDSCHUTZ — ~50 keys).
2. Walk a fresh T-01 conversation locally + capture every key emitted (live grep of `state.facts`).
3. Re-walk Sanierung, Umnutzung, Abbruch templates to fill gaps.
4. Aim for ~80–100 keys at ship; target zero falls-through-to-fallback in a normal T-01 session.

**Resolver fallback**

When a key isn't in the lookup, fall back to:

```ts
key.split('.').map(s => titleCase(s.replace(/_/g, ' '))).join(' · ')
```

Logged once per session via `console.warn('[factLabel] unmapped key:', key)` in DEV only.

**Estimated LOC ~600 (mostly the lookup table)**

---

### Commit #68 · File upload pipeline (Storage + project_files table + UI)

**Files**

- `supabase/migrations/0007_project_files.sql` — **new**
- `supabase/functions/signed-file-url/index.ts` — **new** (returns 1-hour signed URL for an attachment, scoped to owner)
- `supabase/functions/delete-file/index.ts` — **new** (removes a `project_files` row + its storage object; called when user removes a chip pre-send)
- `src/features/chat/components/Input/AttachmentPicker.tsx` — full implementation (replacing #67 stub)
- `src/features/chat/components/Input/AttachmentChip.tsx` — full implementation
- `src/features/chat/components/Thread/MessageAttachment.tsx` — **new** (renders attached files in user message bubble)
- `src/features/chat/components/MessageUser.tsx` — extend to show attachments
- `src/lib/uploadApi.ts` — **new** client helper
- `src/features/chat/hooks/useUploadFile.ts` — **new** TanStack mutation
- `src/features/chat/hooks/useDeleteFile.ts` — **new**
- `src/types/projectFile.ts` — **new** types
- `src/features/chat/lib/documentLinkage.ts` — **new** (maps category → checklist document, applies state delta)
- `src/features/result/components/DocumentChecklist.tsx` — wire user-uploaded files into checklist (display side)

**Migration `0007_project_files.sql`**

Verbatim from the brief, with one addition: **`messages.attachment_ids uuid[]`** column (default `'{}'`) so chat-turn can record attachments per-message without changing the request schema.

```sql
-- Phase 3.6 — project_files
create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  owner_id uuid not null references auth.users on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size bigint not null,
  storage_path text not null unique,
  storage_bucket text not null default 'project-files',
  category text check (category in (
    'plot_plan','building_plan','b_plan','photo',
    'grundbuch','energy_certificate','other'
  )),
  uploaded_by_role text not null default 'client'
    check (uploaded_by_role in ('client','designer','engineer','authority','system')),
  message_id uuid references public.messages on delete set null,
  document_id text,
  status text not null default 'uploaded' check (status in (
    'uploading','uploaded','processing','ready','failed','deleted'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.messages add column if not exists attachment_ids uuid[] not null default '{}';

-- indexes + RLS policies + updated_at trigger per the brief
```

**Edge functions**

- `signed-file-url` — body `{ fileId }`. Verifies row owner = auth.uid(). Calls `storage.from('project-files').createSignedUrl(path, 3600)`. Returns `{ url }`.
- `delete-file` — body `{ fileId }`. Verifies owner. Removes storage object then deletes the row. Used when a user removes an attachment chip *before* sending.

The existing `chat-turn` Edge Function does **not** change.  After a user message lands, the SPA updates each pending `project_files.message_id` with the persisted message id (RLS allows owner update). This avoids any change to the Edge Function contract.

**Storage bucket setup (manual, Rutik does in Supabase Dashboard before this commit deploys)**

Per the brief — bucket `project-files`, private, 25 MB cap, mime allowlist = pdf, png, jpg, jpeg, doc, docx, dwg.

Storage RLS policies (3, all on `bucket_id = 'project-files'` with `auth.uid()::text = (storage.foldername(name))[1]`): SELECT, INSERT, DELETE. Path convention: `<user-uuid>/<project-uuid>/<random>-<sanitized-filename>`.

**Document checklist linkage (Q9 default: auto-set)**

When user uploads a file with category `plot_plan | building_plan | b_plan`:

1. Find a matching document in `project.state.documents` by category mapping (e.g., `b_plan` → `D-Bebauungsplan` if the model has emitted one).
2. If found and `status === 'erforderlich'`: transition to `liegt_vor`, link `project_files.document_id`, `qualifier: { source: 'CLIENT', quality: 'VERIFIED' }`.
3. If not found: inject a new document row.

This is the only place in #68 that mutates `projects.state` — via the standard `applyDocumentsDelta` helper. We write a `project_events` row `event_type: 'file_uploaded'` for the audit log either way.

**Drag-and-drop**

Native HTML5: `dragenter / dragover / drop` listeners on the chat thread root. While dragging: dashed drafting-blue border on the entire thread + a centered "Dokument hier ablegen" badge. Drop → triggers upload via `useUploadFile`. Mobile: drag-and-drop unavailable, so we don't bind those listeners on `(pointer: coarse)` devices.

**Edge cases**

- Oversize / wrong mime → friendly error, no upload begins.
- Network failure mid-upload → chip shows red border + retry icon.
- Page refresh during upload → orphan `project_files` row with `status = 'uploading'`. Phase 4 cron cleans up; for v1, accept the orphan and log it.
- Project deleted → RLS cascades the rows; storage objects need `delete-project` to clean them up explicitly (TODO comment, defer to Phase 4).

**Estimated LOC ~1100**

---

### Commit #71 · Overview cockpit rebuild

**Files**

- `src/features/chat/pages/OverviewPage.tsx` — full rewrite (kept routing, replaced renderer)
- `src/features/result/components/Cockpit/CockpitHeader.tsx` — **new**
- `src/features/result/components/Cockpit/CockpitTabs.tsx` — **new**
- `src/features/result/components/Cockpit/Tables/ProjectTable.tsx` — **new**
- `src/features/result/components/Cockpit/Tables/FactsTable.tsx` — **new**
- `src/features/result/components/Cockpit/Tables/AreasTable.tsx` — **new**
- `src/features/result/components/Cockpit/Tables/ProceduresTable.tsx` — **new**
- `src/features/result/components/Cockpit/Tables/DocumentsTable.tsx` — **new**
- `src/features/result/components/Cockpit/Tables/RolesTable.tsx` — **new**
- `src/features/result/components/Cockpit/Tables/RecommendationsTable.tsx` — **new**
- `src/features/result/components/Cockpit/Tables/AuditTable.tsx` — **new** (replaces the literary AuditTimeline in this surface; the timeline stays for the result page)
- `src/features/result/components/Cockpit/StatusPill.tsx` — **new** (operating-mode pills)
- `src/features/result/components/Cockpit/QualifierBadge.tsx` — **new**
- `src/features/result/components/Cockpit/EditableCell.tsx` — **new** (inline editor for CLIENT-source facts)
- `src/features/chat/components/BinderTabStrip.tsx` — kept but unused on this page; if no other consumer, mark for deletion in #74

**Layout**

```
┌──────────────────────────────────────────────────────────────────────┐
│  ⌂  Sanierung · 28.04.2026                       [Status] [Export ▼] │
│     Bayern · Erlangen                                          [×]   │
├──────────────────────────────────────────────────────────────────────┤
│  Projekt  Daten  Bereiche  Verfahren  Dokumente  Team  Empf.  Audit │
├──────────────────────────────────────────────────────────────────────┤
│  Suche…                                  [Filter ▼]  [Sortieren ▼]  │
│                                                                      │
│  KEY                          WERT          QUELLE        STATUS    │
│  ──────────────────────────────────────────────────────────────────  │
│  Straße                       Goethestraße  CLIENT · D    OK        │
│  …                                                                   │
└──────────────────────────────────────────────────────────────────────┘
```

**Visual register**

- Inter 13 body, Inter 11 tracking `[0.18em]` uppercase clay column headers.
- Row hover: paper-darken 3%.
- Status pills: `rounded-full px-2 py-0.5 text-xs`, OK / Annahme / Verifiziert / Fehlt — color-coded.
- Qualifier badges: Inter 10 tracking `[0.16em]` uppercase clay/70 — `CLIENT · D`. Hover tooltip → full source/quality + reason.
- Tabs: hairline-bottom border, active tab gets 2 px ink underline.
- No serif headlines. No huge italic project name. Compact title bar.

**Edit-in-place (Q4: every CLIENT-source fact)**

Click value cell on a CLIENT-source row → input replaces value → Enter saves, Esc cancels. Save calls `applyFactsDelta` with new value + `qualifier: { source: 'CLIENT', quality: 'DECIDED', setBy: 'user', reason: 'Manuelle Korrektur über Cockpit' }`. Writes audit event `event_type: 'fact_corrected_by_owner'`. Does NOT re-trigger the model — just updates state.

**What's deleted from this surface (NOT from the result page)**

- The huge Instrument Serif `Sanierung · Projekt vom 28.04.2026` headline → replaced with compact title
- The `FULL OVERVIEW` eyebrow
- The 8-tab paper "binder strip" → replaced with hairline tabs
- The literary Roman-numeral chapter feel → tab numerals stay (small Roman in column 1) for reference only

**What's kept**

- Paper background
- Drafting-blue surgical accent (active tab underline, hover)
- Inter typography
- Compact qualifier discipline
- The `Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in` footer at page bottom

**Routing decisions**

- The existing chat workspace LeftRail's "Vollständige Übersicht öffnen" still routes to `/projects/:id/overview`.
- A new "Briefing ansehen" link in LeftRail routes to `/projects/:id/result` (deliverable page).

**Estimated LOC ~1400**

---

### Commit #72 · Result page sections II–XII operating uplift

**Files (per section, surgical edits)**

- `VerdictSection.tsx` — reduce hero font 56→36 pt, add expandable "Warum dieses Verfahren?" with ordered determining facts + qualifier badges
- `TopThreeHero.tsx` — keep custom ① ② ③ numerals; add localStorage-backed checkbox per card ("Begonnen"); per-card "Verschieben" (move down)
- `LegalLandscape.tsx` — keep hatched bands; convert popover → inline expandable showing rule excerpt + gesetze-im-internet.de link + "Diese Norm betrifft Sie weil…" rationale (Q5 default: inline)
- `DocumentChecklist.tsx` — rebuild as 3-column kanban (Erforderlich / In Arbeit / Liegt vor); click-to-move (Q6 default: not drag-and-drop in v1); file-upload integration (drop a file on a column → upload via the same pipeline as #68 + auto-categorize)
- `SpecialistsRequired.tsx` — add "Anbieter in Erlangen finden" CTA stub (vaul drawer with "Coming soon" message); "Aufwand verfolgen" tracker stub
- `CostTimelinePanel.tsx` — rebuild as horizontal interactive timeline with phase scrubber (HTML5 input range styled as slider); hover shows cost + duration + dependencies
- `RiskFlags.tsx` — each flag gains "Diese Annahme klären" CTA opening a vaul drawer with form to convert ASSUMED → DECIDED
- `ConfidenceDashboard.tsx` — unchanged
- `ConversationAppendix.tsx` — unchanged (already collapsed-by-default)
- `SmartSuggestions.tsx` — unchanged
- `ExportHub.tsx` — keep card design; enlarge CTAs (full-width buttons inside cards), download-icon in card heading, mobile cards stack tighter

**Mode wrapper**

`ResultPage.tsx` adds `data-mode="operating"` on a `<section>` wrapping sections II–XII. Section I (CoverHero) stays outside this wrapper. The PaperSheet/BlueprintSubstrate stay; only the inner card register changes.

**Cover hero is sacred.** Animation choreography, axonometric, north arrow, document number — untouched.

**Estimated LOC ~1300**

---

### Commit #73 · Fix PDF export + error boundary + telemetry

**Files**

- `src/features/chat/lib/exportPdf.ts` — apply `winAnsiSafe()` on the Helvetica path; replace literal em-dashes with hyphens unconditionally (cheap, harmless even with TTFs)
- `src/lib/fontLoader.ts` — small: log fallback usage to telemetry
- `src/lib/winAnsiSafe.ts` — **new** sanitizer
- `src/features/chat/components/ExportMenu.tsx` — wrap export entry in try/catch with calm error UI surfaced via local state; do not silently console.error
- `src/features/chat/components/ExportErrorBoundary.tsx` — **new** React error boundary
- `src/lib/telemetry.ts` — **new** thin helper that writes a `project_events` row (`pdf_export_attempted` / `_succeeded` / `_failed`)

**Pre-fix diagnostic** (mandatory, before writing fix):

1. Reproduce locally with `npm run dev` — open T-01 project, click Vollständiges PDF, capture exact console error.
2. Block `/fonts/*` in DevTools network on the deployed app, click PDF, capture error.
3. Verify the throw is from `drawText` with U+2014.

**Sanitizer**

```ts
export function winAnsiSafe(text: string): string {
  return text
    .replace(/[—–]/g, '-')  // — –
    .replace(/[‘’]/g, "'")  // ' '
    .replace(/[“”]/g, '"')  // " "
    .replace(/…/g, '...')        // …
    .replace(/→/g, '->')          // →
    .replace(/←/g, '<-')          // ←
    .replace(/ /g, ' ')           // nbsp
    .replace(/[​-‍﻿]/g, '') // zero-widths
}
```

Apply in `exportPdf.ts` only when `fonts.usingFallback === true`. When TTFs are present (Rutik commits them), pdf-lib + fontkit handle full Unicode and we skip the sanitizer.

**Error boundary UI**

Calm panel: "Der PDF-Export ist leider fehlgeschlagen. Versuchen Sie stattdessen die Markdown-Checkliste oder den JSON-Datenexport." + primary "Markdown stattdessen" button + tertiary "Fehler kopieren" copying the error message.

In DEV (`import.meta.env.DEV`): show stack trace below. Q7 confirms — recommended default: hide in production, show in DEV.

**Telemetry**

Every export attempt writes `project_events`:

- `event_type: 'pdf_export_attempted'`
- On success: `pdf_export_succeeded` with `output_size_bytes` in `reason`
- On failure: `pdf_export_failed` with sanitized `error_message` in `reason` (truncated to 200 chars, no PII)

Markdown + JSON exports get the same telemetry treatment for parity.

**Verification**

- Walk: download PDF on a fresh project → success, opens in Preview, all pages render, German umlauts correct, KEY DATA labels in German (after #70).
- Walk: download PDF on a 40+-turn project → success.
- Walk: simulated failure (block `/fonts/`) → currently throws on em-dash; with #73 sanitizer, succeeds in Helvetica.
- Walk: forced failure (mock `buildExportPdf` to throw) → error UI shows with Markdown fallback.

**Estimated LOC ~280**

---

### Commit #74 · Docs + plan archive

**Files**

- `PHASE_3_6_PLAN.md` → moved to `docs/phase3-6-plan.md`
- `docs/phase3-decisions.md` — append D19 (template in brief §6 Commit #74)
- `README.md` — Phase 3.6 line per brief
- `docs/manager-demo-prep.md` — updated demo walk per brief

Plus optional clean-ups: drop `BinderTabStrip` if no remaining consumer, delete `MobileRightRailPeek` if abandoned (audit first).

**Estimated LOC ~200**

---

## §5 · Volume + risk summary

| # | Commit | LOC est. | Risk | Why risky |
|---|---|---|---|---|
| 67 | Persistent input bar | 720 | Medium | Most-used component in product |
| 69 | Loud progress indicator | 420 | Low | Composition |
| 70 | Translate fact labels | 600 | Medium | Many surfaces, easy to miss one |
| 68 | File upload pipeline | 1100 | **High** | First storage integration, RLS, signed URLs, Edge functions |
| 71 | Overview cockpit | 1400 | **High** | Biggest single rewrite |
| 72 | Result II–XII uplift | 1300 | Medium-high | Recently shipped code, regression risk |
| 73 | PDF fix + telemetry | 280 | **High** (gated on diagnosis) | Diagnostic-first |
| 74 | Docs + archive | 200 | Low | |
| | **Total** | **~6020** | | Largest batch in project. |

---

## §6 · Questions for Rutik — **ALL LOCKED 2026-04-28**

| ID | Question | **Locked** |
|---|---|---|
| **Q1** | Chip click + existing text in textarea — append or override? | **Append (with newline)** |
| **Q2** | Storage bucket creation — manual via Dashboard or setup script? | **Manual via dashboard** |
| **Q3** | File category chip in AttachmentPicker — required or optional? | **Optional, default `other`** |
| **Q4** | Edit-in-place on cockpit — every CLIENT-source fact or allowlisted keys? | **Every CLIENT-source fact** |
| **Q5** | LegalLandscape rule expansion — popover or inline-expandable? | **Inline-expandable** |
| **Q6** | DocumentChecklist kanban — DnD or click-to-move in v1? | **Click-to-move** |
| **Q7** | PDF export error UI — show stack trace? | **DEV only** (`import.meta.env.DEV`) |
| **Q8** | Existing left-rail `ProgressMeter` — keep demoted or remove? | **Keep, demote visually** |
| **Q9** | File upload + b_plan — auto-set checklist `liegt_vor` or just suggest? | **Auto-set** |
| **Q10** | Result II–XII rewrites — one commit or split? | **One commit (#72)** |
| **Q11** | PDF fix — sanitizer only or bundle font subset? | **Sanitizer only in this batch** |

Execution order locked: **#67 → #69 → #70 → #68 → #71 → #72 → #73 → #74**.
#73 held until reproduction confirms WinAnsi-on-em-dash hypothesis.

---

## §7 · Operational gates (Rutik must complete; called out in §11 batch report)

Before deploying commit #67:

1. **Verify migration `0005_likely_user_replies.sql` is applied to Supabase.** (Should already be.)
2. **Verify migration `0006_share_tokens.sql` is applied to Supabase.** (Should already be.)
3. **Optional but recommended:** drop the four brand TTFs (Inter-Regular, Inter-Medium, InstrumentSerif-Regular, InstrumentSerif-Italic) into `/public/fonts/` and commit them. Without them, the PDF works (post-#73) but in Helvetica.

Before deploying commit #68:

4. **Apply migration `0007_project_files.sql`** in Supabase Dashboard SQL Editor.
5. **Create storage bucket `project-files`** in Supabase Dashboard with: private, 25 MB cap, mime allowlist per the brief.
6. **Add 3 storage RLS policies** (SELECT, INSERT, DELETE) per the brief.
7. **Deploy Edge functions `signed-file-url` and `delete-file`** via `supabase functions deploy`.

Each step has a 1-line verification I'll list explicitly in the batch report.

---

## §8 · Live verification matrix

The 50-item PASS/FAIL walk in the brief §10 governs the batch report. Every item gets a checkbox; failing items keep the batch open. Specifically:

- Chat workspace: 14 checks (input bar, progress, mobile)
- File upload: 6 checks
- Overview cockpit: 6 checks
- KEY DATA labels: 4 checks (right rail, cockpit, PDF, share)
- Result page (mixed): 6 checks
- PDF export: 5 checks
- Reduced motion: 3 checks
- Regression checks (atelier surfaces UNCHANGED): 6 checks

**No claims of "shipped" without all 50 walked.**

---

## §9 · What I'd flag if I were reviewing this for someone else

1. **#68 is the most likely batch-killer.** RLS policies, signed URLs, and storage bucket setup all touch Supabase Dashboard. If any policy is wrong, uploads work but reads fail (or vice versa). I'll write a detailed runbook with exact SQL/policies + verification queries; Rutik should run them with eyes on the screen.
2. **#71 is the biggest UX risk.** Going from editorial register to operating cockpit is a felt-sense change for the architect manager. The cockpit will be calm and dense; the manager may experience the loss of the literary headline as "less premium." Demo prep update in #74 reframes it: the manager sees both surfaces (cockpit vs. result page cover hero) and understands the mode-separation discipline.
3. **#72 has regression risk.** Sections II–XII shipped only weeks ago; rewriting them runs into "did we just lose a feature?" risk. Mitigation: each section's diff is reviewed against its commit-of-origin (#60–#62) so we can prove what's intentionally gone vs. accidentally lost.
4. **#73 is gated on reproducing the bug locally first.** If the actual error in production is different from the WinAnsi hypothesis, the fix changes. We hold #73 until reproduction confirms.
5. **The atelier vocabulary should NOT bleed into operating mode.** The CSS-attribute scoping is the discipline. If a component reaches for a global `--pm-radius-input` without being inside a `[data-mode="operating"]` subtree, it gets the deliverable defaults — atelier wins. Audit during #67 to make sure no tailwind class overrides the var by accident.

---

## §10 · Appendix — execution order rationale

Brief Appendix A says: `#67 → #69 → #70 → #68 → #71 → #72 → #73 → #74`.

- **#67 first** — input bar is the foundation. Its props for attachments (`pendingAttachments`) must exist before #68 wires them.
- **#69 second** — progress bar lays out above the thread; doing it before #68 lets us catch any layout breakage before adding upload chrome.
- **#70 third** — labels needed by #68 (document linkage UI), #71 (cockpit), #72 (result), #73 (PDF). Earlier is safer.
- **#68 fourth** — storage integration, gated on #67's chip slot + #70's labels.
- **#71 fifth** — independent of #68 wiring; can ship in any order after #70.
- **#72 sixth** — independent of cockpit; sequential to keep the merge surface manageable.
- **#73 seventh** — depends on #70 (German labels in PDF).
- **#74 last** — docs, archive, README.

Each commit ships green. The deployed `main` is always working.

---

## §11 · One-line summary

**Phase 3.6 separates atelier (deliverable) from operating modes via CSS-attribute scoping. Eight commits, ~6,020 LOC, three operational gates for Rutik (storage bucket, migrations, optional TTF drop). Plan-first discipline; held for sign-off on Q1–Q11 before commit #67. The chat finally gets a real input bar; the overview finally gets to be a tool; the PDF finally downloads; and the cover hero of the result page stays sacred.**

— End of PHASE_3_6_PLAN.md
