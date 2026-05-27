# V1.0.34 — Bayern Procedure-Article Correction Plan (for licensed-architect adjudication)

> Status: **FINDING + PLAN ONLY. No code changed.** Branch `phase-2/full-matrix`, Bayern SHA `a2ffc7bb…f31a8` (unchanged).
> This document exists because the Bayern procedure-article mapping is **systematically wrong** across the codebase — including the SHA-locked constitutional content and the flagship T-01 demo cell. The correction touches the SHA and needs a per-occurrence legal call, so it is staged here for a Bauvorlageberechtigte/r to adjudicate before application.

---

## 1. The finding (verified against primary sources)

The repo encodes a Bayern procedure mapping that is **shifted by one and invents a non-existent article**. Verified 2026-05-27 against gesetze-bayern.de (4 fetches) + cross-search of official stmb.bayern.de BayBO PDFs:

| Article | **Actual law (VERIFIED)** | What the repo says | Source |
|---|---|---|---|
| Art. 57 | Verfahrensfreie Bauvorhaben | ✓ correct | gesetze-bayern.de/Content/Document/BayBO-57 |
| **Art. 58** | **Genehmigungsfreistellung** | ❌ "Vereinfachtes Verfahren" | https://www.gesetze-bayern.de/Content/Document/BayBO-58 |
| **Art. 58a** | **DOES NOT EXIST (HTTP 404)** | ❌ "Genehmigungsfreistellung" (fabricated) | https://www.gesetze-bayern.de/Content/Document/BayBO-58a → 404 |
| **Art. 59** | **Vereinfachtes Baugenehmigungsverfahren** | ❌ "Baugenehmigungsverfahren (regulär)" | https://www.gesetze-bayern.de/Content/Document/BayBO-59 |
| **Art. 60** | **Baugenehmigungsverfahren** (regulär, inkl. Sonderbau) | ❌ "Sonderbau-Verfahren" | https://www.gesetze-bayern.de/Content/Document/BayBO-60 |

The mapping has been stable since the **BayBO 2008 reform** (confirmed via the official stmb.bayern.de historical PDFs 2008–2018), so this is not an old-numbering artifact — it is simply wrong.

### Why no gate caught it
- **Bayern SHA** guards *byte-stability*, not correctness — it has faithfully protected this error across 34+ commits.
- **verify:citation-drift** checks *membership* (Art. 58 is in the allowlist) — and the allowlist itself contains the fabricated `Art. 58a BayBO`, so the wrong tokens are "allowed."
- **smoke** checks *internal consistency* — the whole repo agrees with itself on the wrong mapping.
- The flagship fixture's own comment says citations were "manually verified against the repo's Bayern localization" — **circular verification against the repo's own wrong data, never against the primary law.**

A Bauvorlageberechtigte/r would catch this immediately: a brief that calls **Art. 58 "vereinfachtes Verfahren"** and cites a **non-existent Art. 58a** is a chamber-stamp-killer.

---

## 2. The correction rule

The repo's **procedure labels** (Genehmigungsfreistellung, vereinfachtes Verfahren, reguläres Verfahren) describe the *intended* procedure; only the **article numbers** are wrong. The mechanical rule is therefore **keep the label, correct the article to the verified law**:

| Repo (wrong) | → Corrected | Note |
|---|---|---|
| `Genehmigungsfreistellung (Art. 58a)` | `Genehmigungsfreistellung (Art. 58)` | Art. 58a is fabricated; Freistellung = Art. 58 |
| `Vereinfachtes Verfahren (Art. 58)` | `Vereinfachtes Verfahren (Art. 59)` | vereinfacht = Art. 59 |
| `Reguläres Baugenehmigungsverfahren (Art. 59)` | `Reguläres Baugenehmigungsverfahren (Art. 60)` | regulär = Art. 60 |
| `Sonderbau-Verfahren (Art. 60)` | `Baugenehmigungsverfahren (Art. 60), auch für Sonderbauten` | Art. 60 is the general full procedure; Sonderbau is a subset of it, not a separate article |

This is **mechanical and unambiguous for ~95% of sites.** The exception requiring a legal call is §4.

---

## 3. Complete per-occurrence inventory

### 3a. SHA-LOCKED files (require an intentional SHA re-baseline — same policy as C4a)

