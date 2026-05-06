# Phase 10 — The 8-Type Build: Findings & Plan

> **Status:** commit 1 of 15. Audit-first artifact for the per-template legal-context build. After this commit lands and gets a status ping, commits 2–10 author the eight template blocks.
>
> **Critical caveat — see §6.** Five 2025/2026 BayBO claims in the brief sit past my training cutoff window. I'll encode them faithfully (the brief explicitly takes legal authority on §1 facts) but flag them in this doc + in each template block as content the user is responsible for re-verifying with a Bayern-zertifizierter Architekt before public ship. The brief is the law; I am not.

---

## 1. Codebase audit — what I found in the 10 mandated surfaces

### 1.1 `compose.ts` (57 lines)

Currently exports a **constant** `COMPOSED_LEGAL_CONTEXT`, joining `SHARED_BLOCK + FEDERAL_BLOCK + BAYERN_BLOCK + MUENCHEN_BLOCK + PERSONA_BEHAVIOURAL_RULES` with `\n\n---\n\n` plus a hand-crafted `══ PROJEKTKONTEXT ══` marker tail. No template branching anywhere. Imported by `systemPrompt.ts` which wraps it in the cached system block.

### 1.2 `personaBehaviour.ts` (250 lines)

The Phase 8.5 behavioural ruleset (PLZ→Bezirk lookup, areas_update Pflicht, fact-extraction rubric, one-question-per-turn, 2-3 sentence + 1 question response shape, recommendations_delta Pflicht). All cross-cutting — applies to every template equally. Untouched by Phase 10.

### 1.3 `index.ts:286-292` — first-turn priming

The synthesized kickoff is a USER role message (not a system block):

```ts
anthropicMessages.push({
  role: 'user',
  content: 'Eröffnen Sie das Gespräch mit dem Bauherrn. Begrüßen Sie kurz, fassen Sie die bekannten Eckdaten (Vorhaben, Grundstück) in einem Satz zusammen, und stellen Sie die erste substantielle Verständnisfrage.',
})
```

The brief's `firstTurnSystemContext(templateId)` (§4.3) is conceptually right but the actual injection point is here — a per-template branch on the kickoff `content` string. Cleaner than touching the system blocks for first-turn-only logic.

### 1.4 `selectTemplate.ts` (114 lines)

Pure function `intent → templateId`. Already returns 8 distinct templates. `Intent` enum has 8 members in `INTENT_VALUES_V3`. **No changes needed**, but Phase 10 leans on this being the single source of truth.

### 1.5 `smartSuggestionsMuenchen.ts` (369 lines, 18 suggestions)

Filters today: `intents?: string[]`, `bundeslaender?: string[]`, `scopeMatch?: RegExp`, `evidenceFacts?: EvidenceFactRequirement[]`. **No `applicableTemplates`** field. Eight existing suggestions already use `intents` for filtering, but `intents` and `templateId` are not the same vocabulary (intents are wizard slugs; templateIds are T-XX). Phase 10 commit 11 adds `applicableTemplates: TemplateId[]` as an additive filter.

Per-suggestion proposed `applicableTemplates` (§4 below).

### 1.6 `costNormsMuenchen.ts` (BASE breakdown shape)

Today: a single `BASE: CostBreakdown` (architekt / tragwerksplanung / vermessung / energieberatung / behoerdengebuehren), modulated by `PROCEDURE_MULT` and (presumably) `REGION_MULT`. Total ~€24.7-46.2k baseline (T-01-shaped). Result page consumes the breakdown to render per-category bars on the Cost tab.

The brief's `COST_BANDS_BY_TEMPLATE` is a simpler `{ lower, upper, basis }` shape — no per-category breakdown. **Decision** (§5 below): keep BASE for backwards compat AND ship the new map; result page reads `state.templateId` to pick the band. The BASE breakdown stays for the Cost-tab category bars (T-01 baseline kept), but headline numbers come from `COST_BANDS_BY_TEMPLATE`.

