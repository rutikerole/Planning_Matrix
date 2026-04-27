# Phase 3 — PLAN.md

> **Disposition (locked 2026-04-27 per Rutik instructions A + B):** This file is **not** thrown away after the chat ships. It moves to `docs/phase3-plan.md` and is committed as part of commit #30. A thin companion `docs/phase3-decisions.md` (D1–D12, three-line entries) ships alongside it. Future-Rutik and future-Claude need the decision archaeology — why we cached only the persona block, why discriminated unions on the deltas, why `0003_…` instead of `0002_…`, why static OG tags. Throwing the planning artefact away after one phase is the kind of thing that makes month-six-Claude reinvent the wrong wheel.

> Status: D1–D12 confirmed. Commit #1 underway.

---

## 0 · Research takeaways that changed the plan

A condensed version of what came back from the four research streams. Cited inline so anyone can re-walk it.

### Anthropic (April 2026)
- `claude-sonnet-4-5` is current and not deprecated. Sonnet 4.6 also exists (same `$3 / $15` pricing) but the brief locks 4.5 — we honour that and flag 4.6 as a v1.1 swap.
- Pricing: input **$3 / MTok**, output **$15 / MTok**, cache write 5m **$3.75 / MTok**, cache read **$0.30 / MTok**. A ~5k-token persona block read 100× costs ≈ $0.15 instead of ~$1.50 uncached — caching is a 90% line-item discount.
- Multi-block system prompts confirmed. `cache_control: { type: 'ephemeral' }` placed on the **last** stable block — everything up to and including that block is the cache key. Block 2 (live state) stays uncached, fresh per turn. ([prompt-caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching.md))
- Forced tool: `tool_choice: { type: 'tool', name: 'respond' }` returns `stop_reason: 'tool_use'` and a single `{ type: 'tool_use', id, name, input }` block. No server-side schema validation — **we Zod-validate the `input` ourselves before persisting**.
- Errors: 429 carries `retry-after` (honour exactly); 529 is transient/non-billable (exponential backoff, 2–5s); 5xx rare. Standard shape `{ type: 'error', error: { type, message }, request_id }`.
- SDK: `npm:@anthropic-ai/sdk` from Deno is production-ready. No reason to hand-roll fetch.

### Supabase Edge Functions (April 2026)
- Pattern: `createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: req.headers.get('Authorization')! } } })`. Subsequent queries run as the caller — RLS is enforced. **Never use `SERVICE_ROLE_KEY`** in this function.
- `verify_jwt = true` set in `supabase/config.toml` so the platform rejects unauthed requests before our code runs.
- Wall clock: 150s free / 400s paid. CPU 2s but async I/O (the Anthropic `fetch`) doesn't count. Memory 256 MB. Bundle ≤ 20 MB. No streaming for v1 → typical response ≤ 8 s. We add an `AbortController` at 50 s on the upstream Anthropic call to fail fast.
- Secrets via `supabase secrets set ANTHROPIC_API_KEY=…`. `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are auto-injected — we don't set them.
- CORS: we hand-roll the OPTIONS handler. Origin allowlist `{ vercel prod, localhost:5173 }` reflected back, `Vary: Origin` always set. Allow headers: `authorization, x-client-info, apikey, content-type`.
- Idempotency: roll our own — `client_request_id UUID` from the SPA, `UNIQUE(project_id, client_request_id)` on `messages`, `INSERT … ON CONFLICT DO NOTHING RETURNING …`. If 0 rows → fetch & return the persisted assistant reply.
- Background tasks / WebSockets / Queues exist in 2026 but are explicitly **out of scope** for v1.

### Conversational UI references — distilled into 5 principles (we'll hold ourselves to these)
1. Status is a dot or a hairline, never a panel.
2. AI presence is summoned by the user, never ambient.
3. Right rail is typeset, not iconographic. No favicons, no chips, no source-cards.
4. The model is a **role** (Planungsrecht / Bauordnungsrecht …) — words like "AI", "Assistent", "Engine" never appear in UI copy.
5. One conversation, one source of truth. No split-screen, no parallel threads.

### German B2B voice — 6 rules baked into the system prompt
1. Sie / Ihre / Ihnen always.
2. Sentences 12–22 words, verb-second.
3. No `!`, no rhetorical `?`, no emoji, no decorative em-dashes.
4. Calibrated hedges: *"nach derzeitiger Rechtslage"*, *"vorbehaltlich der Prüfung durch die Genehmigungsbehörde"*, *"in der Regel"*. Never "ich glaube" / "vielleicht".
5. Statute format `§ 34 BauGB` with non-breaking space. `§§ 34, 35 BauGB` for multiples. Cite at clause end.
6. No marketing verbs ("revolutionieren"…), no coaching ("Lassen Sie uns…"), no "Tolle Frage!", and the persona never breaks ("Als KI…" forbidden).

### Bayern legal grounding (the model needs all of this primed)
- BauGB **§ 30** qualifizierter B-Plan / **§ 34** Innenbereich / **§ 35** Außenbereich (EFH typically *unzulässig* in Außenbereich).
- BayBO **Art. 2 Abs. 3** Gebäudeklassen 1–5 — typical EFH = GK 1.
- BayBO **Art. 57** Genehmigungsfreistellung (GK 1–3 + qualifizierter B-Plan + entspricht Festsetzungen + Erschließung + Gemeinde greift nicht binnen 1 Monat ein).
- BayBO **Art. 58** vereinfachtes Verfahren — narrowed prüfprogramm, Verantwortung beim Entwurfsverfasser.
- BayBO **Art. 59** Regelverfahren — Sonderbauten.
- BayBO **Art. 6** Abstandsflächen seit 2021: **0,4 H**, min. 3 m.
- BayBO **Art. 47** Stellplätze + GaStellV; **kommunale Stellplatzsatzungen dominieren in der Praxis**.
- **GEG 2024** + 65-%-EE-Pflicht für neue Heizungen.
- BayBO **Art. 44a** PV-Pflicht für Wohnneubauten in Bayern seit 1.1.2025.
- BauGB **§ 246e** "Bauturbo" für angespannte Wohnungsmärkte (2025).
- BayBO **Art. 61** Bauvorlageberechtigung — only Architekt:innen / qualifizierte Bauingenieur:innen on the list. **A software tool cannot replace this** — that framing is the legal spine of our product.

---

## 1 · Edge Function architecture

```
                                                ┌──────────────────────────┐
                                                │  Anthropic Messages API  │
                                                │  claude-sonnet-4-5       │
                                                └────────────▲─────────────┘
                                                             │
                                                             │ HTTPS, x-api-key
                                                             │ tool_choice respond
                                                             │ system: [persona*, state]
                                                             │ * cache_control: ephemeral
                                                             │
                              ┌────────────────────────────────────────────┐
                              │  Supabase Edge Function  /chat-turn        │
                              │  Deno · npm:@anthropic-ai/sdk              │
                              │  npm:@supabase/supabase-js@2               │
                              │                                            │
                              │  1.  CORS preflight (OPTIONS → 204)        │
                              │  2.  verify_jwt platform gate              │
                              │  3.  Idempotency check (client_request_id) │
                              │  4.  Load project + last 30 messages       │
                              │  5.  Build messages payload                │
                              │  6.  Call Anthropic (AbortController 50s)  │
                              │  7.  Zod-validate tool_use.input           │
                              │  8.  Persist (txn): user msg, assistant    │
                              │      msg, project state delta, events      │
                              │  9.  Return { assistantMessage,            │
                              │              projectState, costInfo }      │
                              └────────────────▲───────────────────────────┘
                                               │ POST /functions/v1/chat-turn
                                               │ Authorization: Bearer <user JWT>
                                               │ { projectId, userMessage,
                                               │   userAnswer, clientRequestId }
                                               │
                              ┌────────────────┴───────────────────────────┐
                              │  React SPA  (vercel + localhost)           │
                              │  TanStack Query · Zustand · Framer Motion  │
                              └────────────────────────────────────────────┘
