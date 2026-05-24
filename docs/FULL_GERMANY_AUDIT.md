# FULL-GERMANY DEEP-DIVE AUDIT

**Repo:** `/Users/rutikerole/Planning_Matrix` · **HEAD:** `c374ef7` (branch `main`) · **Tag:** v1.0.24
**Date:** 2026-05-24 · **Mode:** READ-ONLY. No production code modified. Bayern SHA verified MATCH at start and end.
**Method:** 12 parallel read-only sub-agents (breadth-first) + lead depth-trace of the Bundesland data flow + a live read-only probe of the production Supabase DB. Law citations were checked for **internal consistency only** — no external/web verification — so every article-number claim against current German law is flagged **UNVERIFIED** (see Appendix B). Where docs and code disagree, **code is treated as ground truth**.

---

## 0. EXECUTIVE SUMMARY

**Verdict for full-Germany ship: 🔴 RED.** "Bayern × München" is the only path that is substantive, internally consistent, and (partially) exercised in production. The other 15 Bundesländer range from *honest-but-thin stubs* (4 substantive non-Bayern states) to *ships-wrong-information-today* (the 11 minimum stubs + all Stadtstaaten). The architect "legal shield" — the manager's headline feature — is **unreachable end-to-end through the shipped UI** and has **zero production usage**. Multiple deterministic surfaces (procedure citation, cost calendar, region multiplier) inject Bayern/München-specific or fabricated content onto every non-München project.

### Production reality (live read-only DB probe, 51 projects total)

| Dimension | Distribution | Implication |
|---|---|---|
| `bundesland` | bayern 46, hessen 2, nrw 2, berlin 1 | **90% Bayern; only 5 non-Bayern projects ever created.** The full-Germany surface is essentially unexercised in prod. |
| `template_id` | T-01 35, T-03 9, T-02 4, T-07 2, T-05 1 | **T-04, T-06, T-08 never used in production.** |
| `city` | muenchen 31, erlangen 7, null 13 | Bayern-centric. |
| `project_members` | **0 rows** | Architect invite flow never exercised. |
| `qualifier_transitions` | **0 rows** | Architect verification never run with real data. |
| `project_files` | **0 rows** | File-upload path never exercised in prod. |
| `project_events` / `messages` | 210 / 299 rows | Normal chat traffic, Bayern-dominated. |

> Note: an earlier probe of a table named `share_tokens` returned 404 — that was a **probe artifact**; the real table is `project_share_tokens` (migration `0006`) and exists.

### Red/Yellow/Green per Bundesland (effective *ship* readiness — what the user actually receives)

Content tier is from the state files; the **ship color** factors the cross-cutting deterministic bugs (Bug 26 fabricated citation, Bug 27 München calendar) that degrade every non-München project.

| # | State (code) | English | Content tier | Ship color | Why |
|---|---|---|---|---|---|
| 1 | bayern (München) | Bavaria | Full | 🟢 GREEN | Only audited-clean path. Caveat: all Bayern → München city law (Bug 42). |
| 2 | nrw | North Rhine-Westphalia | Substantive | 🟡 YELLOW | Real content + `resolveProcedure` covers neubau/sanierung; but München calendar leak (Bug 27). |
| 3 | bw | Baden-Württemberg | Substantive | 🟡 YELLOW | Strong content (GK 1–5 enumerated); generic procedure stub + München calendar. |
| 4 | hessen | Hesse | Substantive | 🟡 YELLOW | Real content; generic procedure stub + München calendar. |
| 5 | niedersachsen | Lower Saxony | Substantive | 🟡 YELLOW | Real content; generic procedure stub + München calendar. |
| 6 | sachsen | Saxony | Stub | 🔴 RED | Empty allowlist (no Layer-C guard) + fabricated `§ 65 BauO SACHSEN` + München calendar. |
| 7 | sachsen-anhalt | Saxony-Anhalt | Stub | 🔴 RED | Same as Sachsen. |
| 8 | thueringen | Thuringia | Stub | 🔴 RED | Same. |
| 9 | rlp | Rhineland-Palatinate | Stub | 🔴 RED | Same. |
| 10 | saarland | Saarland | Stub | 🔴 RED | Same. |
| 11 | sh | Schleswig-Holstein | Stub | 🔴 RED | Same. |
| 12 | mv | Mecklenburg-W.Pomerania | Stub | 🔴 RED | Same + LBO short-name contradiction (Bug 45). |
| 13 | brandenburg | Brandenburg | Stub | 🔴 RED | Same. |
| 14 | berlin | Berlin | Stadtstaat stub | 🔴 RED | `§ 65 BauO BERLIN` fabricated (real name is *BauO Bln*) + München calendar. cityBlock=null handled safely. |
| 15 | hamburg | Hamburg | Stadtstaat stub | 🔴 RED | `§ 65 BauO HAMBURG` fabricated (real name *HBauO*). |
| 16 | bremen | Bremen | Stadtstaat stub | 🔴 RED | `§ 65 BauO BREMEN` fabricated (real name *BremLBO*). |

**Tally: 1 GREEN · 4 YELLOW · 11 RED.**

### Red/Yellow/Green per template

| # | Template | Persona prompt | Cost engine | PDF procedure/docs | Color |
|---|---|---|---|---|---|
| T-01 | EFH-Neubau | Strong | Works (regex+map) | Generic for Bayern | 🟢 GREEN |
| T-02 | MFH | Strongest | guess-map | Generic | 🟢 GREEN |
| T-03 | Sanierung | Strong | **Empirically confirmed** | NRW-only encoded | 🟢 GREEN |
| T-04 | Umnutzung | Strong | guess-map (unverified) | Generic | 🟡 YELLOW |
| T-05 | Abbruch | Strong | guess-map; m³→area mismatch | Generic | 🟡 YELLOW |
| T-06 | Aufstockung | Strong | guess-map (unverified) | Generic | 🟡 YELLOW |
| T-07 | Anbau | Strong | guess-map (unverified) | Generic | 🟡 YELLOW |
| T-08 | Sonstiges | Strong, graceful | generic | Generic | 🟢 GREEN |

No template is RED — the persona layer branches genuinely per template; the YELLOWs are downstream (cost guess-maps unverified for T-04..T-07; PDF procedure/document sections are Bayern-template-blind for all but NRW). T-04/T-06/T-08 have **never** been used in production.

### Top 5 P0 blockers for full-Germany ship