**`src/legal/bayern.ts`** (the constitutional `BAYERN_BLOCK`):
- `:70` `✓ "BayBO Art. 58" — Vereinfachtes` → Art. 59
- `:72` `✓ "BayBO Art. 58a" — Genehmigungsfreistellung` → `Art. 58` (drop 58a)
- `:74` `✓ "BayBO Art. 59" — Baugenehmigungsverfahren` → Art. 60
- `:75` `✓ "BayBO Art. 60" — Sonderbau-Verfahren` → relabel (Art. 60 = reguläres Verfahren)
- `:130` `dem vereinfachten Verfahren (Art. 58)` → Art. 59
- `:206` `Art. 58a BayBO — Genehmigungsfreistellung (qualifizierter B-Plan)` → `Art. 58 BayBO`
- `:212` `… nach Art. 58.` (Freistellung context) → Art. 58 stays IF this is the Freistellung anchor; verify in context
- `:217` `Art. 58 BayBO — Vereinfachtes Verfahren` → Art. 59
- `:224` `Art. 59 BayBO — Baugenehmigungsverfahren (reguläres Verfahren)` → Art. 60
- `:226-227` `vereinfachte Verfahren nach Art. 58` → Art. 59
- `:231` `(gegenüber Art. 58 erweitert)` → Art. 59
- `:244` `Art. 58 Abs. 2 für das vereinfachte Verfahren` → Art. 59 Abs. 2 (verify the Abs.)
- `:252` `Vorhaben in München (T-01) ist Art. 58 die Regel; Art. 59 kommt …` → **SUBSTANTIVE — see §4**
- `:256` `Art. 60 BayBO — Sonderbau-Verfahren` → relabel (reguläres Baugenehmigungsverfahren)
- `:285` `Im vereinfachten Verfahren (Art. 58)` → Art. 59
- `:323-324` `vereinfachten Baugenehmigungsverfahren nach Art. 58 BayBO` → Art. 59

**`src/legal/shared.ts`**: `:175` `"Das Verfahren wäre Art. 58 BayBO (vereinfachtes Verfahren)"` → Art. 59. (`:35`, `:79`, `:194` are generic lists/slugs — no change.)

**`src/legal/templates/shared.ts`**: `:39` `genehmigungspflichtig (Art. 58)` (implies Art. 58 = vereinfacht/genehmigungspflichtig) → Art. 59. (`:34` generic list — no change.)

**`src/legal/muenchen.ts`**: no procedure-article refs found (clean).

### 3b. Templates (NOT SHA-hashed — but all wrong, must move in lockstep with §3a)
- **`t01-neubau-efh.ts`**: `:9,:10,:11` markers; `:38,:40,:41,:52,:56,:61,:139,:140,:141,:157` — the full Freistellung(58a→58)/vereinfacht(58→59)/regulär(59→60) set. **Contains the EFH "default" statements → see §4.**
- **`t02-neubau-mfh.ts`**: `:9,:10` markers; `:46,:48,:57,:60,:169,:171,:189` — vereinfacht(58→59)/regulär(59→60). **MFH "default" → see §4.**
- **`t03-sanierung.ts`**: `:49,:93,:97,:125,:202` — vereinfacht(58→59)/regulär(59→60).
- **`t04-umnutzung.ts`**: `:12` marker; `:51,:83,:87,:183,:185` — vereinfacht(58→59)/regulär(59→60).
- **`t06-aufstockung.ts`**: `:16` marker; `:91,:214` — vereinfacht(58→59).
- **`t07-anbau.ts`**: `:10` marker; `:72,:77,:106,:191` — vereinfacht(58→59)/regulär(59→60).
- (t05-abbruch, t08-sonstiges: procedure refs are Art. 57-based; no 58/59 procedure mislabel found.)

### 3c. PDF engine + allowlist
- **`src/legal/stateLocalization.ts`** Bayern pack: `simplified.citation 'BayBO Art. 58'` → `'BayBO Art. 59'`; `regular.citation 'BayBO Art. 59'` → `'BayBO Art. 60'`. (Proof-of-concept in §5.)
- **`src/legal/bayernAllowedCitations.ts`**: `:44 'Art. 58 BayBO'` keep (Freistellung is real); **`:45 'Art. 58a BayBO'` → REMOVE (fabricated)**; `:46 'Art. 59 BayBO'` keep; `:47 'Art. 60 BayBO'` keep. (Also update `verify-citation-drift` expectations if needed.)

### 3d. Fixtures (test data — flagship + variants)
- `test/fixtures/bayern-t01-muenchen.json` — `_comment`, `areas.B.reason` (`:18`), `verfahren.typ` fact (`:30`), `rec-1` detail (`:33`): all `"Vereinfachtes … Art. 58"` → Art. 59 (pending §4 on whether the EFH should be vereinfacht vs Freistellung).
- `test/fixtures/bayern-t01-muenchen-allverified.json`, `…-partialverified.json` — same.
- `test/fixtures/bayern-t03-verified.json` — Sanierung Art. 58 refs → Art. 59.