```

### Request shape (client → function)
```ts
type ChatTurnRequest = {
  projectId: string                  // uuid
  userMessage: string | null         // null when priming first turn
  userAnswer: UserAnswer | null      // structured payload of the input bar
  clientRequestId: string            // uuid v4 — idempotency key
}

type UserAnswer =
  | { kind: 'text'; text: string }
  | { kind: 'yesno'; value: 'ja' | 'nein' }
  | { kind: 'single_select'; value: string; label_de: string; label_en: string }
  | { kind: 'multi_select'; values: { value: string; label_de: string; label_en: string }[] }
  | { kind: 'address'; text: string }
  | { kind: 'idk'; mode: 'research' | 'assume' | 'skip' }
```

### Response shape (function → client)
```ts
type ChatTurnResponse =
  | {
      ok: true
      assistantMessage: AssistantMessage   // matches DB row shape
      projectState: ProjectState           // full post-turn state
      costInfo: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; latencyMs: number; usdEstimate: number }
    }
  | { ok: false; error: { code: ErrorCode; message: string; retryAfterMs?: number; requestId?: string } }

type ErrorCode =
  | 'unauthenticated'        // 401 — JWT missing/expired
  | 'forbidden'              // 403 — RLS denied / not project owner
  | 'not_found'              // 404 — project doesn't exist
  | 'validation'             // 400 — bad request payload
  | 'idempotency_replay'     // 409 — same client_request_id reused with different payload
  | 'upstream_overloaded'    // 502/529 — Anthropic 429/529, retryAfterMs set
  | 'upstream_timeout'       // 504 — AbortController fired
  | 'model_response_invalid' // 502 — Anthropic returned malformed tool input twice in a row
  | 'persistence_failed'     // 500 — DB transaction failed
  | 'internal'               // 500 — anything else
```

### Status codes used
`200` happy path · `400` validation · `401` auth · `403` RLS · `404` project · `409` idempotency replay · `429` upstream rate-limit (passes `Retry-After`) · `502` upstream invalid · `504` upstream timeout · `500` persistence/internal.

---

## 2 · Database schema

### Migration filename
The brief proposed `0002_planning_matrix_core.sql`, but `0002_autoconfirm.sql` already exists from Phase 2. **Proposed filename: `0003_planning_matrix_core.sql`.** Documented in §12 as an open question — confirm before commit #1.

### Tables — three, all RLS-protected

**`public.projects`** (one row per user-created project)
- `id uuid pk default gen_random_uuid()`
- `owner_id uuid not null references auth.users on delete cascade`
- `intent text not null` — checked enum: `neubau_einfamilienhaus | neubau_mehrfamilienhaus | sanierung | umnutzung | abbruch | sonstige`
- `has_plot boolean not null`
- `plot_address text` (nullable; only when `has_plot=true`)
- `bundesland text not null default 'bayern'`
- `template_id text not null` — checked enum `T-01 | T-02 | T-03 | T-04 | T-05`
- `name text not null` — derived from intent + plot or `Projekt vom <date>`
- `status text not null default 'in_progress'` — checked enum `in_progress | paused | archived | completed`
- `state jsonb not null default '{}'::jsonb` — typed by `src/types/projectState.ts`; *never* written directly, always through `lib/projectStateHelpers.ts`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()` — maintained by trigger
- Index: `(owner_id, updated_at desc)`
- RLS: owner can `select | insert | update | delete`

**`public.messages`** (append-only conversation log)
- `id uuid pk default gen_random_uuid()`
- `project_id uuid not null references public.projects on delete cascade`
- `role text not null` — `user | assistant | system`
- `specialist text` — `moderator | planungsrecht | bauordnungsrecht | sonstige_vorgaben | verfahren | beteiligte | synthesizer` (only on assistant rows)
- `content_de text not null`
- `content_en text` (assistant only; user messages stored in their original language)
- `input_type text` — `text | yesno | single_select | multi_select | address | none` (assistant only)
- `input_options jsonb` (for select types)
- `allow_idk boolean default true`
- `user_answer jsonb` — structured `UserAnswer` shape for user rows
- `client_request_id uuid` — idempotency key on user rows; `null` on assistant
- `model text` (e.g. `claude-sonnet-4-5`)
- `input_tokens int`, `output_tokens int`, `cache_read_tokens int`, `cache_write_tokens int`
- `latency_ms int`
- `created_at timestamptz not null default now()`
- Index: `(project_id, created_at)`
- **Unique partial index** `unique (project_id, client_request_id) where client_request_id is not null` — backs idempotency.
- RLS: caller can `select | insert` only when they own the parent project.

**`public.project_events`** (append-only audit log for state mutations)
- `id uuid pk default gen_random_uuid()`
- `project_id uuid not null references public.projects on delete cascade`
- `event_type text not null` — examples: `fact_added`, `fact_updated`, `qualifier_changed`, `recommendation_upserted`, `recommendation_removed`, `area_state_changed`, `procedure_status_changed`, `document_status_changed`, `role_needed_changed`
- `before_state jsonb`
- `after_state jsonb`
- `reason text`
- `triggered_by text not null` — `user | assistant | system`
- `created_at timestamptz not null default now()`
- Index: `(project_id, created_at desc)`
- RLS: caller can `select | insert` only when they own the parent project.

### Triggers
- `set_updated_at()` plpgsql trigger on `projects.before update for each row` (lifted verbatim from the brief).

### Seed data
None required for v1. Templates are codified in TypeScript / system prompt, not in tables.

### Apply path (mirrors Phase 2 convention)
- File ships in `supabase/migrations/0003_planning_matrix_core.sql`.
- Rutik runs it once via Supabase **SQL Editor**, same process as `0001_profiles.sql` and `0002_autoconfirm.sql`.
- Documented in `SUPABASE_SETUP.md` as a Step-8 addendum + an `ANTHROPIC_API_KEY` secret instruction.

---

## 3 · `ProjectState` shape (TypeScript — JSONB source of truth)

Lifted from §4.2 of the brief, with one clarification noted inline:

```ts
export type Source = 'LEGAL' | 'CLIENT' | 'DESIGNER' | 'AUTHORITY';
export type Quality = 'CALCULATED' | 'VERIFIED' | 'ASSUMED' | 'DECIDED';
export type AreaState = 'ACTIVE' | 'PENDING' | 'VOID';

export interface Qualifier {
  source: Source
  quality: Quality
  setAt: string                                  // ISO
  setBy: 'user' | 'assistant' | 'system'
  reason?: string
}

export interface Fact {
  key: string                                    // e.g. 'plot.area_sqm'
  value: unknown                                 // narrowed in code by key
  qualifier: Qualifier
  evidence?: string
}

export interface Procedure { /* … per brief, lossless */ }
export interface DocumentItem { /* … per brief */ }
export interface Role { /* … per brief */ }
export interface Recommendation { /* … per brief, sorted by rank ascending */ }

export interface Areas {
  A: { state: AreaState; reason?: string }       // Planungsrecht
  B: { state: AreaState; reason?: string }       // Bauordnungsrecht
  C: { state: AreaState; reason?: string }       // Sonstige Vorgaben
}

export interface ProjectState {
  schemaVersion: 1
  templateId: 'T-01' | 'T-02' | 'T-03' | 'T-04' | 'T-05'
  facts: Fact[]
  procedures: Procedure[]
  documents: DocumentItem[]
  roles: Role[]
  recommendations: Recommendation[]
  areas: Areas
  questionsAsked: { fingerprint: string; askedAt: string }[]   // ← brief had string[]; richer shape lets us de-dupe by normalized fingerprint without losing audit timing
  lastTurnAt: string
}
```

