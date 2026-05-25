# v1.0.30 — T-04 Use-conversion Leipzig (Sachsen) smoke-walk diagnosis

**Date:** 2026-05-25
**Baseline:** v1.0.29.2 (HEAD `6233cd4`) · Bayern SHA `b18d3f7f…aacb3471` MATCH
**Smoke walk:** Karl-Liebknecht-Straße 33, 04107 Leipzig · T-04 Use conversion
(Umnutzung) · retail (former bookshop, ~140 m² NGF) → gastronomy (café/bistro,
~40 seats, light kitchen, open until 23:00) · Gründerzeit ~1905 · no Denkmal
known · reiner Innenausbau (no structural intervention) · single entrance,
Hinterhof Rettungsweg in question · 9-round consultation, persona synthesis at
round 8/22.
**Evidence:** `change-of-use-karl-liebknecht-stra-e-2026-05-25.pdf` (EN, 11 pp) +
`…(1).pdf` (DE, same project). 6 desktop screenshots (Image 1–6) referenced by
the launch prompt but **not received in this session** — web-surface bugs
(92 web side, 93, 94, 96, 72) reconstructed from code + the PDF, which share
roots. Visual confirmation of the web surfaces is still outstanding.

> Persona quality across the 9-round walk was EXCELLENT — SächsBO, § 6 BauNVO MI
> assumption, DIN 4109 / 4109-5, TA Lärm, T30-RS, § 33 SächsBO Rettungsweg, all
> state-correct German law. **Every bug below is in the DETERMINISTIC pipeline,
> not the persona.** The persona was state- and template-correct; the downstream
> resolvers / cost engine / composers / labels still assume T-01 (EFH) shape,
> Bayern, and/or do not handle the Sachsen stub-state gracefully.

---

## The blind spot, proven

`smoke:pdf-matrix` is the **16-state T-01 matrix**. It renders
`sachsen-t01-leipzig.json` at 12 pp and passes 16/16. **No existing gate
exercises T-04.** That is why every bug below is invisible to CI. The real T-04
PDF is **11 pp** — and the missing 12th page is **Section 01 Executive Summary**
(Bug 103), skipped because its content source is empty (Bug 94/95). v1.0.30 adds
the first T-04 fixture (`sachsen-t04-*.json`) so the class becomes gate-visible.

---

## Two cross-cutting patterns (continuation of v1.0.28 / v1.0.29)

**(A) Template-blind pattern — third confirmation.** v1.0.28 fixed T-05
(Abbruch), v1.0.29 fixed T-02 (MFH). T-04 hits the *same* class on its own
surfaces: cost itemisation (`exportPdf.ts` only branches `isDemolition`),
procedure qualifier/label, suggestions/recommendations (→ empty exec page),
Domain B rows, building class, EN/DE labels. The deterministic pipeline still
defaults to EFH/new-build shape unless a template branch is explicitly added.
**This will keep biting T-06/T-07/T-08 until each gets a deterministic baseline
pass.**

**(B) Stub-state (Sachsen) leak — Stadtstaat-bleed equivalent.** Sachsen is a
non-substantive state pack (`states/sachsen.ts`, `isSubstantive: false`). The
honest-deferral string `STUB_VERIFY_DE = 'Detail-§ noch nicht hinterlegt — mit
Bauamt oder Architektenkammer abklären'` (`stateCitations.ts:151`) is **internal
framing** that leaks into user-facing text: the architect role description
(Bug 97), every required-document row (Bug 98), Domain B. It must be scrubbed /
gated on `isSubstantive` the same way the v1.0.29 STUB_VERIFY leak (Bug 67) was.

---

## Root-cause corrections vs the launch prompt

Reading the code before trusting the prompt — seven bugs differ materially from
the prompt's stated root. (Same discipline that produced 5 root corrections in
v1.0.29.)