1. **Architect verification flow is unreachable end-to-end (Bug 29).** No component calls `share-project` in CREATE mode; the owner's "Send to architect" modal mints an unrelated 30-day **read-only** `create-share-token` link instead (`SendToArchitectModal.tsx:64`). `project_members`/`qualifier_transitions` are empty in prod. The legal shield the manager cares about does not function through the UI. **— RESOLVED v1.0.27 (C7): owner-side share-project CREATE caller wired (architectInviteApi + InviteArchitectModal + result-page CTA); reachable e2e through the UI (validation pending smoke walk).**
2. **`resolveProcedure.ts:294` fabricates invalid citations that ship (Bug 26).** The generic branch emits `§ 65 BauO ${bundesland.toUpperCase()}` → `§ 65 BauO BERLIN`, `§ 65 BauO HAMBURG`, `§ 65 BauO MV` — none are valid LBO short names — and this is threaded into the PDF Areas-B body, Procedure card, and Key-Data row. Fires for all 11 stub states and all non-NRW intents. **— FULLY CLOSED 2026-05-24 (v1.0.26 / C11): the generic branch + Executive footer + structural cost-item are all driven off `getStateLocalization`; verified by render across all 16 Bundesländer (`smoke:pdf-matrix`, 16/16 green DE+EN), now CI-gated.**
3. **Cost & Timeline tab renders München authority closures on every state (Bug 27).** `composeCalendar.ts:37` has no bundesland parameter; it matches `MUENCHEN_AUTHORITY_CLOSURES` unconditionally, so a Berlin/NRW project is told its approval slips because of the **München** Bauamt's Christmas closure (`CostTimelineTab.tsx:281-289`).
4. **11 of 16 states have empty citation allowlists → no hallucination guard (Bug 38).** Layer-C positive-list enforcement short-circuits for stub states (`citationLint.ts:642`), so the persona can emit any § for those 11 states with no positive defense — only fail-soft negative filters + the Vorläufig footer.
5. **Schema + chat-layer encode "everything is Bayern" (Bugs 40, 50, 17/20-chat).** `projects.bundesland` is free `text`, NOT NULL, default `'bayern'`, **no CHECK** (`0003:58`); `resolveStateDelta` silently falls back to `BAYERN_DELTA` for unknown codes (`legalRegistry.ts:104`); and the persona prompt's behavioural rules + every template tail are **Bayern-only and never state-parameterized** (`personaBehaviour.ts:191`, `compose.ts:68`). The chat-side of Bug 17/Bug 20 is therefore structurally open for all 15 non-Bayern states.

### Top 5 P1 visible defects

1. **`REGION_MULT` key-case bug (Bug 28).** `costNormsMuenchen.ts:130` keys `'Bayern'` (capital) but receives lowercase `'bayern'` → multiplier is dead code for all states **and** the raw code is shown to users as "Bundesland-Faktor **bayern**" (`:236-237`).
2. **Owner result page has no loading/error state (Bug 30).** `ResultPage.tsx:41` returns `null` during fetch → blank screen; no error UI (shared-mode page is the correct reference).
3. **PDF is 11 sections, not 12 (Bugs: §6 missing).** No Section XII Risk Register, no Vorhabensbeschreibung narrative, KfW BEG 458 is abstract glossary text with no numbers. The Risk Register exists only as a result-page card.
4. **Runtime leak guards are PDF-export-only (Bug 31).** `crossStateBleedGuard`/`germanLeakGuard` run only in `exportPdf.ts`; the live result-page UI and the persisted `projects.state` get **zero** runtime sanitization. The on-screen surface is what the user sees first.
5. **Architect verification erodes silently (Bug 32).** Owner edits via chat re-downgrade architect-verified facts to ASSUMED with no audit linkage; the owner's Vorläufig footer is not reactive (no realtime, `useProject` staleTime 60s); the aggregate footer can never be cleared if any static LEGAL item exists (Bug 33). **— RESOLVED v1.0.27 (C8): reactive footer via focus-poll + best-effort projects realtime (migration 0035); server-side erodeVerificationOnEdit downgrade on owner edit; computeVerificationRollup + progress indicator + PDF footer flip for Bug 33.**

### Estimated sprint count to "manager-perfect" full Germany

**~7 sprints** (3-commit shape, hard gates per commit), with two caveats:
- The **long pole is legal content**: expanding 11 stub states to persona-grade + populating their citation allowlists is research-bound, not just engineering, and likely needs legal sourcing per state. If that is descoped to "honestly-framed stub that ships no fabricated citations," the engineering drops to ~4 sprints.
- Sprint 1 (deterministic-surface state-correctness: Bugs 26/27/28/35/37) and Sprint 2 (architect flow: Bugs 29/32/33/34) are the highest-leverage and unblock the "legal shield" demo. See Appendix C for sequencing.

---

## 1. BAND 1 — REPOSITORY MAP & ARCHITECTURE GROUND TRUTH

### Directory map (`src/`)
- `app/` — SPA entry: `router.tsx` (react-router v7, lazy admin/architect consoles) + `providers.tsx`.
- `components/` — shared UI (`SEO`, `SiteFooter`, `SkipLink`, `TouchTarget`) + `shared/` guards/skeletons + `ui/` primitives.
- `data/` — precomputed Munich-centric catalogs: `riskCatalog.ts`, `costRationales.ts`, `muenchenPlzDistricts.ts`, `factsMuenchen.ts`, `smartSuggestionsMuenchen.ts`, `muenchenAuthorityCalendar.ts`, `timelineAnnotations.ts`.
- `features/` — `admin` (Atelier Console, admin-gated), `architect` (Phase 13 verification, designer-gated), `auth`, `chat` (Chamber workspace + **the PDF generator under `chat/lib/`**), `cookies` (consent), `dashboard`, `landing`, `legal`, `loader`, `not-found`, `project` (empty), `result` (six result tabs), `wizard`.
- `legal/` — three-layer legal knowledge: constitutional (`shared.ts`, `federal.ts`, `personaBehaviour.ts`, `bayern.ts`, `muenchen.ts`), state deltas (`states/*`), templates (`templates/t01..t08`), helpers (`compose.ts`, `legalRegistry.ts`, `resolveProcedure.ts`, `requiredDocuments.ts`, `stateLocalization.ts`, `stateCitations.ts`, `crossStateBleedGuard.ts`, `germanLeakGuard.ts`, `systemFlagFilter.ts`, `deriveGebaeudeklasse.ts`).
- `hooks/` — `useAuth`, `useIsAdmin`, `useIsDesigner`, `useSession`, `useEventEmitter`.
- `lib/` — utilities incl. `addressParse.ts` + `addressParser.ts` (both active, see below), `fontLoader.ts`, `winAnsiSafe.ts`, `qualifierNormalize.ts`, `projectStateHelpers.ts`, `errorTracking.ts`, `analytics.ts`, `telemetry.ts`, `export/` (JSON/MD/filename only — **not PDF**).
- `locales/`, `stores/` (`authStore`, `chatStore`), `styles/`, `types/`.

### SPA route table (`src/app/router.tsx`)
Public: `/`, `/sign-up`, `/sign-in`, `/forgot-password`, `/reset-password`, `/check-email`, `/verify-email`, `/result/share/:token` (SharedResultPage, RLS-gated), `/impressum`, `/datenschutz`, `/agb`, `/cookies`, `*` (404).
Auth-gated (`ProtectedRoute`): `/dashboard`, `/projects/new` (Wizard), `/projects/:id` (Chat, +`ProjectGuard` owner), `/projects/:id/overview` (redirect), `/projects/:id/result` (Result, +`ProjectGuard`).
Admin-gated (`AdminGuard`, RLS `logs.is_admin()`): `/admin/*` (logs/projects/turns/stream/cost/search).
Designer-gated (`ArchitectGuard`, `profiles.role='designer'`): `/architect/*` → `/architect` (Dashboard), `/architect/projects/:projectId/verify` (VerificationPanel). `/architect/accept?token=…` sits **outside** the guard deliberately (`router.tsx:180`).

### Edge functions (`supabase/functions/`, 8)
`chat-turn` (per-turn conversation; reads projects/messages, writes messages + projects.state + project_events via atomic RPC), `bplan-lookup` (München WMS B-Plan, read-only, rate-limited), `create-share-token` (30-day **read-only** share link → `project_share_tokens`), `get-shared-project` (anon read via service role), `share-project` (Phase 13 architect invite CREATE/ACCEPT → `project_members`), `verify-fact` (architect promotes a qualifier to DESIGNER+VERIFIED), `delete-file`, `signed-file-url`.