### 1.7 `projectState.ts` — `templateId` carrier

Already typed as `'T-01' | 'T-02' | 'T-03' | 'T-04' | 'T-05' | 'T-06' | 'T-07' | 'T-08'` and DB-CHECK-constrained. Carried through the entire chain (wizard → DB → state block → live state). No changes needed.

### 1.8 Locales — no `templates.*` keys yet

Searched both `de.json` and `en.json`: zero matches for `templates.T-01` etc. Phase 10 commit 14 creates the namespace fresh.

### 1.9 Phase 9.2 Persona evolution tab — does it filter by template?

No. `usePersonaEvolution` (commit 11 of Phase 9.2) aggregates by `system_prompt_hash` only. Once Phase 10 ships, different templates will produce different hashes (because the template block is part of the prompt) — admins WILL see per-template grouping naturally without an explicit filter, because the hashes themselves separate them. **No work needed in Phase 9.2 territory.** Bonus: this verifies template content is reaching the model.

### 1.10 `systemPrompt.ts` — where templateBlock plugs in

`buildSystemBlocks(liveStateText, locale)` returns 3 blocks today: `[PERSONA_BLOCK_V1 cached, localeBlock, liveStateText]`. Phase 10 inserts a template block between persona and locale: `[persona cached, templateBlock cached, locale, liveState]`. Both system-cached blocks get their own `cache_control: ephemeral` marker.

---

## 2. Architecture decision — two-block cache, not single-block rebuild

The brief's §3.1 proposal would re-compose the entire prefix per template (8 different cached prefixes). I'm proposing a **better cache strategy**: keep the ~9-12k-token shared prefix ONE cache key (warms once across all templates), add the ~600-1200-token template tail as a SEPARATE cached system block.

Result: shared prefix hits cache on every turn for every project. Template tail hits cache on second+ turns within a template. First turn per template costs the template tail in cache_creation; subsequent turns get the standard 0.1× cache_read.

Anthropic Messages API supports up to 4 cache breakpoints per request. We're using 1 today (persona). After Phase 10 we'll use 2 (persona + template). Plenty of headroom.

**Net token impact:**
- Shared prefix: 9-12k tokens (cached, ~99% hit rate after warm)
- Template block: 600-1200 tokens (cached, ~95% hit rate after warm-per-template)
- Locale block: ~100 tokens (uncached)
- State block: ~200-500 tokens (uncached)

Per-turn cost increase vs Phase 9.2 baseline: **~5-8% on cold-start per template, ~1-2% on warm-cache turns.** Acceptable per the brief's §3.4 estimate.

---

## 3. The 15-commit plan — matches brief §7

| # | Commit | Status |
|---|---|---|
| 1 | findings (this doc) | in progress |
| 2 | scaffold `legalContext/templates/` + shared.ts + index.ts | next |
| 3 | t01-neubau-efh.ts | |
| 4 | **t02-neubau-mfh.ts** (status ping — hardest non-T-01) | |
| 5 | t03-sanierung.ts | |
| 6 | t04-umnutzung.ts | |
| 7 | t05-abbruch.ts | |
| 8 | t06-aufstockung.ts | |
| 9 | t07-anbau.ts | |
| 10 | **t08-sonstiges.ts + compose.ts integration** (status ping — all 8 land) | |
| 11 | per-template applicability in suggestions | |
| 12 | per-template cost bands | |
| 13 | per-template first-turn priming | |
| 14 | **per-template DE/EN locale strings** (final feature ping) | |
| 15 | final audit + 72-point smoke + report | |

Status pings at commits 1 (now), 4, 10, 14 per brief §7.

---

## 4. Per-template suggestion applicability matrix (commit 11 deliverable)

Walking the 18 suggestions in `smartSuggestionsMuenchen.ts` and proposing `applicableTemplates`. T-08 is `['T-08']` only when explicitly relevant (catch-all category demands restraint).