| Bug | Prompt's stated root | **Actual root (file:line)** |
|---|---|---|
| 88 | "T-04 cost branch in `costNormsMuenchen.ts`" | The PDF cost **section** ignores `costNormsMuenchen`'s T-04 entry. `exportPdf.ts:684-710` builds 5 new-build HOAI rows; the **only** template branch is `isDemolition` (`:717`). Fix is an `isUseConversion` branch there. The `costNormsMuenchen` T-04 entry is unused *and* Bayern-framed ("Anzeige nach Art. 57 BayBO") — wrong for genehmigungspflichtig Saxony. |
| 100 | "PDF says 'Saxony factor' → reframe to German baseline" | **Already shipped.** Live PDF p.4 reads "German baseline (regional variance ±10%)". Only an optional "state-specific BKI adjustment in preparation" clause remains. |
| 103 | "audit which section is missing; 11 vs 12 pp" | **Not independent.** The missing page *is* Section 01 Executive Summary, skipped when `topThreeSources` is empty (`exportPdf.ts:438,472,473`) — the **same root as 94/95**. Fixing suggestions/recs auto-restores it; the TOC page-calc (`:1375` reads `hasTop3` = recommendations only) must align. |
| 104 | "EN labels for Use Change From/To" | **Far broader.** ~10 T-04 keys leak in **both** locales (the DE PDF also shows English "Use Change From/To"). `factLabels.{en,de}.ts` is missing the whole family. Plus a **key-name mismatch trap**: persona emits `gebaeude_baujahr` but `humanizeFact.ts:36` maps `bestandsgebaeude_baujahr` — adding labels blindly won't fix it. |
| 92 | "converge web→PDF" | The web's "Simplified · likely" is plausibly the **more correct** verdict (non-Sonderbau Gaststätte → § 63 SächsBO vereinfachtes Verfahren). Convergence must converge to the *correct* answer, not blindly to the PDF's "regulär". (BACKLOG already flags the web qualifier-override as partly persona-side.) |
| 96 | "fire only when denkmalschutz TRUE/UNKNOWN" | Value is "nicht bekannt" + qualifier ASSUMED. `factIsFalse()` (`composeRisks.ts:83-87`) matches only `false/'false'/'NEIN'/'nein'` — neither ASSUMED quality nor "nicht bekannt". Fix gates on `qualifier.quality`, not on adding string variants. |
| 72 | "map should recentre on geocoded address" | **By design, not a leftover bug.** The whole wizard is München-PLZ-gated (Phase 5 narrowing); caption is a static i18n string (`en/de.json:835`); an out-of-München message already exists (`de.json:829`). The legal engine is nationwide (16 states) but the wizard map is München-only — that inconsistency is the bug. Resolution (per Rutik): **honest non-München state**, not a nationwide recenter (geocoder is München-bounded). |

---

## Bug register (88–104, 72, + new 105–109)

Legend — surface: **PDF** / **WEB** / **BOTH**. Class: **A** template-blind ·
**B** Bayern-bleed · **S** stub-state leak · **L** layout · **K** key/label leak ·
**P** persona-side (mitigate render-side; no chat-turn this sprint).

### Bug 88 — cost engine T-04-blind (Class A) · PDF · C2
- **Evidence:** PDF p.4 — Architect (LP 1–4) €11,700–21,800, Structural
  €3,500–6,200, Surveying €900–1,700, Energy €1,900–3,500, Authority
  €1,200–2,700, total €19,200–35,900. User gave NGF interior fit-out, no
  structural intervention, no envelope/GEG trigger, no new site plan.
- **Root:** `exportPdf.ts:684-710` builds the 5 new-build HOAI rows from
  `buildCostBreakdown(procedure, klasse, costOpts)`; the only template branch is
  `const isDemolition = procedureCase.intent === 'abbruch'` (`:717`). T-04
  (`intent === 'umnutzung'`) falls through to the new-build itemisation.