### Dead code / duplication
- `addressParse.ts` (utility extractors) and `addressParser.ts` (blob parser) are **both active and distinct** — not duplication. `dashboard/lib/projectName.ts:25` is an intentional documented re-export.
- No `// DEPRECATED`/`// TODO: remove` dead modules found in sampled lib/features.

### "LOCKED" surfaces
There are **no literal `LOCKED`/`DO NOT EDIT`/`Phase 7.9` lock markers** in code (Band 1 grep). The Phase-7 Chamber surfaces the brief calls LOCKED (Spine `chat/components/Chamber/Spine/Spine.tsx`, MatchCut, Astrolabe, CapturedToast) carry phase-design comments but no enforced lock. "magnetic focus" and "Stand-up" terms do not appear in code as named surfaces. **The lock is a working convention, not a code-enforced invariant** — worth knowing before relying on it.

### Doc-vs-code drift (load-bearing docs only)
- **`DELIVERABLE_GAP_AUDIT.md:73-77`** claims the wizard hardcodes `bundesland:'bayern'` at `useCreateProject.ts:184`. **STALE** — code reads `input.bundesland` (`useCreateProject.ts:255`) since v1.0.6; the doc predates the fix. (Bug 50.)
- **`HANDOFF.md`** "Bayern-only B2B" scope framing — **STALE** vs the 16-state registry + 5 non-Bayern prod projects.
- **`legalRegistry.ts:99` and `systemPrompt.ts:232`** in-code comments both assert "the wizard hardcodes 'bayern' … production traffic never hits the fallback." **STALE / FALSE** — the dropdown is user-overridable + PLZ-auto-detected and prod has hessen/nrw/berlin rows. (Bug 50.)
- Bug D wizard integration (`BACKLOG.md:87-94`) — **VERIFIED MATCH** with `useCreateProject.ts:145-186`.

---

## 2. BAND 2 — BUNDESLAND RESOLUTION DATA FLOW (END-TO-END)

Traced firsthand by the lead. Every hop, with the leak verdict.

| Hop | File:line | Behaviour | Bayern leak? |
|---|---|---|---|
| 1. Wizard dropdown | `QuestionPlot.tsx:23-40,433-451` | 16-option select, user-overridable. | No (all 16 selectable). |
| 2. PLZ auto-detect | `QuestionPlot.tsx:180-195` → `inferBundeslandFromPostcode.ts:74-81` | First-two-digits → Bundesland; **fallback returns `'bayern'`** on unparseable/unknown PLZ (`:76,78,80`). | **Yes (residual B04)** — malformed address silently → bayern, not "unknown". |
| 3. Wizard store default | `useWizardState.ts:32` | `bundesland: 'bayern'` initial state. | **Yes** — untouched dropdown ships bayern. |
| 4. Submit gate | `QuestionPlot.tsx:260,268-271` | `isMunich` hardcoded; non-München requires "outside München" acknowledgement. | München-centric UX friction for all non-München (Bug 46). |
| 5. DB write | `useCreateProject.ts:255-256` | `bundesland: input.bundesland`; `city: bundesland==='bayern' ? 'muenchen' : null`. | **Yes** — every Bayern project forced to München city (Bug 42). Mitigation: PLZ↔Bundesland mismatch seeds an ASSUMED fact (`:173-186`). |
| 6. DB column | `0003:58` | `text NOT NULL default 'bayern'`, **no CHECK**. | **Yes (schema-level, Bug 40)**. |
| 7. Registry resolve | `legalRegistry.ts:102-105` | `resolveStateDelta(code) ?? BAYERN_DELTA`. | **Yes** — unknown code → Bayern law silently (`:104`). Casing handled by `normalizeBundeslandCode`. |
| 8. Prompt compose | `compose.ts:64-71` | shared→federal→state.systemBlock→cityBlock?→persona→template→tail. cityBlock only Bayern→München (`:67`). | cityBlock null-safe; **persona + template blocks are Bayern-only regardless of state** (Bug 17/20-chat). |
| 9. Persona inject | `systemPrompt.ts:247-275` | 4 system blocks, 2 cache breakpoints; block 1 = `composeLegalContext(bundesland)`. | Bundesland reaches block 1; behavioural rules still Bayern-worded. |
| 10. Citation firewall | `citationLint.ts` | Layer A (Bayern structural) always; Layer B (per-state) skips home state; Layer C positive-list. **Observability/fail-soft, never blocks** (`:7-9`); **off for empty-allowlist stub states** (`:642`). | Wrong-state citations logged + downgraded, not blocked; stubs unprotected. |
| 11. PDF | `chat/lib/exportPdf.ts` + `pdfSections/*` | Reads `project.bundesland` via `getStateCitations`/`getStateLocalization`; `resolveProcedure`; München calendar (Bug 27). | No ungated hardcoded Bayern string in PDF, **but** fabricated `§ 65 BauO {CODE}` (Bug 26) + München calendar (Bug 27) + inconsistent null fallbacks (Bug 37). |

**Net:** the value reaches every consumer correctly when explicitly set, but Bayern is the silent default at three points (store, inference fallback, registry fallback) and the deterministic/persona layers still bake in München/Bayern specifics.

---

## 3. BAND 3 — 16-STATE COVERAGE MATRIX

Each state ships across **three independent registries** that must be read together: `states/<code>.ts` (LLM `StateDelta` + `allowedCitations`, registered in `legalRegistry.ts:51-68`), `stateLocalization.ts` (chamber, monument authority, procedure §§, cost factor), `stateCitations.ts` (form/structural/Abstandsflächen/DSchG §§). The same 5 states are substantive in all three; the other 11 are stubs in all three. **All article numbers below are UNVERIFIED against current law (internal-consistency check only).** LOC = lines of the `states/<code>.ts` file.

| # | State (code) | English | Tier | LOC | Citations populated? | Chamber | Authority | Cost factor | GK thresholds | Last verified | Risk |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | bayern | Bavaria | 1 | 84 (+897 imported) | Yes (`states/bayern.ts:25-73`) | ByAK | BLfD | HOAI baseline | Yes (Art. 2) | code-only | 🟢 |
| 2 | nrw | N.Rhine-Westphalia | 1 | 374 | Yes (`nrw.ts:336-364`) | AKNW | LVR/LWL | HOAI baseline | Partial (§50 Sonderbau) | code-only | 🟢content |
| 3 | bw | Baden-Württ. | 1 | 411 | Yes (`bw.ts:370-401`) | AKBW | LAD | HOAI baseline | **Yes (GK 1–5 verbatim)** | code-only | 🟢content |
| 4 | niedersachsen | Lower Saxony | 1 | 344 | Yes (`niedersachsen.ts:309-334`) | AKNDS | NLD | HOAI baseline | Partial (GK1–3) | code-only | 🟢content |
| 5 | hessen | Hesse | 1 | 461 | Yes (`hessen.ts:419-449`) | AKH | LfDH | HOAI baseline | Partial (§53, GK4/5) | code-only | 🟢content |
| 6 | sachsen | Saxony | 2 | 42 | **No (`[]`, sachsen.ts:41)** | AK (generic) | LfD (generic) | HOAI baseline | No | code-only | 🟡content/🔴ship |
| 7 | sachsen-anhalt | Saxony-Anhalt | 2 | 42 | No (`[]`) | AK | LfD | baseline | No | code-only | 🟡/🔴 |
| 8 | thueringen | Thuringia | 2 | 42 | No (`[]`) | AK | LfD | baseline | No | code-only | 🟡/🔴 |
| 9 | rlp | Rhineland-Palat. | 2 | 42 | No (`[]`) | AK | LfD | baseline | No | code-only | 🟡/🔴 |
| 10 | saarland | Saarland | 2 | 42 | No (`[]`) | AK | LfD | baseline | No | code-only | 🟡/🔴 |
| 11 | sh | Schleswig-Holstein | 2 | 42 | No (`[]`) | AK | LfD | baseline | No | code-only | 🟡/🔴 |
| 12 | mv | Meckl.-Vorp. | 2 | 42 | No (`[]`) | AK | LfD | baseline | No | code-only | 🟡/🔴 (Bug 45) |
| 13 | brandenburg | Brandenburg | 2 | 42 | No (`[]`) | AK | LfD | baseline | No | code-only | 🟡/🔴 |
| 14 | berlin | Berlin | 3 | 48 | No (`[]`, berlin.ts:47) | AK | LfD | baseline | No | code-only | 🟡/🔴 |
| 15 | hamburg | Hamburg | 3 | 46 | No (`[]`) | AK | LfD | baseline | No | code-only | 🟡/🔴 |
| 16 | bremen | Bremen | 3 | 45 | No (`[]`) | AK | LfD | baseline | No | code-only | 🟡/🔴 |

