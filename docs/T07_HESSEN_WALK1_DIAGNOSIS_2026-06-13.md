# T-07 Hessen Walk 1 — Diagnosis (READ-ONLY, no fixes)

**Date:** 2026-06-13 · **Project:** `f0c4cc86-12d9-4d24-be24-db47ba418975` (Extension Taunusstraße 24, 65183 Wiesbaden) · **Repo:** main @ `7d74b5d` · No code changed; Bayern SHA `41b37961` not touched.

Method note: the conflict was **reproduced at HEAD** by importing the real `resolveProcedure` functions and feeding the **actual persisted `state.procedures`** (read via service-role GET). My first hypothesis — a raw-string compare / stale bundle — was **wrong** and is recorded here as a discarded lead, because the verification mattered.

---

## PRIMARY — the false "Conflicting procedure signals" caveat

### Root cause (one sentence)
The conflict detector classifies the persona's **full title+rationale blob** with `classifyVerdictDirection`, and the rationale's phrase *"Brutto-Rauminhalt 144 m³ übersteigt jede **verfahrensfreie** Schwelle"* / *"exceeds any **verfahrensfreie** threshold"* matches the `free` regex — so the persona side classifies `'free'` while the fact side classifies `'simplified'`, producing a phantom direction conflict between two values that both mean **§ 65 HBO vereinfachtes**.

It is **not** a raw-string compare. It is a **CLASS-3 keyword-fragility** bug — the same lineage as the `genehmigungsfrei(?!gestellt)` lookahead fix — where a *negated/exceeded* mention of `verfahrensfrei` in explanatory prose is read as a positive verdict.

### Q1 — where it runs, what it compares, why §65 ≠ §65

- **Detector:** `buildProcedureCase`, `src/legal/resolveProcedure.ts:1531-1540`:
  ```
  const factVerdict    = resolveVerfahrensIndikation(facts)        // :1531
  const personaVerdict = extractPersonaProcedureVerdict(...)       // :1532
  const df = classifyVerdictDirection(factVerdict)                 // :1533
  const dp = classifyVerdictDirection(personaVerdict)              // :1534
  if (df && dp && df !== dp) { ... verfahren_konflikt = {...} }    // :1535-1538
  ```
  It compares the **direction** of two strings (not raw equality, not resolved kind).
- **The two strings (from the persisted state):**
  - `factVerdict` = `"vereinfachtes Verfahren nach § 65 HBO"` (the `verfahren_indikation` fact, `resolveVerfahrensIndikation` `:240-268`) → `df = 'simplified'`.
  - `personaVerdict` = the persona's single structured procedure rendered as `title_de + title_en + rationale_de + rationale_en` by `extractPersonaProcedureVerdict` (`:322-346`, text assembled `:340`):
    `"Vereinfachtes Baugenehmigungsverfahren (§ 65 HBO) Simplified Baugenehmigung procedure (§ 65 HBO) Brutto-Rauminhalt 144 m³ übersteigt jede verfahrensfreie Schwelle; … exceeds any verfahrensfreie threshold; …"` → `dp = 'free'`.
- **Why they diverge:** `classifyVerdictDirection` (`:300-303`) matches the bare token `verfahrensfrei`; the `freeNegated` guard (`:294-295`) only catches `(nicht|kein[e]?|not)\s+verfahrensfrei` adjacency. *"übersteigt jede verfahrensfreie Schwelle"* / *"exceeds any verfahrensfreie threshold"* is a negation **by verb**, not by adjacency, so the guard misses it → `'free'`.
- **Internal inconsistency (the cleanest framing):** `extractPersonaProcedureVerdict` *selects* this entry by classifying its **title first** → `'simplified'` (`:337-338`). `buildProcedureCase` then *re-classifies the full title+rationale* → `'free'` (`:1534`). **The same entry is classified two different ways**; the conflict is the disagreement between the selection classifier and the conflict classifier, not between the persona and the facts.
- **Reproduced at HEAD** (real inputs): `df=simplified`, `dp=free`, `verfahren_konflikt` set, `kind=vereinfachtes` (conservative `df` wins, `:1536-1537`), `confidence=ASSUMED`, `verdikt_konflikt` caveat present — byte-identical to the live PDF caveat.