- **Fix:** add `isUseConversion` branch mirroring the T-05 stub — use-conversion
  rows (Schallschutzgutachten, Brandschutzkonzept + Rettungswegplan, TA-Lärm
  Außenlärm-Gutachten, Bestandsaufnahme, architect LP1-2 coordination, authority
  fees) OR an honest "depends on Schallschutz/Brandschutz scope — request
  quotes" stub. No fabricated BKI. No new-build LP1-4 / GEG-thermal row.

### Bug 88-sub — `±` renders as `²` (Class L/K) · PDF · C2
- **Evidence:** PDF p.4 — "regional variance **²**10%".
- **Root:** `±` (U+00B1) at `pdfStrings.ts:106,111,318,321`; not in the
  `winAnsiSafe.ts:39-69` REPLACEMENTS table. **Caveat:** the caption is brand-
  serif italic, so the active render path is likely `preventBrandLigatures`
  (brand TTF subset), not the Helvetica `winAnsiSafe` fallback — `m²` renders
  fine (the `²` glyph exists), so `±` is missing/mis-mapped in the subset and
  resolves to the nearest existing glyph `²`. Confirm path at fix time.
- **Fix:** pre-substitute `±`→`+/-` before draw, or ensure brand-TTF glyph
  coverage for U+00B1.

### Bug 99 — cost basis "140 m² façade" but user gave NGF (Class A/K) · PDF · C2
- **Evidence:** PDF p.4 "Computed from 140 m² façade"; p.9 `Nettogrundfläche M2 =
  140`, `Use Change From: …~140 m² NGF`.
- **Root:** noun hardcoded — `pdfStrings.ts:106` (EN "façade"), `:318`
  (DE "Fassade"). The area *value* is correct (`resolveAreaSqmByTemplate` maps
  T-04 → `nutzflaeche`); only the caption noun is template-blind.
- **Fix:** template-aware noun — T-04 → "net floor area (NGF)" / "NGF".

### Bug 100 — "Saxony factor" honesty (Class A) · PDF · C2 (mostly done)
- **Evidence:** PDF p.4 already reads "German baseline (regional variance ±10%)".
- **Root:** the honest reframe is shipped; "Saxony factor" no longer present.
- **Fix:** optional — append "state-specific BKI adjustment in preparation"
  clause for parity with the Hamburg framing. Low priority.

### Bug 89 — Domain B underfilled for T-04 + Saxony (Class A/S) · BOTH · C3
- **Evidence:** PDF p.3 Section B = single "Procedure for Saxony subject to
  state-specific details… (Baugenehmigungsverfahren (regulär) — landesrechtliche
  Detail-Spezifika in Vorbereitung)" row, after 6 rounds of DIN 4109, DIN 4109-5,
  TA Lärm, § 33 SächsBO Rettungsweg, T30-RS. Substantive facts exist (p.9:
  `schallschutz_massnahmen…`, `brandschutz_massnahmen`, `rettungsweg_zweiter`,
  `ta_laerm_gutachten…`).
- **Root:** `composeLegalDomains.ts:200-235` builds **one** procedure-citation
  row per project; it reads the verfahren fact but never the substantive keys.
- **Fix:** read `schallschutz_massnahmen`/`brandschutz_massnahmen`/
  `rettungsweg_zweiter`/`ta_laerm_*` → substantive Domain B rows (mirror T-02
  Bug 66). Honest "in Vorbereitung" framing per row for the stub state, but use
  the fact-emitted §§ where present.

### Bug 90 — procedure qualifier ASSUMED, not CALCULATED (Class A) · BOTH · C4
- **Evidence:** PDF p.6 Section 05 + p.9 Key Data — "LEGAL · ASSUMED" on a
  procedure the persona calculated across 6 rounds.
- **Root:** `resolveProcedure.ts:330` matches only `/vereinfacht|simplified/`
  against the verfahren string. T-04 emits "Baugenehmigungsverfahren (regulär)"
  → no match → generic stub branch returns `confidence: 'ASSUMED'` (`:402`). The
  reasoning-chain facts (`sonderbau_trigger`=CALCULATED, `verfahren_
  genehmigungspflichtig`=CALCULATED) never feed the procedure confidence.
