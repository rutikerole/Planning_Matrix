# Phase 10.1 — Citation Accuracy Findings

**Date:** 2026-05-06
**Scope:** root-cause audit of the wrong-Bundesland citation bug surfaced in the post-Phase-10 smoke walk.
**Reviewers needed before merge:** none (this is the finding doc; the implementation is gated by reviewer of the code commits that follow).

---

## 1. The smoke-walk symptoms (recap)

Two failing turns, observed in production:

| Template | Address | Persona output | Verdict |
|---|---|---|---|
| T-07 Anbau | Türkenstr. 52, 80799 München | "…unter **Annex 1 BayBO**…" + 48 m³ < 75 m³ math wrong | conclusion + citation both wrong |
| T-03 Sanierung | Schwabinger Tor 1, 80807 München | "…unter **Annex 1 BayBO**…" | conclusion right, citation wrong (should be **Art. 57 Abs. 3 Nr. 3**) |

The *Denkmal* follow-up cited **BayDSchG Art. 6** correctly in the same session, so the persona CAN cite Bayern law correctly when prompt content lands. The persistent error is the "Anlage 1 / Annex 1 BayBO" pattern — a Brandenburg/NRW (and Musterbauordnung) structure that **does not exist in the BayBO**.

---

## 2. Root cause — the smoking gun

`supabase/functions/chat-turn/legalContext/bayern.ts:70-84` actively instructs the model to refer to "Anlage 1 BayBO":

```text
Verfahrensfreie Vorhaben (Anlage 1 BayBO i. V. m. Art. 56 BayBO)
  Bestimmte kleine Vorhaben sind verfahrensfrei und brauchen weder
  Genehmigung noch Anzeige. Die abschließende Liste steht in
  Anlage 1 BayBO. Mit der Modernisierung 2025 wurde der Katalog
  ausgeweitet…

  DISZIPLIN: nennen Sie keine konkreten Maße (m³-Schwellen,
  Geschossigkeit) ohne Bezug auf Anlage 1 in der jeweils gültigen
  Fassung.
```

This block is part of the cached system prefix loaded on every turn for every Bayern project. It tells the model — explicitly, in a "DISZIPLIN" rule — to anchor verfahrensfrei statements to "Anlage 1 BayBO". The BayBO has **no Anlage 1**: verfahrensfreie Vorhaben are listed directly inside **Art. 57** (Abs. 1 Nr. 1–18, Abs. 2–7). "Anlage 1" is the structural pattern of the **Brandenburgische Bauordnung (BbgBO)** and the **Musterbauordnung (MBO)** — and, partially, the **BauO NRW** in older fassungen. The model is doing exactly what the prompt instructs; the prompt is wrong.

This is **not** training-data bleed-through. It is a **content defect in the cached prefix**. Removing the false instruction is the highest-leverage edit in this entire phase.

---

## 3. Citation density audit (per file)

Counts of explicit Art./§/Anlage references in each block, plus character of each reference. Verifies "the templates do contain right citations; the prefix injects the wrong one."

### 3.1 `legalContext/shared.ts` — federal-agnostic foundation

| Marker | Count | Notes |
|---|---|---|
| `§ … BauGB` (correct) | 6 | shared rule: "§ 34 BauGB", "§§ 30 ff. BauGB" — **canonical example** of citation discipline (line 79-81) |
| `Art. … BayBO` (correct) | 1 | line 79, used as positive example alongside § BauGB |
| `Anlage` | 0 | clean |
| Negative examples (✗) | 0 | **no "do not cite" list** |

### 3.2 `legalContext/federal.ts` — BauGB / BauNVO / GEG / HOAI

| Marker | Count | Notes |
|---|---|---|
| `§ … BauGB` | 23 | uniformly correct (`§ 30`, `§ 34`, `§ 35`, `§ 31 Abs. 2`, `§ 246e` …) |
| `§ … BauNVO` | 8 | `§ 1`, `§ 3`–`§ 11` (Gebietstypen). Correct |
| `§ … GEG` | 1 | line 111: `§ 8 GEG`. Correct |
| `Art. … BayBO` | 0 | correctly absent — federal block doesn't mention Bayern law |
| `Anlage` | 0 | clean |

