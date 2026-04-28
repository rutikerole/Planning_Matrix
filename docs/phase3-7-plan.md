# Phase 3.7 — PLAN.md (The Polish Pass)

> **Disposition:** Same rhythm as 3.2 / 3.3 / 3.4 / 3.5 / 3.6. Pre-flight → plan → confirm → execute → report. Move to `docs/phase3-7-plan.md` in the final commit (#82) — append D20 to `docs/phase3-decisions.md`.
>
> **Do NOT touch `src/`, `supabase/functions/`, or `supabase/migrations/` until Rutik signs off §6 Q1–Q10.**

---

## §1 · Pre-flight survey (findings, not plans)

Surgical bug-fix batch. Pre-flight is short and targeted — no migrations, no new third-party deps, no architectural unknowns to derisk. Reproductions came from Rutik's screenshots + read-the-source diagnostics.

### §1.1 i18n state — already healthier than the brief assumed

```bash
$ diff <(jq -r 'paths(scalars) | join(".")' src/locales/de.json | sort) \
       <(jq -r 'paths(scalars) | join(".")' src/locales/en.json | sort)
# → 0 lines. Full key parity at the JSON level.
```

DE and EN both have **790 lines** in their respective `.json` files; both expand to identical key paths.

So the i18n bug isn't a missing-key parity problem — it's two separate problems:

1. **122 inline `lang === 'en' ? '…' : '…'` ternaries** scattered across `src/`. They bypass i18n and lock English/German strings into component code. Most are short labels (`'HIGHLY RELEVANT' / 'HOCH RELEVANT'`); a handful are paragraph-level. Easy to extract.
2. **Locale plumbing to the model** is missing — see §1.4.

The hardcoded-string grep also surfaces:

- `src/types/chatInput.ts:97` — `'Continue.' / 'Weiter.'` — used as the user-message text for the Continue button. Goes into the conversation as user input. Not a UI string per se.
- `src/features/result/components/CoverHero.tsx:304` — `aria-label="Maßstab 1 zu 100"` (hardcoded German) — should be locale-aware.
- `src/features/result/components/CoverHero.tsx:349` — `'Vorläufige Einschätzung — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in.'` literal. Should use the existing `chat.preliminaryFooter` key.
- `src/features/result/components/Cockpit/saveFact.ts:45` — `reason: 'Manuelle Korrektur über Cockpit'` — written into `project_events.reason` (DB metadata). Should be a stable token (e.g. `'CLIENT_FACT_CORRECTION'`) not a UI string.
- Landing-page visuals (`DemoBrowser`, `DomainBVisual`, `BlueprintFloorplan`) carry hardcoded German labels — these are **locked landing demos** from Phase 1; out of scope for 3.7.

### §1.2 Footer architecture — current state

The "four floating corners" feel is real. Three independent surfaces stack at the workspace bottom:

- **LeftRail bottom** (`src/features/chat/components/LeftRail.tsx:88–117`):
  - `<FountainPenFooter>` — decorative inkwell SVG
  - "→ Ergebnis ansehen" Link to `/projects/:id/result`
  - `<ExportMenu variant="ghost">` — text link
  - "← Projekt verlassen" Link to `/dashboard`
- **Center column** (`ChatWorkspaceLayout.tsx:35`):
  - `<InputBar>` rendered via the `inputBar` prop, sticky at the bottom of `<main>`
- **RightRail bottom** (`src/features/chat/components/RightRail.tsx:62–73`):
  - "Open overview" Link to `/projects/:id/overview`
  - `<FactTicker />` — Bayern-fact carousel (idle decoration)
  - `<CostTicker />` — `≈ 313K Tokens · 1,17 USD` scale-bar flourish

Each surface scrolls inside its own column; nothing visually unifies the band. **#75 builds a single `<UnifiedFooter>` band that spans the grid.** `<FountainPenFooter>` stays in left-rail (decorative signature, not functional). `<FactTicker>` stays in right-rail body (idle decoration, not footer-functional).

### §1.3 Send button + user message — current state

**Send button (`src/features/chat/components/Input/InputBar.tsx:297`):** already round, ink-fill, `lucide ArrowUp` icon, `size-9` (36×36), `rounded-full`. Disabled state at ink/15 + cursor-not-allowed. Per Rutik's screenshot (image 12), the button reads as "small grey circle floating to the right of the input"; the issue is **visual weight + centering inside the input card**, not the basic shape. Phase 3.7 #76 tightens proportions, fixes vertical alignment, adds hover scale.

**User message (`src/features/chat/components/MessageUser.tsx:24–52`):** atelier paper card with folded-corner mark, `BAUHERR` eyebrow tag (Inter 9, tracking `0.22em`), Inter 15 body, italic-Serif 10 timestamp at clay/65. Screenshot (image 16) confirms the timestamp is barely visible (`15:47` in light italic), and the eyebrow + folded-corner read as decoration-heavy on a working surface. Phase 3.7 #76 simplifies: paper-darker bg, soft `rounded-xl`, drop the `BAUHERR` tag, timestamp Inter 12 italic clay/68 always visible.

### §1.4 Locale leak — bug fully diagnosed before any code

The cause is a layer-by-layer stack:

1. **Frontend has the locale.** `postChatTurnStreaming(request, lang, handlers)` at `src/lib/chatApi.ts:196` already takes `lang: 'de' | 'en'` — it uses it locally to pick which JSON field to extract from the streaming JSON (`message_de` vs `message_en`).
2. **Frontend never tells the model.** `chatTurnRequestSchema` at `src/types/chatTurn.ts` has only `projectId`, `userMessage`, `userAnswer`, `clientRequestId`. **No `locale` field.** The Edge Function never knows the user's UI locale.
3. **Edge Function uses a static, German-first system prompt.** `supabase/functions/chat-turn/systemPrompt.ts:393 buildSystemBlocks(liveStateText)` returns the cached PERSONA_BLOCK_V1 + the live-state block. PERSONA_BLOCK_V1 instructs the model in formal German Sie-form throughout. There is no locale-aware adaptation.
4. **Tool schema requires both fields.** `respondTool.ts:198–200` — `message_de: z.string().min(1)`, `message_en: z.string().min(1)`. The model MUST emit both. So `content_en` is never null after a successful turn.
5. **UI render path is correct.** `MessageAssistant.tsx:41` reads `lang === 'en' && message.content_en ? message.content_en : message.content_de`. `MessageSystem.tsx:20` does the same.

**Why the user still sees German:** when the user types English while the persona prompt is German-first, the model treats English input as a foreign-language interjection and replies in the persona's primary register (German). It still emits `message_en` (Zod requires it) but as a hasty translation. The UI then **does** render `message_en` correctly — but the model-generated English isn't the natural-quality response the user expected, so it feels "auto-translated."

**Fix:** add `locale: z.enum(['de', 'en']).optional()` to the request schema. Frontend sends `locale: i18n.language`. Edge Function appends a small locale-aware text block AFTER the cached PERSONA_BLOCK (so cache stays warm) instructing the model to make `message_en` first-class native English when locale is `en`, and to address the user in their language register inside `message_en` while keeping `message_de` formal-Sie. **No prompt-cache invalidation.**

Additionally: the streaming bubble extracts `message_de` regardless of locale (because `streamingExtractor` is called with the field name passed by the caller). If the caller always passes `message_de`, an EN user sees German appearing live during streaming, then a swap to English at completion. Verify and pass `message_de` if `lang === 'de'` else `message_en`. Tracked under #79.

### §1.5 Illustrations — current state

`IntentAxonometricXL.tsx` (252 lines) registers 6 drawings keyed by intent. Each is an SVG `<g>` with hand-coordinated paths. The geometry is approximately right but not mathematically projected — visible faces don't always converge to the same vanishing-axis directions, hidden edges occasionally leak across visible faces. The screenshot (image 14) shows the wonkiness clearly. The brief recommends mathematical 30° projection; per Q1 (locked recommendation: T-01 only), I rebuild **`EinfamilienhausDrawing`** with proper projection and have the other five intents render a simplified neutral box drawing until Phase 3.8 picks them up.

`AtelierIllustration.tsx` (175 lines) renders the small "drafting stool + table + lamp" SVG seen in the wizard transition + result-page footer. The screenshot (image 17) shows the stool reads but the "table" looks like a single hairline; the composition is unbalanced. #78 redraws.

`ScaleBar` lives inline in `IntentAxonometricXL.tsx:50–67` and elsewhere (extracted from `RightRail` via `IntentAxonometric`). #78 lifts it into `ScaleBar.tsx` and redraws as alternating ink-fill/paper-fill segments with proper tick marks.

### §1.6 Typography legibility + sharp-edge inventory

```bash
$ grep -rEn 'text-\[1[01]px\]|tracking-\[0\.[12][08]em\]' src/features/chat src/features/result --include='*.tsx' | wc -l
108

$ grep -rEn 'rounded-sm[^-]|rounded-\[2px\]' src/features/chat src/features/result --include='*.tsx' | wc -l
45

$ grep -rEn 'text-clay/(55|65)' src/features/chat src/features/result --include='*.tsx' | wc -l
26
```

The 179 sites are within scope for a surgical pass. Most fix via mechanical search-and-replace through the operating-mode subtrees:

- `text-[10px]` → `text-[11px]` (qualifier badges, micro-labels)
- `text-[11px]` → `text-[12px]` (eyebrows, timestamps)
- `tracking-[0.22em]` → `tracking-[0.20em]` (eyebrows on operating surfaces; deliverable cover hero stays)
- `text-clay/55` → `text-clay/72` (timestamps, captions)
- `text-clay/65` → `text-clay/72` (eyebrow text)
- `rounded-sm` → `rounded-md` on cards in operating subtrees (4px → 6px)
- `rounded-[2px]` → `rounded-md` (~6 sites, all in operating subtrees)
- Buttons → `rounded-lg` (8px) where they were sharp

CSS-token approach via `[data-mode="operating"]` already exists from Phase 3.6 — extend to add the new tokens. Components that already reference `var(--pm-radius-input)` etc. update centrally.

### §1.7 Dependencies + reference research

- **No new dependencies** proposed.
- For the send button + user message reference (Claude.ai, ChatGPT, Vercel v0): patterns already studied in Phase 3.6 §1.6. The "ink-filled circle, paper up-arrow, scale on hover" is universal across modern AI chat UIs.
- For architectural illustration references: 30° axonometric is a standard isometric variant; vertices defined in 3D, projected mathematically. Don't need external assets — pure SVG with computed coordinates.

---

## §2 · Mode separation discipline holds

Phase 3.7 lives entirely inside operating mode. The `[data-mode="operating"]` attribute scoping introduced in Phase 3.6 is the boundary. Atelier defaults at `:root` stay; landing / auth / wizard / cover hero / PDF / share view are visually unchanged.

**The exception:** illustration redraws in #78 apply on both modes (the cover hero's XL axonometric is in deliverable mode). Animation choreography (per-path stroke-dashoffset draw-in over 2.4s) preserved. Geometry replaced under the same animation contract.

---

## §3 · Vocabulary inheritance

Reused without modification:

- `<BlueprintSubstrate>` · `<PaperSheet>` · `<PaperCard>`
- `<Wordmark>` · `<LanguageSwitcher>` · `<SpecialistSigil>`
- `<StatusPill>` (cockpit) · `<QualifierBadge>` · `<EditableCell>` · `<CockpitTabs>` · `<CockpitTable>`
- `<ChatProgressBar>` (top of thread) — Phase 3.6 #69
- `<AttachmentChip>` · `<AttachmentPicker>` · `<MessageAttachment>` — Phase 3.6 #67/#68
- `<SuggestionChips>` — Phase 3.6 #67
- `factLabel(key, locale)` resolver — Phase 3.6 #70

New primitives in Phase 3.7:

| Primitive | Owns | Used by |
|---|---|---|
| `<UnifiedFooter>` | sticky band spanning the grid bottom | ChatWorkspaceLayout |
| `<FooterLeftColumn>` | Briefing primary CTA + Cockpit/Export/Leave secondary | UnifiedFooter |
| `<FooterRightColumn>` | Open cockpit + scale bar + cost ticker | UnifiedFooter |
| `<SendButton>` | extracted send button (visual identity own) | InputBar |
| `<ScaleBar>` | proper architectural scale bar (alternating fill segments) | IntentAxonometric / IntentAxonometricXL / UnifiedFooter |
| `formatRelativeShort(date, lang)` | "vor 2 Min." / "2 min ago" | MessageUser timestamp tooltip |
| `verify-locale-parity.ts` | build-time DE/EN parity check | npm prebuild |

---

## §4 · The seven commits — concrete scope

> Execution order: **#75 → #76 → #77 → #78 → #79 → #80 → #81 → #82**

Each commit ends with `npx tsc --noEmit` clean and `npm run build` green; the deployed `main` branch must always work.

---

### Commit #75 · Unified sticky footer across three columns

**Files**

- `src/features/chat/components/UnifiedFooter/UnifiedFooter.tsx` — **new**
- `src/features/chat/components/UnifiedFooter/FooterLeftColumn.tsx` — **new**
- `src/features/chat/components/UnifiedFooter/FooterRightColumn.tsx` — **new**
- `src/features/chat/components/ChatWorkspaceLayout.tsx` — restructure to host the unified footer outside the three-column grid (full-width fixed band)
- `src/features/chat/components/LeftRail.tsx` — drop the bottom Briefing/Export/Leave cluster (lines 90–117); keep `<FountainPenFooter>` as the rail's decorative signature
- `src/features/chat/components/RightRail.tsx` — drop the bottom Open-overview link + `<CostTicker>` (lines 61–73); keep `<FactTicker>` in the rail body where it currently lives (idle decoration)
- `src/features/chat/components/MobileRailDrawer.tsx` — small extension: a "more" entry point for the secondary footer actions on mobile

**Layout (desktop ≥ lg)**

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ⌃ Briefing ansehen     [📎 ……………………………………………… ↑]   ↗ Cockpit öffnen          │
│  ⌃ Cockpit öffnen                                     M 1:100 ├──┤              │
│  ⌃ Export                                             ≈ 313K · 1,17 USD          │
│  ⌃ Projekt verlassen                                                             │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- `position: sticky; bottom: 0; z-30; border-top: 1px ink/12; box-shadow: 0 -2px 8px hsl(220 15% 11% / 0.04); background: hsl(38 30% 93%)` — paper-darker by ~4% so the band visually settles below the thread
- Three sub-grid columns matching the workspace `grid-cols-[280px_minmax(0,1fr)_360px]`
- Vertical padding: 14px top / 12px + safe-area-inset bottom
- `data-pm-unified-footer="true"` for grep

**Mobile (<lg)**

- Footer collapses to a single sticky bar containing only the input + a `…` overflow trigger
- `…` opens a vaul drawer (bottom direction) with the secondary actions (Briefing primary CTA + Cockpit/Export/Leave + Open cockpit + scale bar + cost ticker) listed vertically

**Edge cases**

- ☐ Streaming response in flight — input bar disabled, secondary nav still clickable
- ☐ `completion_signal === 'needs_designer'` — Continue button stays in center column
- ☐ Footer doesn't overlap the last message in the thread (PaperCard adds bottom padding equal to footer height)
- ☐ Scrollbar gutter doesn't shift the footer when it appears/disappears

**Estimated LOC ~520**

---

### Commit #76 · Send button + user message + visible timestamps

**Files**

- `src/features/chat/components/Input/SendButton.tsx` — **new** (extracted from InputBar)
- `src/features/chat/components/Input/InputBar.tsx` — uses `<SendButton>`; small layout polish
- `src/features/chat/components/MessageUser.tsx` — full visual rewrite
- `src/features/chat/lib/formatRelativeShort.ts` — **new** (tiny helper)

**Send button**

- Size 36×36 (mobile 32×32). `rounded-full`. `bg-ink`. Paper `<ArrowUp size={18}>` icon centered via flexbox.
- Hover: `motion-safe:hover:scale-[1.05]` + bg `ink/92`. Disabled: `bg-ink/30`, no hover, `cursor-not-allowed`. Streaming (Q2 locked: wire to abort): swap to `<Square size={14}>` icon + `bg-drafting-blue`.
- Q2 abort wiring: chatStore exposes a `currentAbortController` ref; SendButton reads it and triggers `controller.abort()` on click during streaming. `useChatTurn` plumbs through.
- Aria-label localized: `chat.input.send` / `chat.input.stop`
- Reduced motion: no scale on hover

**User message redesign**

```
                                                ┌─────────────────────────────┐
                                                │  Goethestraße 20,           │
                                                │  91054 Erlangen             │
                                                │                       17:50 │
                                                └─────────────────────────────┘
                                                  ↑ paper-darker tint, soft
                                                  ↑ bg shadow, no folded mark
```

- Drop the folded-corner SVG mark
- Drop the `BAUHERR` eyebrow tag (atelier overdesign for a working chat surface)
- Background: `hsl(38 30% 94%)` (paper-darker by 3%); border `1px ink/8`; `rounded-xl` (12px)
- Padding 14px 18px; max-width 70%; right-aligned (unchanged)
- Body: Inter 15 ink, `leading-relaxed`
- **Timestamp always visible:** absolute time `${HH:mm}` Inter 12 italic clay/68 in the bottom-right corner of the card
- Hover: tooltip showing the relative time `vor 2 Min.` / `2 min ago` via `title=`
- Drop shadow `shadow-[0_1px_2px_hsl(220_15%_11%/0.03)]`

Q3 locked: absolute always (17:50) + relative on hover.

**`formatRelativeShort(date, lang)`**

- < 60s → "gerade eben" / "just now"
- < 60min → "vor N Min." / "N min ago"
- < 24hr → "vor N Std." / "N hr ago"
- ≥ 24hr → absolute date `28. Apr 2026` / `28 Apr 2026`

**Edge cases**

- ☐ Send button keyboard: Enter sends, Shift+Enter newline (existing behaviour preserved)
- ☐ Timestamp respects DE/EN locale
- ☐ Reduced motion: no scale animations on send button hover
- ☐ Streaming abort: server-side handles `AbortController.abort()` cleanly; partial assistant message persists via `cleanup-on-abort` path (verify with chatApi)

**Estimated LOC ~420**

---

### Commit #77 · Briefing vs Cockpit naming

**Files**

- `src/features/chat/components/UnifiedFooter/FooterLeftColumn.tsx` — primary CTA `Briefing ansehen →` (drafting-blue/15 background, `rounded-lg`, full-width column-band, 32px tall) + secondary text links underneath
- `src/locales/de.json` / `src/locales/en.json` — add new keys:
  - `chat.footer.briefingPrimary` → `Briefing ansehen →` / `View briefing →`
  - `chat.footer.briefingSubtitle` → `Das ausführliche Dokument` / `The full document`
  - `chat.footer.cockpitSecondary` → `Cockpit öffnen` / `Open cockpit`
  - `chat.footer.exportSecondary` → `Exportieren` / `Export`
  - `chat.footer.leaveSecondary` → `Projekt verlassen` / `Leave project`
- Replace the existing `chat.leftRail.viewResult` use site (if no remaining consumer, mark for deletion in #82)

**Visual hierarchy**

- **Primary** — drafting-blue/15 bg, drafting-blue ink text, `rounded-lg`, `Inter 13 medium`
- **Secondary** — Inter 13 ink/75, no background, hover ink
- **Destructive (Projekt verlassen)** — Inter 13 clay/68, sits below a thin separator

**Verification**

- Open a project → primary CTA visibly stands out
- Click primary → routes to `/projects/:id/result`
- Click "Cockpit öffnen" → routes to `/projects/:id/overview`
- Result + cockpit pages each have a "Zurück zum Gespräch" affordance (already in CockpitHeader's close-X; verify on result page)

**Estimated LOC ~280**

---

### Commit #78 · Architectural illustrations redraw

**Files**

- `src/features/result/components/IntentAxonometricXL.tsx` — `EinfamilienhausDrawing` rewritten with mathematical 30° projection; `MehrfamilienhausDrawing`/`SanierungDrawing`/`UmnutzungDrawing`/`AbbruchDrawing` switched to a simplified clean-base drawing with intent-specific decorators (Q1 locked: T-01 only with proper geometry; others ride a simplified base until Phase 3.8); `SonstigesDrawing` keeps current placeholder
- `src/features/chat/components/AtelierIllustration.tsx` — redrawn drafting stool + table + lamp composition
- `src/features/chat/components/illustrations/ScaleBar.tsx` — **new** (extracted, alternating fill-segment design)
- `src/features/result/components/IntentAxonometricXL.tsx` — uses `<ScaleBar>` instead of inline scale SVG
- `src/features/chat/components/IntentAxonometric.tsx` — also uses `<ScaleBar>`
- `src/lib/axonometric.ts` — **new** (small math helper: `project(x,y,z)` for 30° axonometric)

**Math helper**

```ts
// 30° axonometric projection: both visible side faces inclined 30°
// from horizontal. Vertices in 3D space, returned as 2D screen coords.
export function project(
  x: number,
  y: number,
  z: number,
  origin = { sx: 240, sy: 240 },
  scale = 16,
): { sx: number; sy: number } {
  const cos30 = Math.cos(Math.PI / 6)
  const sin30 = Math.sin(Math.PI / 6)
  return {
    sx: origin.sx + (x * cos30 - y * cos30) * scale,
    sy: origin.sy - (z - x * sin30 - y * sin30) * scale,
  }
}
```

**T-01 Einfamilienhaus geometry**

- Footprint 8×10 module units (rectangular)
- Box body 5 module units tall
- Pitched roof at 35° (12 module units high gable peak from box top)
- Door (front face), 3 windows (front face), 2 windows (visible side face), chimney (roof)
- Visible edges: 1.5px stroke ink/85
- Hidden edges: 0.75px stroke ink/45 with `stroke-dasharray="4 3"`
- Ground reference: 1px hairline ink/30

**`AtelierEmpty` redraw**

- Drafting table (8×3 units) at 30° iso, perspective drawing
- Drafting stool to the left at 1×1 unit base + slim cylindrical column
- Drafting lamp on right edge of table — articulated arm extending up + outward at 45°
- One paper sheet laid on table surface with one curved corner suggesting drafting in progress
- All in 0.75–1.5px stroke ink/55–85, on a 480×320 viewport

**`<ScaleBar>` redesign**

```
M 1:100   ├──■──┤──■──┤──■──┤──■──┤
            0  1  2  3  4 m
```

- 4 segments × 24px wide × 6px tall, alternating ink-fill / paper-fill
- Tick marks at each segment boundary extending 4px below
- Inter 9 ink/65 numerical labels with `tnum` figure feature
- Inter italic 11 clay/72 `M 1:100` label

**Animation choreography preserved**

The `pm-cover-axo` per-path stroke-dashoffset CSS is reused as-is. New paths declared inside the `<g pathLength={100}>` block; the existing nth-child selectors handle them.

**Estimated LOC ~840**

---

### Commit #79 · Locale plumbing to Anthropic

> Highest-risk commit. Diagnostic-first: verify the hypothesis with a manual reproduction in DEV before editing anything.

**Reproduction (mandatory before code)**

1. `npm run dev` → sign in → start a project
2. Switch UI to EN via LanguageSwitcher
3. Type "Where is the building permit office in Erlangen?" → send
4. Open DevTools Network → inspect chat-turn request body — confirm no `locale` field is sent
5. Wait for response → inspect the persisted assistant row (DB or `messages` cache) — confirm both `content_de` and `content_en` are populated
6. Inspect what user actually sees in the bubble — is it `content_de` (the bug) or `content_en` (and the model just didn't translate well)?

**Files**

- `src/types/chatTurn.ts` — extend `chatTurnRequestSchema` with optional `locale: z.enum(['de','en'])`
- `src/lib/chatApi.ts` — pass `locale: lang` in the request body for both the streaming and synchronous paths; pass the right field name to `streamingExtractor` based on locale (currently hardcoded `message_de`)
- `src/features/chat/hooks/useChatTurn.ts` — read locale from `i18n` and forward through `request`
- `supabase/functions/chat-turn/index.ts` — read parsed `locale` (defaults to `'de'`)
- `supabase/functions/chat-turn/systemPrompt.ts` — add `buildLocaleBlock(locale)` returning a small text block (NOT cached); `buildSystemBlocks(liveStateText, locale)` appends the locale block AFTER the cached PERSONA_BLOCK + before the live-state block
- `src/lib/streamingExtractor.ts` — verify it accepts the dynamic field name (already does per §1.4) — small tweak in caller
- `src/features/chat/components/Thread/MessageAssistant.tsx` — audit `getMessageText` (already correct per §1.4); add a fallback safety: if `content_en` is empty string (Zod prohibits min(1) but defensive), fall through to `content_de`

**The locale block (German because the persona is German; the instruction is to the model)**

```ts
function buildLocaleBlock(locale: 'de' | 'en'): string {
  if (locale === 'en') {
    return `
═══════════════════════════════════════════════════════════════
NUTZER-LOCALE
═══════════════════════════════════════════════════════════════
Der Nutzer hat die Oberfläche auf ENGLISCH umgeschaltet. Die UI
rendert message_en als Hauptinhalt; message_de wird im Hintergrund
mitgespeichert (Audit + Locale-Switch).

PFLICHT: message_en muss eine vollwertige, native englische
Antwort sein — keine mechanische Übersetzung, sondern eigenständig
formuliert in formellem britischem Englisch ("Mr/Ms ...", "would",
"shall"). Behalten Sie die Sie-Register-Strenge des deutschen
Originals bei. Zitieren Sie deutsche Normen unverändert
("Art. 58 BayBO", "§ 34 BauGB") — übersetzen Sie sie nicht.

message_de bleibt formales Deutsch (Sie). Beide Felder bilden
denselben semantischen Inhalt ab.
`.trim()
  }
  return `
═══════════════════════════════════════════════════════════════
NUTZER-LOCALE
═══════════════════════════════════════════════════════════════
Der Nutzer arbeitet auf DEUTSCH. message_de ist primär.
message_en bleibt eine vollwertige englische Spiegelung im Sinne
der Audit- und Locale-Switch-Anforderung.
`.trim()
}
```

The locale block is **NOT cached** — it appends as a fresh text block AFTER the cached PERSONA_BLOCK so prompt-cache hit rate stays unchanged. Cost penalty: ~150 tokens per turn, well below the 1024-token cache-write threshold.

**Edge case: streaming display during locale switch**

If user sends a message in DE, then switches to EN mid-stream — the streaming bubble continues showing `message_de` (the field the extractor watches). On stream complete, the persisted message swaps to `message_en` per `MessageAssistant`. Acceptable transient behaviour; documented as known-edge in the batch report.

**Verification**

- Walk DE: send German, get German, confirm `content_de` rendered
- Walk EN: send English, get English, confirm `content_en` rendered (and feels native, not auto-translated)
- Walk locale-switch on existing thread: open old DE thread, switch to EN — historical messages re-render in English (since both fields stored)
- Walk first-turn priming with locale: new project + EN locale → first assistant turn arrives in English

**Estimated LOC ~340**

---

### Commit #80 · Typography + softer edges

**Files**

- `src/styles/globals.css` — extend the operating-mode token block with the new typography + radius tokens
- Operating-mode component sweep — replace hardcoded sizes/colors/radii where they'd benefit from the token

**Token extensions in `[data-mode="operating"]`**

```css
[data-mode='operating'] {
  /* Existing 3.6 */
  --pm-radius-input: 1rem;
  --pm-radius-card: 0.5rem;
  --pm-radius-pill: 9999px;
  --pm-shadow-input: 0 1px 2px hsl(220 15% 11% / 0.04);
  --pm-shadow-card: 0 1px 3px hsl(220 15% 11% / 0.06);
  --pm-tracking-body: 0.005em;

  /* 3.7 additions */
  --pm-radius-button: 0.5rem;       /* 8 px — was sharp */
  --pm-radius-card-lg: 0.75rem;     /* 12 px */
  --pm-text-eyebrow: 0.75rem;        /* 12 px */
  --pm-tracking-eyebrow: 0.18em;     /* was 0.20em */
  --pm-text-timestamp: 0.75rem;      /* 12 px — was 11 */
  --pm-text-qualifier: 0.6875rem;    /* 11 px — was 10 */
  --pm-clay-emphasized: hsl(25 30% 38% / 0.82);
  --pm-clay-text: hsl(25 30% 38% / 0.72);
  --pm-ink-soft: hsl(220 15% 11% / 0.80);
  --pm-ink-body: hsl(220 15% 11% / 0.90);
}
```

**Mechanical sweep (~50 sites)**

- `text-[10px]` (qualifier badges) → `text-[11px]` in operating-tree files
- `text-[11px]` (eyebrows, timestamps) → `text-[12px]`
- `tracking-[0.22em]` on operating-tree eyebrows → `tracking-[0.20em]` (cover hero stays — Q6 locked)
- `text-clay/55` → `text-clay/72`
- `text-clay/65` → `text-clay/72`
- `rounded-sm` on operating-tree cards → `rounded-md`
- `rounded-[2px]` on operating-tree cards → `rounded-md`
- Buttons in operating tree → `rounded-lg`

**What stays sharp**

- Cover hero (Section I of result page) — atelier deliverable
- PDF export — A4 deliverable
- Landing page — atelier deliverable
- Auth pages — atelier deliverable

**Estimated LOC ~480**

---

### Commit #81 · i18n audit + parity verification

> The "do a thorough audit" commit Rutik specifically asked for. Three parts.

**Files**

- `scripts/verify-locale-parity.ts` — **new** (build-time DE/EN parity gate)
- `package.json` — add `scripts.verify:locales` + `prebuild` invocation
- `src/locales/de.json` — fill any holes the audit reveals
- `src/locales/en.json` — mirror
- `src/locales/factLabels.de.ts` / `factLabels.en.ts` — same audit
- Touch every component where the §1.1 grep flagged hardcoded strings: extract to keys. The sweep is mechanical; commit message lists each file.
- `docs/i18n-audit-2026-04-29.md` — **new** (audit log: every file changed, every key added, every inline ternary replaced or kept-with-rationale)

**Part 1 — Replace inline `lang === 'en' ?` ternaries**

122 instances. Categorise:

- **Short labels (< 5 words):** extract to a single key per pair. Example: `'HOCH RELEVANT' / 'HIGHLY RELEVANT'` → `result.legal.relevance.high`
- **Status text inside data structures:** extract via locale-keyed map, e.g. `result.legal.area.qualified_innenbereich`
- **One-shot fallback labels with a t() default:** keep as `t(..., { defaultValue: ..., lng: 'en' })` if locale-aware default is required
- **User-message text (`'Continue.' / 'Weiter.'`):** keep — these are user-input strings that go into the conversation, not UI strings. Document the rationale.

**Part 2 — Build-time parity check**

```ts
// scripts/verify-locale-parity.ts
import * as fs from 'node:fs'

function paths(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix]
  if (Array.isArray(obj)) return obj.flatMap((v, i) => paths(v, `${prefix}.${i}`))
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    paths(v, prefix ? `${prefix}.${k}` : k),
  )
}

const de = JSON.parse(fs.readFileSync('src/locales/de.json', 'utf-8'))
const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf-8'))
const dePaths = new Set(paths(de))
const enPaths = new Set(paths(en))
const onlyDe = [...dePaths].filter((p) => !enPaths.has(p))
const onlyEn = [...enPaths].filter((p) => !dePaths.has(p))

if (onlyDe.length || onlyEn.length) {
  console.error(`Locale parity violated:`)
  if (onlyDe.length) console.error(`  DE has, EN missing:`, onlyDe.join(', '))
  if (onlyEn.length) console.error(`  EN has, DE missing:`, onlyEn.join(', '))
  process.exit(1)
}
console.log(`Locale parity ✓ (${dePaths.size} keys)`)
```

`package.json`:

```json
"verify:locales": "tsx scripts/verify-locale-parity.ts",
"prebuild": "npm run verify:locales"
```

Q5 locked: fail build on divergence.

**Part 3 — Manual smoke test in both locales**

1. DE walk: dashboard → wizard → chat → message → overview → result → switch to EN ✓ historical messages re-render
2. EN walk: dashboard → wizard → chat → message in English → overview → result → switch to DE ✓ historical messages re-render

Capture findings in the audit log.

**Special: factLabels coverage check**

Walk a fresh T-01 conversation; capture every emitted fact key; verify all are in both `factLabels.de.ts` and `factLabels.en.ts`. Add the missing.

**Estimated LOC ~720**

---

### Commit #82 · Plan archive + D20 + README

**Files**

- `PHASE_3_7_PLAN.md` → `docs/phase3-7-plan.md`
- `docs/phase3-decisions.md` — append D20
- `README.md` — add Phase 3.7 line
- `docs/manager-demo-prep.md` — small update calling out the new sticky footer + locale fix

**Estimated LOC ~150**

---

## §5 · Volume + risk summary

| # | Commit | LOC | Risk | Why risky |
|---|---|---|---|---|
| 75 | Unified footer | 520 | Medium | Touches workspace layout |
| 76 | Send + user msg + timestamp | 420 | Low | Surgical |
| 77 | Briefing vs Cockpit | 280 | Low | Naming |
| 78 | Illustrations redraw | 840 | Medium | Visual subjective |
| 79 | Locale plumbing | 340 | **High** | Edge Function + system prompt |
| 80 | Typography + edges | 480 | Low | Token system |
| 81 | i18n audit + parity | 720 | Medium | Touches many components |
| 82 | Docs | 150 | Low | |
| | **Total** | **~3,750** | Medium | |

**Highest risk: #79.** Modifying the system prompt risks invalidating the prompt cache. Mitigation: locale block appended AFTER the cached PERSONA_BLOCK, not inside it. Verified with cache-warm + cache-cold scenarios in testing.

---

## §6 · Questions for Rutik — **ALL LOCKED 2026-04-29**

| ID | Question | **Locked** |
|---|---|---|
| **Q1** | Illustrations scope | **T-01 + atelier-empty + scale bar** (others ride simplified base) |
| **Q2** | Send button stop-icon | **Wire to abort** via AbortController plumbing |
| **Q3** | User message timestamp | **Absolute always** (17:50) + relative on hover via title |
| **Q4** | Locale plumbing | **Both turns** — first-turn priming + every subsequent |
| **Q5** | Parity verification | **Fail build** on divergence (prebuild gate) |
| **Q6** | Typography uplift scope | **Strictly operating mode**; cover hero stays atelier |
| **Q7** | Sticky footer shadow | **Paper-up subtle shadow** |
| **Q8** | Briefing primary CTA bg | **Drafting-blue/15** |
| **Q9** | Mobile sticky footer | **Single bar + vaul drawer** for secondary actions |
| **Q10** | Smoke test scope | **Manual for v1**; Playwright in Phase 4 |
| **Q11** | BAUHERR eyebrow tag on user messages | **Drop** — operating mode prioritizes clarity over decoration; right-align + paper-darker bg already communicates user-side |

Execution order locked: **#75 → #76 → #77 → #78 → #79 → #80 → #81 → #82**.
#79 is highest-risk: reproduce locally first; after deploy, verify `cache_read_tokens` stays non-zero on second turn (proves locale block didn't break the cache). If cache breaks, move locale block BEFORE the cache boundary instead.

---

## §7 · Operational gates

**Mandatory before commit #79 deploys:**

- `supabase functions deploy chat-turn` — the system prompt block change requires a redeploy

**No migrations.** No new edge functions. No storage changes. Phase 3.7 is purely client-side + a single edge-function redeploy.

---

## §8 · Verification matrix

The 35 PASS/FAIL checks in §7 of the brief govern the batch report. Categorised:

- Issue 0 (sticky footer): 5 checks
- Issue 1 (send button): 5 checks
- Issue 2 (Briefing vs Cockpit): 4 checks
- Issue 3 (illustrations): 3 checks
- Issue 4 (locale): 4 checks
- Issue 5 (user message + timestamps): 4 checks
- Issue 6 (visibility): 4 checks
- Issue 7 (softer edges): 4 checks
- Issue 8 (i18n audit): 2 checks

No claims of "shipped" without all 35 walked.

---

## §9 · What I'd flag if I were reviewing this for someone else

1. **#79 is the highest residual risk.** Anthropic prompt-cache hit rate is the metric to watch. After deploy, confirm `cache_read_tokens` on the second turn of a fresh conversation is non-zero — that proves the locale block didn't break the cache. If it does break, move the block before the cache boundary instead.
2. **#75 has UX implications I can't fully foresee.** Pulling left-rail and right-rail items into a unified footer changes the rail "shape" — the rails become slightly shorter; the FactTicker and other body-of-rail items might feel orphaned. Mitigation: walk the live deploy and adjust spacing if the rails look stranded.
3. **#80 is a tone shift, not just a typography uplift.** The user explicitly asked for "calm, soft, gentle" — going from sharp 90° corners to rounded ones changes the product's perceived register. Don't go too soft (16+ px radii read as consumer/childish on a B2B working surface). 6–12 px is the sweet spot.
4. **Locale switching mid-conversation has known edge:** if user types DE then switches to EN before send, the system block uses the OLD locale because it's resolved at submit time. Acceptable.
5. **The `BAUHERR` eyebrow tag I'm dropping in #76** is a brand element from the atelier vocabulary. Removing it is a small atelier surrender on operating surfaces — but the user message card in the operating mode chat doesn't need a tag (the right-alignment + paper-darker bg + max-width 70% identifies it as user-side). Worth confirming in Q3 before #76 ships.

---

## §10 · One-line summary

**Phase 3.7 fixes nine concrete bugs from Rutik's live walk via seven surgical commits + a docs commit, ~3,750 LOC. No new architecture, no new dependencies, no migrations. One edge function redeploys. Plan-first discipline holds; held for sign-off on Q1–Q10 before commit #75.**

— End of PHASE_3_7_PLAN.md
