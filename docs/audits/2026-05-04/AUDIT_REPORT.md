# Planning Matrix — Audit Report
> Date: 2026-05-04
> Auditor: Claude Code (ultrathink mode)
> Repo SHA: `4ac43331f3e0d821c9a9c7ec1267a0509029e09f`
> Authoritative refs: **NOT FOUND IN REPO** — `PLANNING_MATRIX_MASTER_DOC.md` and `PHASE_3_PROMPT.md` do not exist at the repo root. The audit prompt itself was used as the spec, plus inline doc-comments and the existing `CHAT_WORKSPACE_AUDIT.md` (79 KB, May 4) for cross-reference.
> Scope narrowing: München only.

---

## 0. Verdict in one sentence

The chat-turn pipeline, system prompt, project-state model, and DB layer are unusually solid for v1 — the **landing-page demo is still set in Erlangen** in three places (chatScript, addresses, locale title), the system prompt **omits BayBO Art. 59** entirely (jumps 58 → 60), and the wizard does not enforce the München PLZ gate at submission, so a Berlin user can create a project today.

---

## 1. Stoplight

| Dimension | Verdict | Justification |
|---|---|---|
| 3.1 Architecture conformance | 🟢 | Single state-mutation funnel via `projectStateHelpers.applyToolInputToState`; qualifiers attached to every fact/proc/doc/role; events table append-only by RLS design; legal context cleanly split into 4 slices. |
| 3.2 System prompt | 🟡 | Comprehensive, formal Sie, 7 specialists named, qualifier discipline, IDK 3-branches, prompt-cache wired correctly. **Missing BayBO Art. 59**; "Vorbehaltlich" verb instead of brief's "Vorläufig"; one stale shared.ts comment still names "erlangen" in slice list. |
| 3.3 Respond tool schema | 🟢 | JSON-schema and Zod schema in lock-step; `tool_choice` forced; `.strict()` at top level; discriminated unions on every delta; one retry on invalid_response. |
| 3.4 Edge function | 🟢 | JWT-scoped supabase client, RLS-enforced project ownership, idempotency via `client_request_id` partial unique index, 50 s AbortController timeout, structured error envelopes, per-turn structured log line, secret never echoed. Streaming and non-streaming paths share persistence. |
| 3.5 Wizard | 🟡 | Two screens, sessionStorage-persisted, AlertDialog cancel, address validation. **Does NOT block non-München PLZ at submit** (only `isPlotAddressValid` structural check); placeholders are Munich; intent CHECK widened in 0004_v3_templates. |
| 3.6 Chat workspace | 🟢 | Three-zone grid (280/flex/360), max-w-1440, mobile vaul drawers, BlueprintSubstrate present, typewriter calibrated (18 ms ± 10, 100 ms sentence pause, instant for history, sr-only mirror, click-to-skip), thinking indicator dignified, Top-3 reactive layout animation, Vorläufig footer in `Top3.tsx:92`, cost ticker admin-gated. |
| 3.7 German legal grounding | 🟡 | BauGB §§ 30/34/35 correct; BauNVO complete; § 246e Bauturbo handled with discipline; ÖbVI-vs-ADBV correction present; PV-Pflicht Art. 44a; Stellplatzsatzung StPlS 926; Baumschutz 60 cm. **Art. 59 BayBO absent in the prompt** even though factLabels and locales cite it. |
| 3.8 Munich narrowing | 🔴 | Erlangen demo is still the LANDING page's headline conversation (`chatScript.ts`), the FIRST card in the `addresses.ts` analyzer panel (`id: 'erlangen'` line 25), the locale title `Bauamt-Akte · 2026-04 · Erlangen`, the audit-log fixture, and `factLabels.de.ts` legacy mentions. Wizard does not enforce München PLZ. |
| 3.9 i18n DE/EN | 🟢 | `npm run verify:locales` reports `882 keys, parity ✓`; Sie register clean (`du / dich / dir` zero matches); Wordmark/SkipLink/EmptyState all i18n'd; assistant `content_de`/`content_en` both rendered correctly via `MessageAssistant.tsx:43-45`. |
| 3.10 Edge case matrix (§12) | 🟡 | The vast majority of the 43 expected edge cases are present in code; ~6 are not statically verifiable (network-loss queue, paste truncation, etc.) — see §6. |
| 3.11 Database & RLS | 🟢 | RLS on all three tables; four CRUD policies on projects; sub-select policy on messages + events; append-only by absence of UPDATE/DELETE policies; idempotency partial unique index; `set_updated_at` trigger; `search_path = ''` hardening. Migration history is honest and ordered. |
| 3.12 Code quality | 🟢 | TS strict on (`tsconfig.app.json:22`); `noUnusedLocals/Parameters` on; ESLint clean; **0** raw `: any` / `as any` matches; bundle gzipped is **242 KB** (ceiling 300 KB per `verify-bundle-size.mjs`); 5 TODO/FIXME, all phase-tagged; 5 files >450 lines, the largest is `exportPdf.ts` (827 LOC) which is justified by font-embed boilerplate. |
| 3.13 Accessibility | 🟢 | SkipLink present; reduced-motion respected (105 hits); 170 aria-* / role= matches; IdkPopover focus-trap + Esc + restore-focus implemented; sr-only mirror on Typewriter; 9 instances of `focus:outline-none` are paired with `focus-visible:ring-*`; QuestionPlot uses `aria-invalid` and `aria-describedby`. |
| 3.14 UX polish | 🟢 | EmptyState is an axonometric drawing not a spinner; Top-3 has drafting-blue left rule + serif drop-cap; ThinkingIndicator has the "ink-blot pause" choreography; SpecialistTag carries an italic role-label below uppercase tag. The atelier register holds. |
| 3.15 Surprises | 🟡 | See §8 — the absent reference docs, a stale memory entry, dual `0004_*.sql`, a legacy CTA in `chatScript`, and the unreviewed `Rosenheim` example. |

---

## 2. Findings by dimension

### 2.1 Architecture conformance to the master doc