- **Fix:** mark CALCULATED when the reasoning chain is present (intent +
  non-Sonderbau + procedure-trigger facts resolved), not on keyword match.

### Bug 91 — "(regulär)" label wrong for T-04 use-change (Class A) · BOTH · C4
- **Evidence:** PDF p.6 + p.9 — "Baugenehmigungsverfahren (regulär)".
- **Root:** `stateLocalization.ts:154-158` hardcodes `nameDe: 'Baugenehmigungs-
  verfahren (regulär)'`; `deriveBaselineProcedure.ts:63-68` composes it —
  template-blind (every intent gets it).
- **Fix:** T-04-specific honest label — "Baugenehmigungsverfahren für
  Nutzungsänderung" if substantively cited, else "Genehmigungsverfahren
  erforderlich · Detail-Spezifika in Vorbereitung". Not "(regulär)".

### Bug 92 — web/PDF procedure label contradict (Class A/P) · BOTH · C4
- **Evidence:** (Image 4) web AT A GLANCE "Procedure: Simplified building permit
  · likely" vs PDF p.6 "Standard building permit (regulär) · REQUIRED".
- **Root:** two sources — web `AtAGlance.tsx:40-51` reads `resolvedProc.
  procedures` (persona, "+likely"); PDF `exportPdf.ts:800-842` reads the
  canonical `procedureDecision` from `resolveProcedure`.
- **Fix:** single-source the label, OR add a cross-surface regression assertion
  (web AtAGlance label === PDF Section 05 label) for every matrix fixture.
  Converge to the *correct* verdict (see correction table — "simplified" is
  plausibly right for non-Sonderbau Gaststätte).

### Bug 93 — building class em-dash for T-04 (Class A) · BOTH · C9
- **Evidence:** (Image 4) web "Building class: —"; PDF p.9 "Building class —
  eaves height not recorded; architect to confirm".
- **Root:** `AtAGlance.tsx:63-71` → `ataglance.tbd` placeholder when no explicit
  `gebaeudeklasse_*` fact and the geometric derivation returns null.
- **Fix:** for T-04 interior conversion, GK is not re-classified — omit the row
  OR show honest "not applicable for T-04 interior conversion".

### Bug 94 / 95 — Suggestions tab + PDF Recommendations empty (Class A) · BOTH · C5
- **Evidence:** (Image 1) "No suggestions yet…"; PDF p.8 "No recommendations
  recorded yet." After 9 rounds with rich next steps.
- **Root:** `composeDoNext.ts:206-211` notes T-04 falls through (persona Bug 63
  emits no `recommendations_delta`); `smartSuggestionsMatcher.ts:60-100`
  scope-gates miss when the corpus lacks the trigger keywords; render at
  `SuggestionsTab.tsx:89-92`, `pdfSections/recommendations.ts:92`,
  `exportPdf.ts:953-998`.
- **Fix:** T-04 deterministic baseline next-steps (Bauvoranfrage Leipzig,
  Schallschutzgutachter:in, Brandschutzplaner:in, Rettungsweg coordination,
  TA-Lärm) feeding both the Suggestions tab and PDF Section 08 — mirrors the
  T-05 Bug 56 fix shape. **Also restores the Executive Summary page (Bug 103).**

### Bug 96 — heritage risk fires on "nicht bekannt"/ASSUMED (Class S) · WEB · C6
- **Evidence:** (Image 4) Risk Register top risk = "Heritage-protection
  requirement"; PDF p.9 `Denkmalschutz = nicht bekannt an der Einheit · ASSUMED`.
- **Root:** `riskCatalog.ts:66-81` `risk-denkmal` has `suppressWhenFactFalse:
  'denkmalschutz'`; `composeRisks.ts:83-87` `factIsFalse()` matches only
  `false/'false'/'NEIN'/'nein'` — neither ASSUMED quality nor the "nicht bekannt"
  value → risk fires.
