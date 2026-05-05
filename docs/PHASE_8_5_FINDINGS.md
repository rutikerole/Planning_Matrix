# Phase 8.5 — München-90% Accuracy Sweep · Findings

**HEAD at audit:** `0e572c8 chore(result): Phase 8.1 final verify + react-19 effect lint fix`
**Goal:** close the remaining accuracy/reliability/UX/depth gaps from a real Tengstraße consultation.

Audit-first per the brief's mandate. Commit 1 of the sweep is this file. Screenshot evidence (live Tengstraße project) confirmed five user-visible bugs directly; the rest were verified by code reading.

---

## 1. Brief vs. reality — three deltas resolved

| Brief claim | Reality | Resolution |
|---|---|---|
| `exportBriefingPdf.ts` (referenced) | The PDF builder is `chat/lib/exportPdf.ts` (Phase 3.5 origin). | Modify the existing file in-place (A.3). |
| C.7 "Risk Register shows arbitrary 3 instead of top-3 by score" | `composeRisks` already sorts `b.score - a.score`. | **Non-bug.** The visible 3 ARE highest-scored. Document; no code change. |
| §0 "PLZ → Stadtbezirk lookup table somewhere" | `legalContext/muenchen.ts` tells the persona to derive Stadtbezirk "wenn aus der Adresse ableitbar" but never gives a table. | **A.1 root cause confirmed: persona is hallucinating district numbers.** The fix needs both a data file (curated PLZ map) AND a persona prompt update wiring it in. |

---

## 2. Bug verification — what the screenshot confirms directly

Live Tengstraße project (PLZ 80796, Schwabing-West) screenshot:

| Brief ID | Visible evidence | Status |
|---|---|---|
| C.4 | Verify card rows: "Bauherr: 'approximately 1925'", "Bauherr: 'proceed on the assumption ...'", "Ensemble Schwabing Geprueft: false" | ✓ raw evidence + raw fact keys leak |
| C.5 | At-a-glance "Building class" cell visually empty | ✓ confirmed |
| C.8 | Executive Read: "the plot likely falls under User input: 'proceed on the assumption of § 34 BauGB' — the plot is in an unplanned but built-up area" | ✓ exact text matches brief |
| A.5 | Estimated cost €9,500 – 17,200 in At-a-glance | ✓ way below München realistic for an EFH at €750k+ construction |
| C.6 | Top 3 Next Steps card shows ~2 items where synthesis prompted 3 | partial — visible from shot |
| A.2 | Areas A/B/C all PENDING despite full consultation | needs Legal-tab screenshot to verify; brief asserts ✓ |

---

## 3. Root cause notes (the deeper "why")

### A.1 — PLZ hallucination
Persona prompt (`legalContext/muenchen.ts`) instructs the model to "name the responsible Sub-Bauamt when district is derivable from the address" but provides no lookup table. Model maps "Tengstraße 38" → "Schwabing" → guesses district 12 (Schwabing-Freimann), when the actual district for PLZ 80796 is 4 (Schwabing-West). **Fix needs both data + prompt.**

### A.2 — Areas all PENDING
The persona prompt allows specialists to update areas via `areas_update` but doesn't *require* it on every turn. So areas can finish a consultation still in their initial PENDING state. **Fix is two-pronged**: (a) persona prompt requires `areas_update` on every substantive turn, (b) client-side `resolveAreas(state)` derives ACTIVE from evidence (≥ N facts in domain keys) so the legacy Tengstraße project re-renders correctly without DB rewrite.

### A.3 — PDF "None recorded"
Result page reads `useResolvedProcedures()` which falls back to `deriveBaselineProcedure(intent, bundesland)`. PDF reads directly from `state.procedures`. **Fix: extract resolution into pure helpers that both React and PDF consume.**

### A.4 — Cost reads wrong area
`detectAreaSqm` regex matches `m²` but doesn't distinguish `geplante_grundflaeche_m2` (footprint) from `bruttogrundflaeche_m2` (gross floor area). HOAI fees scale with BGF, not footprint. **Fix: typed fact keys + cost engine reads BGF first, falls back to footprint × storeys.**

### A.5 — Cost too low
`BASE` in `costNormsMuenchen.ts` totals €13.6k–24.5k. München practitioner rates for a typical EFH at construction value €750k+ run €25k–50k. Bayern factor is 1.0; no München premium applied. **Fix: rebase BASE values + add München premium 1.20 for postal codes 80000-81999.**

### B.1 — Synthesis 502
Synthesis turn produces ~2x output of regular turns (top-3 + what-we-know + what-architect-verifies). Anthropic API has hard token limits per request. The persona has no length cap on synthesis. **Fix: persona prompt explicitly caps synthesis at ~1500 chars per locale + Edge Function adds backoff retry.**

### B.2 — Malformed tool-call
Edge Function already has `callAnthropicWithRetry` which handles `UpstreamError` (per `index.ts` comments). But validation failures don't auto-retry — they bubble straight to the user toast. **Fix: append a stricter system reminder + retry once on first validation failure.**