**Honesty findings:**
- All 11 stubs honestly self-frame as "in Vorbereitung / Mindest-Eckdaten" (e.g. `sachsen.ts:21-25`, `berlin.ts:24-28`) — so the **state-file content** is YELLOW, not RED.
- **No non-Bayern state file leaks Bayern/München/BLfD/Schwabing in its content.** Every non-Bayern state prepends `buildAntiBayernLeakBlock` (`_antiBayernLeak.ts:46-89`); the only BayBO occurrences in non-Bayern files are inside ✗-forbidden lists.
- The **ship color is worse than the content color** for stubs because of the deterministic-surface bugs (Bug 26 fabricated citation, Bug 27 München calendar) — see the executive matrix.
- Cost factor is the identical HOAI-Zone-III baseline for all 16 (`stateLocalization.ts:110-117`, stub `:388-391`) — no per-state cost differentiation by design.
- All 16 share the empty-`allowedCitations`-disables-Layer-C exposure for the 11 stubs.

---

## 4. BAND 4 — STADTSTAAT (CITY-STATE) CODE PATH

- **Implementation:** Berlin/Hamburg/Bremen set `cityBlock: null` (`berlin.ts:46`, `hamburg.ts:44`, `bremen.ts:43`); interface permits it (`_types.ts:79`). The single runtime guard is `compose.ts:67` `if (state.cityBlock) slices.push(...)` — **null-safe**.
- **No code path assumes cityBlock is non-null.** The only runtime `.cityBlock` read is the compose guard; PDF/result surfaces read `getStateCitations(bundesland).archivCity` / `getStateLocalization(...)`, and `archivCityFor` maps berlin→Berlin etc. (`stateCitations.ts:155-168`). **No crash risk.**
- **Wizard:** there is no city sub-question for any state, so picking Berlin trivially skips none; PLZ auto-detect covers Stadtstaaten; `city` is correctly set null for non-Bayern (`useCreateProject.ts:256`). But the **München-hardcoded submit gate** (Bug 46) forces a Berlin project through an "outside München, reduced data" acknowledgement.
- **Real Stadtstaat risk is not a crash — it's content:** the fabricated `§ 65 BauO BERLIN/HAMBURG/BREMEN` (Bug 26) is doubly wrong because those abbreviations don't exist (BauO Bln / HBauO / BremLBO), and the München calendar leak (Bug 27).

---

## 5. BAND 5 — 8-TEMPLATE COVERAGE

Three independent consumers of `templateId` differ sharply in depth:
1. **Persona** branches genuinely per template — `getTemplateBlock(templateId)` (~230-line block each, `templates/index.ts:41-43`, wired `systemPrompt.ts:260-264`) + `firstTurnPrimer` switch (`chat-turn/index.ts:741-762`). No fallback-to-T-01 except T-08 as the dispatcher's safe default (`index.ts:42`).
2. **Cost engine** branches via `COST_BASIS_FIELD_BY_TEMPLATE` (`costNormsMuenchen.ts:294-304`) for all 8.
3. **PDF procedure/documents** is the weak link — `resolveProcedure` only substantively handles NRW (neubau/sanierung); every Bayern intent falls to the generic stub, and `requiredDocumentsForCase` declares `intent` but **never reads it** (`requiredDocuments.ts:50,145`), branching only on `procedureKind` + flags. So the rich per-template Bauvorlagen checklists in the prompt blocks are **not reflected in the generated PDF**.

**Bug 24 lineage (cost engine honoring user dimensions):** **structurally generalized, empirically confirmed for T-03 only.** The field map + `resolveAreaSqmByTemplate` (`costNormsMuenchen.ts:322-341`) is called in both cost callers (`CostTimelineTab.tsx:86-88`, `exportPdf.ts:623-625`), so the mechanism is template-general — but the code comment (`:276-292`) and `POST_SMOKE_TEST_INVESTIGATION.md:655-664` state only T-03's key is real; T-04..T-08 are "user-supplied conventions that gracefully no-op" → silent fallback to the 180 m² default (`BASE_AREA_SQM:133`) if the persona emits a different fact key (**UNVERIFIED** for those 6). T-05 maps a `_m3` volume key into the area-based linear scaler (`:300,141-145`) — volume treated as area (**UNVERIFIED** intent).

**T-08 Sonstiges:** graceful, does NOT break — opens "NEHMEN SIE NICHTS AN", enumerates 7 sub-categories with their own §§ (`t08-sonstiges.ts:28-99`), is the dispatcher safe default.

Per-template verdicts are in the executive matrix. No template is RED; T-04/T-05/T-06/T-07 are YELLOW on the cost/PDF downstream only.

---

## 6. BAND 6 — PERSONA / CHAT-TURN PIPELINE