- **Fix:** gate on `qualifier.quality` — suppress heritage risk when
  denkmalschutz is ASSUMED (fire only on TRUE or genuine open UNKNOWN). Mirror
  the v1.0.28 Bug 57 fact-gating.

### Bug 97 — architect role leaks STUB_VERIFY_DE (Class S/K) · PDF · C7
- **Evidence:** PDF p.7 — "Existing-condition survey + permit submission;
  licensed under **Detail-§ noch nicht hinterlegt — mit Bauamt oder
  Architektenkammer abklären**."
- **Root:** `deriveBaselineRoles.ts:174` (RENOVATION_ROLES architect)
  interpolates `citations.permitSubmissionCitation`, which = `STUB_VERIFY_DE`
  for Sachsen; `sanitizeRole()` (`resolveRoles.ts:14-22`) strips only version
  tokens.
- **Fix:** `isSubstantive` guard before interpolating the citation (fallback
  "nach Landesrecht"), and/or scrub `STUB_VERIFY_DE` in `sanitizeRole()`. Same
  i18n gate family as v1.0.29 Bug 67/82.

### Bug 98 — "Detail-§ noch nicht hinterlegt" on every document row (Class S/K) · PDF · C7
- **Evidence:** PDF p.6 — all 4 required-document rows carry the same disclaimer.
- **Root:** `requiredDocuments.ts:87,88-114` resolves stub citations per-document
  when `!cit.isSubstantive`; `exportPdf.ts:902-920` renders each row as
  `${delivery} · ${citation}`.
- **Fix:** suppress the citation when `!isSubstantive`; render ONE footer
  "Saxony-specific §§ in preparation" at the end of Section 06 instead.

### Bug 101 — "Procedure indication" EN/DE concatenation broken (Class K) · PDF · C7
- **Evidence:** PDF p.9 — "standard building permit **nach** Baugenehmigungs-
  verfahren (regulä…".
- **Root:** `exportPdf.ts:1041-1051` builds value =
  `procedureLabel(kind,lang).toLowerCase() + ' nach ' + procedureDecision.
  citation` — hardcoded German " nach " even in EN, plus EN-label + DE-citation
  double-up.
- **Fix:** localize the connector (`lang==='en' ? ' per ' : ' nach '`) or just
  emit `procedureDecision.citation`; pick one language.

### Bug 102 — confidence 87% overconfident with PENDING domains (Class A) · BOTH · C8
- **Evidence:** Cover + Image 4 — 87% with Section A + C PENDING, building class
  empty, 5 open questions.
- **Root:** `computeConfidence.ts:96-136` — PENDING contributes only via the 0.4
  UNKNOWN weight; no explicit PENDING-domain penalty or cap.
- **Fix:** weight PENDING domains lower, or cap when ≥2 domains PENDING.
  **Guard:** confirm no fixture asserts a fixed confidence % before changing the
  formula (T-01/T-02/T-05 must stay green).

### Bug 103 — T-04 PDF 11 pp vs T-02 12 pp (Class A) · PDF · C5 (unified with 94/95)
- **Evidence:** PDF TOC lists "01 Executive summary p.3" but p.3 = Section 02.
- **Root:** Executive page is `null` when `topThreeSources` is empty
  (`exportPdf.ts:438,472,473`); TOC always renders 11 entries (`toc.ts:86-98`);
  `computeTocPageNumbers` (`:1358-1405`) reads `hasTop3 = recommendations.length`
  (`:1375`) not `topThreeSources`.
- **Fix:** the C5 suggestions baseline restores the page; align the TOC page-calc
  to `topThreeSources.length`.

### Bug 104 — T-04 fact-key labels leak in BOTH locales (Class K) · PDF · C7
- **Evidence:** PDF p.9 (EN) "Use Change From/To", "Gebietstyp Annahme", "Gebaeude
  Baujahr", "Strukturelle Aenderungen", "Nettogrundfläche M2", "Schallschutz
  Massnahmen Erforderlich", "Ta Laerm Gutachten Erforderlich", "Verfahren
  Genehmigungspflichtig", "Rettungsweg Zweiter", "Brandschutz Massnahmen",
  "Verfahren Indikation", "Gebäudeklasse"; the DE PDF `…(1).pdf` p.9 ALSO shows
  English "Use Change From/To".
- **Root:** `factLabels.{en,de}.ts` missing the T-04 fact-key family;
  `factLabel.ts:26-67` humanizer fallback title-cases the raw key. Key-name
  mismatch: persona emits `gebaeude_baujahr` but `humanizeFact.ts:36` maps
  `bestandsgebaeude_baujahr`. Canonical keys documented in
  `personaBehaviour.ts:168-174` (`nettogrundflaeche_m2` etc.).
- **Fix:** add the T-04 keys to **both** locale tables with proper EN/DE labels
  (Use Change From → "Current use"/"Bisherige Nutzung"; To → "Intended
  use"/"Neue Nutzung", etc.); reconcile key-name mismatches against
  `personaBehaviour.ts`. Same shape as v1.0.29 Bug 71/81.

### Bug 72 — wizard map shows München for Saxony project (Class A) · WEB · C10
- **Evidence:** (Image 6) federal state correctly Saxony, address correct
  Leipzig, but map shows München; caption "Currently active: München (postal
  codes 80331-81929)".
- **Root:** by design — `PlotMap.tsx:36 MUENCHEN_CENTER`; caption =
  static i18n `en/de.json:835`; wizard PLZ-gated `resolveCityFromPLZ.ts:30`,
  `plotValidation.ts`. An out-of-München message already exists
  (`de.json:829 mapClickOutOfMuenchen`). Legal engine is nationwide (16 states),
  wizard map is München-only.
- **Fix (per Rutik — honest non-München state):** when the project's resolved
  address is outside München, suppress the misleading München map view + "Other
  regions follow" caption and show an honest, state-aware caption (reuse the
  existing out-of-München string). No geocoder change; no nationwide recenter.

