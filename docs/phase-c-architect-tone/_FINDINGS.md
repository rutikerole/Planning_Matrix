# Phase C · Item #2 — Architect-Tone Body-Copy Diagnostic

**Branch:** `phase-c/architect-tone` (from `main` @ 015c76f)
**Scope:** the 11 newly-substantive states (berlin, brandenburg, bremen, hamburg, mv, rlp,
saarland, sachsen, sachsen-anhalt, sh, thueringen). The 5 hand-coded substantive states
(bayern, nrw, bw, hessen, niedersachsen) are **out of scope** and not audited here.
**This is a DIAGNOSTIC ONLY. No source files were changed. No fixes applied.**

Method: rendered one DE PDF per state via `buildExportPdf` (extracts in `/tmp/atone-{slug}.txt`),
extracted every prose section, traced each string back to its source `file:line`, and classified
it **BOILERPLATE** (reads template-stamped / machine-composed) vs **AUTHORED** (reads
state-specific / human-written) vs **LEAK** (wrong — a citation from the wrong state).

> **Render caveat (what the extracts actually exercised):** each extract is a T-01 regular-procedure
> case with Denkmalschutz=false. So **F1 rendered in all 11** (extract line 130/131), but **F2 and F3
> are LATENT** — the verfahrensfrei "Anzeige-Formular" row and the "Denkmalrechtliche Erlaubnis" row
> are not emitted on this case, so their leaks (`§ 60 NBauO`, `${DSchG} § 9`) never reached paper here.
> They are confirmed by the code path (`requiredDocuments.ts:97,112`) and fire on T-04 / verfahrensfrei
> inputs and on denkmal=true inputs respectively. **F10** (stub-footer) rendered only on **RLP**.

> ⚠️ **The headline finding is not tone — it is correctness.** Phase B flipped these 11 states
> from `isSubstantive=false` → `true`. Several ternaries in `requiredDocuments.ts` were written
> for the *old* 5-substantive world, where the `else` branch meant **Niedersachsen**. The 11 new
> states now fall into that `else` and render **Niedersachsen §§** in their own PDFs. This is the
> same class of bug as the München cost-leak — a cross-state leak my own Phase B work exposed.

---

## TIER 0 — CORRECTNESS LEAKS (wrong citations, not tone — fix required regardless of tone pass)

### F1 · `§ 14 NBauO` leaks into all 11 states' Brandschutznachweis  ⛔ HIGH
- **Source:** `src/legal/requiredDocuments.ts:99-109` — `brandschutzCitation` ternary.
  The `else` arm is `'§ 14 NBauO'` (line 108), written when Niedersachsen was the only
  un-named substantive state. All 11 now hit it.
- **Renders as (ground truth):** Berlin / Sachsen / RLP all show
  `Brandschutznachweis · … · § 14 NBauO` (`/tmp/atone-rlp.txt:130`, same in berlin/sachsen).
- **Why it's wrong:** Berlin's fire-protection § is **§ 14 BauO Bln**, Sachsen's is
  **§ 14 SächsBO**, RLP's is **§ 15 LBauO**, etc. Niedersachsen's NBauO has no jurisdiction there.
- **Second-pass options:** wire from corpus (`STATE_CORPUS_*` likely carries the per-state
  Brandschutz §) OR fall back to honest deferral. Do **not** leave NBauO.

### F2 · `§ 60 NBauO` leaks into the verfahrensfrei / notification citation  ⛔ HIGH
- **Source:** `src/legal/requiredDocuments.ts:88-98` — `permitFreeNotificationCitation` ternary;
  `else` arm `'§ 60 NBauO'` (line 97). Same mechanism as F1.
- **Renders as:** the "Anzeige-Formular (verfahrensfrei)" document row (`requiredDocuments.ts:145-153`),
  i.e. surfaces on the verfahrensfrei procedure path (T-04 and any permit-free case).
- **Why it's wrong:** identical to F1 — Niedersachsen § in 11 foreign states.

### F3 · Hardcoded `§ 9` stamped onto every state's Denkmalschutzgesetz  ⚠ MED-HIGH
- **Source:** `src/legal/requiredDocuments.ts:111-113` — `denkmalCitation = `${cit.denkmalSchutzAct} § 9``.
- **Renders as:** `Denkmalrechtliche Erlaubnis · … · DSchG Bln § 9` (Berlin), `SächsDSchG § 9`
  (Sachsen), `DSchG M-V § 9`, etc. — **"§ 9" is appended to all 11 regardless of statute.**
- **Why it's suspect:** the Erlaubnis-§ is genuinely § 9 in some DSchG but **not all**. This is an
  unverified assumption rendered as a hard citation = fabrication risk. Verify per-state in the
  second pass or strip the `§ 9` and keep the act name only (as the stub path did).