All reads/writes flow through `src/lib/projectStateHelpers.ts`. Helpers I plan to expose:
- `applyExtractedFacts(state, deltas) → state`
- `applyRecommendationsDelta(state, deltas) → state`
- `applyProceduresDelta`, `applyDocumentsDelta`, `applyRolesDelta`
- `applyAreasUpdate`
- `appendQuestionAsked(state, message_de) → state`
- `summarizeForSystemBlock(state, locale) → string` (the live block injected into Anthropic call)

Each delta application emits a corresponding `project_events` row inside the same DB transaction.

---

## 4 · Wizard flow (`/projects/new`)

### Visual move
Different from landing's editorial scroll and auth's split-screen. Single full-bleed paper plane. `bg-paper` + a hover-revealed blueprint hairline grid (`.bg-blueprint` already exists in `globals.css`, gated to `radial-gradient` mask under the input).

### Layout (always centered, vertical-rhythm)
- Top-left: `<Wordmark size="sm" asLink />` linking back to `/dashboard`.
- Top-right: `<LanguageSwitcher />` + `<button>Abbrechen</button>` (links to dashboard with confirm).
- Center stack (`max-w-[36rem]`):
  - Eyebrow `Planning Matrix · Initialisierung · 1 / 2`
  - Headline `text-display-3 md:text-display-2` Instrument Serif, with `<span className="text-clay">.</span>` final stop.
  - Sub `text-body-lg text-ink/75`.
  - Spacer · `h-px w-16 bg-clay/55`.
  - Question content (chips / address input / yes-no toggle).
- Bottom-center: `<ProgressDots count={2} active={1|2} />` — two 6px dots, filled = answered, current pulses (`animate-breath-dot`).

### Q1 — `I-01`
- Eyebrow as above.
- Headline `Was möchten Sie bauen?`
- Sub `Wählen Sie die Option, die Ihrem Vorhaben am nächsten kommt.`
- Chips (single-select), `aria-pressed`, keyboard arrows + Enter, hairline-on-paper:
  - Neubau Einfamilienhaus
  - Neubau Mehrfamilienhaus
  - Sanierung
  - Umnutzung
  - Abbruch
  - Sonstiges
- Below chips: small underlined link `Ich bin mir nicht sicher` → inline expansion (`<details>` styled for our register), one short paragraph per option.
- Click → 300ms cross-fade + 8 px y-shift to Q2 (`AnimatePresence mode="wait"`, gated by `useReducedMotion`).

### Q2 — `I-02`
- Eyebrow `Planning Matrix · Initialisierung · 2 / 2`.
- Headline `Haben Sie bereits ein Grundstück?`
- Sub `Wenn ja, geben Sie die Adresse oder die Flurstücksbezeichnung an. Wenn nein, fahren wir mit Annahmen fort.`
- Toggle `Ja` / `Nein` — pill buttons (Inter, ink/paper, hairline border).
- If **Ja**: address input slides in (Inter 16px, hairline-bottom-border, placeholder `z. B. Hauptstraße 12, 91054 Erlangen`). Validation per **D8**: trim, length ≥ 6, contains a digit, *and* contains a comma OR matches `\b\d{5}\b`. Helper text in clay.
- If **Nein**: clay notice → *Hinweis: Ohne Grundstück können wir das Planungsrecht (Bereich A) und sonstige Vorgaben (Bereich C) noch nicht ermitteln. Wir arbeiten zunächst mit Standardannahmen und markieren betroffene Bereiche entsprechend.*
- `Zurück` link below (preserves Q1 answer in `useWizardState`).
- Primary CTA `Projekt anlegen` — disabled until valid, ink/paper, identical chrome to existing `<CtaButton variant="primary">`.

### Submission flow
1. Build `{ intent, has_plot, plot_address, bundesland: 'bayern', template_id }` (`selectTemplate(intent)`).
2. Generate default `name`:
   - Has plot: `intent_de_label · <city extracted from address or first line>`
   - No plot: `intent_de_label · Projekt vom <DD.MM.YYYY>`
3. INSERT into `projects` via `supabase.from('projects').insert(...).select().single()` (RLS guarantees `owner_id = auth.uid()`).
4. Call Edge Function `chat-turn` with `{ projectId, userMessage: null, userAnswer: null, clientRequestId: uuid() }`.
5. **Transition screen** (max 4s with safety timeout): center serif headline *Wir bereiten Ihren Tisch vor.* + hairline horizontal sweep loop (`animate-hairline-draw` keyed) under it; eyebrow `Planning Matrix · Vorbereitung`.
6. On Edge Function success: `navigate(\`/projects/${id}\`, { replace: true })`.
7. On Edge Function failure: still navigate to `/projects/${id}` — chat workspace shows retry affordance (the project already exists in DB).

### Wizard state lives in
- `useWizardState` (Zustand slice scoped to wizard, sessionStorage-persisted under key `pm.wizard.<userId>`). Cleared on submit success or explicit cancel-confirm.

---

## 5 · Chat workspace layout (`/projects/:id`)

### Desktop grid (≥ lg, max-width 1440 px)
```
┌──────────────────────────────────────────────────────────────────────┐
│  280px  │            flexible center · max-w-2xl              │ 360px│
│         │                                                     │      │
│  Left   │            Conversation thread                      │ Right│
│  rail   │                                                     │ rail │
│         │            sticky input bar                         │      │
└──────────────────────────────────────────────────────────────────────┘
```

`grid-template-columns: 280px minmax(0, 1fr) 360px;` Center column padded `pt-20 pb-32`. Sticky input bar lives inside the center column and never visually overlaps the rails.

### Background
Subtle blueprint hairline grid via existing `.bg-blueprint` class on `<main>`, opacity already at 4.5% — meets the brief's "4%" call. Cursor-mask reveal is implemented via a `radial-gradient` mask layer that follows pointer position with a CSS variable updated in a throttled `pointermove` handler.

### Left rail — `Verlauf`
- Header: project `name` (Inter 14 medium, truncate). Below it, optional location subline (Inter 12 clay).
- Hairline divider.
- **Gates list** — vertical, hairline-bordered, 6 px row padding:
  - `00 Übersicht` (active by default)
  - `10 Projekt`
  - `20 Grundstück`
  - `30 Beteiligte`
  - `40 Baurechtliche Einordnung`
    - `41 Planungsrecht`
    - `42 Bauordnungsrecht`
    - `43 Sonstige Vorgaben`
    - `44 Verfahren`
    - `45 Dokumente`
  - `50 Planung`
  - `60 Dokumente`
- Each row leads with a 6 px clay dot (`ACTIVE`), hollow ring (`PENDING`), or faded slash (`VOID`).
- Hover: ink-darken 5%; focus-visible: standard ink ring already in `globals.css`.
- Below: small label `Am Tisch` + auto-detected specialists (last 6 turns), each as `● PLANUNGSRECHT` styled Inter 12, tracking `0.04em`.
- Bottom: `Projekt verlassen` link in Inter 12 clay → `/dashboard`.

### Center — `Gespräch`
- Auto-scroll-to-bottom; pauses if user has scrolled up; new-message indicator pill `Neue Nachricht` appears at the bottom-center of the thread when paused, click to resume.
- **User messages** — right-aligned, `bg-card` (paper-on-paper), hairline border `border-border-strong/40`, rounded `rounded-sm`, padding `px-4 py-3`, Inter 15.
- **Assistant messages** — left-aligned, no card. Specialist tag above:
  - 6 px clay dot (`size-1.5 rounded-full bg-clay`)
  - text `PLANUNGSRECHT` Inter 11 tracking-`[0.16em]` uppercase, `text-clay`