### 3.3 `legalContext/bayern.ts` — **the bug source**

| Marker | Count | Notes |
|---|---|---|
| `Art. … BayBO` (correct) | 27 | `Art. 2 Abs. 3`, `Art. 2 Abs. 4`, `Art. 6`, `Art. 44a`, `Art. 47`, `Art. 57`, `Art. 58`, `Art. 59`, `Art. 60`, `Art. 61`, `Art. 62`, `Art. 64`, `Art. 65`, `Art. 66`, `Art. 69`, `Art. 81`, `Art. 82c` |
| **`Anlage 1 BayBO` (WRONG)** | **2** | **lines 70 + 73** — actively directs the model to use this phrase |
| `Anlage 1 in der jeweils gültigen Fassung` | 1 | line 79-80 — reinforces the wrong frame |
| `§ … BauGB` (correct, in cross-refs) | 4 | `§ 30 Abs. 1`, `§ 246e`, `§ 31 Abs. 2`, `§ 34 Abs. 3b` |
| `Art. … BayDSchG` (correct) | 1 | `Art. 6 BayDSchG` (line 222) |
| Negative examples (✗) | 0 | **no list of articles to avoid** |

**Defect signature:** the only file in the entire prefix that contains "Anlage 1 BayBO" is bayern.ts. There is no other source. Fix here = root-cause fix.

Other notes on bayern.ts:
- Line 87-94 describes "Art. 57 Abs. 1" as **Genehmigungsfreistellung**. Per the current BayBO post-Modernisierungsgesetz, Genehmigungsfreistellung is in **Art. 58a** (qualifizierter Bebauungsplan + Wohngebäude); **Art. 57** is the verfahrensfreie Vorhaben + Anzeige tier. The shared.ts and template-level citations get this right (`Art. 57 Abs. 3 Nr. 3` for Instandsetzung; `Art. 58` for vereinfachtes Verfahren). Bayern.ts at lines 86–94 is an additional definitional drift; flagged for Phase 10.1 fix as well.

### 3.4 `legalContext/muenchen.ts` — city-level statutes

| Marker | Count | Notes |
|---|---|---|
| `Art. … BayBO` | 4 | `Art. 61`, `Art. 64 Abs. 3` — correct |
| `Art. … BayDSchG` | 2 | `Art. 6` — correct |
| `Anlage 1 Nr. 1.1` | 1 | line 98 — refers to **StPlS 926 Anlage 1**, the city's parking ordinance. **CORRECT use** (StPlS does have Anlagen) — must be preserved by the linter (do not flag). |
| `Anlage-1-Werte` (StPlS) | 2 | lines 110, 112 — same provenance, correct |
| `Anlagen 2–7 der Satzung` | 1 | StPlS zoning maps — correct |
| `Anlagen A2–A82` | 1 | BaumschutzV 901 detail maps — correct |
| `§ … BauGB` | 5 | `§ 172` Erhaltungssatzung — correct |
| Negative examples (✗) | 0 | n/a — city-statute level is fine |

**Linter design implication:** `/Anlage 1 BayBO/i` is the safe pattern (anchors to BayBO). `/Anlage 1/i` alone would false-positive on the StPlS 926 references, which are correct.

### 3.5 `legalContext/personaBehaviour.ts` — Phase 8.5 rules

| Marker | Count | Notes |
|---|---|---|
| `§ … BauGB` | 2 | line 220, 246 — used as positive examples |
| `Art. … BayBO` | 0 | rules don't directly cite — they reference "die BayBO" generically |
| `Anlage` | 0 | clean |
| **Citation discipline rule** | **0** | **no rule about Bundesland-correctness or ✗/✓ examples**. Phase 8.5 covers PLZ-lookup, areas_update, fact-extraction, conversation length — citations are out of scope today. |

### 3.6 `legalContext/templates/shared.ts` — TEMPLATE_SHARED_BLOCK