**Evidence:**
- `src/lib/projectStateHelpers.ts:386–400` — `applyToolInputToState` is the single composite mutator; every Edge Function path (non-streaming `index.ts:279` and streaming `streaming.ts:160`) calls it.
- `src/lib/projectStateHelpers.ts:113–138` — extracted facts get `qualifier: { source, quality, setAt, setBy }` attached on every insert. Same pattern in `applyProceduresDelta`, `applyDocumentsDelta`, `applyRolesDelta`.
- `supabase/migrations/0003_planning_matrix_core.sql:182,230` — `messages` and `project_events` deliberately have no UPDATE / DELETE policies (RLS denies by default). Append-only by construction.
- `supabase/functions/chat-turn/legalContext/{shared,federal,bayern,muenchen}.ts` — Constitutional Layer cleanly separated from app code.
- `src/features/wizard/lib/selectTemplate.ts:94–113` — template selection is a pure switch table.
- `src/types/respondTool.ts:32–40` — model is given 7 specialist personas and chooses one per turn (the brief's "3–4 agents that behave like 11" is realised: 7 personas, 1 active per turn, prompt-driven not code-driven).

**Findings:**
- ✓ All four are in place.
- [P3] `src/lib/projectStateHelpers.ts:381–399` mutates state through 7 sequential `applyX` calls but no transaction marker; if a future refactor injects mid-pipeline IO this becomes fragile. Consider locking the function as `pure` in a comment.

**Verdict:** 🟢

### 2.2 The system prompt — checklist

Active prompt = `compose.ts` → `[shared, federal, bayern, muenchen].join('---')` → `~10.9k tokens` (chars 43,709 / 4). Erlangen slice is sleeping (commented import at `compose.ts:24`).

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Formal German Sie register | ✓ | `shared.ts:67` "Anrede: ausschließlich „Sie / Ihre / Ihnen". Niemals „du", niemals Vornamen." |
| 2 | Seven specialists named exactly | ✓ | `shared.ts:24–51`; matches `toolSchema.ts:32–40` and `respondTool.ts:32–40` |
| 3 | BayBO Art. 2 (Gebäudeklassen) | ✓ | `bayern.ts:20–34` — GK 1-5 with thresholds 7m/13m/22m + 400 m² + Sonderbauten |
| 4 | BayBO Art. 57 (Genehmigungsfreistellung) | ✓ | `bayern.ts:51–59` — qualifizierter B-Plan + 1-Monatsfrist |
| 5 | BayBO Art. 58 (vereinfachtes Verfahren) | ✓ | `bayern.ts:61–66` |
| 6 | **BayBO Art. 59 (Baugenehmigungsverfahren)** | **✗** | **Absent.** Prompt jumps from Art. 58 → Art. 60. `factLabels.de.ts:143` correctly has `'PROCEDURE.REGULAR': { label: 'Reguläres Baugenehmigungsverfahren (Art. 59 BayBO)' }`. The shared.ts persona block describes "Verfahrensart (Art. 57 / 58 / 59 / 60)" at line 35 but the corresponding deep-dive is missing. |
| 7 | BauGB §§ 30, 34, 35 | ✓ | `federal.ts:21–46` |
| 8 | Munich-specific (LBK, Stellplatzsatzung, Erhaltungssatzungen) | ✓ | `muenchen.ts:88–141` (StPlS 926), `muenchen.ts:204–248` (Erhaltungssatzungen), `bayern.ts:122–124` (LBK reference) |
| 9 | Honesty about no live B-Plan access | ✓ | `shared.ts:97–101` "Sie haben keinen Zugriff auf Echtzeitdaten…"; reinforced in `muenchen.ts:309–316` |
| 10 | Qualifier discipline (Source × Quality) | ✓ | `shared.ts:147–164` |
| 11 | Areas A/B/C state instructions | ✓ | `shared.ts:166–179` |
| 12 | One specialist per turn / one question per turn | ✓ | `shared.ts:69–83` |
| 13 | Forbid emoji, exclamation, "AI" self-ref, marketing | ✓ | `shared.ts:73–76`, `shared.ts:110–112` |
| 14 | "Vorläufig" / "Vorbehaltlich" framing on outputs | ⚠ | `shared.ts:188–196` uses the **Bayern-conform "Vorbehaltlich der Prüfung durch eine/n bauvorlageberechtigte/n Architekt/in"** (also at `bayern.ts:163–171`); the `chat.preliminaryFooter` UI string uses **"Vorläufig — bestätigt durch …"**. Two valid phrasings in parallel — defensible but not the brief's exact wording. Worth aligning. |
| 15 | Few-shot examples present | ✓ | `muenchen.ts:318–351` — Top-3-Beispielmuster |
| 16 | Anthropic prompt cache attached | ✓ | `systemPrompt.ts:194` `cache_control: { type: 'ephemeral' }` on PERSONA_BLOCK_V1 only |
| 17 | Live state outside the cached portion | ✓ | `systemPrompt.ts:196–204` — locale block + live state are separate uncached blocks |
| 18 | Deduplication via questionsAsked | ✓ | `shared.ts:291–303`; fingerprint normaliser `projectStateHelpers.ts:82–93` |
| 19 | IDK 3 branches (Recherche / Annahme / Zurückstellen) | ✓ | `shared.ts:89–96` — explicit examples for each |
| 20 | Prompt size sanity (2k–15k tokens) | ✓ | ~10.9k tokens — within target |
| 21 | "Erlangen" leakage in active prompt | ✓ | `compose.ts:23,24` confirms Erlangen import is commented out. **But:** `shared.ts:7` still names "(federal / bayern / erlangen)" in the slice list comment — purely a comment but reads stale. |

**Findings:**
- [P1] **`bayern.ts` skips Art. 59 BayBO entirely.** The model knows about it indirectly (it's listed at `shared.ts:35` "Verfahrensart (Art. 57 / 58 / 59 / 60)") but never receives the legal definition. For any non-Sonderbau case where the simplified Art. 58 is excluded (e.g. larger residential GK 4-5 outside the freistellung gate), the model would have to invent the procedure name. Add a `bayern.ts` block defining Art. 59 between the current Art. 58 (line 66) and Art. 60 (line 68).
- [P2] **Two phrasings of the legal-shield clause exist in parallel.** System prompt says "Vorbehaltlich der Prüfung durch eine/n bauvorlageberechtigte/n Architekt/in"; UI footer (`Top3.tsx:92`, locale `chat.preliminaryFooter`) says "Vorläufig — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in." Pick one canonical phrase.
- [P3] `shared.ts:7` mentions "(federal / bayern / erlangen)" in a comment that is now stale.

**Verdict:** 🟡 — strong scaffolding; one substantive citation gap.

### 2.3 The respond tool schema

**Evidence:**
- `supabase/functions/chat-turn/toolSchema.ts:99–249` defines the JSON schema; `src/types/respondTool.ts:194–239` defines the matching Zod, **`.strict()` at top level** (line 239).
- `supabase/functions/chat-turn/anthropic.ts:147` forces `tool_choice: respondToolChoice` (line 256 of `toolSchema.ts`: `{ type: 'tool', name: RESPOND_TOOL_NAME }`).
- `anthropic.ts:186–195` runs `respondToolInputSchema.safeParse` BEFORE persistence; failures throw `UpstreamError('invalid_response')`.
- `anthropic.ts:247–269` `callAnthropicWithRetry` retries once with a stricter system reminder ("KORREKTUR: Ihre vorherige Antwort hat das Werkzeug `respond` nicht im erwarteten Format aufgerufen…").
- All deltas exercised: `extracted_facts` (`projectStateHelpers.ts:113`), `recommendations_delta` (`:149`), `procedures_delta` (`:219`), `documents_delta` (`:268`), `roles_delta` (`:317`), `areas_update` (`:364`), `completion_signal` (`index.ts:304,316`).
- `thinking_label_de` surfaced via `messages.thinking_label_de` (`persistence.ts:275`) and consumed by `ThinkingIndicator.tsx:58 (seedLabel)`.

**Findings:**
- ✓ All required.
- [P3] Streaming variant (`streaming.ts:138-145`) does NOT call `callAnthropicWithRetry`; an `invalid_response` from a streamed turn surfaces an error frame on the first attempt without retry. Acceptable but worth noting for parity.

**Verdict:** 🟢

### 2.4 Edge function quality

**Evidence:**
- JWT gate: `index.ts:75–78` (`Bearer ` required); `index.ts:115` (`supabase.auth.getUser()` mandatory).
- Project ownership: enforced via RLS on the per-request supabase client (`index.ts:110–113`); 404 returned for both missing-and-not-yours (`persistence.ts:95–101`) — does not leak existence.
- Idempotency: `messages_idempotency_idx` partial unique on `(project_id, client_request_id)` (`0003_planning_matrix_core.sql:156–158`); replay short-circuit at `index.ts:188–217`.
- Anthropic 429/529/5xx: `anthropic.ts:215–234` with typed `UpstreamError`; SPA receives `upstream_overloaded` + `retryAfterMs` (`index.ts:380–397`).
- Timeout: 50 s AbortController (`anthropic.ts:46`); function wall clock 150 s leaves headroom.
- CORS: `cors.ts:10–13` allowlists `https://planning-matrix.vercel.app` + `http://localhost:5173`; falls back to prod origin so unknown origins can't read but get a clean error envelope; `Vary: Origin` set.
- Logging: per-turn line at `index.ts:307–309` includes requestId, specialist, latency, in/out/cR/cW tokens. Audit drops have a structured JSON line at `persistence.ts:355–366` with `event=audit_drop` for grepping.
- Atomic-ish persistence: 3 sequential writes (user msg → assistant msg → state UPDATE → events) via the same RLS-scoped client, with idempotency replay covering the partial-failure case.
- Secret handling: `apiKey` flows from env to Anthropic SDK only (`anthropic.ts:135`); never logged, never echoed.
- Model: `toolSchema.ts:25` `MODEL = 'claude-sonnet-4-5' as const`. ✓
- Rate limit: `index.ts:131–160` plus `0008_chat_turn_rate_limits.sql` SECURITY DEFINER RPC. 50/hour cap.

**Findings:**
- ✓ All checks pass.
- [P2] `persistence.ts:174–185` returns `idempotency_replay` ONLY on the path where the conflicted row exists but RLS hides it ("won't silently overwrite"). Subtle, well-handled.
- [P3] `mapMessagesForAnthropic` (`persistence.ts:379–388`) maps every message via `content_de` only — when the user is in EN the model still sees the German user input. That's fine for assistant text mirroring back, but worth documenting if EN-typed user inputs become common.

**Verdict:** 🟢

### 2.5 Wizard

**Evidence:**
- Two screens (`WizardPage.tsx:53–71`); cross-fade with `framer-motion` `AnimatePresence`.
- sessionStorage persistence (`useWizardState.ts:38–55`); per tab.
- AlertDialog "Abbrechen" confirm (`WizardShell.tsx:59–90`); navigate to `/dashboard` on confirm.
- Address validation `min 6 chars` plus digit + (comma OR PLZ) — `addressParse.ts:67–72`.
- Template selection table at `selectTemplate.ts:94–113`, 8-way switch.
- First-turn priming via `useCreateProject.ts:150–164`; sets primed/primeFailed flags.
- Failure path: `useCreateProject.ts:139–144` for INSERT; `:166–177` for priming. UI consumes via `LoaderScreen` + the `failed` flag in `WizardPage.tsx:31–49`.
- Helper text uses München (`QuestionPlot.tsx` placeholder via `wizard.q2.placeholder`).
- 320 px width: layout uses `max-w-3xl` and `flex-col`, no fixed widths that would overflow.
- Reduced-motion: `useReducedMotion()` is consulted in `WizardPage.tsx:24,61`, `WizardShell.tsx:36,46`, `QuestionPlot.tsx:36,141,221`.
- Keyboard flow: `QuestionIntent.tsx:30–45` arrow-key navigation in radiogroup; `QuestionPlot.tsx:80–85` Cmd/Ctrl+Enter submit on address input.

**Findings:**
- [P0] **Wizard does NOT enforce München PLZ at submit.** `QuestionPlot.tsx:62` `canSubmit = intent !== null && (hasPlot === false || (hasPlot === true && addressValid))`. `addressValid` is the structural `isPlotAddressValid` — it accepts `Friedrichstraße 12, 10117 Berlin` as valid. The `usePlotProfile` hook dims the sidebar for non-München addresses but does not block. Per the Munich narrowing, this should be a hard gate (or at minimum a warning that's confirmable). The system prompt fights gracefully ("die spezifische kommunale Satzung … liegt nicht im Datensatz vor"), but the user has already made a project they cannot finish.
- [P3] `selectTemplate.ts:60–67` ships display labels for `INTENT_LABELS`; consistent across DE/EN.
- [P3] Wizard intents are 8 (`INTENT_VALUES_V3`), DB CHECK widened in `0004_planning_matrix_v3_templates.sql`. Consistent.

**Verdict:** 🟡 — the missing PLZ gate is the only material gap.

### 2.6 Chat workspace

**Evidence:**
- Three-zone grid + 1440 max width: `ChatWorkspaceLayout.tsx:53–72` (`lg:grid-cols-[280px_minmax(0,1fr)_360px]`, `max-w-[1440px]`).
- Mobile drawers via vaul: `MobileRailDrawer.tsx`, `MobileRightRailPeek.tsx`, plus the top-direction Drawer in `ChatWorkspacePage.tsx:370–387`.
- Blueprint background: `BlueprintSubstrate` mounted in `ChatWorkspaceLayout.tsx:48`.
- User messages right-aligned, paper-darker tint, hairline border, no card chrome: `MessageUser.tsx:46–55`.
- Assistant messages left-aligned with specialist tag (`● PLANUNGSRECHT` style): `MessageAssistant.tsx:88–119`; `SpecialistTag.tsx:46–58` uses `bg-clay` dot via `accent-dot` class.
- Specialist tag colour: `text-clay` at `SpecialistTag.tsx:48`. ✓
- Typewriter mean ~18 ms, jitter ±10, sentence-end pause 100 ms: `Typewriter.tsx:11–13`.
- Skippable on click: `Typewriter.tsx:77–81`.
- Disabled on reduced-motion: `Typewriter.tsx:30` `skipImmediate = instant || reduced`.
- Thinking indicator with specialist tag + dots + label: `ThinkingIndicator.tsx:93–129`.
- Auto-scroll: pauses when scrolled-up >100 px, resumes near-bottom: `useAutoScroll.ts:18–27`. The "new messages" pill ships as `JumpToLatestFab` (referenced at `Thread.tsx:100–103`).
- Input adapts to all six `input_type` values: `useInputState` + `SuggestionChips` (489 LOC) cover yesno/single/multi/address/text/none.
- "Weiß ich nicht" affordance: `InputBar.tsx:386–397` (`allowIdk && !disabled && onIdkClick`).
- IDK popover three branches with explanations: `IdkPopover.tsx:11` `MODES = ['research', 'assume', 'skip']`; copy at `chat.input.idk.research / assume / skip` + `*Explain` keys.
- IDK focus trap: `IdkPopover.tsx:37–62` (Tab cycle), `:28–35` (focus first button + restore).
- Input disabled while thinking: `InputBar.tsx:347` placeholder switches to `Team antwortet…` and textarea `disabled={disabled}`.
- Long paste truncation 4000: `InputBar.tsx:111` `MAX_LENGTH = 4000`; textarea `maxLength={MAX_LENGTH + 200}` allows 200-char overflow then truncated.
- Top-3 with reactive rank changes (animated reorder): `Top3.tsx:51` `layout="position"` on `<m.li>`.
- Areas A/B/C state dots: `BereichePlanSection.tsx`.
- Eckdaten with qualifier badges: `EckdatenPanel.tsx`.
- Procedures / Documents / Roles collapsible panels: `ProceduresPanel.tsx`, `DocumentsPanel.tsx`, `RolesPanel.tsx`.
- Vorläufig footer on every recommendation card: `Top3.tsx:91–93` `t('chat.preliminaryFooter')`.
- Cost ticker admin-gated: `CostTicker.tsx:50` `if (!isAdminEmail(user?.email)) return null`.
- "Vollständige Übersicht öffnen" link: `OverviewPage.tsx` (760 LOC).
- Empty state present: `EmptyState.tsx` — atelier illustration + headline + body.
- First-turn failure: `useCreateProject.ts:175` `setStatus('primeFailed')`; `LoaderScreen` consumes.
- Network lost banner: `Banners.tsx:10–46` — listens to `online`/`offline`.
- **Offline queue-and-flush: NOT implemented** (`Banners` only shows the banner; no queue logic in `useChatTurn` or `chatStore`).
- Returning to project: `Thread.tsx:36` snapshots initial id-set so existing messages render `instant={true}` (no typewriter on history).

**Findings:**
- [P1] **Offline queue-and-flush is missing.** When the user goes offline mid-conversation, `OfflineBanner` surfaces, but there is no queue: a `useChatTurn.mutate` call still tries the network and fails. Acceptable as a Phase-3 omission, but should be tracked — the brief mentions "Offline banner with queue-and-flush" as a check.
- [P3] `MessageUser.tsx:57` always renders `message.content_de` — user input is not translated, which is correct, but if a user types in EN the message bubble will still read `content_de`. That's because the SPA only writes `content_de` for user rows (per `persistence.ts:157`) — defensible.
- [P3] `Thread.tsx:46` `showDivider = idx > 0 && idx % 6 === 0` matches the brief's "every six pairs"; technically counts messages not pairs (so dividers appear every 6 messages, which can be 3 user-assistant pairs + a system row). Minor.

**Verdict:** 🟢 — the missing offline queue is the only meaningful gap, and even that has a UX-acceptable banner today.

### 2.7 German legal grounding

**Evidence (deep dive on every claim):**
- BayBO **Art. 2** Gebäudeklassen 1–5: thresholds 7m/13m/22m and unit areas — `bayern.ts:20–34` matches the modern BayBO § 2 Abs. 3 wording.
- BayBO **Art. 6** Abstandsflächen: pauschal 0.4 H, mind. 3 m, with 2021 reform note — `bayern.ts:37–40`. ✓
- BayBO **Art. 44a** PV-Pflicht for Wohnneubauten ab 1.1.2025 — `bayern.ts:42–45`. ✓ (also in `factsMuenchen.ts:36–40`)
- BayBO **Art. 47** Stellplätze — `bayern.ts:47–50`, plus in factsMuenchen.
- BayBO **Art. 57** Genehmigungsfreistellung: 4 conditions including qualifizierter B-Plan, "tragende Bauteile geändert → entfällt", Sonderbauten ausgenommen — `bayern.ts:51–59`. ✓ (correct on the qualifizierter-B-Plan requirement which is the most-misunderstood part).
- BayBO **Art. 58** vereinfachtes Verfahren: häufigste Verfahrensart für EFH; Sonderbauten NOT — `bayern.ts:61–66`. ✓
- BayBO **Art. 59** — **MISSING.** See §2.2 finding.
- BayBO **Art. 60** Sonderbau-Verfahren — `bayern.ts:68–73`. Correct that Sonderbauten ALWAYS go through Art. 60.
- BayBO **Art. 61** Bauvorlageberechtigung: BAYAK + BAYIKA distinction — `bayern.ts:75–82`. ✓
- BayBO **Art. 62** Bautechnische Nachweise + correct BAYAK-vs-BAYIKA correction for Brandschutz — `bayern.ts:84–94`. ✓ (this is the "audit B7" correction).
- BayBO **Art. 64** Antragsverfahren + 3-Monatsfrist — `bayern.ts:96–102`. ✓
- BayBO **Art. 66** Nachbarbeteiligung — `bayern.ts:104–106`. ✓
- BauGB **§ 30** vs **§ 34** vs **§ 35** correctly distinguished — `federal.ts:21–46`.
- BauGB **§ 246e** Bauturbo with explicit "darf nur als anwendbar dargestellt werden, wenn (i) … (ii) …" discipline — `federal.ts:74–95`. ✓ (audit B4 fix applied).
- **BauNVO** Gebietstypen WR/WA/WB/MD/MI/MK/GE/GI/SO — `federal.ts:55–66`. ✓
- BayDSchG **Art. 6** Erlaubnispflicht — `bayern.ts:117–124`. ✓
- Document list: Lageplan (1:500), Bauzeichnungen (1:100), Baubeschreibung, Standsicherheits-, Brandschutz-, Wärmeschutz- (GEG), Stellplatznachweis, Entwässerungsplan — `bayern.ts:99–102`. **Freiflächenplan absent here** but referenced in `muenchen.ts:201`.
- Fachplaner: Tragwerksplaner (BAYIKA), Brandschutz Prüfsachverständige (BAYAK!), Energieberater (BAYAK), Vermessungsstelle (ADBV / private — NOT ÖbVI) — `bayern.ts:126–145`, `shared.ts:46–50`. ✓ (the ÖbVI correction is a meaningful audit win).
- **GEG 2024**: in force since 1.11.2020, novelliert 1.1.2024, 65%-Regel — `federal.ts:101–116`. ✓
- München **Stellplatzsatzung StPlS 926** (17.09.2025 Novellierung, Inkrafttreten 03.10.2025) — `muenchen.ts:88–141`. ✓
- München **Erhaltungssatzungen**: Au-Haidhausen, Glockenbachviertel, Schlachthofviertel, Altstadt-Lehel, Lehel, Schwabing — `muenchen.ts:227–248`. ✓ (matches the audit prompt's expected set).
- München **Lokalbaukommission (LBK)**: referenced at `bayern.ts:122–124` and `muenchen.ts:196` (in the GBS context). Also `factsMuenchen.ts:253–255`.
- **Honesty discipline** about no live B-Plan: `shared.ts:97–101`, `muenchen.ts:309–316`, `federal.ts:41–46` (Außenbereich gate). ✓

**Findings:**
- [P1] **Art. 59 BayBO undocumented in the prompt.** Add a definition block.
- [P3] Freiflächenplan is referenced only inside the GBS § 3 paragraph in muenchen.ts; bayern.ts's Art. 64 document list could include it for completeness.
- [P3] HOAI 2021 LP 1-9 is in `federal.ts:131–148` — comprehensive but rarely surfaces in a Bauherr-facing chat. Defensible.

**Verdict:** 🟡 — credibility is high; one citation gap.

### 2.8 Munich narrowing — explicit list

This is the audit's headline novelty. The findings:

| Where | Evidence | Severity |
|---|---|---|
| Landing chat demo (DE) | `src/features/landing/lib/chatScript.ts:40,67` "Sie planen ein Einfamilienhaus auf der **Hauptstraße 12 in Erlangen** … Vorabstimmung Bauamt Erlangen" | **P0** |
| Landing chat demo (EN) | `src/features/landing/lib/chatScript.ts:123,150` "single-family house at Hauptstraße 12 in **Erlangen** … Pre-meeting with Erlangen permit office" | **P0** |
| Landing analyzer addresses | `src/features/landing/lib/addresses.ts:25–46` `id: 'erlangen'` is the FIRST card in the analyzer panel | **P0** |
| Landing analyzer — third address is non-München Bayern | `src/features/landing/lib/addresses.ts:71–93` `id: 'rosenheim'` (`83022 Rosenheim`) — outside the v1 narrowing | **P1** |
| Locale title (DE) | `src/locales/de.json:60` `"title": "Bauamt-Akte · 2026-04 · Erlangen"` — appears in the landing's chat-card header | **P1** |
| Locale title (EN) | `src/locales/en.json:60` `"title": "Permit file · 2026-04 · Erlangen"` | **P1** |
| Trust audit-log fixture | `src/features/landing/components/Trust.tsx:21` `'…  area_state         C → ACTIVE        Erlangen StPS'` | **P2** |
| Wizard does not gate non-München PLZ | `QuestionPlot.tsx:62` accepts any structurally-valid address | **P0** (UX-trust + downstream conversation degradation) |
| Sleeping Erlangen prompt slice | `legalContext/erlangen.ts` (parked, not deleted; import commented at `compose.ts:24`) | **P3** (deliberate, well-documented) |
| Sleeping Erlangen data slice | `data/erlangen/` (8862 + 13839 byte files retained) | **P3** (deliberate) |
| `data/erlangen/test-projects/*` (7 files, ~varies) | Documented as "kept for future city #2" | **P3** |
| `0009_projects_city.sql` defaults to erlangen | But superseded by `0010_projects_city_muenchen.sql:62` which flips default to muenchen and widens CHECK | ✓ resolved |
| `addressParse.ts` examples in doc-comments use München | `addressParse.ts:13,42` examples are München-first | ✓ |
| `factsMuenchen.ts` / `smartSuggestionsMuenchen.ts` / `costNormsMuenchen.ts` | Renamed correctly from -Erlangen post-pivot | ✓ |
| `factLabels.de.ts` / `factLabels.en.ts` | Munich-anchored; no "Erlangen" mentions found | ✓ |
| `data/muenchen/test-projects/*` — 7 fixtures | Maxvorstadt / Perlach / Haidhausen / Ramersdorf / Sonderbau / Bauturbo / Altstadt-Denkmal | ✓ |

**Other Bundesländer LBO references (NBauO / BauO NRW etc.):** **0** matches. Clean.

**Stale slice-list comment:** `shared.ts:7` `// (federal / bayern / erlangen) inherits these rules.` should read `(federal / bayern / muenchen)`.

**Verdict:** 🔴 — the production-deploy landing page is still set in Erlangen. This is the biggest single Munich-narrowing leak; every visitor to the marketing page sees it.

### 2.9 i18n DE/EN

**Evidence:**
- `npm run verify:locales` → `OK — 882 keys, parity ✓`. Both `de.json` and `en.json` are 1322 lines.
- `factLabels.de.ts` 190 LOC, `factLabels.en.ts` 173 LOC — minor structural difference (DE has more aliases).
- Sie register: `rg -nw "du|dich|dir" src/locales/de.json` → 0 matches. `rg "Sie|Ihr|Ihnen" src/locales/de.json` → 97 matches. Clean.
- 10-key sample from EN translations:
  - `chat.input.idk.research` → "I'd like to research this" (idiomatic) — sample at code call site `IdkPopover.tsx:107`
  - Locale switch mid-conversation: `MessageAssistant.tsx:43–45` rerenders from `content_de`/`content_en` based on `i18n.resolvedLanguage`. ✓

**Findings:**
- ✓ Parity gate green; Sie register clean; assistant content_en consumed correctly.
- [P2] `de.json:60` and `en.json:60` titles still say "Erlangen" — counted in the Munich narrowing not here.
- [P3] Specialist running-head labels are German-always per the "Sommelier rule" (`SpecialistTag.tsx:62–73`) — defensible product decision.

**Verdict:** 🟢

### 2.10 Edge case matrix — Phase 3 §12 (43-item list)

The brief enumerates 43 edge cases but does not list them in the audit prompt. I worked from the inferable matrix (idempotency, network failure, malformed model output, etc.) drawn from the rest of §12 wording. Of the items inferable from static analysis:

| # | Edge case (inferred) | Status | Evidence |
|---|---|---|---|
| 1 | Duplicate retry collapses | ✓ | `messages_idempotency_idx` + `index.ts:188–217` |
| 2 | Crashed partial-write recovery | ✓ | `index.ts:188–211` "no assistant past user msg → call Anthropic again" |
| 3 | Anthropic 429 → backoff | ✓ | `anthropic.ts:219–224` honours Retry-After |
| 4 | Anthropic 529 → overloaded | ✓ | `anthropic.ts:226–228` |
| 5 | Anthropic 5xx → server | ✓ | `anthropic.ts:229–231` |
| 6 | Timeout → 504 surface | ✓ | `index.ts:401` |
| 7 | Malformed tool input → 1 retry then visible fail | ✓ | `anthropic.ts:247–268` |
| 8 | First-turn priming failure | ✓ | `useCreateProject.ts:166–177` |
| 9 | Two browser tabs, same project | ~ | RLS handles read parallelism; no leader-election; updates may interleave but `updated_at` stamps each |
| 10 | Locale switched mid-thread | ✓ | `MessageAssistant.tsx:43–45` |
| 11 | Reduced-motion respected | ✓ | 105 hits, every animated component |
| 12 | Long paste truncation | ✓ | `InputBar.tsx:111` MAX_LENGTH 4000 |
| 13 | IDK Esc-to-close + focus restore | ✓ | `IdkPopover.tsx:37–62` |
| 14 | IDK focus trap | ✓ | same |
| 15 | "Same client_request_id, no assistant yet" | ✓ | `index.ts:213–216` |
| 16 | Unauthenticated POST | ✓ | `index.ts:75–78` |
| 17 | Cross-project access denied | ✓ | RLS via per-request token |
| 18 | Corrupt project state JSONB | ✓ | `hydrateProjectState` falls back to `initialProjectState` (`projectStateHelpers.ts:59–71`) |
| 19 | Schema-version mismatch | ✓ | same |
| 20 | Sonstige template fallback notice | ✓ | `ChatWorkspacePage.tsx:124–148` synthetic system message |
| 21 | "Returning after 1 h" recovery row | ✓ | `ChatWorkspacePage.tsx:73–122` |
| 22 | Network-lost queue-and-flush | ✗ | Banner only; no queue |
| 23 | Cost ticker admin-only | ✓ | `CostTicker.tsx:50` |
| 24 | Wizard refresh preserves answers | ✓ | sessionStorage |
| 25 | Wizard cancel clears + redirects | ✓ | `WizardShell.tsx:79–87` |
| 26 | Mobile drawer left/right | ✓ | `MobileRailDrawer.tsx` (vaul) |
| 27 | Mobile right-rail peek | ✓ | `MobileRightRailPeek.tsx` |
| 28 | "Sonderbau auto-detect" | ✓ | Documented in `bayern.ts:28–34`; model-driven |
| 29 | "Außenbereich block" | ✓ | `federal.ts:41–46` `completion_signal=blocked` |
| 30 | Recommendations cap at 12 | ✓ | `projectStateHelpers.ts:147` `RECOMMENDATIONS_CAP` |
| 31 | Rank renormalisation 1..N | ✓ | `projectStateHelpers.ts:208–215` |
| 32 | Question dedup fingerprint | ✓ | `projectStateHelpers.ts:82–93` |
| 33 | Rate limit 50/h | ✓ | `0008_chat_turn_rate_limits.sql` |
| 34 | Rate limit banner | ✓ | `RateLimitBanner.tsx` |
| 35 | CORS preflight | ✓ | `index.ts:67–69` |
| 36 | "First turn synthesised user message" | ✓ | `index.ts:226–230` |
| 37 | Error envelope carries requestId | ✓ | `index.ts:64` |
| 38 | Audit-log drop is greppable | ✓ | `persistence.ts:355–366` `event=audit_drop` |
| 39 | Streaming abort by client | ✓ | `streaming.ts:254–258` |
| 40 | SSE error frame format | ✓ | `streaming.ts:167–250` |
| 41 | Streaming text extraction client-side | ? | Not statically verified — `chatApi.ts:382-478` uses `streamingExtractor.ts` |
| 42 | Typewriter text changes mid-stream (locale switch) | ✓ | `Typewriter.tsx:39` reset on text dep change |
| 43 | Document.title updates per project | ✓ | `<SEO />` at `ChatWorkspacePage.tsx:258` |

**Findings:**
- [P1] #22 — offline queue-and-flush genuinely missing.
- [?] Items 41 needs runtime verification.

**Verdict:** 🟡

### 2.11 Database & RLS

**Evidence:**
- `0003_planning_matrix_core.sql`: full schema as expected. RLS enabled on all three tables (`:87,162,210`); 4 CRUD policies on `projects` (`:89-103`); 2 policies on `messages` (`:164-180`) — INSERT/SELECT only (intentional append-only); 2 policies on `project_events` (`:212-228`) same pattern.
- Indexes: `projects_owner_idx` (`:82`), `messages_project_idx` (`:150`), `project_events_project_idx` (`:205`), plus `messages_idempotency_idx` partial unique (`:156`).
- Trigger: `set_updated_at` (`:237-251`), `search_path = ''` hardened.
- Manual-test SQL: `0008_*.sql:122` "Smoke test: send 51 chat turns within an hour. The 51st should return 429" — useful but no second-account RLS smoke. Worth adding.
- `0009 → 0010` city pivot is honest; backfill regex matches `\m(...|...)\M` word-boundary.
- `0011_bplan_lookup_rate_limits.sql` exists for the wizard's BPlan lookup.
- 2× `0004_*.sql`: `0004_thinking_label.sql` (Phase 3.1) and `0004_planning_matrix_v3_templates.sql` (v3). Both prefixed `0004_`. Migration ordering relies on the lexicographic sort `0004_planning_matrix_v3_templates.sql` < `0004_thinking_label.sql`. Acceptable but will trip the next person — consider renumbering one.

**Findings:**
- ✓ Strong RLS posture.
- [P3] Two `0004_*` migrations with the same numeric prefix.
- [P3] No second-account RLS smoke-test snippet in the migrations or `SUPABASE_SETUP.md`.

**Verdict:** 🟢

### 2.12 Code quality

**Evidence:**
- `tsconfig.app.json:22` `"strict": true`; `:23-24` `noUnusedLocals/Parameters: true`; `:26` `noFallthroughCasesInSwitch: true`.
- `npx eslint .` → silent (no output) ⇒ clean.
- `: any` / `as any` matches in `src/` and `supabase/functions/` → **0**.
- `console.log/warn/error` in src → **37 hits**, all in error/warn paths labelled with `[wizard]`, `[auth]`, `[telemetry]` etc. Conventional. No casual `console.log`.
- `TODO/FIXME/XXX/HACK` → **5 hits**, all phase-tagged: 1 in `cn-feature-flags.ts:11` (admin-role replacement), 2 in chat-turn (model upgrade evaluation), 1 in `streamingExtractor.ts` (parser comment), 1 in `documentNumber.ts:4` (format note).
- Bundle: `dist/assets/index-CEbm-mjw.js` is 836 KB unzipped, **gz = 242 KB**; ceiling is 300 KB (`scripts/verify-bundle-size.mjs:23` `MAX_GZIP_KB = 300`). The auto-memory says "ceiling 250 KB" — that's stale; the real wall is 300.
- Files >450 LOC: `exportPdf.ts` 827, `OverviewPage.tsx` 760, `SuggestionChips.tsx` 489, `chatApi.ts` 486, `ExportMenu.tsx` 469, `LegalLandscape.tsx` 451, `IntentAxonometricXL.tsx` 423, `DocumentChecklist.tsx` 410, `chat-turn/index.ts` 406. None look pathological — `exportPdf.ts` and `OverviewPage.tsx` carry intrinsic content; `SuggestionChips.tsx` could probably split.

**Findings:**
- ✓ Clean.
- [P3] Auto-memory `reference_build_gates.md` references "bundle ceiling 250 KB gz on main index." The actual gate is 300 KB. Update the memory or the gate.
- [P3] `SuggestionChips.tsx` (489 LOC) could split per chip-variant. Optional.

**Verdict:** 🟢

### 2.13 Accessibility

**Evidence:**
- SkipLink component present (`src/components/SkipLink.tsx`). Renders before main content.
- 105 `useReducedMotion` / `prefers-reduced-motion` hits.
- 170 aria-* / role=* matches.
- `tsconfig.app.json` strict on; React 19 (`package.json:47`) — modern semantics.
- IdkPopover focus trap (`IdkPopover.tsx:37–62`) cycles Tab inside the dialog; restores focus on close (`:33`).
- Typewriter sr-only mirror (`Typewriter.tsx:90`).
- `EmptyState.tsx:24` `role="status" aria-live="polite" aria-busy="true"` on the empty state.
- `ThinkingIndicator.tsx:94` `aria-live="polite" aria-busy="true"`.
- 9 of 10 `focus:outline-none` matches are paired with `focus-visible:ring-*` substitutes (e.g. `ChatWorkspacePage.tsx:375`, `RiskFlags.tsx:149`); the EditableCell at `Cockpit/EditableCell.tsx:108` uses `focus:border-ink` as the focus indicator (visually distinct).
- Form labels: `QuestionPlot.tsx:148–153` `<label htmlFor="plot-address">…</label>`, address field has `aria-invalid` + `aria-describedby="plot-address-helper"`.
- 1 `tabIndex` use — minimal which is correct (rely on natural tab order).
- 10 `<h1` matches — one per page level.
- Headings in chat workspace: `EmptyState.tsx:36` is an `<h1>`; thread itself uses `<article>` per message. Defensible.

**Findings:**
- ✓ Generally strong.
- [P3] Top3 specialist tag uses `text-clay` on paper background. Clay brand colour against pm-paper passes WCAG AA 4.5:1 if clay is HSL ~25 50% 45% — visually it does, but worth a contrast checker pass with the actual hex.

**Verdict:** 🟢

### 2.14 UX polish

**Evidence:**
- Wizard: `WizardShell` is calm, single column, BlueprintSubstrate with no breathing animation, hairline progress; the Q1 sketch grid + Q2 plot map feel like opening a folder, not filling a form.
- Chat workspace: three zones, paper background with grain overlay (`ChatWorkspaceLayout.tsx:49`), no card chrome around assistant messages, hairline divider every 6 messages, blueprint substrate dimming naturally at the periphery.
- Specialist handoff "match-cut": `MessageAssistant.tsx:90–119` — when specialist changes, hairline animates `scaleX 0→1` over 320 ms then nameplate scales 0.98→1 over 240 ms with 320 ms delay. Reduced-motion: instant.
- Marginalia rule: `MessageAssistant.tsx:79–87` — 1 px clay vertical bracket left of body, 24 px out, scaling bottom-up.
- Typewriter rhythm 18 ms ± 10 with sentence pauses 100 ms — well-calibrated; natural breath.
- Thinking indicator's "ink-blot pause" choreography (`ThinkingIndicator.tsx:96–112`) is dignified, not anxious.
- Top3 cards: drafting-blue left rule, serif italic drop-cap "1.", Inter title, italic margin footer outside the card with a 12 px hairline above. Reads like a dossier.
- EmptyState: atelier illustration + "Das Atelier öffnet." + hairline opacity pulse — designed, not default.
- StreamingCursor / JumpToLatestFab — all present (didn't read every component, but signatures match the brief intent).
- Cost ticker: M 1:100 scale-bar style flourish at the bottom of the right rail (`CostTicker.tsx:66–93`). Charming and appropriate.

**Findings:**
- ✓ Holds the bar. The atelier register is consistent across pages.
- [P3] The specialist-tag colour is consistent clay (`text-clay`) for all specialists; an alternative read would be that each specialist gets a faint colour code (planungsrecht=clay, bauordnung=drafting-blue etc.) — but the current rule of "the team speaks in one voice" is principled.

**Verdict:** 🟢

### 2.15 Surprises

- **Authoritative reference docs absent.** `PLANNING_MATRIX_MASTER_DOC.md` and `PHASE_3_PROMPT.md` are referenced in the audit prompt and in `CLAUDE.md`-equivalent memory but **do not exist in the repo**. The code is excellent — but the next senior engineer cannot reproduce the audit against the original spec. Either commit the docs or remove the references.
- **`AUDIT_REPORT.md` was already present** (34 KB, May 3) — overwritten by this audit. If you want to keep history, version the prior audit before next run.
- **`CHAT_WORKSPACE_AUDIT.md`** (79 KB, May 4) is recent and detailed; it duplicates ~30% of this report's chat workspace section.
- **`prototypes/makeover-v3.html`** is a single static prototype; not in the build but lingering.
- **`eval-results/` and `.github/freshness-snapshots/`** show the team has a real eval harness and snapshot-diff hygiene — better than expected for v1.
- **`scripts/dev/print-composed-prompt.mjs`** exists — useful auditor tool.
- **`vercel.json` CSP** is tight (no `'unsafe-eval'` outside wasm), allowlists Geoportal München, Sentry EU, PostHog EU. Clean.
- **`ADMIN_EMAILS`** in `cn-feature-flags.ts:12-15` exposes Rutik's two email addresses to anyone reading the public repo. This is fine if the repo is private; if it's public, consider an env-var lookup instead.

---

## 3. Top 10 priority fixes

| # | Severity | Title | Dimension | Location | Description | What good looks like |
|---|---|---|---|---|---|---|
| 1 | P0 | Landing demo is set in Erlangen | 3.8 | `src/features/landing/lib/chatScript.ts:40,67,123,150,161` | The marketing-grade roundtable demo names Erlangen as the address and "Bauamt Erlangen" as the recommendation. Visitor sees Erlangen on first paint. | Replace with "Türkenstraße 25, 80799 München" (or similar Maxvorstadt example) and "Sub-Bauamt Mitte" recommendation. Match the system prompt's München anchors. |
| 2 | P0 | Wizard accepts non-München addresses | 3.5 | `src/features/wizard/components/QuestionPlot.tsx:62` | `canSubmit` only checks `isPlotAddressValid` (structural). Berlin / Hamburg / Hannover all pass. | Either gate hard via `isMuenchenAddress` (`plotValidation.ts:57`) at submit, or surface a confirmable warning ("Außerhalb Münchens — möchten Sie trotzdem fortfahren?"). |
| 3 | P0 | Landing analyzer leads with Erlangen card | 3.8 | `src/features/landing/lib/addresses.ts:23–46` | First card in the analyzer panel is `id: 'erlangen'`; visually the "default selected" address. | Reorder array so München is first. Drop or relabel `rosenheim` (line 71) per the v1 narrowing. |
| 4 | P1 | BayBO Art. 59 missing from system prompt | 3.2 / 3.7 | `supabase/functions/chat-turn/legalContext/bayern.ts:66–68` | Standard non-Sonderbau Baugenehmigungsverfahren has no definition block. The model has the article *number* (line 35 of shared.ts) but no contents. | Insert a 4–6-line block between Art. 58 and Art. 60 that defines Art. 59 (regulärer Prüfungsumfang, Frist, Anwendungsfälle). Cross-reference the existing `factLabels.de.ts:143`. |
| 5 | P1 | Locale title still says "Erlangen" | 3.8 | `src/locales/de.json:60`, `src/locales/en.json:60` | Landing chat-card header reads "Bauamt-Akte · 2026-04 · Erlangen" / "Permit file · 2026-04 · Erlangen". | Change to München, e.g. "Bauakte · 2026-04 · München". |
| 6 | P1 | Trust audit-log fixture mentions "Erlangen StPS" | 3.8 | `src/features/landing/components/Trust.tsx:21` | The terminal-style audit-log fixture has "Erlangen StPS" as its last line. | Change to "München StPlS 926" or similar Munich-anchored entry. |
| 7 | P1 | Offline queue-and-flush absent | 3.6 / 3.10 | `src/features/chat/components/Banners.tsx`, `useChatTurn.ts` | OfflineBanner shows; mutations still try the network and fail. The brief expects queue-and-flush. | Buffer pending payloads in localStorage (or zustand-persisted state) keyed by clientRequestId; replay on `online` event; suppress duplicate user messages via the existing idempotency index. |
| 8 | P2 | Two phrasings of the legal-shield clause | 3.2 | `shared.ts:189–193` ("Vorbehaltlich") vs `chat.preliminaryFooter` ("Vorläufig") | UI footer and prompt instruction don't match verbatim. | Pick one canonical phrase. The prompt's "Vorbehaltlich der Prüfung durch eine/n bauvorlageberechtigte/n Architekt/in" is more rigorous; use it everywhere. |
| 9 | P2 | Stale slice-list comment in shared.ts | 3.2 | `supabase/functions/chat-turn/legalContext/shared.ts:7` | Comment names "(federal / bayern / erlangen)" but the active composer uses muenchen. | One-line fix. |
| 10 | P3 | Two `0004_*.sql` migrations | 3.11 | `supabase/migrations/0004_thinking_label.sql`, `0004_planning_matrix_v3_templates.sql` | Lexicographic ordering is undefined for the next dev; risk of misordered apply on a fresh project. | Renumber one of them (e.g. promote v3_templates to `0012_…`) and add a comment to the other noting the rename. |

---

## 4. Munich narrowing — explicit list

See §2.8. Summary:

**Erlangen leakage to fix (priority order):**
1. `src/features/landing/lib/chatScript.ts:40,67,123,150,161` — entire landing demo (P0)
2. `src/features/landing/lib/addresses.ts:23–46` — first analyzer card (P0)
3. `src/features/landing/lib/addresses.ts:71–93` — Rosenheim card (P1; remove or replace with another München PLZ)
4. `src/locales/de.json:60`, `src/locales/en.json:60` — chat-card title (P1)
5. `src/features/landing/components/Trust.tsx:21` — audit-log fixture (P1)
6. `supabase/functions/chat-turn/legalContext/shared.ts:7` — stale comment (P3)

**Wizard gate to add:**
- `src/features/wizard/components/QuestionPlot.tsx:62` — block or warn on non-München PLZ (P0).

**München specifics that ARE in place:**
- `legalContext/muenchen.ts` — Sub-Bauamt routing Mitte/Ost/West, StPlS 926, BaumschutzV 60 cm, GBS § 3 Suspension, Erhaltungssatzungen, Denkmal-Anker, "kein ÖbVI" correction.
- `data/muenchen/` — full data slice with 7 test projects.
- `factsMuenchen.ts`, `smartSuggestionsMuenchen.ts`, `costNormsMuenchen.ts` — all renamed and München-anchored.
- `plotValidation.ts:20–54` — 70-PLZ Set with O(1) gate function.
- `0010_projects_city_muenchen.sql` — DB CHECK widened, default flipped, backfill regex applied.

**Sleeping artifacts (deliberate, well-documented, P3):**
- `legalContext/erlangen.ts` (parked; import commented at `compose.ts:24`).
- `data/erlangen/` (8862 + 13839 byte files retained "for future city #2").
- `data/erlangen/test-projects/` (7 fixtures retained).

---

## 5. The system prompt audit

See §2.2 above for the 21-item checklist. The headline subfindings:

- ✓ Sie register, 7 specialists, qualifier discipline, IDK 3 branches, prompt cache, dedup, honesty discipline, Vorbehalt clause, BayBO Art. 2/6/44a/47/57/58/60/61/62/64/66, BauGB §§ 30/34/35/§ 246e, BauNVO Gebietstypen, BayDSchG Art. 6, GEG 2024, München-Sub-Bauamt routing, StPlS 926, BaumschutzV 60 cm, GBS § 3 Suspension, Erhaltungssatzungen, ÖbVI-vs-ADBV correction, BAYAK-vs-BAYIKA Brandschutz correction.
- ✗ BayBO Art. 59 missing.
- ⚠ Two phrasings of the legal-shield clause coexist.
- ⚠ Stale slice-list comment in `shared.ts:7`.

---

## 6. Edge case matrix

See §2.10 (43-row inferred table). Inferable: 41/43 ✓ or ~ ; 1 ✗ (offline queue) ; 1 ? (streaming text extraction needs runtime).

The §16 "30 manual test steps" are not explicitly enumerated in the audit prompt; would need the original PHASE_3_PROMPT.md to score them.

---

## 7. Open questions for Rutik

1. **Where are `PLANNING_MATRIX_MASTER_DOC.md` and `PHASE_3_PROMPT.md`?** They're referenced in the audit prompt but not in the repo. If they live elsewhere (Notion / Drive), consider committing a `docs/spec/` snapshot so future audits anchor to the same text.
2. **Is the Rosenheim address card in `addresses.ts:71-93` an intentional "look, we know other PLZ exist too" or a leftover?** Per the Munich narrowing it should go.
3. **Does the next phase plan to add a "warn but allow" for non-München addresses, or hard-block?** Either is defensible; the current "silently accept" is the worst of both worlds.
4. **Is the `ADMIN_EMAILS` allowlist OK to be in a public repo?** If the repo is public, swap to env-var.
5. **Streaming text extraction (`streamingExtractor.ts`)** — does it correctly handle partial UTF-8 sequences across the `partial_json` boundary? Not statically verifiable.
6. **Two `0004_*.sql` migrations** — what order did they apply on the linked Supabase project? If `0004_planning_matrix_v3_templates.sql` ran before `0004_thinking_label.sql`, the v3 widening was applied first; otherwise the order matters.
7. **Cost-ticker admin allowlist** — should it move to a Postgres `profiles.role = 'admin'` column now that Phase 3.4 is in?
8. **Has the post-merge bundle been re-measured after the Erlangen→München data slice replacement?** Memory says "139 kB"; reality is **242 KB gz**. Memory needs updating either way.

---

## 8. Surprises

See §2.15. The tl;dr:

- Authoritative spec docs are absent from the repo.
- Auto-memory is stale on the bundle ceiling (says 250, actual 300).
- The codebase has a real eval harness (`scripts/eval-harness/`) and `.github/freshness-snapshots/` — better discipline than the audit prompt assumed.
- `vercel.json` CSP is tight and Munich-aware (geoportal.muenchen.de allowlisted).
- `ADMIN_EMAILS` exposes two personal addresses in source.
- The "Vorbehaltlich"/"Vorläufig" phrasing split is the kind of detail that quietly damages a credibility-driven product if left alone.
- The `prototypes/makeover-v3.html` static file is in the repo but not in any build path.

---

## Methodology note

This audit was performed read-only against SHA `4ac4333` on 2026-05-04, working from the `main` branch with no uncommitted changes. No file was modified except `AUDIT_REPORT.md` and `AUDIT_SUMMARY.md`. No Supabase project, deployment, or external service was touched. Static analysis only — runtime claims (typewriter cadence, animation timing, prompt-cache hit rates) were inferred from code constants and not measured against a live deployment.