- Body: `text-ink leading-relaxed text-[15px]`. Important phrases / law citations: `font-medium` (already in our font feature set).
- Vertical rhythm: 32 px between message pairs; full-width hairline `bg-border/60` after every 6 turns.
- **Typewriter** — characters appear with mean 18 ms delay, ±10 ms jitter, 100 ms pause at sentence ends. Skippable by clicking anywhere in the message; reduced-motion renders instant.
- **Thinking indicator** — between user submit and assistant reply:
  - Specialist tag appears immediately (auto-detected from last hint or moderator).
  - Below it: thin-clay label `thinking_label_de` (e.g. *Planungsrecht prüft den Bebauungsplan…*) Inter 11 clay.
  - Below label: three 4 px clay dots cycling left-to-right (`animate-travel-dot` already in tailwind config).
  - If response > 6 s: rotate label through 3 alternates (configured per specialist).
  - Reduced-motion: static `denkt nach…` Inter 11 clay; no dot animation.

### Input bar (sticky bottom, in-column)
- Adapts to assistant's last `input_type`:
  - `text` — single-line growing textarea (max 5 rows), Inter 15, hairline-bottom-border, placeholder from server, `Enter` submits, `Shift+Enter` newline.
  - `yesno` — `Ja` / `Nein` pills.
  - `single_select` — chip row.
  - `multi_select` — chips toggle, `Weiter` primary submit (≥ 1 required).
  - `address` — same as text + validation.
  - `none` — replaced by `Weiter` primary CTA.
- `Weiß ich nicht` link to the right of every input when `allow_idk: true`. Click → popover with three options:
  - *Recherche durchführen lassen*  /  *Als Annahme markieren*  /  *Zurückstellen*
  Each row: bold Inter 13 + 1-line clay explanation. Clicking submits the corresponding `idk` user-answer payload. Focus-trapped while open; `Esc` closes; restores focus on close.
- Disabled while assistant is thinking; on 429 from upstream, shows countdown `Zu viele Anfragen — neuer Versuch in {{seconds}} s.` and auto-retries when zero.

### Right rail — `Was wir wissen`
- Top: `Top 3 Schritte` (Inter 11 eyebrow). Three cards (or fewer if < 3): title Instrument Serif 18, detail Inter 13. Cards animate in (16 px y-rise + opacity 300 ms calm); rank changes animate via `layout` prop on Framer Motion `m.li`. Removed entries fade out 200 ms.
- Each card carries a footer line:
  > *Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in.*
  Inter 11 clay. Non-removable. Brief §6.5.
- Middle: `Bereiche` — three rows A/B/C with state dot, label, hover-tooltip showing `reason`.
- `Eckdaten` — top ~5 facts (intent, plot, Gebäudeklasse, Verfahren, primary deadline). Each shows value + qualifier badge `LEGAL · CALCULATED` in 10 px clay.
- Collapsible sections: `Verfahren`, `Dokumente`, `Fachplaner` — click to expand, hairline-bordered list.
- Bottom-left: small link `Vollständige Übersicht öffnen` → `/projects/:id/overview` (full-screen modal route).
- Bottom-right: `<CostTicker />` (admin allowlist; see §12 open question).

### Mobile (< lg)
- Center column edge-to-edge.
- Top bar: hamburger (left) + project name (truncate) + right-rail icon (right).
- Left and right rails open as `vaul` drawers from edges.
- Right rail also peeks 60 px (4 s) when a new recommendation arrives, then retracts. Reduced-motion: tiny clay badge in the right-rail icon instead.
- Sticky input bar respects `env(safe-area-inset-bottom)`.

### Empty state (project just created, before first assistant message)
- Center placeholder: eyebrow `Planning Matrix`; headline (serif) `Das Team versammelt sich.`; body (Inter) `Einen Moment, bitte.`. Below: hairline horizontal sweep loop (~2.4 s).
- If first turn fails after wizard: replace with `Wir konnten das Team nicht erreichen.` + primary `Erneut versuchen`.

### Returning to a project
- Fetch project + messages via TanStack Query.
- Render messages instantly, no typewriter, no thinking indicator.
- Render right rail from `state`.
- Input bar matches the *last assistant message's* `input_type`.

---

## 6 · Specialist persona system

### Tags (locked)
| Persona | UI tag (DE = EN) | Voice signature |
|---|---|---|
| `moderator` | `MODERATOR` | Begrüßt, fasst zusammen, leitet Übergaben ein. Calm, no domain claims. |
| `planungsrecht` | `PLANUNGSRECHT` | BauGB §§ 30 / 34 / 35, BauNVO. *"Darf hier überhaupt gebaut werden?"* |
| `bauordnungsrecht` | `BAUORDNUNGSRECHT` | BayBO. Gebäudeklasse, Verfahren, Brandschutz, Stellplätze, GEG. *"Welches Verfahren ist nötig?"* |
| `sonstige_vorgaben` | `SONSTIGE VORGABEN` | Baulasten, Denkmalschutz, kommunale Satzungen, Sondergenehmigungen. *"Was sonst noch?"* |
| `verfahren` | `VERFAHREN` | Synthesizer of A/B/C into procedure + document recommendation. |
| `beteiligte` | `BETEILIGTE` | Role-needs analyst — Tragwerksplaner, Brandschutz, Energieberater, Vermesser. |
| `synthesizer` | `SYNTHESIZER` | Cross-cutting Top-3 producer. |

### Auto-detection of "Am Tisch"
We compute `currentTable` from the last 6 specialist tags in the thread, deduplicating, ordered by recency. The moderator is always present unless the thread has not yet started.

### Style note
The visual treatment never adds a portrait, an avatar, or an initials chip. **Status is a dot.** If the user has trouble distinguishing personas, we can fall back to a tooltip on the tag — but no portraits.

---

## 7 · System prompt (DE) — full draft

This is the most important asset in Phase 3. It lives in `supabase/functions/chat-turn/systemPrompt.ts` as the constant `PERSONA_BLOCK_V1`. It's the **first** entry in the `system` array sent to Anthropic, and it carries `cache_control: { type: 'ephemeral' }`. The **second** block is the per-turn live-state summary (no cache).

Length target: ~3–4k tokens (well above the 1024-token cache minimum, well below any practical limit).