---

## TIER 1 — TEMPLATE-STAMPED NAMES (read "fill-in-the-blank", some factually loose)

### F4 · Generic monument authority `Landesamt für Denkmalpflege {Land}`  ⚠ MED
- **Source:** `src/legal/stateCitations.ts:196` (`makeStub` → `denkmalAuthorityDe`). The Phase-C
  item-#1 `ADJACENT_LAWS` overlay replaced `bauVorlagenAct` + `denkmalSchutzAct` but **left
  `denkmalAuthorityDe` as the makeStub generic.**
- **Surfaces via:** `src/features/chat/lib/pdfSections/glossary.ts:162`
  (`${cit.denkmalAuthorityDe}; ${cit.denkmalSchutzAct} regelt Erlaubnispflichten.`).
- **Why it's wrong/loose:** several states do not call it that — Berlin = **Landesdenkmalamt
  Berlin**, Hamburg = **Denkmalschutzamt** (im Bezirksamt), Brandenburg = **BLDAM**. "Landesamt
  für Denkmalpflege {Land}" is a plausible-but-unverified label = reads generated.

### F5 · `Untere Denkmalbehörde (Stadt {capital})`  ⚠ MED
- **Source:** `src/legal/requiredDocuments.ts:110` — `Untere Denkmalbehörde (Stadt ${cit.archivCity})`
  where `archivCity` = the state capital (`stateCitations.ts:160-178`).
- **Why it's loose:** for Flächenländer the untere Denkmalbehörde sits at the Kreis/Gemeinde of the
  *project*, not "Stadt {capital}". Reads as a templated placeholder. (For the 3 Stadtstaaten it
  happens to be correct.)

### F6 · `Architektenkammer {Land}` chamber name  ◦ LOW
- **Source:** `src/legal/stateLocalization.ts:360-361` (`makeStub`).
- Mostly *correct* (chambers are state-level), but it is pure `${labelDe}` interpolation — flag for
  awareness, low priority.

---

## TIER 2 — PROCEDURE PROSE (the most visible tone artifacts)

### F7 · Procedure-name DOUBLING — "Reguläres Baugenehmigungsverfahren (Baugenehmigungsverfahren (regulär), …)"  ⚠ MED
- **Two halves compose it:**
  1. `src/legal/resolveProcedure.ts:436` — `Reguläres Baugenehmigungsverfahren (${reg.nameDe}, ${reg.citation}) als Ausgangspunkt; konkrete Verfahrensart mit dem lokalen Bauamt bestätigen.`
  2. `src/legal/stateLocalization.ts:377` — `reg.nameDe` is itself `'Baugenehmigungsverfahren (regulär)'`.
- **Renders as (ground truth):** `Reguläres Baugenehmigungsverfahren (Baugenehmigungsverfahren (regulär), § 70 LBauO) als Ausgangspunkt…` (`/tmp/atone-rlp.txt:112-113`).
- **Cross-cutting note for your call:** the `nameDe` "(regulär)" lives in *both* the makeStub
  localization (11 states) **and** the 5 substantive packs (summary noted lines 103/162/272/327/445).
  Fixing it at `resolveProcedure.ts:436` (drop the redundant `${reg.nameDe}` interpolation) cleans
  all 16 — which would touch the fenced 5. **Decision needed:** fix the shared composer (improves all,
  crosses the fence) or only the 11 stub `nameDe` values.

### F8 · Procedure deferral caveat — "landesspezifische Detailregeln noch nicht vollständig hinterlegt"  ⚠ MED
- **Source:** `src/legal/resolveProcedure.ts:445-446` (caveat `bebauungsplan_specific`).
- **Renders as:** bullet `• Spezifische Verfahrensart mit lokalem Bauamt klären — landesspezifische Detailregeln noch nicht vollständig hinterlegt.` (`/tmp/atone-rlp.txt:114-115`).
- **Why it reads generated:** it is honest deferral, **but** for the states where we now *have* the
  regular-procedure § (most of the 11), "noch nicht vollständig hinterlegt" understates what we know
  and reads like an un-finished template. Keep honest, but re-author the wording per actual coverage.

### F9 · Generic procedure hedge "konkrete Verfahrensart mit dem lokalen Bauamt bestätigen"  ◦ LOW-MED
- **Source:** `src/legal/resolveProcedure.ts:436` (tail of `reasoning_de`).
- Appended verbatim to every state. Reads as a stock hedge.

---

## TIER 3 — STATE-BLIND GENERIC PROSE (shared/federal; reads templated but not wrong)