- **Lifecycle:** `Deno.serve` (`chat-turn/index.ts:63`) → CORS/auth/Zod → RLS client + `getUser` → role lookup → tracer → rate-limit (50/hr) → load project+messages → hydrate state → idempotent user-message insert → build messages + first-turn primer → live-state block → **streaming or JSON** Anthropic call → fact plausibility → citation lint (A/B) → citation allow-list (C) → qualifier role gate (REJECTION mode) → apply mutations → persona snapshot → atomic commit → event → respond.
- **Two-block cache CONFIRMED:** exactly 4 system blocks, exactly 2 `cache_control: ephemeral` breakpoints (`systemPrompt.ts:257,262`): block 1 = `composeLegalContext(bundesland)`, block 2 = `getTemplateBlock(templateId)`; blocks 3 (locale) + 4 (live state) are volatile/uncached. **No `anthropic-beta` header** anywhere (SDK default caching). Model = `claude-sonnet-4-6` (`toolSchema.ts:27`).
- **composeLegalContext** is pure string concat (no field-level merge); precedence is by prompt position + the `_antiBayernLeak` prepend for non-Bayern states.
- **Anti-leak — the critical finding:** the two named runtime guards (`crossStateBleedGuard`, `germanLeakGuard`) **never execute in chat-turn** — they run only in `exportPdf.ts` (`:588`, `:436/440/871/875`). At chat time there is **zero runtime cross-state/leak sanitization**; defense is prompt-instruction-only (`_antiBayernLeak` names BayBO/BayDSchG/BayNatSchG but **not** BLfD/Schwabing/München/StPlS). Even the PDF-only guard's token list misses München (the city), LBK, ADBV, BAYAK/BAYIKA, BayWoFG, and ~20 München districts/landmarks/satzungen (full list in the band's notes). Bug 23-class leakage of München proper nouns on a non-Bayern project is **not defended at runtime**.
- **Qualifiers:** the tool schema requires SOURCE×QUALITY on delta items (`toolSchema.ts:31-32,144-225`); the persona emits them, but `streamingExtractor` parses **only** the display text — qualifiers come from the validated tool input → `applyToolInputToState` → `projects.state`, and propagate to result tabs from state. `qualifierNormalize` is applied only in `exportPdf.ts`, not in the result tabs.
- **Hallucination guard is soft + partial:** no constrained decoding; Layer C downgrades fabricated-article items to DESIGNER+ASSUMED post-validation, **fail-soft (never blocks)**; sub-Absatz fabrication is uncaught (`citationLint.ts:485-489`); **stub states (empty allowlist) get no Layer-C enforcement** (`:642`); prose-only citations in `message_de/en` are logged (A/B) but neither downgraded nor blocked.
- **Observability:** token spend PRESENT (input/output/cacheRead/cacheWrite per trace); turn budget PARTIAL (`max_tokens=1280`, 50s/attempt abort, 3-attempt retry, 50/hr) but **no cost ceiling that aborts**; **prompt-cache hit-rate is NOT computed as a metric** (raw cache tokens stored, ratio never derived). Tracer no-ops silently if `SUPABASE_SERVICE_ROLE_KEY` is unset.

---

## 7. BAND 7 — RESULT TABS

| Tab | Component | Verdict | Notes |
|---|---|---|---|
| Overview | `OverviewTab.tsx:30` | 🟢 | State-aware; latent `composeExecutiveRead.ts:362` CITATION_RE only recognizes BayBO/federal tokens (no leak today; non-Bayern statutes just fall back to generic copy). |
| Legal landscape | `LegalLandscapeTab.tsx:29` | 🟢 | Domain B BayBO rows correctly gated `if (isBayern)` (`composeLegalDomains.ts:122-158`); Domain C uses state-correct DSchG name. |
| Procedure & documents | `ProcedureDocumentsTab.tsx:36` | 🟡 | Baseline procedure state-correct (`deriveBaselineProcedure.ts:57`), but timeline phases/annotations are Bayern-tuned and presented as universal (`composeTimeline.ts:12`, `timelineAnnotations.ts`). Bug 20 residue. |
| Team | `TeamTab.tsx:64` | 🟢 | **Bug 17 REFUTED** — qualification §§ resolved via `getRoleEffortLookup(bundesland)` (`:159`); stakeholders generic; no chamber hardcode. |
| Cost & timeline | `CostTimelineTab.tsx:67` | 🔴 | **Bug 20 CONFIRMED + Bug 27** — `composeCalendar` renders München authority closures on every state (`:281-289`); **Bug 28** REGION_MULT key-case → "Faktor bayern" raw to users. |
| Suggestions | `SuggestionsTab.tsx:28` | 🟢 | Clean; quirky always-true footer filter (cosmetic). |

**Cross-tab:** i18n is solid — DE/EN full parity on 247 `result.*` keys, no empty values; the `?? ''`/`|| ''` fallbacks are all data-field defaults, **none hide an i18n key**. Mobile is GREEN (all fixed-px grids are `grid-cols-1` at base, `sm:`-gated). **Owner-mode has no loading/error state** (`ResultPage.tsx:41` returns `null`) — Bug 30; shared-mode is correct.

---

## 8. BAND 8 — PDF GENERATION

PDF generator lives in `src/features/chat/lib/exportPdf.ts` (1320 LOC) + 13 `pdfSections/*` renderers + `pdfStrings.ts` (locale) + `pdfPrimitives.ts`. Library: `pdf-lib@1.17.1` + `@pdf-lib/fontkit`.

- **Fonts:** brand TTFs (Inter, Instrument Serif) from `public/fonts/`, Helvetica fallback. Unicode-safe on the brand path (umlauts ä/ö/ü/ß present); fallback routes through `winAnsiSafe()`. Single shared `PDFFont` embed (Bug 30-prior fix).
- **Bug 22 ligature — re-verified SOLID.** `decomposeLigatures` (`winAnsiSafe.ts:99-107`) maps **all of U+FB00–FB04 plus FB05** (ff/fi/fl/ffi/ffl/st), not just `fi`. The load-bearing fix is the embed-time `features:{liga:false,dlig:false,clig:false}` flag (`fontLoader.ts:115-131`), traced through fontkit's `setFeatureOverrides`. **However** the explanatory comment at `winAnsiSafe.ts:124-135` is **factually wrong** (claims `encodeText` bypasses fontkit shaping; it does not in 1.17.1), and `preventBrandLigatures()` is a confirmed no-op (`:146-148`). Output is correct but regression-prone if the `features` flag is removed trusting the comment (Bug 43).
- **Pages:** 11 sections + Cover + TOC. No ungated hardcoded Bayern/NRW string reaches output — all such literals are `bundesland`-gated (`exportPdf.ts:573` NRW, `glossary.ts:131` Bayern) or comments-only. **But** `resolveProcedure.ts:294`'s fabricated citation (Bug 26) and the München calendar (Bug 27) do ship.
- **DE/EN parity:** structurally identical; `pdfStr` fails loudly with `[[MISSING: key]]` sentinel (good). One EN→DE fallback leaks German on EN PDFs: Team rationale `exportPdf.ts:849` `(rationale_en ?? rationale_de ?? '')` without a leak guard (Bug 51). Several other EN-side `?? ''` blank genuinely-absent EN content.
- **Completeness — GAPS:** Section count is **11, not ~12**. **Section XII Risk Register — MISSING** (exists only as a result-page card). **Vorhabensbeschreibung — MISSING** (only a document line-item, not a narrative section). **KfW BEG 458 — abstract** glossary text, no numbers/rates. PRESENT: QR code, confidence score, signature block (architect + chamber + Bauherr), state-parameterized Bauvorlagen list with §§.

---

## 9. BAND 9 — ARCHITECT VERIFICATION FLOW (the legal shield)