```
Sie sind das Planungsteam von Planning Matrix — keine einzelne KI, sondern ein Roundtable
spezialisierter Fachpersonen, die einem Bauherrn beim Verständnis seines deutschen
Baugenehmigungsprozesses helfen. In jeder Antwort spricht eine Fachperson — die, deren Domäne
in diesem Moment am relevantesten ist. Sie sind das Team, nicht ein Werkzeug.

══════════════════════════════════════════════════════════════════════════
DIE FACHPERSONEN
══════════════════════════════════════════════════════════════════════════

• MODERATOR
  Hält das Gespräch zusammen, fasst zusammen, leitet Übergaben ein, begrüßt zu Beginn.
  Verzichtet auf eigene fachliche Bewertungen.

• PLANUNGSRECHT
  Zuständig für BauGB §§ 30 / 34 / 35, BauNVO, Bebauungsplan, Flächennutzungsplan.
  Leitfrage: „Darf hier überhaupt gebaut werden?"

• BAUORDNUNGSRECHT
  Zuständig für die Bayerische Bauordnung (BayBO). Gebäudeklasse (Art. 2 Abs. 3),
  Verfahrensart (Art. 57 / 58 / 59), Abstandsflächen (Art. 6), Stellplatzpflicht (Art. 47),
  Brandschutz, GEG-Konformität, PV-Pflicht (Art. 44a BayBO seit 1. 1. 2025).
  Leitfrage: „Welches Verfahren ist nötig, und welche Anforderungen folgen daraus?"

• SONSTIGE_VORGABEN
  Zuständig für Baulasten, Denkmalschutz (BayDSchG), kommunale Satzungen,
  Stellplatzsatzungen, nutzungsbedingte Sondergenehmigungen, Naturschutzrecht.
  Leitfrage: „Was sonst noch zu beachten ist."

• VERFAHREN
  Synthese der drei Domänen zu einer einheitlichen Verfahrens- und Dokumenten­empfehlung.

• BETEILIGTE
  Leitet aus Verfahren und Gebäudeklasse die nötigen Fachplaner ab — Tragwerks­planer:in,
  Brandschutz, Energieberatung (GEG), Vermessung, Bauvorlage­berechtigte:r.

• SYNTHESIZER
  Erkennt projektübergreifende Muster, hält die Top-3-Handlungsempfehlungen aktuell.

══════════════════════════════════════════════════════════════════════════
GRUNDREGELN
══════════════════════════════════════════════════════════════════════════

1. Anrede: ausschließlich „Sie / Ihre / Ihnen". Niemals „du", niemals Vornamen.

2. Eine Fachperson pro Antwort. Wechsel sind erlaubt und gewünscht — aber niemals abrupt.
   Wechselt eine Fachperson, übergibt der MODERATOR (oder die scheidende Fachperson)
   ausdrücklich: „An dieser Stelle übernimmt das Bauordnungsrecht."

3. Kürze, Ruhe, Präzision. 2–6 Sätze, Sätze 12–22 Wörter, Verb an zweiter Stelle.
   Keine Ausrufezeichen. Keine rhetorischen Fragen. Keine Emojis. Keine Marketing-Verben
   („revolutionieren", „begeistern"). Keine Coaching-Sprache („Lassen Sie uns…").
   Keine englischen Lehnwörter, wenn ein deutscher Begriff existiert.

4. Zitieren Sie Normen präzise und integriert: „§ 34 BauGB", „Art. 57 BayBO",
   „§§ 30 ff. BauGB". Verwenden Sie das Paragraphenzeichen mit geschütztem Leerzeichen.
   Nie paraphrasieren ohne Zitat.

5. Stellen Sie am Ende jeder Antwort genau eine Frage oder benennen Sie genau einen
   nächsten Schritt. Niemals zwei offene Fragen gleichzeitig.

6. Hedge-Vokabular für Unsicherheit: „nach derzeitiger Rechtslage", „in der Regel",
   „vorbehaltlich der Prüfung durch die Genehmigungsbehörde". Niemals „ich glaube",
   „vielleicht", „eventuell".

7. Wenn der Bauherr „Weiß ich nicht" antwortet, schlagen Sie einen Umgang vor:
     a) Recherche  — „Ich kann den Bebauungsplan für diese Adresse prüfen, soweit er
        öffentlich zugänglich ist. Eine verbindliche Auskunft erteilt jedoch nur die
        Gemeinde."
     b) Annahme    — „Wir gehen vorerst von einer typischen Wohnnutzung aus und
        verifizieren das später. Die Annahme wird im Datensatz markiert."
     c) Zurückstellen — „Wir parken diese Frage. Sie blockiert nichts Wesentliches."

8. EHRLICHKEITSPFLICHT: Sie haben **keinen** Zugriff auf Echtzeitdaten — keinen Live-
   Bebauungsplan, kein Liegenschafts­kataster, keine Behörden-API. Wenn ein Wert nur
   live geprüft werden könnte, sagen Sie das offen: „Eine Live-Prüfung ist hier nicht
   möglich. Wir gehen vorerst von [X] aus und markieren dies als Annahme." Erfinden
   Sie niemals B-Plan-Festsetzungen oder Aktenzeichen.

9. RECHTLICHER RAHMEN: Sie schreiben dem Bauherrn nichts vor, was rechtlich verbindlich
   nur ein:e bauvorlageberechtigte:r Architekt:in (oder eingetragene:r Bauingenieur:in
   nach Art. 61 BayBO) freigeben kann. Markieren Sie offen: „Diese Einschätzung ist
   vorläufig und wird beim Eintritt einer/eines bauvorlage­berechtigten Architekt:in
   formell bestätigt." Diese Formulierung ist keine Floskel, sondern Teil der Rechts-
   architektur unseres Produkts.

10. Sie sprechen nie davon, dass Sie eine KI sind. Sie sind das Planungsteam.
    Formulierungen wie „Als KI…", „Ich bin ein Sprachmodell…", „Mein Trainings­datenstand…"
    sind ausgeschlossen.

══════════════════════════════════════════════════════════════════════════
QUALIFIER-DISZIPLIN
══════════════════════════════════════════════════════════════════════════

Jeder Fakt, den Sie aus der Konversation extrahieren, erhält Source × Quality:

  Source:  LEGAL     (aus Gesetz/Verordnung abgeleitet)
           CLIENT    (vom Bauherrn)
           DESIGNER  (vom Architekten — in v1 nicht vorhanden, daher selten)
           AUTHORITY (vom Amt — in v1 nicht vorhanden, daher selten)

  Quality: CALCULATED  (rechnerisch zwingend abgeleitet)
           VERIFIED    (durch belastbare Quelle bestätigt)
           ASSUMED     (Annahme ohne Beleg)
           DECIDED     (Bauherr hat sich festgelegt)

Senken Sie die Qualität ehrlich: äußert der Bauherr eine Annahme, ist das CLIENT/ASSUMED,
nicht CLIENT/DECIDED. Markieren Sie immer den Grund.

══════════════════════════════════════════════════════════════════════════
BEREICHE A · B · C
══════════════════════════════════════════════════════════════════════════

Drei Rechtsbereiche werden parallel bewertet:

  A — Planungsrecht        (BauGB §§ 30 / 34 / 35, BauNVO)
  B — Bauordnungsrecht     (BayBO)
  C — Sonstige Vorgaben    (Baulasten, Denkmal, kommunal, Naturschutz)

Status:
  ACTIVE  — In Arbeit, ausreichend Daten vorhanden.
  PENDING — Wartet auf Eingabe.
  VOID    — Nicht ermittelbar — typischerweise wenn kein Grundstück bekannt ist.

══════════════════════════════════════════════════════════════════════════
EMPFEHLUNGEN (Top-3)
══════════════════════════════════════════════════════════════════════════

Halten Sie immer eine Liste der Top-3 nächsten Handlungsschritte aktuell. Sie erscheinen
in der rechten Spalte beim Bauherrn. Sie sind kurz, konkret, ausführbar, und stets mit
Adressbezug, wenn ein Grundstück bekannt ist.

Beispiel — gut:
  1. Bebauungsplan beim Bauamt Erlangen anfordern (Adresse Hauptstraße 12).
  2. Tragwerksplaner für Einreichplanung kontaktieren.
  3. Stellplatzbedarf nach Erlanger Stellplatzsatzung verifizieren.

Beispiel — schlecht:
  1. Informieren Sie sich über das Baurecht.
  2. Holen Sie sich Beratung.
  3. Beginnen Sie mit der Planung.

Jede Empfehlung trägt am Fuß den Hinweis (im UI gerendert, nicht im Empfehlungs­text):
„Vorläufig — bestätigt durch eine/n bauvorlage­berechtigte/n Architekt/in."

══════════════════════════════════════════════════════════════════════════
TEMPLATE — T-01 NEUBAU EINFAMILIENHAUS BAYERN
══════════════════════════════════════════════════════════════════════════

Typischer Pfad:

  • Gebäudeklasse: in der Regel GK 1 (freistehend, ≤ 7 m, ≤ 2 NE, ≤ 400 m² BGF).
  • Verfahrensart:
      – Genehmigungsfreistellung (Art. 57 BayBO), wenn:
          (i)   qualifizierter B-Plan nach § 30 Abs. 1 BauGB,
          (ii)  Vorhaben entspricht Festsetzungen,
          (iii) Erschließung gesichert,
          (iv)  Gemeinde verlangt nicht binnen einem Monat das Verfahren nach Art. 58.
      – Sonst vereinfachtes Verfahren (Art. 58 BayBO).
      – Innenbereich ohne B-Plan: § 34 BauGB-Prüfung; Verfahren regelmäßig Art. 58.
      – Außenbereich: regelmäßig unzulässig nach § 35 Abs. 2 BauGB.
  • Pflichtdokumente:
      Lageplan (amtlich, ÖbVI), Bauzeichnungen 1:100, Baubeschreibung,
      Standsicherheitsnachweis, Brandschutznachweis (bei GK 1–3 vom Entwurfsverfasser),
      Wärmeschutznachweis nach GEG 2024, Stellplatznachweis, Entwässerungsplan.
  • Pflicht-Fachplaner:
      Tragwerksplaner:in, Vermessungsingenieur:in (ÖbVI),
      Bauvorlage­berechtigte:r Entwurfsverfasser:in.
  • Aufmerksamkeitspunkte (Bayern-spezifisch):
      Abstandsflächen 0,4 H min. 3 m (Art. 6 BayBO seit 2021).
      Stellplätze nach kommunaler Satzung — Bandbreite 1–2 Stp/WE.
      PV-Pflicht für Wohnneubauten (Art. 44a BayBO seit 1. 1. 2025).
      Denkmalumgebung (Art. 6 BayDSchG) — bei sensiblem Bestand prüfen.
      „Bauturbo" § 246e BauGB — relevante neue Befreiungsgrundlage.

Bei den Templates T-02 bis T-05 gehen Sie analog vor, mit folgenden Anpassungen, die
Sie im Gespräch klar markieren:
  T-02 Mehrfamilienhaus  — Gebäudeklasse meist GK 3/4, Brandschutz aufwändiger,
                            Stellplatzbedarf höher, GEG-Anforderungen strenger.
  T-03 Sanierung         — Bestandsschutz, Denkmal, GEG-Sanierungspflichten,
                            ggf. nur Anzeigepflicht.
  T-04 Umnutzung         — § 34/35 BauGB-Prüfung der neuen Nutzung, Stellplatz-Neu-
                            berechnung, Brandschutz-Neukonzept.
  T-05 Abbruch           — Anzeigepflicht (Art. 57 Abs. 5 BayBO), Denkmalprüfung,
                            ggf. UVP-Vorprüfung.

══════════════════════════════════════════════════════════════════════════
ANTWORTFORMAT
══════════════════════════════════════════════════════════════════════════

Sie antworten ausschließlich, indem Sie das Werkzeug `respond` aufrufen. Schreiben Sie
keinen Freitext außerhalb des Werkzeugs.

Felder von `respond`:
  • specialist            — wer spricht in dieser Antwort
  • message_de            — die Antwort in formellem Deutsch (Sie), 2–6 Sätze
  • message_en            — eine englische Spiegelung, gleicher Inhalt
  • input_type            — was der Bauherr als Nächstes eingibt
  • input_options         — bei Auswahltypen
  • allow_idk             — true, wenn „Weiß ich nicht" eine sinnvolle Option ist
  • thinking_label_de/en  — kurzes Etikett, das während der nächsten Berechnung erscheint
  • extracted_facts       — neue oder aktualisierte Fakten mit Source × Quality
  • recommendations_delta — Upserts/Removes der Top-3-Empfehlungen
  • procedures_delta      — Updates an Verfahren
  • documents_delta       — Updates an Dokumenten
  • roles_delta           — Updates an Fachplaner-Rollen
  • areas_update          — Statusänderungen für A/B/C
  • completion_signal     — continue | needs_designer | ready_for_review | blocked

DEDUPLIKATION

Stellen Sie keine Frage, die in `questionsAsked` (im PROJEKTKONTEXT) bereits enthalten
ist. Falls eine bestehende Antwort unklar ist, formulieren Sie die Folgefrage so, dass
sie inhaltlich neu ist (z. B. konkretisierend, nicht wiederholend).

══════════════════════════════════════════════════════════════════════════
PROJEKTKONTEXT
══════════════════════════════════════════════════════════════════════════

[Block 2 — wird zur Laufzeit eingespeist; nicht gecacht.]
```

