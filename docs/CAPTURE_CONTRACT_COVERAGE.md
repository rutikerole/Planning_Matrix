# Capture-Contract Coverage Audit (T-05 sprint · Phase 2.5-C)

**Status: REPORT-ONLY.** No persona directives were added — every directive
addition moves the Bayern SHA (personaBehaviour.ts is hashed-prefix slice 5)
and is an operator decision. This doc generalizes the `verfahren_indikation`
gap: for every conclusion class our own prompt content instructs the persona
to reach, does a CANONICAL KEY exist that a composer actually consumes — or
does the conclusion land only in prose?

Legend: ✅ = directive + canonical key + composer reader all wired ·
⚠ = composer reader exists but NO emission directive (persona must guess the
key; the exact failure mode of the Sachsen T-05 walk) · ❌ = instructed
conclusion with NO canonical key and NO reader (prose-only) ·
🔌 = key/reader exists but the wiring between them is missing.

## A — Fully wired (directive → key → reader)

| Conclusion class | Canonical key | Readers |
|---|---|---|
| Procedure verdict | `verfahren_indikation` (pinned vocabulary, C5) | resolveProcedure (all surfaces) |
| Gebäudeklasse | `gebaeudeklasse` ("GK<N>") | GK row · T-05 tier test |
| Sonderbau triggers | `sonderbau_tatbestand_<x>` + `anzahl_sonderbau_tatbestaende` | Sonderbau gate · confidence |
| Structural intervention | `eingriff_tragende_teile` | procedure tree · docs · role gate |
| Envelope intervention | `eingriff_aussenhuelle` | procedure tree · GEG trigger · docs |
| External appearance | `aenderung_aeussere_erscheinung` | NRW sanierung tree |
| Heritage / ensemble | `denkmalschutz` · `ensembleschutz` | hard blocker / T-05 DSchG overlay · docs · risks |
| Kerngebiet / hard blocker | `mk_gebietsart` · `bauvoranfrage_hard_blocker` | hard-blocker gate |

## B — Reader exists, NO emission directive (⚠ the verfahren_indikation class)

These keys are read by composers but the persona is never told to emit them —
they land only when the model improvises the right name. Proposed: extend the
A.5/D.5 STRUKTUR-FAKTEN list (one SHA re-baseline covers all).

| Key | Read by | Risk if missing |
|---|---|---|
| `gebaeude_freistehend` | T-05 tier (verfahrensfrei vs anzeige) · GK derivation · Tragwerksplaner gate · Standsicherheit doc | conservative anzeige/GK2 default instead of the computed tier (safe but imprecise); the Sachsen walk emitted it by luck |
| `grenzstaendig` | procedure case · Abstandsflächen doc · Tragwerksplaner gate | attached-building duties silently absent |
| `in_gestaltungssatzung` | NRW sanierung caveats | missing Satzung caveat |
| `fassadenflaeche_m2` | GEG trigger · Abstandsflächen condition | GEG docs may not surface |
| `sonderbau_scope` | computeConfidence:59 | confidence mis-weighting (legacy key — consider folding into `anzahl_sonderbau_tatbestaende`) |

## C — Instructed conclusion, captured ad-hoc, consumed by NOBODY (❌/🔌)

| Instructed conclusion (source) | Walk evidence | Proposed canonical key | Proposed consumer |
|---|---|---|---|
| Vollabbruch vs Teilabbruch — "ERSTE Frage", T-05 block + edge directive | `abbruch_typ: Vollabbruch` captured, unconsumed | `abbruch_typ` ∈ {vollabbruch, teilabbruch} | resolver: Teilabbruch must NOT take the Beseitigung path (it is an Änderung → T-03-class simplified); today a Teilabbruch walk would render the demolition brief |
| Baujahr / pollutant era — T-03/T-05 blocks ("vor 1995 → Schadstoffkataster") | `baujahr_ca: 1960` captured; **`DocumentCase.baujahr_pre_1995` is a reader field NEITHER call site populates** (exportPdf + resolveDocuments pass nothing → asbest doc always fires for Bestand intents, never suppressed for ≥1995 buildings) | `baujahr` (number) | 🔌 wire `baujahr → baujahr_pre_1995` in both DocumentCase builders — reader already exists |
| Schadstoffverdacht — T-05 block | `schadstoffverdacht: Asbest…` captured | `schadstoffverdacht` (bool/enum) | requiredDocuments (promote asbest doc recommended→required on suspicion) · risks (today only a free-text evidencePattern match) |
| Planungsrecht classification (§ 30/34/35) — every template's LEITFRAGE 1 | derivation line scans ANY fact value with a `/§ \d+ BauGB/` regex (exportPdf planningRef — fragile) | `planungsrecht_paragraph` ∈ {§ 30, § 34, § 35 BauGB} | exec-summary derivation line · composeExecutiveRead statute implication |
| Anbau volume ≤ 75 m³ tier — T-07 LEITFRAGE 1 (BayBO Art. 57 Abs. 1 Nr. 1a) | no key | `anbau_brutto_rauminhalt_m3` (number) | a future T-07 verfahrensfrei tier in the anbau branch (today: simplified baseline + verify caveat — defensible but coarser than the persona's computed tier) |
| Aufstockung privilege (Art. 46 Abs. 6) — T-06 LEITFRAGE 1 | no key | `aufstockung_privilegiert` (bool) | T-06 branch refinement |
| Bestandsschutz rechtmäßig errichtet — T-03 LEITFRAGE 1 | no key | `bestandsschutz_bestaetigt` (tri-state) | risks/exec framing |
| Use-change matrix (alt → neu) — T-04 LEITFRAGE 1 | prose only | `nutzung_alt` / `nutzung_neu` | T-04 Sonderbau detection grounding |
| Demolition volume (€/m³ basis) — T-05 cost frame | cost norms already read `bruttoraumflaeche_m3` (T-05) but cost is an honest stub pending BKI factors | `bruttoraumflaeche_m3` | cost engine once GAP-4 closes |

## Phase 2.75 resolution (operator decision 2026-06-11)

IMPLEMENTED: one A.5/D.5 directive extension covering section B's four live
keys (gebaeude_freistehend, grenzstaendig, in_gestaltungssatzung,
fassadenflaeche_m2 — sonderbau_scope RETIRED instead: its one consumer,
computeConfidence, now reads the canonical Sonderbau contract) + abbruch_typ,
baujahr, schadstoffverdacht, planungsrecht_paragraph from section C. Frontend
wirings: baujahr→baujahr_pre_1995 in BOTH DocumentCase builders; teilabbruch
routing (Änderung/simplified family, never the Beseitigung path);
schadstoffverdacht promotes the pollutant doc recommended→REQUIRED and is the
PRIMARY risk-bump signal (free-text pattern = fallback).

EXPLICITLY DEFERRED to their templates' own campaigns (defensible coarse
baselines exist; the directive must not grow past what the next walks can
validate): T-07 75-m³ tier key, T-06 Art.-46 privilege, bestandsschutz
tri-state, T-04 nutzung_alt/nutzung_neu matrix, cost m³ basis (GAP-4).

## Recommendation (superseded by the resolution above)

One additional A.5/D.5 directive block covering section B's five keys +
`abbruch_typ` + `baujahr` + `schadstoffverdacht` (the highest-leverage subset
of C) would close the remaining capture gaps in a single intentional SHA
re-baseline. The two 🔌 wiring fixes (`baujahr_pre_1995`, `abbruch_typ`
routing) are frontend-only and need no directive to be useful once personas
emit the keys — but are inert until then.