| Marker | Count | Notes |
|---|---|---|
| `Art. 57/58/59 BayBO` | 3 | line 39-40, line 49-50 — correct, used as examples of "template ≠ procedure" |
| `Anlage` | 0 | clean |

### 3.7 Per-template citation density (T-01 .. T-08)

The format below: each row shows what the template tail (Block 2 of the cache) currently teaches the model. **Bold** = key article that is the template's value-add and is most prone to drift if not reinforced.

| Template | Correct Art. citations | Anlage refs | Has VERBOTENE list? | Notes |
|---|---|---|---|---|
| **T-01 Neubau EFH** | `Art. 57 Abs. 1`, `Art. 58`, `Art. 59`, `Art. 2 Abs. 3 Nr. 1`, `Art. 44a`, `Art. 46 Abs. 6` (negative ref), `Art. 64`, `Art. 65`, `§ 30 / 34 / 35 BauGB` | 0 | **No** | LEGAL-VERIFY-MARKER header is good. T-01 cites Genehmigungsfreistellung as `Art. 57 Abs. 1` (drift from current BayBO `Art. 58a`) — flagged for the `bayern.ts` rewrite to align. |
| **T-02 Neubau MFH** | `Art. 2 Abs. 3 GK 3-5`, `Art. 2 Abs. 4` Sonderbau, `Art. 58`, `Art. 59`, `Art. 62`, `Art. 8 Abs. 2`, DIN 4109 | 0 | **No** | Brandschutz cited via BAYAK (correct). MFH-specific Sonderbau triggers right. Missing: explicit "do not cite Anlage 1 BayBO". |
| **T-03 Sanierung** | **`Art. 57 Abs. 3 Nr. 3`** (Instandsetzung), **`Art. 57 Abs. 1 Nr. 18`** (DG-Ausbau), `Art. 46 Abs. 6`, `Art. 57 Abs. 7`, `Art. 76`, `Art. 81 Abs. 1 Nr. 4 b`, `Art. 58`, `Art. 59`, `Art. 6 BayDSchG` (cross-ref) | 0 | **No** | The template is the *most citation-dense* in the codebase. Yet it failed the smoke walk. The first-turn primer (index.ts:505) explicitly mentions `Art. 57 Abs. 3 Nr. 3` — which means the persona had the right answer in the primer turn and *still* drifted to "Annex 1 BayBO" by the time it spoke. This proves the bayern.ts wrong-anchor instruction is overriding the template-level positive example. |
| **T-04 Umnutzung** | **`Art. 57 Abs. 4`** (Use-change verfahrensfrei), `Art. 57 Abs. 7`, `Art. 58`, `Art. 59`, `Art. 2 Abs. 4`, BauNVO `§§ 1-15`, `§ 31 BauGB` | 0 | **No** | T-04 also relies on the new 2025 verfahrensfrei tier — same risk pattern as T-03. |
| **T-05 Abbruch** | **`Art. 57 Abs. 5 Satz 1` / `Satz 2`**, `Art. 57 Abs. 7` (1-Monat-Frist), `Art. 76`, `Art. 12`, BayDSchG | 0 | **No** | Cleanly cites the abs/satz structure inside Art. 57. |
| **T-06 Aufstockung** | **`Art. 46 Abs. 6`** (Privileg), **`Art. 81 Abs. 1 Nr. 4 b`** (Stellplatz-Privileg), `Art. 57 Abs. 1 Nr. 18`, `Art. 31 Abs. 2 Satz 2`, `Art. 58`, GEG | 0 | **No** | T-06's whole value-prop is the two privileges. Persona MUST not drift to "Anlage 1" here. |
| **T-07 Anbau** | **`Art. 57 Abs. 1 Nr. 1 a`** (75-m³-Schwelle), `Art. 6` (Abstandsflächen), `Art. 58`, `§ 35 BauGB`, GEG, DIN 4109 | 0 | **No** | T-07 was one of the two failing templates. The first-turn primer (index.ts:513) cites `Art. 57 Abs. 1 Nr. 1 a` directly — the model overrode this with bayern.ts's "Anlage 1" anchor. |
| **T-08 Sonstiges** | `Art. 57 Abs. 1 Nr. 1 b` (Garage), `Art. 57 Abs. 1 Nr. 3 b` (PV Dach), `Art. 57 Abs. 1` (Pool), `§ 35 Abs. 1 Nr. 8 b BauGB`, BayBO Werbeanlagen-Reform 04/2026 | 0 | **No** | T-08 routes to many sub-categories that are all properly Art-57-internal. |

