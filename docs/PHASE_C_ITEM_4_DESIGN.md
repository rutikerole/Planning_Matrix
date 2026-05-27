# Phase C Item #4 — Cost Calibration: Recon + Design

**Branch:** `phase-c/item-4-recon`
**Date:** 2026-05-27
**Status:** RECON + DESIGN ONLY. No code changed this turn. Bayern SHA verified MATCH before and after.
**Method:** 3 parallel recon agents (Destatis API · data availability · cost-engine map) + orchestrator's own live API smoke-test (`curl`) and primary-source cross-checks. Every repo claim carries `file:line`; every data claim carries a URL + 2026-05-27 fetch.

> **The one-line finding, up front, brutally honest:** The stated goal — *"a T-01 EFH in Schwerin shows different numbers than München, anchored in real construction cost data"* — is **not achievable for free with authoritative data.** Destatis is **national-only** (an inflation index, base 2021=100), and the only authoritative per-state construction-cost source (**BKI Regionalfaktoren**) is **paid, no API**. This is exactly why the team already chose "honest German-baseline framing" over guessed multipliers in v1.0.22 (`docs/cost-formula.md`). This doc lays out the three real options and what each costs.

---

## 1. Executive Summary

**Is Destatis usable? CONDITIONAL — yes for one purpose, no for the purpose the goal needs.**
- **YES** for keeping the cost baseline *current over time* (construction-price inflation). Table **61261** (Baupreisindex) is live, free-of-charge, REST/JSON — but the **API requires a free registered account + token** (the "no registration" claim is about the web UI, not the API; verified live). It returns an **index (2021=100), not euros**, published **quarterly (~6-week lag)**.
- **NO** for the cross-state variation the goal asks for. 61261 is **national/Bund only**. The state-level "M I 4" indices are a trap — they are *time* indices (each based to 100), explicitly **not cost-level-comparable between states**. There is **no free official Regionalfaktor**. (§3)

**Recommended design.** Implement **Option A** in Part B regardless: wire 61261 (build-time, server-side, quarterly) to *escalate* the existing baseline so the numbers are current + officially sourced, finish de-Münchenizing the baseline's provenance, and keep the honest "regionale Varianz ±10%" framing. This is free, fully defensible, and a real improvement — but it does **not** make Schwerin ≠ München. To actually meet the goal's spirit you must pick: **Option B** (free, per-state *proxy* tiers from Destatis Baufertigstellungen €/m², labelled "indikative Tendenz, kein offizieller Regionalfaktor") or **Option C** (license **BKI**, the only authoritative per-state source, paid). That choice is a Rutik decision — see §5 + the closing question.

**Effort estimate for Part B:** Option A ≈ **2–3 engineer-days**. Option A + B ≈ **4–6 engineer-days**. Option C wiring ≈ **1–2 engineer-days** *plus* BKI procurement (cost + lead time, Rutik).

**Top 3 risks.** (1) The goal can't be met free with authoritative data — shipping proxy numbers a licensed architect could challenge. (2) The €-baseline itself is München-derived (`costNormsMuenchen.ts:64-82`); escalating it nationally doesn't change its origin — Destatis only deflates/inflates, it cannot supply an absolute €/m². (3) GENESIS API friction: account/token, POST-only, Latin-1 payloads, scheduled-maintenance outages (Code 16, observed live today), `job=true` for big pulls — all manageable build-time, but not a drop-in.

---

## 2. Destatis GENESIS API Status (verified live 2026-05-27)