### 3e. Smoke assertions (test code — currently enshrine the wrong Art. 58)
- `scripts/smoke-pdf-text.mts:1655` (comment), `:1660` (`/BayBO\s+Art\.\s*58/` assertion) → Art. 59.
- `scripts/smoke-architect-flow.mts:319` (comment), `:803` (`/BayBO\s+Art\.\s*58/` assertion) → Art. 59.
- `scripts/smokeWalk.mjs:3454-3455` (`Bayern simplified-permit citation Art. 58`) → Art. 59.

---

## 4. The ONE substantive question for the architect (not mechanical)

Several sites assert the **default/Regel** procedure for a München project. Example `bayern.ts:252`: *"Für ein Vorhaben in München (T-01) ist Art. 58 die Regel; Art. 59 kommt …"* and the t01/t02 templates say *"vereinfachtes … der Default für GK 3-5"* + *"Genehmigungsfreistellung wenn qualifizierter B-Plan."*

Under the mechanical rule these become *"vereinfachtes (Art. 59) die Regel; Genehmigungsfreistellung (Art. 58) wenn B-Plan."* **But that ordering is itself a legal judgment:** for a München EFH/MFH in a *qualifizierter Bebauungsplan*, **Genehmigungsfreistellung (Art. 58) is frequently the common path**, not the vereinfachte Verfahren. So the corrected statements may need to *reverse the default ordering*, not just renumber.

**Architect, please decide for T-01 (EFH) and T-02 (MFH) in München:**
1. Is the **default/Regel** procedure the **vereinfachte Verfahren (Art. 59)** or **Genehmigungsfreistellung (Art. 58)**?
2. Should the briefs lead with Freistellung (Art. 58) for B-Plan cases and fall back to vereinfacht (Art. 59)?
3. Any site where the *label* (not just the number) should change.

Everything else in §3 is mechanical (keep label → fix article).

---

## 5. Proof-of-concept: corrected `stateLocalization.ts` Bayern block

```ts
  procedure: {
    free: {
      citation: 'BayBO Art. 57',
      nameDe: 'Verfahrensfreie Vorhaben',
      nameEn: 'Procedure-free projects',
    },
    notification: {
      citation: 'BayBO Art. 57 Abs. 7',
      nameDe: 'Anzeigeverfahren',
      nameEn: 'Notification procedure',
    },
    simplified: {
      citation: 'BayBO Art. 59',          // was 'BayBO Art. 58' — Art. 59 IS the vereinfachte Verfahren
      nameDe: 'Vereinfachtes Baugenehmigungsverfahren',
      nameEn: 'Simplified building permit',
    },
    regular: {
      citation: 'BayBO Art. 60',          // was 'BayBO Art. 59' — Art. 60 is the reguläre Baugenehmigungsverfahren
      nameDe: 'Baugenehmigungsverfahren (regulär)',
      nameEn: 'Regular building permit',
    },
  },
```
(Note: the 4-field structure has no slot for Genehmigungsfreistellung (Art. 58). If the architect confirms Freistellung is a primary München path, the structure should gain a `genehmigungsfreistellung` field — a small `_types` change, not SHA-relevant.)

---

## 6. Application plan (one coordinated commit, after adjudication)

1. Apply §3a (SHA-locked) + §3b (templates) + §3c + §3d + §3e in a **single commit** so the repo never sits in a half-corrected, internally-inconsistent state (the failure mode worse than the current consistent-but-wrong state).
2. **Intentional SHA re-baseline** (authorized policy, as in C4a): recompute, update `EXPECTED_BAYERN_SHA`, log old→new in `bayernSha.mjs` with the legal reason + this doc's reference.
3. Gates that MUST pass: `verify:bayern-sha` (new baseline), `verify:citation-drift` (allowlist no longer contains Art. 58a; PDF cites Art. 59/60), `smoke:citations`, `smoke:pdf-text` (updated assertions), `smoke:pdf-matrix`, `smoke:architect`, `tsc -b`, `verify:bundle`, `verify:locales`.
4. **Operator/architect visual confirm** of the corrected T-01 Bayern PDF before push.

---

## 7. Broader implication (for the record)

This is the **wrong-§ class made concrete in the constitutional core** — exactly what the v1.0.30 strategic research warned about and what statute-XML grounding (never built) was meant to prevent. Two systemic lessons:
- **Internal-consistency gates (SHA, drift, smoke) cannot certify legal correctness.** They certify the repo agrees with itself. Only primary-source grounding + a licensed reviewer certifies correctness.
- **The "manually verified" claims in the fixtures were circular** (verified against the repo's own data). Any remaining "manually verified" legal content should be re-checked against primary sources, not the repo.

Recommend: after this correction, add a **build-time primary-source citation check** (the deferred statute-XML grounding) so a wrong article number cannot pass a green build again.