### Block 2 — live state (uncached, ~200–500 tokens)
Generated by `summarizeForSystemBlock(state, 'de')`. Compact format:

```
templateId: T-01
intent: neubau_einfamilienhaus
plot: { hasPlot: true, address: "Hauptstraße 12, 91054 Erlangen" }
areas: { A: ACTIVE, B: ACTIVE, C: ACTIVE }
facts (5 most recent):
  • plot.address = "Hauptstraße 12, 91054 Erlangen"  [CLIENT/DECIDED]
  • plot.bundesland = "bayern"                        [CLIENT/DECIDED]
  • building.gebaeudeklasse = 1                       [LEGAL/CALCULATED, gemäß Art. 2 BayBO]
  …
recommendations (current top-3):
  1. Bebauungsplan beim Bauamt Erlangen anfordern.
  2. Tragwerksplaner für Einreichplanung kontaktieren.
  3. Stellplatzsatzung Erlangen prüfen.
questionsAsked (last 6 fingerprints):
  • plot:has_plot
  • plot:address
  • building:abriss_vorhanden
  …
last user input: "Ja, ein Abriss ist nicht geplant."
last specialist: planungsrecht
```

---

## 8 · Tool schema (`respond`) — TypeScript + Zod source of truth

Lifted from §4.4 of the brief, plus minor refinements:

- `client_request_id` is **not** a tool field — it's at the request envelope level.
- `extracted_facts[].value` is `unknown`; the helper layer narrows by `key`.
- `procedures_delta`, `documents_delta`, `roles_delta` are typed as `Array<{ op: 'upsert'|'remove'; ... }>` rather than `Array<object>` — proposed refinement; flagged in §12 for confirmation.
- `completion_signal` enum unchanged.

The tool definition lives in `supabase/functions/chat-turn/toolSchema.ts`. The Zod schema lives at `src/types/respondTool.ts` and is imported by the Edge Function for validation. Edge Function flow on validation failure:

1. First failure → re-call Anthropic once with an additional system note: *"Ihre vorherige Antwort enthielt ungültige Felder ([details]). Bitte rufen Sie das Werkzeug `respond` mit den korrekten Feldern erneut auf."*
2. Second failure → return `{ ok: false, error: { code: 'model_response_invalid' } }`. SPA shows manual retry button on the failed user message.

---

## 9 · State management plan

### Zustand
- `useAuthStore` — already exists. Untouched.
- `useWizardState` — `{ step: 1|2, intent | null, hasPlot | null, plotAddress | '', setStep, setIntent, setPlot, reset }`. Persisted to `sessionStorage` keyed by user id.
- `useChatStore` — `{ activeProjectId, isAssistantThinking, currentSpecialist, currentThinkingLabel, retryQueue, setThinking, enqueueRetry, dequeueRetry }`. **Not** persisted. Conversation messages are NOT in zustand — they live in TanStack Query cache.
- `useProjectStore` — slim. Just exposes a setter that hydrates from query results.

### TanStack Query keys
- `['project', projectId]` → row from `projects`. `staleTime: 60_000`, `refetchOnWindowFocus: false`.
- `['messages', projectId]` → array from `messages` ordered by `created_at`. `staleTime: 60_000`.
- Mutation `useChatTurn(projectId)` —
  - **onMutate**: append a placeholder user message + thinking flag.
  - **mutationFn**: `chatApi.postChatTurn(...)`.
  - **onSuccess**: replace placeholder with persisted user message; append assistant message; setQueryData on `['project', projectId]` with new state.
  - **onError**: keep placeholder, attach `retry()` handler.
  - **retry**: 0 (we own retries explicitly via the UI).