- **Routes:** `/architect/*` behind `ArchitectGuard`; `/architect/accept` outside it. Verify UI at `/architect/projects/:projectId/verify` (`VerificationPanel`).
- **Role gating is defense-in-depth but uneven.** `useIsDesigner` is cosmetic (own docstring `useIsDesigner.ts:16-17`). Server enforcement: RLS architect-read via `is_accepted_architect()` (`0031:63-77`) checks accepted membership, **not** the designer role directly (role is enforced by the `project_members.role_in_project CHECK='designer'`, `0026:28`); the binding write-gate is in the edge functions (`verify-fact:148-177`, `share-project:287-302`). **There is no DB CHECK/trigger on the qualifier values in `projects.state`** — `state` is plain JSONB (`0003:76`); the entire shield rests on edge-function role checks writing via the service role.
- **🔴 Bug 29 — the invite flow is dead in the UI.** No component calls `share-project` CREATE mode; the only SPA caller is `AcceptInvite.tsx:123` (accept). The owner modal `SendToArchitectModal.tsx:64` calls `createShareToken` → a 30-day **read-only** `/result/share/:token` link, **not** a `project_members` invite. So an architect can never become a member through the UI; the verification surface is unreachable without a manual SQL invite. Corroborated by the DB probe (`project_members`=0, `qualifier_transitions`=0).
- **Verify path:** "Bestätigen" → `verify-fact` flips the targeted `projects.state` entry's `qualifier.quality` ASSUMED→VERIFIED in-place via service role + logs `qualifier.verified`. No dedicated column.
- **🔴 Owner UI not reactive (Bug 32):** `useProject` has `staleTime:60_000`, `refetchOnWindowFocus:false`, **no realtime channel, no polling** (`useProject.ts:27-28`). The Bauherr's "Vorläufig" footer does not update on architect confirmation until a >60s-stale refetch + navigation/reload.
- **🔴 Aggregate footer can be permanently un-clearable (Bug 33):** `isPending` treats anything ≠ DESIGNER+VERIFIED as preliminary (`VorlaeufigFooter.tsx:93-98`), but `verify-fact` only ever produces DESIGNER+VERIFIED — so any static LEGAL/CALCULATED item (e.g. `SuggestionsTab.tsx:111`) makes the project-level footer impossible for the architect to dismiss.
- **Edge cases:** **no reject/un-verify path exists** (Bug 34-adjacent); `verify-fact` has **no precondition** — it overwrites any qualifier (even LEGAL/CLIENT) to DESIGNER+VERIFIED and logs a hardcoded prior state (Bug 34); **owner edits silently erode verification** — a client re-upsert downgrades a verified item to ASSUMED with no audit linkage or architect notification (Bug 32). Minor: architect notes on *recommendations* are dropped from state (`verify-fact:313` narrower qualifier shape). **— RESOLVED v1.0.27 (C8): reject/un-verify via verify-fact action:'reject' overload + required reason → DESIGNER+ASSUMED + qualifier.rejected (Bug 34); erosion now downgrades explicitly with a re-verification reason (Bug 32). The recommendations narrower-qualifier note remains.**

---

## 10. BAND 10 — DATA INTEGRITY, DB SCHEMA, MIGRATIONS

- **33 migration files**, chronological and mostly clean. Tables: `profiles`, `projects`, `messages`, `project_events`, `project_share_tokens`, `project_files`, `chat_turn_rate_limits`, `bplan_lookup_rate_limits`, `logs.{traces,spans,persona_snapshots}`, `model_pricing`, `admin_users`, `event_log`, `project_members` + 4 qualifier views. Full column/RLS/index catalog captured (see band notes).
- **🔴 `projects.bundesland` (Bug 40):** `0003:58` `text NOT NULL default 'bayern'`, **no CHECK / enum / FK** — never altered by any later migration. Contrast `city`, which got progressively-widened CHECKs (`0009:62`, `0010:54`). This is the schema-level enabler of the Bayern-leak thesis: the DB will silently stamp `'bayern'` on any row inserted without an explicit value, and will store a Berlin address as `bundesland='bayern'` with no guardrail.
- **🔴 Migration 0033 / `state_version` — ghost deploy (Bug 39).** No `0033*` file exists on `main` or on disk. It lives **only** on parked branch `feature/v1-0-6-race-fix` (commit `95c8c30`), never merged. Yet docs assert the `state_version` column is **live in prod** (`SESSION_RESUME_STATE.md:160`). So **production schema diverges from `main`**; the `bump_projects_state_version` trigger's presence is **UNVERIFIED** (PostgREST can't expose `pg_trigger`). A fresh rebuild from `main` would be missing the column. Resolves the brief's "Migration 0033" reference: it does **not** exist on main.
- **Migration anomalies:** **0024/0025 missing** (cosmetic gap, manual SQL-Editor apply model). **Duplicate `0004_*` and `0005_*` prefixes** (Bug 41) — incompatible with the Supabase CLI migration runner (ledger keys on version prefix); `0005_seed…OPTIONAL` is a dev seed (defaults to ROLLBACK) wearing a migration prefix.
- **`project_events` is append-only by RLS omission** (no UPDATE/DELETE policy) but **not audit-grade**: `service_role` bypasses RLS, and the `project_id` CASCADE means a user deleting their project erases its entire audit trail. The `trace_id` FK was added (0016 col / 0018 FK) then **dropped (0022)** due to write-ordering (trace row lands after the child event row) — now an integrity-free soft pointer; orphans expected.
- **Cascade gap (Bug, P3):** `project_share_tokens.created_by → auth.users` has **no ON DELETE** clause (`0006:26`) — the only `auth.users` FK that deviates from the CASCADE/SET-NULL house pattern.
- **Backup/restore posture: UNDOCUMENTED.** Nothing in `config.toml` or `SUPABASE_SETUP.md`; backups are implicitly delegated to the Supabase platform but never stated, configured, or drill-tested — a material gap for a privacy-sensitive product.
- **UNVERIFIED:** the 4 qualifier views may bypass `event_log` RLS if non-`security_invoker` and owned by a superuser — needs live `\d+` inspection.

---

## 11. BAND 11 — OPERATIONAL READINESS

- **Sentry-EU:** configured + **consent-gated correctly** (`SentryLifecycle` on `state.functional`; PII scrubbing strong). **But EU residency is not enforced in code** — DSN is an env secret and the CSP allows **both** US (`*.ingest.sentry.io`) and EU (`*.ingest.de.sentry.io`) hosts (`vercel.json:20`). **No Sentry in edge functions** — persona/edge errors go only to `event_log` + stdout (Bug 49).
- **PostHog-EU:** configured, EU host hardcoded, consent-gated, cookieless. **The clean typed `track()` funnel is dead code** (zero call sites); the live funnel is the eventBus→PostHog bridge. **Conversion events lack `template_id`/`bundesland` dimensions**, and there's no anonymous landing capture (pageviews only post-consent) — funnel denominators undercount (Bug 47).
- **Daily gates:** only `test.yml` runs per-commit (build + Playwright); build transitively runs locales/hardcoded-de/legal-config/bundle. **`verify:bayern-sha` is NOT in CI** despite a P0 runbook classification (Bug 48). **— CLOSED 2026-05-24 (v1.0.26 / C11): `verify:bayern-sha` + `smoke:pdf-matrix` + `smoke:citations` are now CI steps in `test.yml`.** The canonical "4 daily gates" (`SESSION_RESUME_STATE.md:246`, `OPS_RUNBOOK.md:34`) are bayern-sha, smoke:citations, tsc, build — **3 of 4 are manual-only**; "all four green" is a human attestation, not CI-enforced.
- **Bundle:** 274.2 KB gz vs 300 KB ceiling (`verify-bundle-size.mjs:22`), 25.8 KB headroom — confirmed by live `dist/` measurement. (Memory note said ~242 KB — stale; bundle grew ~32 KB.) Gate checks only the entry chunk, not lazy chunks.
- **Vercel:** `vercel.json` is rewrites+headers only (no buildCommand/output → Vite auto-detect). Security headers solid. **Prod-vs-HEAD drift UNVERIFIED** (no live deploy probe).
- **Edge functions:** `config.toml` has only `[functions.chat-turn] verify_jwt=true`; **no cold-start/timeout/memory settings in repo** — platform defaults, UNVERIFIED. Code assumes a 150s wall clock (`anthropic.ts:25`) but the outer retry worst case is 158s (`:369-371`) — can exceed the assumed wall clock under sustained 5xx.
- **Anthropic posture:** model `claude-sonnet-4-6` ✓; `maxRetries:0` (app owns retry: 3 attempts, 0/2/6s backoff); 429 honors `Retry-After`; **no model fallback** (retry + schema-reminder reprompt only); 50s/attempt abort; `max_tokens:1280`.