---

## New bugs found this walk (beyond the 17)

### Bug 105 — Key Data table overflows the footer (Class L) · PDF · DEFER (= Bug 78)
- **Evidence:** DE PDF p.9 — "Verfahren Indikation" row collides with the
  "VORLÄUFIG…" footer; ~17 rows exceed one page.
- **Disposition:** multi-page Key Data table = deferred Bug 78 (deep). DEFER.

### Bug 106 — long Key Data values clipped mid-word, no ellipsis (Class L) · PDF · C7
- **Evidence:** PDF p.9 — "…leichte Küche, Öffnun…", "…erforderlich; ko…",
  "…strukturell vor…", "…zweiter Ret…".
- **Root:** `keyData.ts` draws values with no `maxWidth`/wrap; `ellipsizeToWidth`
  (`pdfPrimitives.ts:424-440`) exists but is unused in the table.
- **Fix:** ellipsize value column to its width. **Surgical.**

### Bug 107 — document basis lines overflow right margin (Class L) · PDF · C7
- **Evidence:** PDF p.6 — first document basis line runs off the right page edge.
- **Fix:** ellipsize/clip document context strings to the content width.
  **Surgical.**

### Bug 108 — glossary right column overflows page edge (Class L) · PDF · C7
- **Evidence:** PDF p.11 — "Landes-Denkmalschutzgesetz Sachsen · Denkmalschu…"
  runs past the right edge.
- **Fix:** clamp glossary term/definition to the column width. **Surgical.**

### Bug 109 — verification signature block collision (Class L) · PDF · DEFER (= Bug 60)
- **Evidence:** PDF p.10 — "Bauherr · Owner" overlaps the italic disclaimer +
  "Date". Confirmed still broken on this walk.
- **Disposition:** = deferred Bug 60 (deep PDF layout). DEFER.