### Optimistic update lifecycle
1. Generate `clientRequestId`.
2. `onMutate` — push `{ id: 'pending-' + clientRequestId, status: 'pending', … }` into messages cache. Set `isAssistantThinking = true`.
3. POST to Edge Function.
4. `onSuccess` — splice the pending placeholder out, push the canonical user row + assistant row. Refresh project state. Set `isAssistantThinking = false`. Update last `input_type`.
5. `onError` — keep placeholder with `status: 'error'`. Mount an `Erneut senden` link below the message. Click → re-run mutation with the same `clientRequestId` (idempotent).

### Hydration on `/projects/:id` mount
- `useQuery(['project', id])` and `useQuery(['messages', id])` in parallel.
- If `messages.length === 0`: prime first turn now (rare — only if wizard's Edge Function call failed but the project insert succeeded).
- Else: render history; set input bar from last assistant message.

---

## 10 · Edge case checklist

The brief lists 43 explicit cases (§12). All are inherited verbatim. The few I'd flag as deserving extra attention or where the implementation is non-obvious:

- **#11 Pasted long message** — trim to 4000 chars on the **client**, show inline notice. The Edge Function also enforces 4000 to be safe (server-side guard).
- **#15 Idempotent retry** — covered by `client_request_id` + unique partial index on `messages`. The SPA reuses the same UUID on retry; the Edge Function detects via `ON CONFLICT DO NOTHING RETURNING …` and short-circuits to the previously persisted assistant reply.
- **#16 Malformed tool call** — single auto-retry with a stricter system reminder (see §8). Two failures → user-visible retry button.
- **#23 Returning to a project** — no typewriter on history, no thinking indicator. We tag historic messages with `meta.history: true` in the local cache so `<MessageAssistant>` can branch on it.
- **#24 Two browser tabs same project** — last write wins. We rely on `updated_at` as a soft sync signal; on focus-refetch the SPA re-pulls messages and project. Real-time sync deferred to v1.1.
- **#34 Offline queue** — we use `navigator.onLine` + `online`/`offline` events. Queued mutations live in a small `useChatStore.retryQueue` array; on `online` we flush in order (deferring further retries to the standard mutation path).
- **#35 No-plot path** — `Areas.A` and `Areas.C` are seeded `VOID` at first turn; the moderator opens with an explicit acknowledgement. The system prompt's HONESTY rule (§7 rule 8) is doing the heavy lifting here.
- **#37 Cost ticker** — admin allowlist (see §12 open question). Hidden for non-admin users entirely.
- **#39 RLS** — verified by manual test (sign in as a second account, hit `/projects/<id>` for the first user's project, expect calm 404). Also verified at the SQL level via the policies above.
- **#42 Wizard → chat handoff** — the transition screen owns the visual continuity. We do not unmount the transition until the project route has fetched the first message (or 4s timeout, whichever first).

I'd also flag **two cases the brief implies but doesn't enumerate**:
- **A11y for the typewriter** — assistive tech announcement: render the full text in a visually-hidden `<span>` and run the typewriter visually only. Reduced-motion path already does this naturally.
- **Sign-out clears the chat cache** — already true via `useAuth.signOut` calling `queryClient.clear()`. Confirmed in `src/hooks/useAuth.ts`.

---

## 11 · File / folder structure

The brief's tree (§14) is adopted verbatim, with three small additions:

```
supabase/
├── config.toml                         (new — at minimum [functions.chat-turn].verify_jwt = true)
├── .env.example                        (new — ANTHROPIC_API_KEY=...)
└── functions/chat-turn/
    ├── index.ts
    ├── systemPrompt.ts                 (PERSONA_BLOCK_V1 + buildLiveStateBlock())
    ├── toolSchema.ts                   (the tool definition; mirrored by src/types/respondTool.ts)
    ├── persistence.ts                  (DB ops: load context, persist user+assistant, emit events)
    ├── cors.ts                         (origin allowlist + preflight)
    ├── anthropic.ts                    (SDK wrapper with AbortController + cost calc)
    ├── deno.json                       (import map)
    └── _tests/                         (deno test files — out of v1 unless we have time)

src/
├── features/wizard/...                 (per brief §14)
├── features/chat/...                   (per brief §14)
├── features/dashboard/
│   ├── DashboardPage.tsx               (replaces DashboardPlaceholder.tsx — new project list + CTA)
│   └── components/ProjectCard.tsx      (single-row card)
├── lib/chatApi.ts
├── lib/projectStateHelpers.ts
├── lib/cn-feature-flags.ts             (admin allowlist for cost ticker — see §12)
├── stores/chatStore.ts
├── stores/projectStore.ts
├── stores/wizardStore.ts
├── types/projectState.ts
├── types/respondTool.ts
└── components/shared/ProjectGuard.tsx
```

`DashboardPlaceholder.tsx` becomes `DashboardPage.tsx` — content shifts from "coming soon" to a thin project list above a `Neues Projekt` primary CTA. New users see the empty state copy + CTA only. Confirmed in **D2**.

### `docs/` additions (commit #30 territory, per A + B)

```
docs/
├── phase3-plan.md             (this file, moved from repo root in #30)
├── phase3-decisions.md        (D1–D12 companion — one ## heading per decision,
│                                3-line body: question, answer, reasoning)
├── phase3-test-plan.md        (manual test plan from brief §16 + the 3 rows in §14)
└── phase3-out-of-scope.md     (mirror of brief §18)
```

---

## 12 · Commit sequence (small, reviewable, conventional)

I plan to ship in 30 commits in this order. (Brief §15 had 30 commits in the same general order; my sequence is identical except for the migration filename and one re-ordering.)

1. `feat(db): add projects, messages, project_events tables with RLS` — migration `0003_planning_matrix_core.sql`.
2. `feat(types): add ProjectState and respond tool schemas`
3. `feat(edge): scaffold chat-turn function with JWT verification and CORS`
4. `feat(edge): add Anthropic system prompt and tool schema`
5. `feat(edge): wire Anthropic call with cache and tool-forced response`
6. `feat(edge): persist messages and project_state mutations`
7. `feat(edge): error handling, retries, idempotency keys`
8. `feat(wizard): scaffold /projects/new with shell and progress dots`
9. `feat(wizard): question 1 (intent) with options + unsure helper`
10. `feat(wizard): question 2 (plot) with conditional address`
11. `feat(wizard): submission flow → project insert → first-turn priming → route`
12. `feat(wizard): edge cases (refresh, cancel, network failures)`
13. `feat(chat): three-zone workspace shell with blueprint background`
14. `feat(chat): left rail with gates and specialists at the table`
15. `feat(chat): thread with user and assistant message components`
16. `feat(chat): typewriter and thinking indicator`
17. `feat(chat): input bar with adaptive controls (text/yesno/select/multi/address)`
18. `feat(chat): IDK popover with research/assume/skip branches`
19. `feat(chat): right rail Top-3 with reactive transitions`
20. `feat(chat): right rail areas, eckdaten, procedures, documents, roles panels`
21. `feat(chat): completion interstitials (needs_designer, ready_for_review, blocked)`
22. `feat(chat): full overview modal at /projects/:id/overview`
23. `feat(chat): banners (offline, retry, network lost)`
24. `feat(chat): cost ticker (admin allowlist)`
25. `feat(chat): mobile drawers via vaul`
26. `feat(i18n): add wizard and chat namespaces (DE + EN)`
27. `feat(dashboard): replace placeholder with project list and Neues Projekt CTA`
28. `feat(chat): page titles, OG tags, ProjectGuard`
29. `feat(chat): typewriter respects reduced-motion + a11y polish`
30. `chore(docs): phase 3 archive — plan, decisions, test plan, out-of-scope, README + SUPABASE_SETUP updates` — moves `PLAN.md` → `docs/phase3-plan.md`, creates `docs/phase3-decisions.md` (per **A + B**), `docs/phase3-test-plan.md`, `docs/phase3-out-of-scope.md`, and updates `README.md` + `SUPABASE_SETUP.md` for the Edge Function workflow + `ANTHROPIC_API_KEY` secret.

---

## 13 · Confirmed decisions (locked 2026-04-27)

All twelve open questions resolved by Rutik. Captured here as the canonical record — supersedes anything in the brief that conflicts.

**D1 · Migration filename.** `supabase/migrations/0003_planning_matrix_core.sql`. (Brief said `0002_…` but `0002_autoconfirm.sql` is taken from Phase 2.)

**D2 · Dashboard scope.** Build the real dashboard. `DashboardPlaceholder.tsx` is replaced by `DashboardPage.tsx`:
- `Neues Projekt` primary CTA → `/projects/new`
- Project list, newest first, each row navigates to `/projects/:id`. Each row shows: name (Inter 14, truncate), location subline (Inter 12 clay), status dot (clay = `in_progress`, hollow ring = `paused`, faded slash = `archived`, ink-filled = `completed`), last-updated relative time (Inter 12 clay-soft, e.g. *vor 3 Stunden*).
- Empty state for first-time users: same copy spirit as the existing placeholder, plus the CTA. No "coming soon" copy.
- **No** filtering, search, or sort controls in v1. Order is `updated_at desc`.

**D3 · Cost-ticker admin allowlist.** Both emails in `src/lib/cn-feature-flags.ts`:
```ts
// TODO(phase-4): replace with role check when admin role lands.
export const ADMIN_EMAILS = [
  'erolerutik9@gmail.com',     // Rutik — active dashboard account
  'vibecoders786@gmail.com',   // Rutik — secondary working account
] as const
```

**D4 · Model.** `claude-sonnet-4-5` (locked for v1). Leave `// TODO(model-upgrade): evaluate claude-sonnet-4-6 in Phase 3.5 — same pricing, reportedly stronger reasoning` next to the `MODEL` constant. No upgrade ships in this phase — the eval comes after we have real transcripts to A/B against.

**D5 · `*_delta` strictness.** Discriminated unions: `{ op: 'upsert', id, …fields }` | `{ op: 'remove', id }`. Tool schema spelled out explicitly. Edge-function Zod validation is **strict**, not lenient — refuse loose objects.

**D6 · `questionsAsked` shape.** `{ fingerprint: string; askedAt: string }[]`. `appendQuestionAsked(state, message_de)` deduplicates on `fingerprint` (last-write-wins on `askedAt`).

**D7 · First-turn priming retry — tightened.** **One** silent auto-retry at 1.5 s. If that fails, surface the manual `Erneut versuchen` CTA — never two silent retries (hides too much when the network is genuinely down). At ≥ 10 s of failure (counting the auto-retry), the empty state expands to:
> Eyebrow `Planning Matrix · Verbindung` · serif `Wir konnten das Team nicht erreichen.` · body (Inter, ink/75) `Sie können dieses Projekt jetzt verlassen — es ist gespeichert. Wir versuchen die Verbindung erneut, wenn Sie zurückkommen.` · primary `Erneut versuchen` + ghost `Zum Dashboard`.

**D8 · Address validation.** Free-text, no geocoding, no autocomplete, no Maps embed. Validation: trim & `length ≥ 6` AND `/\d/` AND (`/,/` OR matches `\b\d{5}\b` German-postcode pattern). Bayern postcodes start with 8 or 9 — the model can use that as a sanity signal in its grounding (the system prompt will note this).

**D9 · Email verification.** `0002_autoconfirm.sql` stays in place for v1. Custom SMTP is deferred to a separate Phase 3.1 slice after chat ships. Auth concerns do not bleed into this phase.

**D10 · Idempotency uniqueness.** `UNIQUE (project_id, client_request_id) WHERE client_request_id IS NOT NULL`. RLS handles cross-tenant.

**D11 · OG tags.** Static (existing landing OG). Project pages are private behind auth, so social cards never render them, and dynamic project names could leak titles into history / share-to-X flows. **Document `<title>` updates dynamically** to `<project name> · Planning Matrix` — that's enough.

**D12 · "Sonstiges" notice.** Yes — render as a calm in-thread **system row**, distinct visual register from assistant messages:
- Tag: `SYSTEM` (Inter 11 tracking-`[0.16em]` uppercase, `text-clay`, no leading dot — different from specialist tags)
- Body: hairline-bordered (`border-y border-border-strong/40`, no fill), padded `py-3`, Inter 13 clay
- Copy (DE): *Sie haben „Sonstiges" gewählt. Wir arbeiten zunächst mit dem Standard-Template für Einfamilienhaus und passen das im Gespräch an.*
- Mirrored EN copy in `chat.system.fallbackTemplateNotice`.
- This requires a new component `MessageSystem.tsx` alongside `MessageUser` / `MessageAssistant`. Folder structure §11 updated.

**D13 · DEV-mode cache-write logging (added 2026-04-27 mid-batch).** In the wizard's submission flow (commit #11), when chat-turn is called with `userMessage: null` for first-turn priming, log `costInfo.cacheWriteTokens` (and the full `costInfo` object) to `console.info` gated behind `import.meta.env.DEV`. Lets Rutik verify cache writes are happening from the live UI without parsing Edge Function logs in the dashboard. Implementation note: the log fires inside `useCreateProject` after the chat-turn POST returns, before navigation. A second turn within 5 min should show `cacheWriteTokens: 0` and `cacheReadTokens > 0` — the verification pattern.

### Side-effects on earlier sections of this plan
- §4 (Wizard Q2) — address validation reads as in **D8**.
- §5 (Chat workspace) — thread renders three message types now (`user`, `assistant`, `system`); `MessageSystem` shipped in commit #15.
- §9 (State management) — `useChatTurn` `onError` after the first auto-retry surfaces the manual CTA; chat workspace empty-state branches at the 10 s mark per **D7**.
- §11 (File / folder) — add `src/features/chat/components/Thread/MessageSystem.tsx`, plus the `DashboardPage.tsx` + `ProjectCard.tsx` already in the tree.

---

## 14 · Manual test plan

The brief's 30-step plan (§16) is adopted verbatim and will live in `docs/phase3-test-plan.md` (committed in #30). I'll add three rows to it from the edge cases I identified that aren't currently covered:
- **#31** — A11y: VoiceOver on macOS reads the full assistant message text (not the typewriter mid-state).
- **#32** — `meta` tags on `/projects/:id` reflect project name (verify via browser tab + `view-source:`).
- **#33** — Sign-out from chat clears TanStack Query cache (no stale messages flash on next sign-in).

---

## 15 · Guardrails (carried forward)

- I will not run any database migration against your live Supabase project — every migration ships as a SQL file you apply manually via the Supabase SQL Editor (same pattern as 0001 / 0002).
- I will not add `ANTHROPIC_API_KEY` to the repo or to any client-visible env file. It's a secret you set once via `supabase secrets set ANTHROPIC_API_KEY=…`.
- I will not change any Phase 1 / Phase 2 page, copy, or visual unless **D2** explicitly requires it (the dashboard, which is replaced).
- `PLAN.md` stays at the repo root through commits #1–29 and moves to `docs/phase3-plan.md` in #30 per **A**. `docs/phase3-decisions.md` ships alongside it per **B**.
- Manual test plan + out-of-scope doc also ship in #30.

— End of PLAN.md.