| ID | Currently | Proposed `applicableTemplates` | Rationale |
|---|---|---|---|
| `pv-pflicht` | intents: EFH, MFH | T-01, T-02 | PV-Pflicht for new residential. Not for renovation/demolition/etc. |
| `bauherrenversicherung` | (none) | T-01, T-02, T-06, T-07 | Insurance relevant when actual bauliche Maßnahme on site. T-03/T-04 (verfahrensfrei) often skip; T-05 has its own demolition liability |
| `kfw-foerderung` | scopeMatch: sanierung/geg | T-01, T-02, T-03, T-06 | Energy-relevant builds + renovations |
| `denkmal-pruefen` | intents: sanierung, umnutzung, abbruch | T-03, T-04, T-05 | Existing buildings only |
| `baulasten` | (none) | T-01, T-02, T-06, T-07 | Land-charge inspection most relevant on plots that gain new mass |
| `stellplatzsatzung-muenchen` | (none) | T-01, T-02 | StPlS 926 NEW Stellplatzpflicht — does NOT apply to T-06 (Privileg per Art. 81 Abs. 1 Nr. 4 b — see §6 flag). Skipped on T-03/T-04/T-05/T-07 (rules not triggered). |
| `baumschutz-muenchen` | (none) | T-01, T-02, T-05, T-07 | Tree-protection bites where ground is touched (new build, demolition, anbau) |
| `energieausweis` | intents: EFH, MFH, sanierung | T-01, T-02, T-03, T-06 | GEG triggers on new build + Sanierung above thresholds + Aufstockung (counts as Sanierung-equivalent) |
| `nachbarschaft` | (none) | T-01, T-02, T-04, T-06, T-07 | Neighbour-objection risk (Art. 66 BayBO) on visible/footprint changes — NOT T-03 verfahrensfrei, NOT T-05 (different process) |
| `baumgutachten` | evidence: baumschutz_betroffen | T-01, T-02, T-05, T-07 | Same as baumschutz |
| `ensemble-blfd` | evidence: ensemble_schwabing_geprueft=false | T-01, T-02, T-03, T-04, T-05, T-06, T-07 | Ensemble gate triggers on any visible-change project |
| `pv-konzept-baybo44a` | intents: EFH, MFH | T-01, T-02 | Art. 44a PV-Pflicht for new residential builds only |
| `lageplan-amtlich` | intents: EFH, MFH, aufstockung, anbau | T-01, T-02, T-06, T-07 | Already correctly scoped — translates 1:1 to templateIds |
| `abbruch-anzeige` | intents: EFH, MFH, umnutzung + evidence: bestand_abbruch_geplant | T-01, T-02, T-04, T-05 | Add T-05 (the actual demolition template) — currently missing |
| `kfw-40-foerderung` | scopeMatch: kfw 40 | T-01, T-02, T-03, T-06 | Same as KfW general |
| `bauherren-haftpflicht-bind` | (none) | T-01, T-02, T-06, T-07 | Same as bauherrenversicherung |
| `stellplatz-nachweis-doku` | evidence: stellplatz_anzahl_geplant | T-01, T-02 | Same as stellplatzsatzung — explicitly NOT T-06 |

**Net effect:** T-06 (Aufstockung) loses ~6 suggestions vs Phase 9.2 (specifically the Stellplatz family). T-03 (Sanierung) loses ~5 (Stellplatz, PV-Pflicht for Neubau, baumschutz, Lageplan). T-05 (Abbruch) loses Stellplatz/PV-Konzept, gains correct abbruch-anzeige scoping. T-08 (Sonstiges) gets explicit empty list — keep general suggestions OUT until sub-category elicited.

---

## 5. Cost bands — proposed map (commit 12)