| Property | Finding | Evidence |
|---|---|---|
| Cost | Free of charge (since 2019) | [destatis.de OpenData](https://www.destatis.de/EN/Service/OpenData/api-webservice.html); [PE19_006](https://www.destatis.de/EN/Press/2019/01/PE19_006_p001.html) |
| **Registration** | **REQUIRED for the API** (username+password or personal token). The "no registration" line is about the web UI only. Guest `GAST` passes `helloworld/logincheck` but every `data/`·`catalogue/` call returns `Code 15 "not allowed to call this service"`. | Live probe (regionalstatistik + NRW mirror); [restatis](https://long39ng.github.io/restatis/), [bundesAPI/deutschland](https://github.com/bundesAPI/deutschland/blob/main/docs/destatis/README.md) corroborate |
| Base URL (federal — hosts 61261) | `https://www-genesis.destatis.de/genesisWS/rest/2020/` | live |
| Method | **POST** for data (GET → live `HTTP 405`). Creds as POST form params or token header. | my `curl` + agent both got 405 on GET `logincheck` |
| Sample data call | `POST {base}/data/table` body `name=61261-0002&area=all&format=ffcsv&language=de` | v5.0 API docs |
| Response format | JSON envelope; **payload format = `format` param**. Use `ffcsv` (flat-file CSV, one row/observation). **Encoding often ISO-8859-1** — decode defensively. | docs + live header inspection |
| Rate limits | ~**10 parallel/account**, long requests killed at **15 min**, large pulls need `job=true`. 61261 quarterly series are small → sync `ffcsv` fine. No documented daily cap. | live `logincheck` text |
| Freshness / lag | **Quarterly** (ref. months Feb/May/Aug/Nov), **~5–6 week** publication lag. Feb-2026 data published **2026-04-10**. Series: use **`61261-0002`** (quarterly). | [PD26_126_61261](https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/04/PD26_126_61261.html); [BAK](https://bak.de/kammer-und-beruf/daten-fakten/baupreisindexdestatis/) |
| CORS | Enabled (`access-control-allow-origin` reflected) — but **fetch server-side anyway** (never ship creds to the browser; WAF is finicky). | live preflight |
| **Index vs €** | **INDEX, base 2021=100** (rebased from 2015=100 in May-2024). Gives a relative escalation factor only — **never an absolute €/m²**. | [Destatis Revision 2021=100](https://www.destatis.de/DE/Themen/Wirtschaft/Preise/Baupreise-Immobilienpreisindex/revision_baupreise.html) |
| Live gotcha today | Federal instance in **scheduled maintenance** (`Code 16`) during recon — handle as transient. | my `curl` whoami + agent |

**Integration shape (build-time, not runtime):** a Node script (à la the corpus codegen) registers-once → token in CI/local env → `POST 61261-0002` → parse ffcsv (Latin-1) → emit a generated TS constant (the cumulative escalation factor + a `Stand` date). No runtime API dependency, no CORS exposure, no creds in the bundle. Refresh quarterly.

---

## 3. Data Availability Map — what we can and can't get for free

**The crux question answered: free official data gives TIME variation, NOT cross-state LEVEL variation.**

| Source | Per-Bundesland? | Type | Usable for cross-state cost? | URL |
|---|---|---|---|---|
| **Destatis 61261 Baupreisindex** | **No — national/Bund only** | Index 2021=100 (time) | Only for inflation escalation | [tables](https://www.destatis.de/DE/Themen/Wirtschaft/Preise/Baupreise-Immobilienpreisindex/Tabellen/_tabellen.html) |
| State "M I 4" indices (11 of 16 states) | Per-state, but each based to 100 | Index (time) | **NO — trap.** Explicitly *not* level-comparable across states; MV/Schwerin doesn't even publish one | [Berlin-BB M I 4](https://www.statistik-berlin-brandenburg.de/m-i-4-vj/); [IT.NRW](https://www.it.nrw/thema/baupreise) |
| **BKI Regionalfaktoren** (~400 Kreis factors) | **Yes — the real answer** | €-level factor | **Yes — but PAID, no API.** Out of scope | [bki.de](https://bki.de/bki-regionalfaktoren) (ref only) |
| Destatis 31121 Baufertigstellungen — *veranschlagte Baukosten je m²* | **Yes, per Bundesland** (regionalstatistik) | €/m² (budgeted) | **Proxy only** — confounded by building mix/standard/size; budgeted-at-permit, not realized | [baufertigstellungen](https://www.destatis.de/DE/Themen/Branchen-Unternehmen/Bauen/Tabellen/baufertigstellungen.html) |
| Destatis 61511 Kaufwerte für Bauland | Per-state | €/m² **land** | **No** — measures land, a different cost line; would mislead | regionalstatistik theme 61 |

**Bottom line (Agent 2, my cross-check, and `docs/cost-formula.md` all agree):** there is **no free, official, citable cross-state construction-cost *level* factor**. The closest free per-state €-level signal is **Baufertigstellungen €/m² (table 31121)** — an official, directionally-correct *proxy*, not an authoritative Regionalfaktor.

---

## 4. Current Cost-Engine Map (file:line)

All cost constants live in `src/features/result/lib/costNormsMuenchen.ts`.

- **`BASE` breakdown** (`:84-91`): architekt 15–28k · tragwerk 4.5–8k · vermessung 1.2–2.2k · energieberatung 2.5–4.5k · behörde 1.5–3.5k · **total 24.7–46.2k €**. Single global table — **München-tuned by its own admission** (`:64-82`: "München practitioner +15–25% premium… BASE itself is München-tuned").
- **Multipliers:** `PROCEDURE_MULT` (`:93`), `KLASSE_MULT` (`:100`), `ZONE_MULT` (`:117`, default III), `areaFactor` (`:147`, clamp 0.5–2.5, `BASE_AREA_SQM=180` `:139`), and **`REGION_MULT` (`:135-137`) = `{ bayern: 1.0 }`** — **the only state hook, and every other state falls through to `?? 1.0` (`:215`)**. Composite at `:216-221`.
- **`COST_BANDS_BY_TEMPLATE`** (`:435-497`): per-template headline bands (T-01 17.3–32.3k … T-08 2–15k). **Template-keyed, NOT state-aware.** Read directly via `costBandFor` (`:502`) — **bypasses `REGION_MULT` entirely.** (T-01/T-03/T-05 basis strings still name "München"/"BayBO" — the latent GAP-1; dead because those templates render the per-category table or honest stubs, not the band.)
- **Render flow:** PDF — `exportPdf.ts:700-825` (resolves area + `bundesland` → `buildCostBreakdown` → `costBandFor` → branch: T-01 per-category table / T-02·06·07·08 headline band / T-03·04·05 honest stub) → `pdfSections/costs.ts`. Web — `CostTimelineTab.tsx:87-227` (same model). Also `AtAGlance.tsx:85`, `composeExecutiveRead.ts:80`.
- **Current caveat wording (already honest / Path B):** `costFactorLabel` (`stateLocalization.ts`, all 16 packs): *"HOAI Honorarzone III · deutscher Basiswert (regionale Varianz ±10%; staatsspezifische BKI-Anpassung in Vorbereitung)"*; PDF `costs.basisTemplate` (`pdfStrings.ts:111,363`): *"German baseline (regional variance ±10%)"*; web `headlineBandNote` (`locales/*.json:2001`). **The user-facing text already promises no state differentiation and flags BKI "in Vorbereitung."** Note: the `pdfCaveat` field (`stateLocalization.ts:68`) is **dead** (zero readers).
- **Plug-in points, smallest surface first** (Agent 3): **(1)** populate `REGION_MULT` (`:135`) — one line/state, scales the per-category BASE/T-01 only; **(2)** extend `costBandFor(templateId, bundesland)` (`:502`) + 2 call sites — to make the headline-band templates state-aware; **(3)** update the caveat strings; **(4)** per-state `BASE`/`COST_BANDS` tables (largest, `:84`/`:435`). **Plumbing is already complete end-to-end — every caller already passes `bundesland`.** Only the data content needs to change.

> Architectural punchline: activating state-awareness is *mechanically trivial* (the hook exists, all 1.0). The hard part is entirely **what numbers to put in it, and whether they're defensible.**

---

## 5. Design Options

### Option A — Destatis time-escalation + keep honest national baseline *(recommended core; free; fully defensible)*
- **Data:** 61261-0002 (national), build-time, quarterly. Compute `escalation = index_current / index_anchor`; apply to `BASE` (and bands) so numbers track real construction inflation. **No cross-state factor.**
- **State-factor:** none. `REGION_MULT` stays neutral. Numbers remain identical across states — *honestly* so.
- **Framing:** *"…deutscher Basiswert · Stand Q1/2026 (Destatis Baupreisindex 61261, 2021=100, DL-DE-BY-2.0) · regionale Varianz ±10%."* Keep + source it.
- **Pros:** free; official; citable; current; survives an architect's read; matches the team's documented Path-B discipline; also a clean home to finish de-Münchenizing the BASE provenance + retire GAP-1 strings. **Cons:** does **not** meet the goal's literal "different per state."
- Effort ≈ 2–3 d. Maintenance: quarterly auto-refresh + a freshness gate.

### Option B — Option A + coarse *proxy* regional tiers from Baufertigstellungen €/m² (table 31121) *(free; meets goal's spirit; proxy-grade)*
- **Data:** 31121 per-Bundesland *veranschlagte Baukosten je m²*, normalized to the national mean → a per-state factor (e.g. Bayern ~1.08, Sachsen ~0.90 — **illustrative; real values derived in Part B**). Feed `REGION_MULT` + `costBandFor`.
- **Framing (non-negotiable):** *"· indikative regionale Tendenz auf Basis der Destatis-Baufertigstellungen (veranschlagte Baukosten je m²; **kein offizieller Regionalfaktor**)."*
- **Pros:** free; official source; per-state-different numbers; directionally correct. **Cons:** the proxy is confounded by building mix/standard/size per state (Bayern's higher €/m² partly = bigger/fancier homes, not pure price level); a careful architect can challenge it; **per `cost-formula.md` the team's bar for Path A was "authoritative source-cited factors" — this proxy does not fully clear that bar.** Needs Rutik's explicit sign-off on proxy-grade numbers.
- Effort ≈ +2–3 d + a state-factor sanity guard.

### Option C — License BKI Regionalfaktoren *(authoritative; paid; the only "real data" path)*
- **Data:** BKI per-Kreis/Bundesland factors (manual quarterly entry — no API). Feed `REGION_MULT` + `costBandFor`.
- **Pros:** the recognized authoritative answer; fully defensible to an architect; literally meets the goal. **Cons:** **costs money** (license), no API (manual refresh = ongoing ops), licensing/attribution constraints to check before redistributing factors in a product.
- Effort ≈ 1–2 d wiring + procurement (Rutik: cost + lead time).

**Recommendation:** Ship **Option A** in Part B unconditionally (it's the free, honest, real improvement and the right home for the GAP-1/de-München cleanup). Treat the cross-state goal as a **separate explicit decision**: **B** if Rutik accepts free proxy-grade tiers with "indikativ" framing; **C** if he wants authoritative numbers and will fund BKI. Do **not** silently fabricate per-state multipliers from indices (statistically invalid — indices aren't level-comparable) or from land prices (wrong cost line).

---

## 6. Rendered Output Examples (T-01 EFH, ~180 m²)

*Numbers below are illustrative; Option A's escalation factor and Option B's tier factors are computed in Part B from live tables. The point is the **shape + framing**, not the exact €.*

**BEFORE (today) — all states identical, München-tuned, no source/date:**
```
München · Dresden · Saarbrücken  →  € 24.700 – 46.200
Basis: HOAI Zone III · deutscher Basiswert (regionale Varianz ±10%;
       staatsspezifische BKI-Anpassung in Vorbereitung)
```

**AFTER Option A — identical across states, but current + officially sourced (honest):**
```
München · Dresden · Saarbrücken  →  € 26.400 – 49.400   (illustr. ~+7% escalation)
Basis: HOAI Zone III · deutscher Basiswert · Stand Q1/2026
       (Destatis Baupreisindex 61261-0002, 2021=100, DL-DE-BY-2.0) · regionale Varianz ±10%
```

**AFTER Option B — per-state proxy tiers (illustrative factors), explicitly labelled:**
```
München (×~1.08)     → € 28.500 – 53.400
Dresden (×~0.90)     → € 23.800 – 44.500
Saarbrücken (×~0.93) → € 24.600 – 45.900
Basis: … deutscher Basiswert · Stand Q1/2026 (Destatis 61261) · regionale Varianz ±10%
       · indikative regionale Tendenz (Destatis Baufertigstellungen, kein offizieller Regionalfaktor)
```

**AFTER Option C — per-state authoritative (BKI) factors:** same shape as B, framing drops "indikativ/kein offizieller Regionalfaktor" and cites BKI Regionalfaktoren + Stand.

---

## 7. Part B Implementation Scope (if approved)

**Common to A (and prerequisite for B/C):**
- **Add:** `scripts/fetch-baupreisindex.mjs` (build-time, token from env, POST 61261-0002, parse ffcsv/Latin-1, handle Code 16) → emits `src/features/result/lib/baupreisindex.generated.ts` (escalation factor + `stand`). Mirrors the corpus-codegen pattern.
- **Modify:** `costNormsMuenchen.ts` (apply escalation to `BASE` + bands; retire GAP-1 München strings in T-01/T-03/T-05), the caveat strings (`stateLocalization.ts` costFactorLabel · `pdfStrings.ts` costs.basisTemplate/notes · `locales/*.json` 2001) to cite Stand + source.
- **New gates:** a **data-freshness check** (fail/warn if `baupreisindex.generated.ts` `stand` older than ~2 quarters — mirrors the new law-version gate), and a `prebuild` step that the generated file is in sync.
- **Docs:** flip `docs/cost-formula.md` from "honest framing" to "Destatis-escalated baseline."

**Additional for B:** `scripts/fetch-baufertigstellungen.mjs` (table 31121 per-Bundesland) → `regionalCostTiers.generated.ts`; populate `REGION_MULT`; extend `costBandFor(templateId, bundesland)` + update `exportPdf.ts:760` + `CostTimelineTab.tsx:111`; add a **state-factor sanity guard** (all factors within e.g. 0.8–1.2, no NaN); the "indikativ" framing strings.

**Additional for C:** manual `regionalFactorsBKI.ts` table + the same `REGION_MULT`/`costBandFor` wiring; a documented quarterly manual-refresh runbook; licence/attribution review.

**Estimates:** A ≈ 2–3 d · A+B ≈ 4–6 d · A+C ≈ 3–4 d (excl. BKI procurement). **Dependencies:** a registered Destatis API token (Rutik/ops, 1 form); for C, a BKI licence. **Risks:** API maintenance windows (build-retry), index rebasing (re-anchor logic), proxy defensibility (B).

---

## 8. Risks + Unknowns

1. **The goal isn't free-achievable with authoritative data** (the headline). Decision required before Part B: A / B / C. Everything else is downstream of this.
2. **The €-anchor stays München-derived.** Destatis only escalates a number we already have; it can't supply an absolute €/m². The BASE's München origin (`:64-82`) is unchanged by Option A — a separate (paid BKI, or accepted-proxy) input is the only way to re-anchor it nationally. *Honest mitigation:* HOAI fees (the BASE's backbone) are federal, so the BASE is less München-specific than the comment implies — but the +15–25% München premium baked in (`:70`) is real and should be removed/re-derived as part of any option.
3. **UNVERIFIED:** exact live 61261 fetch — blocked today by GENESIS scheduled maintenance (Code 16) + the account requirement (GAST is read-blocked). The endpoint/method/params are confirmed against live servers + v5.0 docs, but a real authenticated pull happens in Part B once a token exists.
4. **Option B proxy quality** — Baufertigstellungen €/m² confounds price with building mix/size; the derived tiers may over/understate true regional price level. Needs a sanity-bound + honest framing, and ideally a one-time eyeball against any free regional reference.
5. **Licence/attribution:** Destatis data is DL-DE-BY-2.0 (attribution required in the rendered output); BKI factors have their own redistribution terms to check before embedding in a shipped product.

---

## 9. Where I Disagree With This Prompt's Scope

**The prompt's framing — "Destatis Baupreisindex 61261 gives us free per-state construction price indices → plug into `REGION_MULT`" — is factually wrong, verified today.** 61261 is a **national** index, and even the per-state "M I 4" indices that exist are *time* indices that are **not cost-level-comparable across states**. Plugging index values into `REGION_MULT` would be **statistically invalid** (you'd be comparing each state's inflation-since-2021, not its cost level) and would produce numbers a German architect would correctly reject. So:

- The realistic free win is **time-freshness + honest national framing (Option A)**, *not* per-state numbers. This is the same conclusion the team reached in v1.0.22 (`docs/cost-formula.md`: Path B over guessed multipliers) — item #4 doesn't overturn it; it *sources and freshens* it.
- Genuine per-state numbers require either an **accepted proxy** (Option B, free but proxy-grade) or **paid BKI** (Option C). There is no free authoritative middle path. Pretending otherwise — or quietly shipping index-derived or land-price-derived multipliers — would repeat exactly the "fabricated multiplier" mistake the cost-formula doc warns against.
- Net: I recommend Part B implement Option A now, and that the cross-state goal be reframed as an explicit **A/B/C business decision** rather than an assumed "wire Destatis into REGION_MULT" task.

---

## Appendix — Sources (fetched 2026-05-27)
Destatis: [OpenData API](https://www.destatis.de/EN/Service/OpenData/api-webservice.html) · [61261 tables](https://www.destatis.de/DE/Themen/Wirtschaft/Preise/Baupreise-Immobilienpreisindex/Tabellen/_tabellen.html) · [method](https://www.destatis.de/DE/Themen/Wirtschaft/Preise/Baupreise-Immobilienpreisindex/Methoden/Erlaeuterungen/baupreisindex.html) · [2021=100 revision](https://www.destatis.de/DE/Themen/Wirtschaft/Preise/Baupreise-Immobilienpreisindex/revision_baupreise.html) · [PD26_126 Feb-2026](https://www.destatis.de/DE/Presse/Pressemitteilungen/2026/04/PD26_126_61261.html) · [Baufertigstellungen 31121](https://www.destatis.de/DE/Themen/Branchen-Unternehmen/Bauen/Tabellen/baufertigstellungen.html) · [regionalstatistik](https://www.regionalstatistik.de/genesis/online). State indices: [Berlin-BB M I 4](https://www.statistik-berlin-brandenburg.de/m-i-4-vj/) · [IT.NRW](https://www.it.nrw/thema/baupreise). Reference: [BAK Baupreisindex](https://bak.de/kammer-und-beruf/daten-fakten/baupreisindexdestatis/) · [BKI Regionalfaktoren (paid)](https://bki.de/bki-regionalfaktoren) · [restatis](https://long39ng.github.io/restatis/) · [bundesAPI/deutschland](https://github.com/bundesAPI/deutschland/blob/main/docs/destatis/README.md). Live API probed: `www-genesis.destatis.de/genesisWS/rest/2020/` (Code 16 maintenance + GET→405), `regionalstatistik.de/genesisws/rest/2020/` (GAST login OK / data Code 15). Repo: `src/features/result/lib/costNormsMuenchen.ts`, `src/features/chat/lib/exportPdf.ts`, `src/features/result/components/tabs/CostTimelineTab.tsx`, `src/legal/stateLocalization.ts`, `docs/cost-formula.md`.