### 3.8 First-turn priming (`index.ts:496-517`)

The per-template kickoff string is correct in every case. T-03 mentions `Art. 57 Abs. 3 Nr. 3`; T-06 mentions `Art. 46 Abs. 6` and `Art. 81 Abs. 1 Nr. 4 b`; T-07 mentions `Art. 57 Abs. 1 Nr. 1 a`. So the **primer is fine**; the drift happens because bayern.ts (sitting earlier in the prefix and inside the cached prefix) tells the model the wrong anchor.

---

## 4. Hypotheses verdict

| # | Hypothesis | Status | Evidence |
|---|---|---|---|
| **H1** | Template content is too vague | **Partial** | Templates DO cite explicit articles. But none have a VERBOTENE list and none teach the model to *avoid* "Anlage 1 BayBO" specifically. Adding ✗ examples per template is high-leverage. |
| **H2** | bayern.ts isn't strong enough on Bundesland-discipline | **Confirmed (root cause)** | bayern.ts actively instructs the model to use "Anlage 1 BayBO". Two distinct mentions in lines 70 + 73 + 79. This must be removed and replaced with Art-57-anchored content + a top-of-file Bundesland-Disziplin block with explicit ✗/✓ pairs. |
| **H3** | Citation discipline rule missing in personaBehaviour.ts | **Confirmed** | Phase 8.5 rules cover everything except citation correctness. Adding a top-level ZITATE-DISZIPLIN rule (Bayern-specific, Art. vs §, Stand 01.01.2025, "lieber kein Zitat als ein falsches") is the persona-layer fix. |
| **H4** | No post-validation on citations | **Confirmed** | factPlausibility.ts validates numeric/categorical fact bounds but never scans `message_de`/`message_en` text. A linter is the safety net for drift even when content is right. |
| **H5** | Cache-warming bleeding stale patterns | **Possible** | The cached prefix is ~9-13k tokens and has a 5-minute TTL. After a content edit, warm sessions may still serve the old prefix until the cache expires. A `// Cache-Bust: Phase-10.1` comment in compose.ts forces invalidation. Low-cost insurance. |

**Conclusion:** H2 is the smoking gun, H3 + H1 are reinforcements, H4 is the permanent safety net, H5 is the deployment hygiene.

---

## 5. Hard-call: shape of the fix

Eight commits (per brief §7), no scope creep:

1. **(this doc)** `docs(phase-10-1): findings + citation-density audit`
2. `feat(prompt): bayern.ts — strip 'Anlage 1 BayBO' + add Bundesland-Disziplin block`
   - Remove the two "Anlage 1 BayBO" sentences (lines 70-84).
   - Replace with correct content anchored to **BayBO Art. 57** (verfahrensfrei) + cross-ref to Art. 56 (genehmigungs-, but-not-verfahrensfreie Vorhaben).
   - Prepend a **BUNDESLAND-DISZIPLIN: BAYERN** header at the top of BAYERN_BLOCK with explicit ✗ / ✓ pairs covering: Anlage 1 BayBO, Annex 1 BayBO, "§ NN BayBO" instead of Art., Bauordnung NRW/Bln/BbgBO, MBO als Rechtsgrundlage.
3. `feat(prompt): personaBehaviour.ts — ZITATE-DISZIPLIN top-level rule`
   - Add the rule between A.4/D.4 and C.1 so it sits with the other "every turn" rules.
   - Cover: Bayern-spezifisch, Strukturmarker (Art./§), Aktualität (Stand 01.01.2025), "lieber kein Zitat als ein falsches".