---

## 12. BAND 12 — BACKLOG RECONCILIATION + NEW FINDINGS

### Open-item status (verified against code)

| # | Item | Status | Evidence |
|---|---|---|---|
| Bug 17 | Team-tab Bayern hardcodes | **PARTIALLY CLOSED** | UI closed (`TeamTab.tsx:159`); chat-layer OPEN (`personaBehaviour.ts:191`, `compose.ts:68` — persona/template blocks Bayern-only, never state-parameterized). |
| Bug 20 | Procedure-tab caveat | **PARTIALLY CLOSED** | PDF closed (`procedures.ts:56`); chat-layer OPEN (`personaBehaviour.ts:227-237`); **result-tab calendar RE-OPENED as RED via Bug 27**. |
| Bug 23 | Schwabing/BLfD persona leak | **CLOSED at data source** | risk catalog + suggestions state-gated (`riskCatalog.ts:232,263`; `composeRisks.ts:44`); residual guard-coverage gap → Bug 31. |
| — | resolveProcedure unification (legacy detectProcedure) | **STILL OPEN** | both coexist; `detectProcedure` is Bayern-only regex (`costNormsMuenchen.ts:352`) wired into 4 live surfaces → Bug 35. |
| — | Vorhabensbeschreibung PDF section | **STILL OPEN** | no renderer in `pdfSections/`. |
| — | Risk Register Section XII | **STILL OPEN** | `composeRisks` consumed only by `RiskRegisterCard.tsx`. |
| — | KfW BEG 458 specifics | **STILL OPEN / abstract** | no `BEG 458`/`§35c`/`iSFP` anywhere in src. |
| — | Bebauungsplan ID / Flurstück / GK fields | **PARTIALLY CLOSED** | B-Plan WMS lookup exists but **orphaned** (Bug 36); Flurstück absent; GK only derived heuristically. |

### NEW bugs (numbered 26+, continuing the existing sequence)

| # | Sev | Title | file:line |
|---|---|---|---|
| 26 | P0 | `resolveProcedure` generic branch fabricates `§ 65 BauO {CODE}` → ships invalid citations to PDF + Procedure/Key-Data tabs for all 11 stub states + non-NRW intents | `resolveProcedure.ts:294` |
| 27 | P0 | `composeCalendar` ignores bundesland → München authority closure reasons ("Christmas closure") render on every state | `composeCalendar.ts:37`, `muenchenAuthorityCalendar.ts:54-61`, `CostTimelineTab.tsx:281-289` |
| 28 | P1 | `REGION_MULT` keyed `'Bayern'` but receives lowercase `'bayern'` → multiplier dead + raw "Bundesland-Faktor bayern" shown to users | `costNormsMuenchen.ts:130,208,236-237` |
| 29 | P0 | Architect membership-invite CREATE flow has no UI caller; owner modal uses read-only `create-share-token` → verification surface unreachable (prod `project_members`=0) | `SendToArchitectModal.tsx:64`, `share-project/index.ts:205` |
| 30 | P1 | Owner result page returns `null` during fetch (blank screen) + no error state | `ResultPage.tsx:41` |
| 31 | P1 | Runtime leak guards are PDF-export-only; result-page UI + persisted `projects.state` are unsanitized | `crossStateBleedGuard.ts` (only caller `exportPdf.ts:588`) |
| 32 | P1 | Owner edits silently erode architect-verified qualifiers (no audit linkage); Vorläufig footer not reactive (no realtime, staleTime 60s) | `projectStateHelpers.ts:106-117`, `useProject.ts:27-28` |
| 33 | P2 | Aggregate Vorläufig footer un-clearable when any static LEGAL/CALCULATED item present | `VorlaeufigFooter.tsx:93-98`, `SuggestionsTab.tsx:111` |
| 34 | P2 | `verify-fact` has no promotion precondition — overwrites any qualifier (incl. LEGAL) to DESIGNER+VERIFIED; logs hardcoded prior state; no reject/un-verify path | `verify-fact/index.ts:296-338,259-262` |
| 35 | P1 | `detectProcedure` (Bayern-only regex) silently returns `'unknown'` for non-Bayern citations → wrong cost mult + generic timeline, no caveat | `costNormsMuenchen.ts:352-358` (callers `CostTimelineTab.tsx:76`, `AtAGlance.tsx:79`, `composeExecutiveRead.ts:78`, `exportPdf.ts:617`) |
| 36 | P2 | Wizard seeds `bplan.number` but Area A reads `bebauungsplan_id` → WMS B-Plan facts never upgrade Area A confidence (orphaned data path) | `useCreateProject.ts:66-95` vs `exportPdf.ts:527` |
| 37 | P2 | Inconsistent null-`bundesland` fallbacks in exportPdf (`'nrw'` :355, `'bayern'` :590, `''` :327/:1047) → contradictory state handling | `exportPdf.ts:355,590,327,1047` |
| 38 | P2 | Layer-C citation enforcement off for 11 empty-allowlist stub states → no positive hallucination guard | `citationLint.ts:642` |
| 39 | P2 | Ghost-deployed migration 0033 `state_version` — prod schema diverges from `main`; trigger presence unverified | branch `feature/v1-0-6-race-fix:0033` |
| 40 | P1 | `projects.bundesland` free `text`, NOT NULL, default `'bayern'`, no CHECK — schema-level Bayern-leak enabler | `0003_planning_matrix_core.sql:58` |
| 41 | P3 | Duplicate migration prefixes `0004_*`/`0005_*` — incompatible with Supabase CLI runner; seed file wears a migration prefix | `supabase/migrations/` |
| 42 | P2 | `city='muenchen'` forced for ALL Bayern projects + compose injects München cityBlock for all Bayern → Nuremberg/Augsburg/Erlangen get München city law | `useCreateProject.ts:256`, `compose.ts:67` |
| 43 | P3 | `winAnsiSafe.ts:124-135` documents wrong mechanism for Bug 22; `preventBrandLigatures()` is a no-op → silent regression risk | `winAnsiSafe.ts:124-148` |
| 44 | P2 | `crossStateBleedGuard.TOKENS` covers only 5 states; the 11 stub-state unique tokens uncovered | `crossStateBleedGuard.ts:32-58` |
| 45 | P3 | MV LBO short-name contradiction (`'LBauO M-V'` vs `'LBO MV'`) in one 42-line file | `mv.ts:13,27` |
| 46 | P2 | Wizard submit gate hardcoded to München → every non-München project forced through "outside München" acknowledgement | `QuestionPlot.tsx:260,268-271` |
| 47 | P3 | PostHog: clean `track()` funnel is dead code; live funnel lacks template/bundesland dims on conversion events; no anon landing capture | `analytics.ts:72-100,155-168` |
| 48 | P2 | `verify:bayern-sha` not in CI despite P0 runbook classification; 3 of 4 "daily gates" manual-only | `.github/workflows/test.yml`, `OPS_RUNBOOK.md:34` |
| 49 | P3 | Sentry EU residency not code-enforced; CSP allows US ingest host | `errorTracking.ts:23`, `vercel.json:20` |
| 50 | P2 | Stale "wizard hardcodes bayern" claims contradicted by code + 5 non-Bayern prod projects | `legalRegistry.ts:99`, `systemPrompt.ts:232`, `DELIVERABLE_GAP_AUDIT.md:73` |
| 51 | P3 | Team rationale EN→DE fallback can render German on EN PDF without leak guard | `exportPdf.ts:849` |