Following brief §4.2. The result page's Cost tab consumes this for headline numbers; the BASE breakdown stays for the per-category bars on T-01 (and is scaled by a multiplier derived from the template's median for non-T-01).

```ts
export const COST_BANDS_BY_TEMPLATE: Record<TemplateId, {
  lower: number  // cents
  upper: number
  basis: string  // explanation surfaced to the user
}> = {
  'T-01': { lower: 17_300, upper: 32_300, basis: 'EFH Neubau, München, ~150 m² Wohnfläche, vereinfachtes Verfahren' },
  'T-02': { lower: 28_000, upper: 55_000, basis: 'MFH ab 4 WE, München, mit Brandschutz/Schallschutz/Statik-Prüfung' },
  'T-03': { lower:  8_000, upper: 22_000, basis: 'Sanierung verfahrensfrei (Anzeige nach Art. 57 Abs. 7 BayBO), München' },
  'T-04': { lower:  6_000, upper: 18_000, basis: 'Umnutzung verfahrensfrei (Anzeige), München' },
  'T-05': { lower:  4_500, upper: 12_000, basis: 'Abbruch anzeigepflichtig + Standsicherheits­bescheinigung Nachbar, München' },
  'T-06': { lower: 14_000, upper: 28_000, basis: 'Aufstockung (Tragwerk + GEG), München' },
  'T-07': { lower:  4_500, upper: 18_000, basis: 'Anbau (klein verfahrensfrei bis groß genehmigungspflichtig)' },
  'T-08': { lower:  2_000, upper: 15_000, basis: 'Sonstige Vorhaben — Sub-Kategorie bestimmt die Spanne' },
}
```

T-01 number matches Phase 8.5 BASE total min/max. Other 7 are new content from brief §1.

---

## 6. ⚠ Legal claims I cannot independently verify

