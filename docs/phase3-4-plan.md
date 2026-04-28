# Phase 3.4 — PLAN.md

> **Disposition:** uncommitted while Rutik reviews. Moves to `docs/phase3-4-plan.md` in the final commit (#59). Same pattern as 3.2 and 3.3.
>
> **Status:** Pre-flight survey done (Edge Function + Anthropic call shape, chatApi, useChatTurn, Typewriter, ThinkingIndicator, chatStore, package.json all read live). Awaiting Rutik's sign-off on §6 questions before commit #52.
>
> **One sentence:** the engagement edition is the largest functional batch of Phase 3 — streaming responses, progress meter, suggested replies, export, sigil animations, fact ticker, section celebration, conversation map, save indicator — with one big architectural decision (streaming through tool use) that I want to flag before we cut.

---

## 1 · Pre-flight findings

### 1a — Streaming is genuinely greenfield

`supabase/functions/chat-turn/anthropic.ts` calls `client.messages.create({ stream: false })` (the SDK default — implicit, no streaming). `src/lib/chatApi.ts` does `await response.json()`. Neither side has any SSE or stream-handling code today. **Both ends need work for #52, and the order matters: server-side first (so the response shape exists), then client-side.**

### 1b — Tool use complicates streaming

The model is **forced into tool mode** (`tool_choice: { type: 'tool', name: 'respond' }`) and a text-only response throws `UpstreamError('invalid_response')` (`anthropic.ts:167–195`). The user-visible text lives inside the `respond` tool's `message_de` / `message_en` fields — *not* in standard `text` content blocks.

Anthropic's streaming for tool input emits `content_block_delta` events with `type: 'input_json_delta'` containing partial JSON strings. The full JSON only validates at the end (`content_block_stop`). To stream user-visible text *during* the tool call, we need to extract the `message_de` field out of partial JSON as it grows.

**Three approaches:**

- **(a) Refactor prompt** — drop forced tool use, instruct the model to emit text first, then call `respond` for structured side-effects. Cleanest streaming, but the Bayern persona is deeply calibrated; a behavior change carries real risk and the production prompt cache invalidates.
- **(b) Server-side partial JSON parser** — accumulate `input_json_delta` chunks in the Edge Function, run them through a partial-JSON parser, extract `message_de` text as it grows, forward extracted text deltas to the client as SSE events. Adds a small dependency to the Deno function.
- **(c) Client-side state-machine extractor** — server streams raw `input_json_delta` chunks as SSE events; client accumulates and uses a tiny state machine to extract the text field. ~30 lines of code, no dependencies.

I recommend **(c)** — see Q1. It keeps the persona prompt and tool-choice contract untouched (no prompt-cache invalidation), it's robust if the model reorders the JSON keys (we just look for `"message_de":"..."` regardless of position), and it ships in the smallest line-count.

### 1c — No top bar on the desktop chat workspace

`ChatWorkspacePage` renders `MobileTopBar` (lg:hidden) + `ChatWorkspaceLayout` (the three-zone grid). **No sticky desktop header.** Language switcher only appears on `OverviewPage`. So `Exportieren` and `Auto-saved` indicators need a home. Two options:

- (i) Mount them inside `LeftRail` (top of the rail, below the wordmark) — desktop-only by default, no new component shells.
- (ii) Add a new sticky `ChatWorkspaceTopBar` with wordmark + auto-save indicator + export + language switcher + leave link.

(ii) is structurally cleaner and gives mobile parity, but it adds a real component and a desktop visual change beyond the locked Phase 3.2 layout. **Recommend (i) for #59 (auto-save) and put `Exportieren` in the LeftRail footer + the OverviewPage header — no new top bar.** See Q10.

### 1d — `chatStore` has no progress tracking

No `turnCount`, no `sessionStartedAt`, no `lastSuccessfulTurnAt`. The progress meter algorithm needs `turnCount`, and the auto-save indicator needs `lastSuccessfulTurnAt`. **Add both fields to `chatStore` in #53.**

### 1e — Suggested replies need a model-emitted source of truth

Currently `MessageRow.input_options` carries the model-emitted options. For free-text turns, `input_options === null`. The brief proposes a *separate Anthropic call* per turn to infer 3 likely replies — this doubles API calls + adds latency.

**I recommend extending the `respond` tool schema with an optional `likely_user_replies: string[]` field** (max 3, ≤6 words each). The model has full context already; one call, no extra latency. The Edge Function passes the field through; client renders chips when present. See Q2.

### 1f — Existing `Typewriter` will become a fallback

The `Typewriter` component renders a character-by-character reveal on new messages, instant on history. Once streaming ships, **streaming becomes the primary reveal mechanism** for new messages; Typewriter remains for the historical fallback path (e.g., recovery on reload, where messages already exist when the page mounts). This is in line with the brief's note: "The typewriter animation from Phase 3 is replaced by real streaming."

### 1g — `MessageSystem` already accepts arbitrary copy

The recovery system row in #59 reuses the existing `MessageSystem` component. No new component shell needed.

### 1h — pdf-lib vs jspdf

`pdf-lib` produces real text-PDF (selectable, smaller, sharper); `jspdf` is older with worse SVG support. `pdf-lib` is also lighter (~250 kB vs jspdf's ~150 kB but the jspdf bundle quality is worse). **Recommend `pdf-lib`** — see Q3.

---

## 2 · Vocabulary inherited (do not invent more)

The atelier vocabulary is locked across Phase 3.2 + 3.3. Phase 3.4 adds *behaviour*, not new visual primitives. The only "new" visual surfaces are:

| Surface | Vocabulary it reuses |
|---|---|
| Progress meter (left rail + mobile) | Roman-numeral / hairline rule / italic Serif sub vocabulary from #41, #44 |
| Suggested-reply chips | Paper-tab chip vocabulary from #48 wizard, drafting-blue selected state, clay dot prefix |
| Export menu | Roman-numeral schedule rows from #40, #44; vaul drawer from #45 |
| Sigil micro-animations | Existing #38 sigils — only animation behaviour is new |
| Fact ticker | Inter italic clay margin-annotation register (matches CostTicker / footer notes) |
| Section celebration | Drafting-blue hatching from #40, hand-drawn checkmark glyph (new but minimal) |
| Conversation map | Spec-index Roman numerals from #41, GateStateMarker dots from #41 |
| Save indicator | Italic Serif clay timestamp register from #39 (user message) and #44 (audit timeline) |
| Recovery system row | `MessageSystem` from D12 |

**One new vocabulary element** I want to flag: a tiny **drafting-blue cursor `▌`** that blinks at the end of streaming text. No precedent — but a streaming cursor is a near-universal UX pattern (Claude.ai, ChatGPT, Cursor IDE). Visual: 1px wide × 14px tall solid drafting-blue/65 vertical bar, 0.8s blink loop. Reduced-motion: solid, no blink. **Q9.**

---

## 3 · The seven commits

Same shape as 3.2 / 3.3 — one cohesive piece per commit, sequential after sign-off, push as a batch.

### Commit #52 · `feat(edge): streaming responses via Server-Sent Events`

**Edge Function (`supabase/functions/chat-turn/`)**

- `anthropic.ts` — switch from `client.messages.create()` to `client.messages.stream()`. Iterate event stream; for each event:
  - `content_block_delta` with `input_json_delta` → forward as SSE `data: {"type":"json_delta","partial":"<chunk>"}\n\n`
  - `message_stop` → run final validation against `respondToolInputSchema` on the accumulated JSON, run state mutations + persistence (existing path), then emit final SSE `data: {"type":"complete","assistantMessage":{...},"projectState":{...},"completionSignal":"...","costInfo":{...}}\n\n`
  - On any error: emit SSE `data: {"type":"error","code":"...","message":"..."}\n\n`, then close the stream.
- `index.ts` — new code path: when request includes `Accept: text/event-stream`, set `Content-Type: text/event-stream` on response and pipe stream events. When `Accept: application/json`, fall back to existing synchronous behaviour (graceful regression).
- Persistence (insert assistant message, log event, etc.) runs **after** `message_stop` — same as today, just deferred until stream completes.

**Client (`src/lib/chatApi.ts` + `src/features/chat/hooks/useChatTurn.ts`)**

- New `postChatTurnStreaming(request, handlers)` function in `chatApi.ts`:
  - Sends POST with `Accept: text/event-stream`
  - Reads response body via `ReadableStream`'s `getReader()`
  - Parses each `data: ...\n\n` block, dispatches to handlers `{ onJsonDelta, onComplete, onError }`
  - Maintains a small partial-JSON state machine (~30 LOC): tracks whether we're inside `"message_de":"..."` (or `"message_en":"..."` for EN locale), pulls characters out as they arrive, calls `onTextDelta(text)` per extracted character batch.
- New `useStreamingAssistantMessage` chatStore slice: `streamingMessage: { id, specialist, contentSoFar, isComplete } | null`. While streaming, `MessageAssistant` renders this slice's `contentSoFar` instead of the persisted message.
- `useChatTurn` mutation updated:
  - On `onMutate` — set `streamingMessage = { id: tempId, specialist: seedSpecialist, contentSoFar: '', isComplete: false }`
  - On `onTextDelta` — append delta to `streamingMessage.contentSoFar`
  - On `onComplete` — replace `streamingMessage` with the persisted message in the cache; clear `streamingMessage`
  - On `onError` — fall back to a single retry with `Accept: application/json`, log the failure (`window.posthog?.capture('streaming_failed', ...)` if available), surface error normally if non-streaming retry also fails

**Cursor**

A 1×14 px drafting-blue/65 cursor span renders at the end of `streamingMessage.contentSoFar` with `animation: pmStreamCursor 0.8s steps(2) infinite`. Reduced-motion: solid, no blink. Disappears when `isComplete = true`.

**Reduced-motion behaviour**

Per brief: full message lands when complete (no progressive reveal). My recommendation in Q9 is to *keep* streaming for reduced-motion users (the perceived-speed win matters more for accessibility than the visual cursor) and only kill the cursor blink. Flag for sign-off.

**Files**

- `supabase/functions/chat-turn/anthropic.ts` — streaming variant
- `supabase/functions/chat-turn/index.ts` — Accept-header branching
- `src/lib/chatApi.ts` — `postChatTurnStreaming`, partial-JSON state machine
- `src/features/chat/hooks/useChatTurn.ts` — streaming integration
- `src/stores/chatStore.ts` — `streamingMessage` slice
- `src/features/chat/components/MessageAssistant.tsx` — streaming-message render path + cursor
- `src/features/chat/components/StreamingCursor.tsx` (new — minimal)

---

### Commit #53 · `feat(chat): progress meter — left rail + mobile compact + percentage estimate`

**Algorithm** (`src/features/chat/lib/progressEstimate.ts`)

```ts
const SPECIALIST_PROGRESS: Record<Specialist, number> = {
  moderator: 0.05,
  planungsrecht: 0.25,
  bauordnungsrecht: 0.50,
  sonstige_vorgaben: 0.70,
  verfahren: 0.85,
  beteiligte: 0.92,
  synthesizer: 0.98,
}

export function estimateProgress(turnCount: number, currentSpecialist: Specialist | null) {
  const fromSpecialist = currentSpecialist ? SPECIALIST_PROGRESS[currentSpecialist] : 0.05
  const fromTurns = Math.min(turnCount / 18, 0.95)
  return Math.max(fromSpecialist, fromTurns)
}
```

Plus `estimateTurnsRemaining(progress)` returning a string range like `"4–5"`.

**Visual — left rail desktop** (`src/features/chat/components/ProgressMeter.tsx`)

```
─────────────────────────
FORTSCHRITT
─────────────────────────

ca. 65 % erfasst

──●─────────────
▰▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱

ca. 4–5 Wendungen verbleibend.
Aktuell: Bauordnungsrecht
```

- Inter 11 0.22em uppercase clay eyebrow `FORTSCHRITT` / `PROGRESS`
- Hairline rules above + below
- Inter 13 italic ink "ca. 65 % erfasst" / "approx. 65 % covered"
- 16-cell SVG bar, 8 px wide × 3 px tall cells, 1 px gap. Filled = ink. Unfilled = ink/15. Above-bar clay dot indicating current cell. Stagger fill on advance: 200 ms per cell, left-to-right. Dot slides 320 ms ease.
- Inter 12 italic ink/65 sub: "ca. 4–5 Wendungen verbleibend" + line below "Aktuell: {specialist}"

**Position in `LeftRail`**: between SpecIndex and SpecialistsAtTheTable.

**Mobile compact** (in `MobileTopBar`)

Replaces the project-name centre column when `currentProgress > 0.05`:
```
●━━━━━━━━━━━○ 65 %
```
12-cell horizontal mini-bar. Tap → opens a small vaul drawer (top, 50% height) showing the full meter. Swipe-close.

**Edge cases**

- `currentSpecialist` unknown / null → fall back to `turnCount / 18`.
- `turnCount > 18` → "ca. >95 %" + "Wir nähern uns dem Ende."
- `lastCompletionSignal === 'ready_for_review'` → lock at 100% + sub "Bereit zur Überprüfung."

**Reduced-motion**: no fill animation, no slide. Static at current state.

**Files**

- `src/features/chat/lib/progressEstimate.ts` (new)
- `src/features/chat/components/ProgressMeter.tsx` (new)
- `src/features/chat/components/ProgressMeterCompact.tsx` (new)
- `src/features/chat/components/LeftRail.tsx` (insert ProgressMeter between sections)
- `src/features/chat/components/MobileTopBar.tsx` (compact meter conditional)
- `src/stores/chatStore.ts` (turnCount field — incremented on successful turn)
- `src/locales/{de,en}.json` (`chat.progress.*`)

---

### Commit #54 · `feat(chat): suggested replies — paper-tab chips above input bar`

**Two paths, one row**

- **Model-emitted** (already exists via `input_options`) — visual upgrade only: paper-tab chip styling from #48, hairline border ink/15, hover lift 1 px + drafting-blue/[0.05] tint, drafting-blue/60 selected border + clay dot prefix. 60 ms stagger entrance.
- **Inferred** — extend `respondToolInputSchema` with optional `likely_user_replies: z.array(z.string().max(60)).max(3).optional()`. Persona system prompt gets a small instruction: *"When `input_type === 'text'` and you can guess plausible short answers, populate `likely_user_replies` with up to 3 options (≤6 words each)."* Edge Function persists this to a new `messages.likely_user_replies` column (`text[]`), nullable. Client renders chips from this field when present.

**Hide rules** (per brief)

- First turn (moderator's opener, address question)
- After IDK is selected
- When user has typed > 8 chars in the input
- When `lastCompletionSignal !== 'continue'`

**Component** (`src/features/chat/components/Input/SuggestedReplies.tsx`)

Row of 1–3 chips, full-width, wraps to 2 rows if needed. Each chip = paper-tab card from the wizard chip vocabulary. On hover, a tiny clay-italic `←` prefix appears (suggesting "use this"). Click → calls the same submit handler as text input, sending the chip's value as `userMessage`.

**Schema migration**

`supabase/migrations/0004_likely_user_replies.sql`:
```sql
ALTER TABLE messages ADD COLUMN likely_user_replies text[];
```

This is a **schema change**, but trivial — additive nullable column. Per brief §5 (out of scope), schema changes are flagged for Phase 4. Including this single column expansion in #54 is the cheapest path; alternative is to thread the field through the API response + client state without persisting (works but throws away history-replay). Recommend persisting. **See Q4.**

**Files**

- `supabase/migrations/0004_likely_user_replies.sql` (new — single ALTER TABLE)
- `supabase/functions/chat-turn/persistence.ts` (write `likely_user_replies` on assistant insert)
- `src/types/db.ts` (add `likely_user_replies: string[] | null` to MessageRow)
- `src/types/respondTool.ts` (extend schema)
- `src/features/chat/components/Input/SuggestedReplies.tsx` (new)
- `src/features/chat/components/Input/InputBar.tsx` (mount SuggestedReplies above the input control row)

---

### Commit #55 · `feat(chat): export menu — PDF brief + Markdown checklist + JSON`

**Dependency**

Add `pdf-lib` (~250 kB ESM, no native deps). Already React-19-compatible.

**Component** (`src/features/chat/components/ExportMenu.tsx`)

- Desktop: popover (Radix Popover) attached to a small `Exportieren` ghost button in the LeftRail footer (above the "← Zurück zum Dashboard" link).
- Mobile: Drawer.Root from vaul (top direction, 60% height) opened by a 4th icon in the MobileTopBar (a folded-paper-tab download glyph, mirrored variant of the existing tab icons).
- Roman-numeral schedule rows for the three options: I PDF-Briefing / II Markdown-Checkliste / III JSON-Datenexport.

**PDF generator** (`src/features/chat/lib/exportPdf.ts`)

Built on pdf-lib. Page layout:

- **Page 1 — Title page**
  - Top-left: small wordmark glyph (10 px) + "Planning Matrix" Inter 8
  - Centre: PROJEKT eyebrow (Inter 9 0.22em clay) → project intent (Helvetica-italic 32) → address (Helvetica-italic 14 ink/65) → "Erstellt: DD. Monat YYYY" Courier 10
  - Below centre: 320 × 200 axonometric house drawing (the same SVG used in `IntentAxonometric` — embed via pdf-lib's `drawSvgPath`)
  - Bottom: "Vorläufige Zusammenfassung — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in." Helvetica-oblique 9 clay
- **Page 2 — TOP-3 next steps**
  - Each row: Helvetica-italic 28 numeral (1./2./3.) clay-deep + Helvetica 16 title + Helvetica 12 body + Helvetica 9 italic clay qualifier
- **Page 3 — Bereiche assessment**
  - A/B/C labels in 18 Helvetica-italic clay-deep + state pill + reason text
  - Hatched bands rendered as native PDF lines (not rasterised)
- **Pages 4-N — Schedule sections**
  - Verfahren / Dokumente / Fachplaner / Eckdaten — same Roman numeral column + entry block layout as the right rail
- **Last page — Audit log**
  - Last 30 events from `useProjectEvents`: italic Serif date column (left of vertical hairline) + ink event detail (right of hairline)
- **Every page footer**: "Generiert mit Planning Matrix · planning-matrix.app · DD. Monat YYYY" Helvetica 8 ink/55

Note: pdf-lib uses Helvetica/Helvetica-Bold/Helvetica-Italic/Helvetica-Oblique by default. If we want Inter + Instrument Serif in the PDF we'd need to embed the .ttf files (~600 kB of font data). **Recommend ship with Helvetica family for v1**, document as a follow-up. The visual gap between Inter and Helvetica at 11 px is small. **Q5.**

**Markdown generator** (`src/features/chat/lib/exportMarkdown.ts`)

Pure string-template — no library. Produces the exact format from brief §2 #55. UTF-8 BOM-free, LF line endings.

**JSON generator** (`src/features/chat/lib/exportJson.ts`)

```ts
export function buildExportJson(project: ProjectRow, messages: MessageRow[], events: ProjectEventRow[]) {
  return {
    schema: 'planning-matrix.export.v1',
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      intent: project.intent,
      bundesland: project.bundesland,
      hasPlot: project.has_plot,
      plotAddress: project.plot_address,
      status: project.status,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    },
    state: project.state,
    messages: messages.map(stripInternal),
    auditLog: events.slice(0, 30).map(stripInternal),
  }
}
```

`stripInternal` drops `client_request_id`, token counts, `latency_ms` (internal telemetry).

**File naming**: `{slug}-{YYYY-MM-DD}.{ext}` where slug = `project.name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 64)`.

**Files**

- `package.json` (add `pdf-lib`)
- `src/features/chat/lib/exportPdf.ts` (new)
- `src/features/chat/lib/exportMarkdown.ts` (new)
- `src/features/chat/lib/exportJson.ts` (new)
- `src/features/chat/lib/exportFilename.ts` (new — slug helper)
- `src/features/chat/components/ExportMenu.tsx` (new — popover desktop, drawer mobile)
- `src/features/chat/components/MobileTopBar.tsx` (4th tab icon for export)
- `src/features/chat/components/LeftRail.tsx` (Exportieren button above leave link)
- `src/features/chat/pages/OverviewPage.tsx` (header export button)
- `src/locales/{de,en}.json` (`chat.export.*`)

---

### Commit #56 · `feat(chat): engagement — sigil micro-animations + Bayern fact ticker`

(Streaming from #52 already covers Layer 1 of the brief's "engagement during latency" requirement — this commit is Layers 2 + 3.)

**Sigil micro-animations** (`src/features/chat/components/SpecialistSigils.tsx`)

Each of the 7 sigils gets an `isActive` prop (default `false`). When `true` AND not reduced-motion, the sigil's animation plays in a continuous loop. Specifics:

- **moderator (roundtable)** — three stools rotate around the table center. CSS `transform-origin: 7px 7px; animation: pmRotate 4s linear infinite;` on the three stool circles. Apply to each via `<g class="pm-rot">` wrapping each stool with staggered initial rotation.
- **planungsrecht (folded site-plan)** — fold animates: the corner triangle scales 1 → 0.85 → 1 over 3 s, with the path's diagonal also rotating slightly.
- **bauordnungsrecht (building section)** — a tiny ruler line sweeps vertically across the section, `transform: translateY(-2px → 12px)` with opacity fade on entry / exit. 3 s loop.
- **sonstige_vorgaben (stamp)** — the rectangle scales `1 → 1.05 → 1` (lifts) plus the diagonal slash strokeOpacity `0.6 → 1 → 0.6` (ink pulse). 3.5 s loop.
- **verfahren (flowchart)** — arrow head extends and retracts: the three small triangles between boxes scale `1 → 1.4 → 1` with stagger. 2 s loop.
- **beteiligte (three figures)** — heads tilt sequentially: each circle (head) rotates `0deg → 5deg → 0deg` with 200 ms stagger between figures. 4 s loop.
- **synthesizer (fountain pen nib)** — a tiny ink drop (small filled circle) appears below the nib, falls 0 → 4 px, fades out. 3.5 s loop.

Implementation: add `<style>` blocks per sigil with CSS keyframes scoped via class names. `isActive` toggles the class.

**Wiring**: `ThinkingIndicator` already mounts `SpecialistTag` which mounts `SpecialistSigil`. Pass `isActive={isThinking && currentSpecialist === thisSpec}` through the chain.

**Reduced-motion**: all sigils fully static.

**Fact ticker** (`src/features/chat/components/FactTicker.tsx`, `src/data/factsBayern.ts`)

Bank of ~30 facts in `src/data/factsBayern.ts`:

```ts
export const FACTS_BAYERN: Array<{ de: string; en: string }> = [
  { de: 'Bayern hat 2025 die PV-Pflicht für Wohnneubauten eingeführt.', en: 'Bavaria introduced the solar requirement for new residential builds in 2025.' },
  { de: 'Die Gebäudeklasse 1 nach BayBO Art. 2 (3) gilt für freistehende Gebäude bis 7 m Höhe.', en: '...' },
  // ~28 more — drafted in the commit
]
```

Component: in the right rail, below all schedule sections + above CostTicker, when:

- conversation has been idle for > 30 s (no user input, no thinking)
- `!isAssistantThinking`
- `lastCompletionSignal === 'continue'`
- `!isUserScrolling` (debounced via `'scroll'` listener with 1 s settle)

Render: WUSSTEN SIE? eyebrow Inter 9 0.20em clay + body Inter 11 italic ink/65 (max 2 lines).

Cycling: random fact chosen from bank (no repeats within session — track shown indices in `useRef`). Hold 12 s, fade over 600 ms (Framer Motion `AnimatePresence`), next fact appears. Reduced-motion: instant swap, no fade.

**Files**

- `src/data/factsBayern.ts` (new)
- `src/features/chat/components/FactTicker.tsx` (new)
- `src/features/chat/components/SpecialistSigils.tsx` (animation variants on all 7)
- `src/features/chat/components/RightRail.tsx` (mount FactTicker above CostTicker)
- `src/features/chat/components/SpecialistTag.tsx` (thread `isActive` to sigil)
- `src/locales/{de,en}.json` (`chat.facts.eyebrow`)

---

### Commit #57 · `feat(chat): section celebration when Bereich flips PENDING → ACTIVE`

**Trigger** (`src/features/chat/components/BereichePlanSection.tsx`)

`useEffect` watches `state.areas[X].state` per band. When transitions `PENDING → ACTIVE` (or `VOID → ACTIVE`) detected, fires a 1.6 s celebration on that band:

1. Hatched band's diagonal lines redraw left-to-right via `stroke-dashoffset` animation (0.6 s)
2. A drafting-blue/70 hand-drawn checkmark glyph (1.5 px stroke, 14 × 14 SVG, baked imperfection) draws itself in the band's right edge over 0.6 s (stroke-dashoffset)
3. Band briefly brightens — opacity 0.45 → 0.65 → 0.45 over 1.2 s
4. Hairline ripple (1 px ink/15 outline) expands from the band outward, fades over 0.8 s

After ≈ 2 s, band returns to its normal `ACTIVE` state.

**Audio (default off)**

A very soft `*plink*` sound (small WAV / OGG ~ 4 kB embedded as base64, 0.1 s duration). Behind a `localStorage.getItem('pm-celebration-audio')` check (default `'off'`). No UI to toggle in v1 — it's a hidden affordance for power users.

**Q6 — confirm whether to ship the audio asset at all (default-off + no UI = essentially dead code for most users) or skip until Phase 4 settings page exists.**

**Reduced-motion**: no animation, immediate state change.

**Files**

- `src/features/chat/components/BereichePlanSection.tsx` (celebration trigger + animation paths)
- `public/audio/celebration.wav` (~ 4 kB — only if Q6 = ship)

---

### Commit #58 · `feat(chat): conversation map — visual journey through gates in left rail`

**Component** (`src/features/chat/components/VerlaufMap.tsx`)

Mounts in LeftRail between ProgressMeter (#53) and SpecialistsAtTheTable.

**Layout (5 circles)**

5 small circles representing the 5 main gates (matches the spec-index Roman numerals I–V). Each:
- 6 px diameter, 1 px ink/30 stroke by default
- Filled clay if visited (i.e. at least one assistant turn from a specialist mapped to that gate exists)
- 1 px drafting-blue/65 ring if current
- Hairline (1 px ink/20) connectors between circles
- Small Roman numeral above each circle (Inter 9 italic clay-deep)
- Sub label below current circle: italic clay 10 "Hier" / "Here"

**Mapping**

```ts
const GATE_FOR_SPECIALIST: Record<Specialist, 1 | 2 | 3 | 4 | 5> = {
  moderator: 1,
  planungsrecht: 2,
  bauordnungsrecht: 3,
  sonstige_vorgaben: 4,
  verfahren: 5,
  beteiligte: 5,
  synthesizer: 5,
}
```

Five gates (matching the chat-workspace's existing spec-index of I–VII, but collapsing VI/VII into V for the journey map's visual tightness). **Q7.**

**Click behaviour**

Click a visited circle → scroll the chat thread to the first message attributed to that gate's specialists. Uses a smooth `scrollIntoView({ behavior: 'smooth', block: 'start' })`. Reduced-motion: instant scroll.

**Files**

- `src/features/chat/components/VerlaufMap.tsx` (new)
- `src/features/chat/components/LeftRail.tsx` (mount)
- `src/locales/{de,en}.json` (`chat.verlauf.*`)

---

### Commit #59 · `feat(chat): auto-saved indicator + recovery system row + docs`

**Auto-save indicator** (in LeftRail header, below the project name + above the spec index)

Italic Serif clay 11 reading `Automatisch gespeichert · vor 12 Sek.` (DE) / `Auto-saved · 12s ago` (EN). Updates:
- On every successful turn (sets `chatStore.lastSavedAt = new Date()`)
- Re-renders relative time via a `setInterval(setTick, 5_000)` re-render trigger

Helper: `formatRelativeShort(date, lang)` — returns `vor X Sek.`, `vor X Min.`, `vor X Std.` (DE) / `Xs ago`, `Xm ago`, `Xh ago` (EN).

**Recovery system row** (in `Thread.tsx`)

On project mount: if `chatStore.lastSavedAt < project.updated_at - 1 hour ago` (or session was abandoned mid-turn), prepend a synthetic system row (using `MessageSystem` pattern from D12) at the top of the new turns. Copy:

- DE: "Sie waren zuletzt am {date} hier. Wir setzen die Konsultation an derselben Stelle fort."
- EN: "You were last here on {date}. We'll continue the consultation from where you left off."

The synthetic row is client-only (never persisted), generated on mount when `(project.updated_at - lastUserSessionAt) > 1 hour`.

**Docs**

- Move `PHASE_3_4_PLAN.md` → `docs/phase3-4-plan.md`
- Append `D17 · Streaming responses + engagement layer` to `docs/phase3-decisions.md`
- Update `README.md` Phase status: append `Phase 3.4 — engagement edition: streaming responses, progress meter, suggested replies, export menu (PDF + Markdown + JSON), sigil animations, Bayern fact ticker, section celebration, conversation map, auto-saved indicator (docs/phase3-4-plan.md)`
- `docs/manager-demo-prep.md` — refresh demo script. New §1 opens with the streaming response moment as the wow factor; export menu becomes the new closing moment.

**Files**

- `src/features/chat/components/AutoSavedIndicator.tsx` (new)
- `src/features/chat/components/LeftRail.tsx` (mount above spec index)
- `src/features/chat/components/Thread.tsx` (recovery system row prepend logic)
- `src/features/chat/lib/formatRelativeShort.ts` (new — small helper)
- `docs/phase3-4-plan.md` (move from root)
- `docs/phase3-decisions.md` (D17)
- `README.md`
- `docs/manager-demo-prep.md`

---

## 4 · Volume estimate

| # | Title | LOC est. | Risk |
|---|---|---|---|
| 52 | Streaming via SSE — Edge Function + chatApi + useChatTurn | ~580 | **High** — first stream-handling code in the project; partial-JSON state machine is novel; cache_control behaviour with streaming needs verification |
| 53 | Progress meter — left rail + mobile + chatStore.turnCount | ~280 | Low — pure UI + tiny algorithm |
| 54 | Suggested replies — schema + persona instr + InputBar | ~340 | Medium — touches the persona prompt + schema migration; small but multi-layer |
| 55 | Export — pdf-lib + 3 formats + menu component | ~640 | Medium — pdf-lib is new; PDF layout is detail-heavy; OverviewPage + LeftRail + MobileTopBar all gain entry points |
| 56 | Engagement — 7 sigil animations + fact ticker + 30-fact bank | ~480 | Medium — 7 distinct keyframe animations; fact bank needs careful sourcing |
| 57 | Section celebration — animation in BereichePlanSection | ~140 | Low |
| 58 | Conversation map — VerlaufMap + click-scroll | ~200 | Low |
| 59 | Auto-saved indicator + recovery row + docs | ~180 | Low |

**Total estimated LOC: ~2,840** across 7 commits + 1 schema migration (single ALTER TABLE). Sits between Phase 3.2 (3,240) and Phase 3.3 (1,320).

---

## 5 · Where my judgment differs from the brief

### 5a — Streaming through tool use

Per §1b — recommend client-side state machine (option (c)) over prompt refactor (option (a)). Keeps the persona untouched; doesn't invalidate prompt cache. **Q1.**

### 5b — Suggested replies inference path

Brief proposes a separate Anthropic call for "3 plausible replies" per turn. Doubles API cost + adds latency. Recommend extending the `respond` tool schema with optional `likely_user_replies: string[]?`. The model has full context already; one call. **Q2.**

### 5c — PDF library

Brief mentions jspdf + html2canvas. Recommend pdf-lib — proper text-PDF (selectable, smaller, sharper), native SVG support. **Q3.**

### 5d — Suggested-replies schema persistence

Persisting `likely_user_replies` to a new nullable `text[]` column on `messages` is the cleanest path (history-replay works). Alternative: thread the field through the API response only (no schema change but lose history-replay). Recommend persist (one trivial ALTER TABLE). **Q4.**

### 5e — Custom fonts in the PDF

Embedding Inter + Instrument Serif in pdf-lib adds ~ 600 kB to the export's JS bundle (loaded on demand when user clicks Export). Helvetica family ships built into pdf-lib at zero bundle cost. The visual gap at 11 px is small. Recommend ship with Helvetica family for v1. **Q5.**

### 5f — Section-celebration audio

Default-off + no UI = effectively dead code. Recommend skipping the audio entirely for v1; revisit when Phase 4 ships a settings page. Saves ~4 kB of WAV + the localStorage-checking ceremony. **Q6.**

### 5g — Conversation map gate count

Brief shows 5 circles. The chat-workspace spec index has I–VII (7 gates). Collapse to 5 (matching the journey-map visual tightness) or keep 7 (matching the spec index)? Recommend 5 — visual tightness wins; "Verfahren / Beteiligte / Synthesizer" all cluster at the end of the conversation anyway. **Q7.**

### 5h — Streaming + reduced-motion

Per brief: reduced-motion users get the full message landed at once (no streaming). My read: streaming is a *perceived speed* improvement, not a motion effect. Killing it for reduced-motion users penalises accessibility. Recommend keep streaming for everyone, only drop the cursor blink. **Q8.**

### 5i — Streaming cursor

The drafting-blue `▌` cursor is the one new visual primitive in this batch. Universal in streaming UIs (Claude.ai, ChatGPT). Worth flagging: confirm we ship it, or skip and just let text appear word-by-word with no cursor. **Q9.**

### 5j — Top-bar / no top-bar

Brief implies a chat-workspace top bar exists; survey confirms it doesn't (only mobile has MobileTopBar). Recommend mounting Exportieren in LeftRail footer + on OverviewPage header, mounting `Auto-saved` in LeftRail header — no new top bar. **Q10.**

---

## 6 · Confirmation list — please answer before commit #52

| ID | Question | My recommendation | Your call |
|---|---|---|---|
| **Q1** | Streaming through tool use — refactor prompt (a), server-side partial JSON parser (b), or client-side state-machine extractor (c)? | (c) client-side state machine | ☐ (a) refactor ☐ (b) server parser ☐ (c) client SM |
| **Q2** | Suggested replies for free-text turns — separate Anthropic call, or integrate `likely_user_replies` into the existing `respond` tool? | Integrate into respond tool | ☐ separate call ☐ integrate |
| **Q3** | PDF library — pdf-lib (proper text PDF) vs jspdf + html2canvas (rasterised)? | pdf-lib | ☐ pdf-lib ☐ jspdf |
| **Q4** | Persist `likely_user_replies` to a new `messages.likely_user_replies` column (single ALTER TABLE), or thread it through API response only? | Persist (column) | ☐ persist ☐ no-persist |
| **Q5** | PDF fonts — built-in Helvetica family (free, ~no bundle cost) or embed Inter + Instrument Serif (~600 kB bundle add)? | Helvetica | ☐ Helvetica ☐ embed Inter+Serif |
| **Q6** | Section-celebration audio — ship a 4 kB WAV behind a default-off localStorage flag with no UI, or skip until Phase 4 settings exist? | Skip in v1 | ☐ ship ☐ skip |
| **Q7** | Conversation map — 5 gates (collapsed at the end) or 7 gates (one per specialist)? | 5 | ☐ 5 ☐ 7 |
| **Q8** | Reduced-motion — kill streaming entirely (full message lands at once) or keep streaming but skip the cursor blink? | Keep streaming, no cursor | ☐ kill streaming ☐ keep streaming |
| **Q9** | Streaming cursor — ship the drafting-blue `▌` blinking cursor or skip and just have text appear progressively? | Ship cursor | ☐ ship ☐ skip |
| **Q10** | Top bar — add a new sticky desktop top bar in chat workspace, or mount Exportieren in LeftRail footer + Auto-saved in LeftRail header (no new top bar)? | LeftRail mounts | ☐ new top bar ☐ LeftRail mounts |

If you answer all ten, I'll lock them into this file and start commit #52. If you want to discuss any, we can. If you want to reject the batch direction, also fine — better now than after 2,800 lines.

---

## 7 · What I will NOT do without confirmation

- Touch any production file in `src/` or `supabase/functions/` until you sign off Q1–Q10.
- Change the persona prompt's text content (only schema additions like `likely_user_replies` — and only if Q2 = integrate).
- Change the existing tool-choice contract (`tool_choice: { type: 'tool', name: 'respond' }`).
- Add new color tokens or visual primitives beyond the streaming cursor (Q9-gated).
- Touch the chat workspace's locked Phase 3.2 layout beyond the LeftRail additions.
- Add audio without your explicit "ship" answer to Q6.
- Skip reduced-motion fallbacks on any animated surface — every motion ships with one.
- Move `PHASE_4_PLAN.md` (Phase 4 still awaits manager Q1–Q16 walkthrough).

---

## 8 · If you confirm — what happens next

1. I lock Q1–Q10 into this file (a quick edit in §6).
2. Commit #52 opens (streaming foundation). Each commit ends with `npx tsc --noEmit` clean and `npm run build` green before the next opens.
3. The schema migration (`0004_likely_user_replies.sql`) ships as part of #54 — Rutik applies it via Supabase SQL Editor before the corresponding code change deploys, same pattern as 0003.
4. After commit #59, I push the batch and wait for Vercel deploy.
5. Live verification per brief §3 — the full nine-check walkthrough on the deployed URL. Same proof bar as Phase 3.2 + 3.3.
6. Batch report follows the same shape — what shipped, what's verified, what's still gating on your eyes (screenshots + screen recording I cannot capture from this shell).

— End of PHASE_3_4_PLAN.md.