---

## APPENDIX A — KEY FILE:LINE CITATIONS

**Bundesland flow:** `inferBundeslandFromPostcode.ts:25-81`, `useWizardState.ts:32`, `QuestionPlot.tsx:23-40,180-195,260-271,433-451`, `useCreateProject.ts:145-186,255-256`, `legalRegistry.ts:51-68,102-105`, `compose.ts:64-71`, `systemPrompt.ts:247-275`, `citationLint.ts:436-448,635-717,642`, `0003:58`.
**States:** `states/_types.ts:79`, `_antiBayernLeak.ts:46-89`, `states/bayern.ts:25-73`, `nrw.ts:336-364`, `bw.ts:127-140,370-401`, `hessen.ts:419-449`, `niedersachsen.ts:309-334`, `mv.ts:13,27`, `berlin.ts:46`, `stateLocalization.ts:110-117`, `stateCitations.ts:155-168`.
**Templates:** `templates/index.ts:41-43`, `t01..t08`, `chat-turn/index.ts:42,741-762`, `requiredDocuments.ts:50,145`, `costNormsMuenchen.ts:130,208,276-341,352-358`.
**Persona:** `chat-turn/index.ts:63,375-496,508-579`, `anthropic.ts:46-47,171,373-403`, `systemPrompt.ts:257,262`, `crossStateBleedGuard.ts:32-58`, `germanLeakGuard.ts:25-54`, `streamingExtractor.ts:25-106`, `tracer.ts:300-303`.
**Result tabs:** `OverviewTab.tsx:30`, `LegalLandscapeTab.tsx:29,127`, `composeLegalDomains.ts:122-158`, `ProcedureDocumentsTab.tsx:36`, `TeamTab.tsx:64,159`, `CostTimelineTab.tsx:67,263,281-289`, `composeCalendar.ts:37`, `SuggestionsTab.tsx:28,111`, `ResultPage.tsx:41`, `VorlaeufigFooter.tsx:93-98`.
**PDF:** `exportPdf.ts:247,275,375,527,573,588,617,763-828,849`, `fontLoader.ts:115-131`, `winAnsiSafe.ts:99-107,124-148`, `pdfSections/toc.ts:86-96`, `glossary.ts:90-92,131-161`, `verification.ts:199-243`, `resolveProcedure.ts:239-309`.
**Architect:** `router.tsx:180-192`, `ArchitectGuard.tsx:23-43`, `VerificationPanel.tsx:140-143,277-302`, `AcceptInvite.tsx:117-132`, `verify-fact/index.ts:148-177,296-338`, `share-project/index.ts:205-271,275-435`, `SendToArchitectModal.tsx:64`, `useProject.ts:27-28`, `useIsDesigner.ts:16-17`.
**Schema:** `0003:58,76,87-103`, `0006:26`, `0009:62`, `0010:54`, `0016/0018/0022 trace_id`, `0026:28`, `0028`, `0031:63-101`, branch-only `0033`.
**Ops:** `errorTracking.ts:19-152`, `analytics.ts:31-168`, `.github/workflows/test.yml`, `vercel.json:20`, `verify-bundle-size.mjs:22`, `config.toml:10-11`, `toolSchema.ts:27`.

## APPENDIX B — UNVERIFIED ITEMS (could not confirm without external sources or live runtime)

1. **All state-law article numbers** (BayBO Art. n, BauO NRW §, LBO BW GK 1–5, HBO §, NBauO §, etc.) — checked for internal consistency only; **not** verified against current statutes (per the audit's "internal-consistency only" scope).
2. **MV LBO canonical short name** (`LBauO M-V` vs `LBO MV`) — which is correct is UNVERIFIED.
3. **Cost guess-maps for T-04/T-05/T-06/T-07** — whether the persona emits the named area fact keys (else silent 180 m² fallback) is UNVERIFIED; T-05 m³→area mapping intent UNVERIFIED.
4. **Migration 0033 trigger** — whether `projects_bump_state_version` was applied to prod alongside the `state_version` column is UNVERIFIED (PostgREST can't expose `pg_trigger`); the column's prod presence is asserted by docs.
5. **Vercel prod-vs-HEAD drift** — no live deploy probe; UNVERIFIED.
6. **Edge-function cold-start/timeout/memory** — platform defaults, not in repo; UNVERIFIED.
7. **Sentry DSN region** — EU vs US depends on the prod secret; CSP allows both; UNVERIFIED.
8. **qualifier_* views RLS bypass** — depends on view ownership + `security_invoker`; needs live `\d+`; UNVERIFIED.
9. **EN locale block token count** (`systemPrompt.ts:129-137` claims ~150; likely larger) — UNVERIFIED (no cache impact regardless).
10. **Prompt-cache hit rate** — raw cache tokens stored, ratio never computed; whether a downstream dashboard derives it is UNVERIFIED.

## APPENDIX C — SUGGESTED SPRINT SEQUENCING (ordering proposal only, no code)

> Ordering only — not a commitment, not implementation. Reviewed by Rutik before scoping.

- **Sprint 1 — Deterministic-surface state-correctness (highest leverage, unblocks every non-München state).** Bugs 26 (fabricated `§ 65 BauO {CODE}`), 27 (München calendar on all states), 28 (REGION_MULT key case), 35 (`detectProcedure` unknown), 37 (null-bundesland fallbacks), 42 (München cityBlock for all Bayern). These are mechanical, high-visibility, and make the 4 substantive non-Bayern states genuinely shippable.
- **Sprint 2 — Architect legal shield made real.** Bugs 29 (wire `share-project` CREATE into a real owner UI), 32 (reactive footer + verification-erosion guard), 33 (aggregate-footer semantics), 34 (reject/un-verify + promotion precondition). Unblocks the manager's headline demo; today it's 0-usage and unreachable.
- **Sprint 3 — Leak-defense + schema hardening.** Bugs 31 (move leak guards into chat-turn + result UI), 38/44 (stub-state citation defense + token coverage), 40 (`bundesland` CHECK), 39 (merge/clean 0033 ghost deploy), 41 (migration-prefix hygiene), 48 (put bayern-sha + smoke:citations in CI).
- **Sprint 4 — PDF deliverable completeness.** Section XII Risk Register, Vorhabensbeschreibung narrative, concrete KfW BEG 458, EN-parity guard (Bug 51), and the Bug 43 comment/no-op cleanup.
- **Sprint 5 — Chat-layer state-parameterization.** Bug 17/20 chat-layer: make `personaBehaviour` + template tails state-aware instead of Bayern-worded. Non-trivial because it touches the prompt corpus near the SHA-locked Bayern content — sequence carefully.
- **Sprints 6–N — 11-state legal content expansion (the long pole).** Populate `allowedCitations` + procedure thresholds + chamber/authority per state. Research-bound; likely needs legal sourcing. If descoped to "honest stub that ships no fabricated citation," Sprint 1 + a framing pass may suffice for an interim ship.
- **Cross-cutting / low-effort anytime:** Bugs 30 (result loading/error state), 36 (wire B-Plan facts into Area A), 45 (MV short name), 46 (wizard München gate), 47 (analytics dims), 49 (Sentry EU enforcement), backup/restore documentation.

---

*End of audit. Bayern SHA verified MATCH at start and re-verified at commit time. No production code was modified in this pass.*