### F10 · Documents stub-footer "Landesspezifische Einreichungs-§§ in Vorbereitung…"  ⚠ MED (only states it shows on)
- **Source:** `src/features/chat/lib/pdfStrings.ts:480-481` (`docs.stubFooter`, DE).
- **Renders as:** `Landesspezifische Einreichungs-§§ in Vorbereitung — die genauen Dokumentanforderungen mit dem lokalen Bauamt abklären.` (`/tmp/atone-rlp.txt:143`).
- **Note:** appears on RLP (the structural-deferral outlier) but **not** on Berlin/Sachsen — the
  per-state files confirm exactly which states still trip it.

### F11 · LegalLandscape click-to-expand FEDERAL_OVERRIDES — "…in Vorbereitung"  ◦ LOW-MED
- **Source:** `src/data/legalRuleSnippets.ts:206-236` (Brandschutz / Stellplatzsatzung / Baulasten /
  Denkmalschutz non-Bayern overrides). State-blind deferral prose in the LegalLandscapeTab.

### F12 · Generic role qualifications "bauvorlageberechtigt nach {citation}"  ◦ LOW
- **Source:** `src/features/result/lib/roleEffortLookup.ts:55-84` (consumes per-state citation pack).
  Mostly correct once the citation resolves; reads templated.

### F13 · Cost rationales / timeline annotations / "BKI-Anpassung in Vorbereitung"  🚫 OUT OF SCOPE
- **Source:** `src/legal/stateLocalization.ts:394-396` (`costFactorLabel`),
  `src/data/costRationales.ts`, `src/data/timelineAnnotations.ts`.
- **Cost & timeline calibration is Phase C item #4 — explicitly fenced off this pass. Listed for
  completeness; do NOT touch in item #2.**

### F14 · `archivCity` shows the PROJECT city, not the state capital  ◦ LOW (surfaced in sachsen extract)
- **Observed:** Sachsen extract renders `Stadtarchiv Leipzig` (`/tmp/atone-sachsen.txt:59`) although the
  Sachsen capital in `stateCitations.ts:172` is `Dresden`. The archive reference is being driven by the
  fixture's project city, not `archivCity`. Cosmetic, but note it interacts with F5 (Untere Denkmalbehörde
  uses `archivCity` = capital, so the two city references can disagree within one PDF).

### F15 · Glossary header short-name vs. body spelled-out name can disagree  ◦ LOW
- **Observed (saarland/sachsen):** the glossary term header uses the adjacent-law short name (`BauVorlVO`,
  `DVOSächsBO` — `glossary.ts:155`) while the body sentence spells out a different parent-law label. Reads
  as two un-reconciled templates. Source `glossary.ts:153-158`.

---

## AUTHORED — reads state-specific, leave alone ✅

| What | Source | Example |
|---|---|---|
| A1 · Regular/free/simplified procedure §§ (corpus) | `src/legal/corpusCitations.generated.ts` (overlaid in `stateLocalization` `withLocalizationCorpus`) | RLP `§ 70 LBauO`, Berlin `§ 63 BauO Bln` |
| A2 · Adjacent-law short names (Phase-C item #1) | `src/legal/stateCitations.ts` `ADJACENT_LAWS` | `BauVorlV`, `DSchG Bln`, `BauuntPrüfVO`, `DVOSächsBO`, `SächsDSchG` |
| A3 · Submission/structural §§ (corpus) surfaced in glossary | `corpusCitations.generated.ts` → `glossary.ts:156-157` | `permitFormCitation`, `structuralCertCitation` per state |
| A4 · Archive/capital city | `stateCitations.ts:160-178` | Potsdam, Schwerin, Dresden, Kiel … |

---

## Severity roll-up

| Tier | Findings | Nature | Must fix? |
|---|---|---|---|
| **0** | F1, F2, F3 | Cross-state citation leak / fabrication | **Yes — correctness, independent of tone** |
| **1** | F4, F5, F6 | Templated names, some factually loose | F4/F5 yes (tone + accuracy), F6 optional |
| **2** | F7, F8, F9 | Procedure-prose tone artifacts | Yes — the core of "architect-tone" |
| **3** | F10, F11, F12 | State-blind generic prose | Judgment call (re-author wording) |
| **3** | F14, F15 | City/glossary cosmetics | Low — optional cleanup |
| **—** | F13 | Cost/timeline | **No — Phase C item #4, fenced** |

## Recommended decisions before the rewrite pass

1. **F1/F2/F3 first, as correctness** — these are leaked/assumed citations, not tone. Confirm whether
   to source them from the corpus or revert to honest deferral.
2. **F7 fence question** — fix the shared `resolveProcedure.ts:436` composer (cleans all 16, crosses
   the 5-state fence) or only the 11 `nameDe` values? Needs your call.
3. **F13 stays untouched** (item #4).

See the 11 per-state files (`berlin.md` … `thueringen.md`) for each state's actual rendered strings,
quoted and classified against this catalog.