---

## Commit map

| Commit | Bugs | Scope |
|---|---|---|
| C1 | — | this diagnosis doc |
| C2 | 88, 88-sub, 99, 100 | T-04 cost branch + caption noun + `±` fix |
| C3 | 89 | Domain B substantive rows (+ stub framing) |
| C4 | 90, 91, 92 | procedure qualifier-from-reasoning + honest label + web/PDF single-source + assertion |
| C5 | 94, 95, **103** | T-04 deterministic suggestions/recs → restores exec page + TOC page-calc |
| C6 | 96 | risk fact-gating on `qualifier.quality` |
| C7 | 97, 98, 101, 104, **106, 107, 108** | PDF copy hygiene + EN/DE labels + surgical layout ellipsize |
| C8 | 102 | confidence weights PENDING lower / caps |
| C9 | 93 | building class — omit/honest for T-04 interior |
| C10 | 72 | wizard map — honest non-München state |
| C11 | — | `sachsen-t04-*.json` fixture (real persona keys, triangulated) + T-04 arms in `smoke-architect-flow.mts`; Bayern byte-identical + T-01/T-02/T-05 regression |
| C12 | — | CHANGELOG + HANDOFF + BACKLOG + tag `v1.0.30` + push |

**Deferred (confirmed deep this walk):** Bug 105 (= Bug 78 multi-page Key Data
table), Bug 109 (= Bug 60 signature layout). Persona-side: Bug 63
(`recommendations_delta` thin), fact-key naming alignment (`gebaeude_baujahr`
vs `bestandsgebaeude_baujahr`; dotted vs snake) — flagged for a chat-turn sprint,
NOT this one.

**Pattern flag for v1.0.31+:** T-06 (Aufstockung), T-07 (Anbau), T-08
(Sonstiges) will hit the identical template-blind class. T-05 + T-02 + T-04 are
now three proofs of the fix shape; each remaining template needs its own
deterministic baseline pass.

---

## Non-negotiables (every commit)

Bayern SHA `b18d3f7f…aacb3471` MATCH · 16-state T-01 matrix 16/16 · T-05 NRW +
T-02 Hamburg fixtures green · new T-04 Saxony fixture green · v1.0.29.1
procedure-conclusion + v1.0.29.2 chat-UX UNTOUCHED · daily gates green · no red
commits · no chat-turn redeploy · no migrations · no fabrication (honest "in
Vorbereitung" for any unsourced number) · net-zero lint in touched files (baseline
8 errors / 2 warnings, not in CI).

---

## Resolution

| Bug | Status | Commit |
|---|---|---|
| 88 cost T-04 branch | OPEN | C2 |
| 88-sub `±`→`²` | OPEN | C2 |
| 99 caption noun (NGF) | OPEN | C2 |
| 100 BKI honesty clause | OPEN (mostly shipped) | C2 |
| 89 Domain B rows | OPEN | C3 |
| 90 qualifier CALCULATED | OPEN | C4 |
| 91 honest procedure label | OPEN | C4 |
| 92 web/PDF single-source | OPEN | C4 |
| 94 + 95 suggestions/recs | OPEN | C5 |
| 103 exec page + page count | OPEN | C5 |
| 96 heritage risk gating | OPEN | C6 |
| 97 architect role scrub | OPEN | C7 |
| 98 doc disclaimer → footer | OPEN | C7 |
| 101 procedure-indication text | OPEN | C7 |
| 104 EN/DE T-04 labels | OPEN | C7 |
| 106 + 107 + 108 layout ellipsize | OPEN | C7 |
| 102 confidence | OPEN | C8 |
| 93 building class | OPEN | C9 |
| 72 wizard map honest state | OPEN | C10 |
| sachsen-t04 fixture + gate | OPEN | C11 |
| 105 multi-page table (= Bug 78) | DEFERRED | — |
| 109 signature layout (= Bug 60) | DEFERRED | — |