### B.3 — Non-atomic state writes
The Edge Function writes message → state → events sequentially. A failure mid-sequence leaves partial state. **Fix: wrap in a Postgres RPC transaction.** *Cannot deploy from CLI; SQL file authored, deployment is Rutik's job.*

### C.1 — Question density
Persona prompt allows "thematic blocks of 3-5 sub-questions per turn." Brief explicitly wants one main question per turn. **Fix: prompt update + reduce `max_message_length` to 800 for non-synthesis.**

### C.2 — Response brevity
Same prompt source. **Fix: explicit response-shape examples in prompt, length cap, "long-form belongs in result page."**

### C.3 — Markdown asterisks
`MessageAssistant` renders `message.content_de` / `_en` as plain text via `<Typewriter>` and a `<p>` element. No markdown parsing. **Fix: minimal whitelist parser (~80 LOC) for `**bold**`, `- list`, line breaks. Avoids adding `react-markdown` (~15 KB gz).**

### C.4 — Raw fact keys + evidence quotes
`computeOpenItems` falls back to `f.evidence ?? \`${f.key}: ${f.value}\``. Both branches surface unprocessed strings. **Fix: humanizeFact lookup table (~30 templates) + algorithmic fallback for unmapped keys.**

### C.5 — Building class missing
`AtAGlance` reads `f.key.match(/gebaeudeklasse|geb_klasse/i)`. The persona may emit `gebaeudeklasse_geplant`, `gebaeudeklasse_hypothese`, or just describe it in `message_de` without emitting a fact at all. **Fix: client-side reads several known keys; falls back to deriving from `vollgeschosse_oberirdisch` + `bauwerks_hoehe_m`; persona prompt requires explicit emit.**

### C.6 — Recommendations lost
Synthesis turn names 3 recommendations in `message_de` but only #1 emits via `recommendations_delta`. **Fix: persona prompt requires `recommendations_delta` BEFORE the prose for synthesis turns.**

### C.7 — Risk sort
**Non-bug.** Verified `composeRisks` already sorts `b.score - a.score || b.impact - a.impact || a.entry.id.localeCompare(b.entry.id)`. The visible 3 ARE the highest-scored. Document and skip.

### C.8 — Executive Read evidence leak
Same root as C.4: `computeOpenItems` returns labels carrying user-quote evidence; those labels feed `composeExecutiveRead` paragraph 3 via `flagSummary`. **Fix: same humanizeFact pipeline. C.4 fix propagates to C.8.**