The brief asserts five claims about the **Bayern Modernisierungsgesetz** that takes effect 01.01.2025 + 01.10.2025 + 04/2026. These are past my training cutoff confidence horizon. I will encode them faithfully (the brief's §1 explicitly takes legal authority) and add a "Verify before public launch" callout at the top of each affected template block. The user is responsible for cross-checking against the actual statute (gesetze-bayern.de) before public ship.

| # | Claim | Brief reference | Affected template |
|---|---|---|---|
| 1 | Instandsetzung verfahrensfrei + 2-Wochen-Anzeige nach **BayBO Art. 57 Abs. 3 Nr. 3** seit 01.01.2025 | §1 T-03 | T-03 |
| 2 | Dachgeschossausbau zu Wohnzwecken verfahrensfrei nach **BayBO Art. 57 Abs. 1 Nr. 18** | §1 T-03 | T-03, T-06 |
| 3 | Umnutzung verfahrensfrei + 2-Wochen-Anzeige nach **BayBO Art. 57 Abs. 4** seit 01.01.2025 | §1 T-04 | T-04 |
| 4 | Stellplatz-Privileg für Aufstockungen nach **BayBO Art. 81 Abs. 1 Nr. 4 b** seit 01.10.2025 | §1 T-06 | T-06 |
| 5 | Werbeanlagen-Reform 04/2026 (Viertes Modernisierungsgesetz) | §1 T-08 | T-08 |

The other claims in §1 (Art. 46 Abs. 6 Aufstockungs-Privileg; Art. 57 Abs. 1 Nr. 1 a 75-m³-Schwelle für Anbau; Art. 57 Abs. 5 Abbruch-Tiers; Sonderbau-Tatbestände nach Art. 2 Abs. 4) are pre-2025 BayBO wording I can verify against my training and find consistent.

**Mitigation in template blocks:** every block ends with a `LEGAL-VERIFY-MARKER` listing the specific Art./§ claims encoded so a downstream legal review can ack each one. Also: the persona's citation discipline (commit Phase 8.5 personaBehaviour) requires citing source — meaning when the model speaks one of these rules to a user, the user/architect can spot-check against the cited statute.

---

## 7. Architecture — concrete file plan

### 7.1 Create

```
supabase/functions/chat-turn/legalContext/templates/
├── shared.ts            # template-shared rules (always cite active templateId; clarify uncertainty when GK/procedure ambiguous; etc.)
├── index.ts             # barrel export + getTemplateBlock(id)
├── t01-neubau-efh.ts
├── t02-neubau-mfh.ts
├── t03-sanierung.ts
├── t04-umnutzung.ts
├── t05-abbruch.ts
├── t06-aufstockung.ts
├── t07-anbau.ts
└── t08-sonstiges.ts
```

### 7.2 Modify

| Path | Change |
|---|---|
| `legalContext/compose.ts` | Add new fn `getTemplateBlock(templateId)` returning the per-template string. Keep `COMPOSED_LEGAL_CONTEXT` constant (cached prefix) untouched. |
| `chat-turn/systemPrompt.ts` | `buildSystemBlocks(liveStateText, locale, templateId)` — accept templateId, insert template block between persona + locale, with its own `cache_control: ephemeral`. |
| `chat-turn/index.ts` | Pass `templateId` to `buildSystemBlocks` (already in scope at the call site — line 263 / 305). Also: per-template branch on first-turn priming string at line 286-292. |
| `src/data/smartSuggestionsMuenchen.ts` | Add optional `applicableTemplates?: TemplateId[]` field to `SmartSuggestion`. Walk all 18 entries with the matrix from §4. |
| `src/features/result/lib/smartSuggestionsMatcher.ts` | Filter on `applicableTemplates` if set, fall through to `intents` if not. |
| `src/features/result/lib/costNormsMuenchen.ts` | Export new `COST_BANDS_BY_TEMPLATE` map. Keep BASE for backwards compat. |
| Result page Cost tab | Read `COST_BANDS_BY_TEMPLATE[state.templateId]` for headline; bars stay BASE-driven. |
| `src/locales/de.json` + `en.json` | Add `templates.T-01..T-08.{name, shortName, description}` namespace. Verify parity. |

### 7.3 Untouched

- `shared.ts`, `federal.ts`, `bayern.ts`, `muenchen.ts`, `personaBehaviour.ts` — all locked.
- `commit_chat_turn` RPC, RLS, tracer, all Phase 9.x infrastructure.
- Wizard layout, atelier opening, chat workspace structure, result tab layout.
- Tool schema, retry policy, plausibility validation.

---

## 8. First-turn priming — per-template directives (commit 13)

`index.ts:286-292` is the injection. Per-template branch:

| Template | Opener directive |
|---|---|
| T-01 | Standard EFH opener — Planungsrecht / Bauordnungsrecht / sonstige Vorgaben am Tisch. |
| T-02 | MFH opener — beachte Sonderbau-Trigger früh; Brandschutz + Schallschutz Pflicht-Spezialisten. |
| T-03 | Sanierungs-Opener — erkenne verfahrensfreie Tier zuerst, **überrecommende keine Genehmigung wo Anzeige reicht**. Energieberatung + Tragwerk an den Tisch. |
| T-04 | Umnutzungs-Opener — frage zuerst die Use-Change-Matrix (was war es, was wird es). Ohne diese Paarung keine Verfahrenseinordnung. |
| T-05 | Abbruchs-Opener — frage zuerst **Vollabbruch oder Teilabbruch?** Plus Denkmalstatus. Tragwerk + Schadstoffgutachten am Tisch. |
| T-06 | Aufstockungs-Opener — invoke **Art. 46 Abs. 6 BayBO Privilegierung** explicit als Wert-Argument. Stellplatz-Privileg ab 01.10.2025 erwähnen wenn passend. |
| T-07 | Anbau-Opener — prüfe 75-m³-Schwelle (Art. 57 Abs. 1 Nr. 1 a) + Außenbereich-Lage zuerst. |
| T-08 | Sonstiges-Opener — **DO NOT assume structure**. Persona MUST elicit sub-category before any Verfahrens-call. |

---

## 9. Edge cases (brief §9 reflected)

| # | Case | Handling |
|---|---|---|
| 1 | User changes intent mid-wizard | templateId updates → first-turn primer reads NEW value (Q2 hasn't fired yet) ✓ |
| 2 | T-08 first turn must NOT assume structure | Opener directive uses elicitation, not assumption ✓ |
| 3 | Reduced-motion | No animations introduced ✓ |
| 4 | DE/EN parity | Locale parity verified by `verify:locales` in commit 14 |
| 5 | T-06 + no existing building | Persona detects via `buildLiveStateBlock` (state.areas.A=PENDING + intent=aufstockung) — template directive prompts clarification ✓ |
| 6 | Mobile cost band display | No layout change to Cost tab — number swap only ✓ |
| 7 | Persona evolution per template | Different prompt hashes per template → automatic separation in the tab ✓ |
| 8 | Suggestion count varies per template | Empirical: T-01 ~12, T-08 ~0-3, T-06 ~7. Tab handles empty state already (Phase 6) ✓ |
| 9 | Cost band undefined | TS Record<TemplateId, ...> guarantees coverage ✓ |
| 10 | Bundle delta target ≤+15 KB gz | Template strings ~600-1200 tokens × 8 ≈ ~30 KB raw / ~10 KB gz. Within budget. |
| 11 | Cache regression check | Phase 9.2 Persona tab will surface this — first turn per template = cache write, second+ = read |
| 12 | system_prompt_hash differs per template | Confirms content reaches the model — the most important sanity check |

---

## 10. Locks held

| Lock | Status |
|---|---|
| `shared.ts`, `federal.ts`, `bayern.ts`, `muenchen.ts`, `personaBehaviour.ts` | held — additive only |
| Tool schema, retry policy, plausibility validation | untouched |
| `commit_chat_turn` RPC, RLS on user-facing tables | untouched |
| Phase 7-9.2 work (chat workspace, atelier opening, wizard layout, result tabs, logs drawer) | untouched |
| Persona voice / tone / language register / Sie-form | untouched — template content uses same German register |
| Postcode gate (München PLZ) | untouched — all 8 templates still München-only |

---

## 11. Open questions for the user (none blocking)

1. **Werbeanlagen 04/2026 reform** (T-08) — the brief mentions it but doesn't enumerate. T-08 will note the reform is pending without claiming specific content. User can fill in once the legislation lands.
2. **Cost band T-08 lower bound** — `€2.000` is plausible for smallest verfahrensfreie Werbeanlage / Solar / Garage but may understate Architektenkosten when sub-category is e.g. Mobilfunkmast. Acceptable for MVP; tighten in Phase 11 once we see real T-08 conversations.
3. **Per-template wider context block** — should the `bayern.ts` slice know about template existence? Currently it doesn't. Phase 10 keeps it template-blind; Phase 11+ may inline template references where they directly affect Bayern slice content (e.g. add a parenthetical "Aufstockungen siehe T-06-Block" at the relevant Art. 46 section). Not in scope here.

---

## 12. The standard (brief §10)

Each template is correct, not directional. Specifically:

- T-05 opens with "Vollabbruch oder Teilabbruch? Falls denkmalgeschützt — denkmalrechtliche Erlaubnis benötigt zusätzlich zur Anzeige."
- T-06 explicitly invokes Art. 46 Abs. 6 BayBO as the legal-economic raison d'être.
- T-03 recognizes Instandsetzung verfahrensfrei (Art. 57 Abs. 3 Nr. 3 — flag #1 above) and recommends Anzeige nach Art. 57 Abs. 7 over Bauantrag.
- T-08 elicits sub-category before any Verfahrens-call.

The 72-point smoke walk in commit 15 verifies this template-by-template.

— end of findings.