4. `feat(prompt): T-01..T-08 — TYPISCHE / VERBOTENE Zitate per template`
   - 8 template files updated. 5–8 positive citations + 2–4 forbidden patterns per template, **scoped to the kind of mistakes likely in that template** (T-07 emphasises 75-m³ schwelle ≠ Anlage 1; T-03 emphasises Art. 57 Abs. 3 Nr. 3 ≠ Anlage 1; T-08 emphasises sub-category-specific Art. 57 paragraphs).
5. `feat(edge): citationLint.ts module + wire into JSON & streaming paths`
   - Create `supabase/functions/chat-turn/citationLint.ts` exporting `lintCitations(text)`.
   - Pattern list anchored to BayBO so muenchen.ts's StPlS Anlage 1 references don't false-positive.
   - Call the linter on `message_de` + `message_en` after Zod validation in **both** `index.ts` (JSON path, after `validateFactPlausibility`) and `streaming.ts` (streaming path, in the same place).
6. `feat(observability): citation.violation events flow to event_log`
   - Direct insert into `public.event_log` with `source='system'`, `name='citation.violation'`, `attributes={pattern, match, context, severity}`, `trace_id` populated from tracer.
   - Non-blocking: response always proceeds. Failed inserts are warn-logged (same pattern as `logTurnEvent`).
7. `feat(scripts): smokeWalk.ts — citation regression CLI`
   - Reads `(template, address, expected_citations[])` tuples from a static JSON.
   - Calls the deployed Edge Function with a real auth token from env.
   - Pipes the first-turn response through `lintCitations` AND checks every `expected_citations` entry appears in the response.
   - Exits 0 (green) / 1 (red) for CI gating later.
   - Bundles two seed cases: T-07 wintergarten and T-03 sanierung — exactly the two failing turns.
8. `chore(phase-10-1): cache-bust comment + comprehensive report`
   - Add `// Cache-Bust: Phase-10.1 (2026-05-06)` to compose.ts so existing warm sessions invalidate.
   - Re-run smokeWalk.ts. Capture the green report into `docs/PHASE_10_1_REPORT.md`.

**Render Gate:** N/A (no UI).
**Bundle ceiling:** N/A (Edge-function code; 300 KB gz client ceiling unaffected).
**Migration:** none (event_log already exists; no new table needed).

---

## 6. Out of scope (raised for Phase 10.2 if helpful)

The brief §5.3 raises a `legalRegistry.ts` single-source-of-truth for legal citations. **I am not building this in Phase 10.1** because:
- The smoking gun is one file (bayern.ts). Removing the false instruction + adding the discipline block fixes 90% of the bug.
- A full legal registry is a 2-3-day refactor that touches every template + linter + smoke-walk.
- The smoke walk + linter (Phase 10.1) provide enough cover that we can size the registry properly later, against real production telemetry.

Recommend tracking as Phase 10.2 with an explicit input from real `citation.violation` rates over the next 2-3 weeks.

---

## 7. Verification target after commit 8

- **T-07 retest** (Türkenstr 52, "4×4×3m wintergarten"):
  - PASS if the persona cites `BayBO Art. 57 Abs. 1 Nr. 1 a` and states 48 m³ < 75 m³ → verfahrensfrei.
  - PASS if Abstandsflächen are framed as substantive (Art. 6 BayBO), not as a procedural gate to verfahrensfreiheit.
- **T-03 retest** (Schwabinger Tor 1, like-for-like sanierung):
  - PASS if the persona cites `BayBO Art. 57 Abs. 3 Nr. 3` (Instandsetzung verfahrensfrei seit 01.01.2025).
  - PASS if Denkmal cross-ref still cites `BayDSchG Art. 6` correctly.
- **smokeWalk.ts**: green for both seed cases.
- **citation.violation rate**: zero in the first 24 h post-deploy (telemetry check by user).

If any pass criterion fails, fix-commit before declaring complete.

— end of findings.