### D.1 — Generic suggestions
`SmartSuggestion` has `intents` + `bundeslaender` + `scopeMatch` filters. No fact-evidence matching. So tree-protection / Ensemble / PV-Pflicht templates fire (or don't) based on regex over fact keys, not based on whether the persona emitted a `baumschutz_betroffen: true` fact. **Fix: extend matcher with `evidenceFacts: { key: string; expectedValue?: any }[]` filter + add 8 project-specific templates.**

### D.3 — Generic risks
`riskCatalog.ts` has 10 entries. None München-specific. **Fix: add 8 entries — Schwabing-Ensemble, BaumschutzV cutting close to footprint, StPlS 926 stricter rules near U-Bahn, Bauamt summer slowdown, PV-Pflicht enforcement, Maxvorstadt density disputes, etc.**

### D.4 — BGF vs footprint conflation
Persona prompt has no fact-extraction rubric for area types. **Fix: rubric in prompt + plausibility validation in Edge Function.**

---

## 4. What this saves us — reuse-existing-infra

Same audit-first dividend as Phase 8 / 8.1. Concrete reuse:

| Need | Existing infra | Saves |
|---|---|---|
| Risk sort (C.7) | `composeRisks` already sorts | A useless code change |
| PDF builder (A.3) | `chat/lib/exportPdf.ts` | A new PDF stack — extend, don't rebuild |
| Markdown rendering (C.3) | None — but tiny surface | Avoiding `react-markdown` (~15 KB gz) |
| Resolve helpers (A.2/A.3) | Hooks already exist (`useResolvedRoles`, `useResolvedProcedures`) | Just extract pure helpers + reuse selector logic |
| Areas state derivation (A.2) | `state.facts` already keyed under domain prefixes | Pattern-match keys for derivation |
| Auto-retry (B.2) | `callAnthropicWithRetry` already wraps Anthropic calls | Extend, not rebuild |
| Prompt cache (persona work) | PERSONA_BLOCK_V1 cached ephemerally | Persona changes go inside the cached block |

---

## 5. Scope honesty — what's testable in CLI vs deployment-required

This sweep is genuinely massive. Three categories:

**Tier 1 — testable client-side, full confidence (8 commits):**
C.4 (humanizeFact), C.5 (building class), C.8 (executive read), A.5 (cost calibration), D.1 (suggestions templates + matcher), D.3 (risk catalog), C.3 (markdown), A.1 data file (PLZ map only, no persona wiring yet).

**Tier 2 — code authored, deployment required to verify (1 commit):**
A.2 (resolveAreas client-side fallback), A.3 (resolve* shared helpers), A.4 (cost engine reads BGF first). These are testable but layered on top of persona changes that aren't deployed.

**Tier 3 — Edge Function changes, deployment + redeployment required (1 commit):**
A.1 persona wiring (load PLZ table into legalContext), A.2 prompt requires areas_update, A.4 fact-extraction rubric, C.1 one-question-per-turn, C.2 response brevity, C.6 recommendations always emitted, D.4 fact-extraction rubric. **All consolidated into one commit because they all touch `legalContext/muenchen.ts` + `systemPrompt.ts` + a single new file. Deployment is the user's job.**

**Tier 4 — deferred (require user-confirmed deployment and SQL deploy):**
B.1 (synthesis retry — Edge Function timeout change), B.2 (auto-retry malformed — Edge Function logic), B.3 (atomic transactions — needs SQL migration deploy). **Documented in findings, code path is in scope but skipped for this sweep.** The fixes are clear; will land in a follow-up once the persona changes are deployed and validated.

C.7 — non-bug, skipped.

**Realistic commit count: 13** (was budgeted 22 in the brief; the difference is C.7 non-bug + Tier 4 deferral).

---

## 6. File plan

### Create
| Path | Purpose |
|---|---|
| `src/data/muenchenPlzDistricts.ts` | A.1 — ~70 PLZ entries + lookupDistrict() helper |
| `src/features/result/lib/humanizeFact.ts` | C.4 — fact key/value → human-readable label, locale-aware |
| `src/features/result/lib/resolveAreas.ts` | A.2 — derive ACTIVE from evidence patterns when state.areas is PENDING |
| `src/features/result/lib/resolveProcedures.ts` | A.3 — pure helper, replaces useResolvedProcedures hook for non-React callers |
| `src/features/result/lib/resolveRoles.ts` | A.3 — same pattern |
| `src/features/result/lib/renderMarkdown.tsx` | C.3 — minimal whitelist parser as a React component |

### Modify
| Path | Change |
|---|---|
| `src/data/costNormsMuenchen.ts` | A.5 — recalibrate BASE; add Munich premium for 80-/81- bundesland; A.4 — distinguish BGF vs Grundfläche |
| `src/data/smartSuggestionsMuenchen.ts` | D.1 — extend SmartSuggestion shape with `evidenceFacts`; add 8 templates |
| `src/data/riskCatalog.ts` | D.3 — add 8 München-specific entries |
| `src/features/result/lib/computeOpenItems.ts` | C.4 — apply humanizeFact to outputs |
| `src/features/result/lib/composeExecutiveRead.ts` | C.8 — drop evidence-quote interpolation |
| `src/features/result/lib/smartSuggestionsMatcher.ts` | D.1 — evidence-fact matching; relevance sorting |
| `src/features/result/components/Cards/AtAGlance.tsx` | C.5 — read gebaeudeklasse_geplant + derive from height/storeys |
| `src/features/chat/components/Chamber/MessageAssistant.tsx` | C.3 — apply renderMarkdown to assistant body |
| `src/features/chat/lib/exportPdf.ts` | A.3 — read from resolve* helpers |
| `src/features/result/components/tabs/LegalLandscapeTab.tsx` | A.2 — use resolveAreas for state derivation |
| `supabase/functions/chat-turn/legalContext/muenchen.ts` | A.1 + A.2 + A.4 + C.1 + C.2 + C.6 + D.4 prompts |
| `supabase/functions/chat-turn/systemPrompt.ts` | length cap pass-through |
| `src/locales/de.json` + `en.json` | All new strings |

---

## 7. Out of scope (acknowledged)

Per the brief's §7 + this sweep's Tier 4:

- B.1 Edge Function synthesis retry — code change is straightforward (timeout + backoff in `callAnthropicWithRetry`), but cannot be tested in CLI. Will land in follow-up once persona changes are deployed.
- B.2 Auto-retry on malformed — same.
- B.3 Atomic transaction migration — cannot deploy SQL from CLI. Will author migration file in follow-up if explicitly authorized.
- C.7 Risk sort — non-bug.
- D.4 fact-extraction validation in Edge Function — prompt-side rubric in commit 12; runtime validation deferred to follow-up.

---

## 8. Reporting

Final commit lands a report covering:
1. Live URL (push to origin/main).
2. This findings file.
3. Per-commit table with [render-check-deferred] tags + scope-tier.
4. Bundle delta (target ≤ +20 KB gz vs Phase 8.1 baseline 248.5 KB).
5. New curated content for Rutik review:
   - PLZ → Stadtbezirk map (~70 entries) — spot-check accuracy.
   - Cost calibration BASE values + München premium — confirm vs. real practitioner data.
   - 8 new suggestion templates — review bodies + reasoning.
   - 8 new risk entries — review un-risk actions.
   - ~30 humanizeFact templates — review readability in DE/EN.
   - Persona prompt diff — review tone, length, fact-extraction rubric.
6. Things flagged for review — brutally honest.
7. Tier 4 deferrals + reason.

End of findings.