### Q2 — qualifier mutation CALCULATED→ASSUMED and the surface split

- **Mutation:** `resolveProcedure.ts:586-600` — `if (c.verfahren_konflikt) { d = { ...d, confidence: 'ASSUMED', caveats: [verdikt_konflikt, ...] } }`. So the decision's confidence is forced `ASSUMED` and the caveat (`:594-595`) is prepended.
- **Surfaces sourced from the DECISION → ASSUMED (single source = `resolveProcedure` `decision.confidence`):**

  | Surface | file:line | reads |
  |---|---|---|
  | Web Procedure tab | `resolveProcedures.ts:26-44` (`procedureFromDecision`, qualifier.quality `:38`) | `decision.confidence` → **ASSUMED** |
  | PDF Section 05 card | `exportPdf.ts:909-941` (caveats in `decisionBody`; procRows `quality:` `:940`) | `procedureDecision.confidence` → **ASSUMED** + renders the caveat text |
  | PDF Key Data "Procedure indication" | `exportPdf.ts:1167-1184` (synthetic row, `quality:` `:1182`) | `procedureDecision.confidence` → **ASSUMED** |

- **Surface sourced from the raw FACT → CALCULATED (single source = the persisted `verfahren_indikation` fact's own qualifier `LEGAL/CALCULATED`):**

  | Surface | file:line | reads |
  |---|---|---|
  | .md Key Data "Procedure indication" | `exportMarkdown.ts:253-258` (iterates **all** facts, prints `f.qualifier.quality` `:258`) | raw fact → **CALCULATED** |

  Note: PDF Key Data **excludes** the raw `verfahren_indikation` fact (`exportPdf.ts:1154` `filter(f.key !== 'verfahren_indikation')`) and substitutes the decision-derived row; the `.md` does **neither** — it has no synthetic decision row and no exclusion, so it prints the fact verbatim.

- **This is CLASS-1 (two sources of truth)** for the "Procedure indication" Key-Data row: PDF/web build it from the resolved decision; `.md` builds it from the raw fact. The split is **only visible because the conflict diverged `decision.confidence` (ASSUMED) from `fact.quality` (CALCULATED)** — without the (false) conflict both read CALCULATED and the structural divergence stays latent. (The `.md` *Procedures* section does route through the decision via `selectProcedures(resolveProcedures(...))` `exportMarkdown.ts:116-142`, but `:142` prints status only, not the qualifier — so the ASSUMED is invisible there.)

### Q3 — should it compare resolved kind (+ citation base-§), never raw labels? + call-site census

**Yes.** Comparing the resolved `ProcedureDecision.kind` and/or the citation **base-§** would treat `"vereinfachtes Verfahren nach § 65 HBO"` and the persona's § 65 entry as identical (both `kind='vereinfachtes'`, base `§ 65 HBO`) → no conflict. The current design classifies **free-form prose** (incl. the explanatory rationale), which is inherently keyword-fragile.

Call sites that classify/compare procedure **strings** (the fragile surface; the model to follow is `decision.kind` switching, e.g. `composeLegalDomains.ts:40`, `exportPdf.ts:903-904`):

| # | file:line | what | exposure |
|---|---|---|---|
| 1 | `resolveProcedure.ts:1533-1535` | conflict: `classifyVerdictDirection(factVerdict) !== classifyVerdictDirection(personaVerdict)` | **the bug** — classifies the persona title+rationale blob |
| 2 | `resolveProcedure.ts:337-338` | `extractPersonaProcedureVerdict`: `classifyVerdictDirection(title) ?? classifyVerdictDirection(rationale)` to pick the most-conservative entry (`DIRECTION_RANK` `:341`) | the title-first classification that **disagrees** with #1's full-text classification |
| 3 | `resolveProcedure.ts:608-790` | `decideProcedure` verdict cascade: `/regex/.test(vi)` for verfahrensfrei `:659`, freistellung `:684`, kenntnisgabe, anzeige `:711`, vereinfacht `:741`, regular `:770` | classifies the **fact** string (short) — same family, lower risk |
| 4 | `resolveProcedures.ts:82-90` | `isLboVerdictProcedure`: `classifyVerdictDirection(title)\|\|...(rationale)\|\|/bauvoranfrage.../` to route verdict-vs-overlay | an overlay whose rationale mentions a procedure word could misroute |
| 5 | `resolveProcedures.ts:128-130` | `verdictKey`: dedup by normalized `status + title_de` string | raw-string normalize, not kind |

Minimal consistency fix (report-only, not implemented): have the conflict reuse the **same direction `extractPersonaProcedureVerdict` already computed** (title-first), or compare resolved `kind` + citation base-§ — either closes this case.

### Q4 — why no guard caught a §65-vs-§65 false positive

- **No T-07 coverage of the conflict path at all.** `composerParity.mts:75` defaults `procedures: []`, and `assertBaseline`/`assertFlip` never pass a persona procedures list, so `personaVerdict` is always `undefined` and the conflict branch (`if (factVerdict && personaVerdict)`) **never executes** in any per-template composer smoke — including `smoke-t07-composer`.
- **T-05 has a conflict fixture, but only the TRUE-positive + agreement cases:** `smoke-t05-composer.mts:194-205` pins fact `"reguläres … § 64 SächsBO"` vs persona `"Verfahrensfreier Vollabbruch § 61 SächsBO"` → a *genuine* regular-vs-free conflict, and an agreement case. **Nothing pins the false-positive** where fact and persona are the *same* procedure and only the rationale prose contains `verfahrensfrei`.
- **A same-kind / rationale-mentions-verfahrensfrei fixture would have been RED pre-walk.** None exists → gap. (The Jena lesson: guards pin happy-path verdicts, not prose-classification fragility.)

---

## SECONDARY — § 10 GEG vs the heated 45 m² Anbau (REPORT ONLY, corpus/lawyer)

- **What surfaced:** the recommendations/energy framing cites **§ 10 GEG** (PDF Recommendations footer; cell ENERGIE line `stateOverrides.ts` HE×T-07 `"• Energie — § 10 GEG. § 80 GEG."`). § 10 GEG = *"Grundsatz und Niedrigstenergiegebäude"* — the **new-build** principle.
- **The project:** heated 45 m² living-space Anbau (`anbau_nutzung = "beheizte Wohnfläche"`, `anbau_grundflaeche_m2 = 45`) to a 1960 building.
- **Correct provision (web-verified, geg-info.de / Haufe / BBSR-GEG portal):** **§ 51 GEG 2024 — "Anforderungen an ein bestehendes Gebäude bei Erweiterung und Ausbau."** A heated extension's new components must meet the 1.2× Referenzgebäude transmission-loss limit (Anlage 1); the **50 m²** threshold triggers the *additional* summer-heat-protection requirement (§ 14) — at 45 m² that add-on does **not** trigger, but the core § 51 component requirement does.
- **Verdict:** § 10 GEG (new-build) **over-frames** an Anbau. The user's § 48 guess (existing-building change) is directionally right but is the **component-modification** rule; the **precise** provision is **§ 51 GEG**. And **§ 51 GEG is NOT in the corpus** — `scripts/legal-corpus/federal.json` GEG carries only §§ 8/10/48/80 (verified). This is the § 27f lesson again: a real operative provision missing from corpus. **Flag for corpus ingestion + counsel confirmation; not a code conflict.**

---

## Recommended fix priority (for a later fix branch — NOT done here)

1. **Conflict detector** (`resolveProcedure.ts:1533-1535`): compare resolved kind / citation base-§, or reuse `extractPersonaProcedureVerdict`'s title-first direction. Ship a guard with a §65-fact + verfahrensfrei-in-rationale fixture (RED pre-fix) and wire the conflict path into the composer-parity smokes (currently `procedures: []`).
2. **CLASS-1 Key-Data split** (`exportMarkdown.ts:253-258` vs `exportPdf.ts:1154,1167-1184`): make `.md` Key Data render the "Procedure indication" row from the **same decision** the PDF uses (exclude the raw fact + add the synthetic decision row), so the two exports can never diverge.
3. **§ 51 GEG** corpus ingestion + HE×T-07 (and the base T-07 block) energy-citation review — lawyer-gated.
