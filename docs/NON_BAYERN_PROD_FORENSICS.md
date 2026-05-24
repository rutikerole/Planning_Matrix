# NON-BAYERN PROD FORENSICS — how the Bayern leak manifests in real persona output

**Repo:** `/Users/rutikerole/Planning_Matrix` · **Date:** 2026-05-24 · **Mode:** READ-ONLY (SELECT-only via service-role PostgREST). Bayern SHA MATCH preserved.
**Source:** live dump of `projects.state` (JSONB) for all 5 non-Bayern prod rows (`bundesland != 'bayern'`).
**PII handling:** these are **test projects** — every address is a public landmark (Marienplatz, Römerberg, Königsallee, Pariser Platz) and both `owner_id`s map to the `.env.local` test accounts. Addresses are kept (they reveal nothing personal); `owner_id` is shown as the first-8 hex + `(test)`. No emails/names appear in `state`. Everything legally relevant (citations, German legal terms, qualifier reasons) is quoted verbatim.

## TL;DR — the leak is REAL but largely TIME-BOUND, with two live residuals

| When | Project | Tagged | Persona CONTENT | Live residual defects |
|---|---|---|---|---|
| 05-08 | Marienplatz (T-03) | `hessen` | 🔴 **Total Bayern saturation** — BayBO/BayDSchG/BLfD/BayernHeim/BAYAK/München authority | address *is* München; `city=muenchen`; `sv=0` |
| 05-11 | Römerberg (T-03) | `hessen` | 🟢 **Correct Hessen** (§ 63 HBO, § 6 HBO, GEG § 50) | 🔴 `city=muenchen` on a Frankfurt row; 🔴 Layer-C ran **`active=bayern`** → downgraded a legit federal GEG § 50 |
| 05-12 | Königsallee (T-03) | `nrw` | 🟢 **Correct NRW** (§ 62 BauO NRW, § 48 GEG, § 30 BauGB) | `city=null` ✓ |
| 05-13 | Königsallee (T-01) | `nrw` | 🟢 **Correct NRW/federal** (§ 34 BauGB, § 7 BauNVO, Düsseldorf authority) | `city=null` ✓ |
| 05-13 | Pariser Platz (T-01) | `berlin` | 🟢 **Correct Berlin** (§ 7 BauNVO, real Berlin authorities) | `city=null` ✓; stub-state risk dormant (see §5) |

**Headline:** the audit's theoretical "Bayern leak" was severe in the **oldest** project (2026-05-08) and is **largely remediated in current persona content** — 4 of 5 projects are state-correct, the anti-Bayern prompt block visibly held, and Stadtstaat Berlin produced perfect output. **But** two leak fingerprints survive in live data: the `city='muenchen'` hardcode frozen onto both Hessen rows, and a citation-firewall that resolved **`active=bayern` for a Hessen project**. Critically, the **Bug 26 `§ 65 BauO {CODE}` fabrication is NOT in any stored state** — it's a PDF/render-time surface, not a chat-state one (see §6).

---

## 1. 🔴 Marienplatz (hessen / T-03, `city=muenchen`, `state_version=0`, created 2026-05-08) — worst case

`owner=816d9675(test)` · `plot_address="Marienplatz 8, 80331 München"` · `bundesland="hessen"`

**This row is tagged `hessen` but every legal field is pure Bayern/München.** Note the address *is* München (Marienplatz 8 = the München Rathaus) — so the content is *address*-correct but the Bundesland *tag* is wrong, and the system served full Bayern law for a non-Bayern-tagged project. Leaked tokens, verbatim from `state`:

- `areas.A.reason`: "BauGB § 172 Erhaltungssatzung **Ensemble Altstadt München**"
- `areas.B.reason`: "**BayBO Art. 58** vereinfachtes Verfahren … Gebäudeklasse unverändert"
- `areas.C.reason`: "**BayDSchG Art. 6** Denkmalerlaubnis … Ensemble Altstadt München BauGB § 172; KfW und **BayernHeim** Förderung"
- `facts`: `ensemble_altstadt_muenchen` = "Grundstück liegt im **Ensemble Altstadt München (BLfD)**"; `denkmal_status` = "Eingetragenes Baudenkmal in der **Bayerischen Denkmalliste**"; `stadtbezirk` = "Stadtbezirk 1 – **Altstadt-Lehel**"; `foerderung_bayernheim` = "**BayernHeim**-Förderung"; `verfahren_art57_abs3_nr3_entfaellt` reason cites "**BayBO Art. 57 Abs. 3 Nr. 3**"
- `procedures`: "Baugenehmigung nach **BayBO Art. 58**" (LEGAL+CALCULATED), "Denkmalrechtliche Erlaubnis nach **BayDSchG Art. 6**" (LEGAL+CALCULATED)
- `questionsAsked` fingerprints (the actual chat prose): "…**bayerische architektenkammer bayak** führt eine architektensuche…", "…eingereicht beim **referat für stadtplanung und bauordnung**…" (the München authority), "…ensemble **altstadt münchen**…"

**Severity:** the leaked items carry **LEGAL+CALCULATED / AUTHORITY+VERIFIED** qualifiers — i.e. they would render on the result page and PDF as *confident*, not provisional. The citation firewall (Layer A/B) would have *logged* the BayBO-on-non-Bayern violations but, by design, **never blocks** — so the leak shipped. `state_version=0` + the 05-08 date place this as a pre-/early-fix artifact (likely before bundesland reached the prompt composer, or a deliberate leak-probe with a München address under a hessen tag).

---

## 2. 🟢/🔴 Römerberg (hessen / T-03, `city=muenchen`, `state_version=10`, created 2026-05-11) — fixed content, two live residuals

`owner=47b5247f(test)` · `plot_address="Römerberg 1, 60311 Frankfurt am Main"` · `bundesland="hessen"`

**Content is now correct Hessen** — the anti-Bayern prompt block held for a real Frankfurt address:
- `facts`: `plot.bundesland` = "Hessen … **nicht Bayern**"; `verfahren_hbo` = "genehmigungsfrei nach **§ 63 HBO**"; `geg_pflicht_paragraph` = "**GEG § 50**"; `abstandsflaechen_relevant` = "**§ 6 HBO** gilt materiell weiter"
- `procedures`: "Genehmigungsfreies Vorhaben nach **§ 63 HBO**", "Verfahrensfreie Maßnahme mit Anzeigepflicht … nach **HBO (Hessen)**"
- **No BayBO, no München, no BLfD anywhere.** The leak guard works here.

**But two residual defects are live in this row:**

**(a) `city='muenchen'` on a Frankfurt project** (Bug 42 frozen into data). The address is Frankfurt, `bundesland=hessen`, yet `city=muenchen`. Any code that keys on `city` (München cityBlock injection, München PLZ-district lookup, the München authority calendar — Bug 27) would misfire for this Frankfurt project. It's a latent leak carrier even though the persona text is clean.

**(b) The citation firewall ran with `active=bayern` for this Hessen project.** Verbatim, the `role-energieberater` qualifier reason in `state`:
> `"reason": "citation not in allow-list: GEG 50 (active=bayern)", "source": "DESIGNER", "quality": "ASSUMED"`

This is the single most revealing artifact in the dump. Layer-C `enforceCitationAllowList` resolved the **active Bundesland as `bayern`** for a project whose row is `hessen`, checked the model's `GEG § 50` citation against **Bayern's** allowlist (which contains `GEG § 8`, not `§ 50`), found it absent, and **downgraded the energy-consultant role to DESIGNER+ASSUMED** — i.e. marked a legitimate federal citation as preliminary, for the wrong reason. Meanwhile the *persona content* for the same turn is Hessen-correct. So in one turn, **the prompt composer saw Hessen but the citation firewall saw Bayern** — a bundesland-resolution split.

Candidate explanations (cannot be fully reconstructed from the row alone — flag for a trace lookup):
1. The project was created with `bundesland='bayern'` (wizard default / pre-auto-detect) and later updated to `hessen`, but this qualifier string was written by an earlier turn that ran as bayern. *(Against this: the content is uniformly Hessen, and the row shows no bayern content.)*
2. At that build, Layer-C received a different/defaulted bundesland value than the prompt composer (two code paths reading the active state differently).
3. The stale "wizard hardcodes bayern" path (FULL_GERMANY_AUDIT Bug 50) leaked a bayern default into the Layer-C call specifically.

**Recommended confirmation:** pull `event_log` / `logs.traces` for this project (`project_id = 24c8fb67-…`) around `2026-05-11T07:50:08Z` and inspect the `citation.fabrication` event's recorded active bundesland. This is the empirical lead for whether the firewall has a bundesland-resolution bug independent of the prompt composer — which would be a new P1 beyond the audit's findings.

---

## 3. 🟢 Königsallee T-03 (nrw, `city=null`, `state_version=7`, created 2026-05-12) — clean

`owner=816d9675(test)` · `plot_address="Königsallee 1, 40212 Düsseldorf"` · `bundesland="nrw"`

State-correct NRW throughout: `areas.B` = "Verfahrensfreiheit nach **§ 62 BauO NRW** … GEG-Pflicht nach **§ 48 GEG**"; `areas.A` = "beplanter Innenbereich (**§ 30 BauGB**)"; facts `verfahren_indikation` = "verfahrensfrei nach **§ 62 BauO NRW**", `geg_trigger` = "**§ 48 GEG** … GEG Anlage 7". `city=null` (correct post-fix). No BayBO/München. (Of note: a late `questionsAsked` fingerprint shows the user pivoted to a Stuttgart/BW address mid-chat and the persona correctly said "damit verlassen wir den nrw rahmen" — clean cross-state handling, not a leak.)

---

## 4. 🟢 Königsallee T-01 (nrw, `city=null`, `state_version=6`, created 2026-05-13) — clean

`owner=816d9675(test)` · `plot_address="Königsallee 30, 40212 Düsseldorf"` · `bundesland="nrw"`

Federal/NRW-correct: `§ 34 BauGB` Innenbereich + Einfügungsgebot, `§ 7 BauNVO` Kerngebiet (MK), Bauvoranfrage hard-blocker logic, "Bauvoranfrage beim **Bauaufsichtsamt Düsseldorf**", recommendation names the real "**Stadtplanungsamt Düsseldorf, Brinckmannstraße 5**". No Bayern leak. This is the audit's hard-blocker path working correctly (procedure deferred to a Bauvoranfrage rather than asserting a fabricated citation).

---

## 5. 🟢 Pariser Platz (berlin / T-01, `city=null`, `state_version=5`, created 2026-05-13) — Stadtstaat, clean

`owner=816d9675(test)` · `plot_address="Pariser Platz 1, 10117 Berlin"` · `bundesland="berlin"`

Berlin output is textbook-correct with **real Berlin authorities named**: `§ 7 BauNVO` MK blocker, Ensemble-Denkmalschutz blocker, "**Stadtentwicklungsamt Berlin-Mitte, Mathilde-Jacob-Platz 1, 10551 Berlin**", "**Untere Denkmalschutzbehörde Berlin-Mitte**", recommendation cites "**Bezirksamt Mitte, Stadtentwicklung, Karl-Marx-Allee 31, 10178 Berlin**". `city=null`. **Zero** BayBO/München/BLfD/Schwabing.

**Why the stub-state risk stayed dormant here (important nuance):** Berlin is a **minimum-stub** state — empty `allowedCitations`, Layer-C disabled (FULL_GERMANY_AUDIT Bug 38), and `resolveProcedure` would fabricate `§ 65 BauO BERLIN` (Bug 26). None of that bit because: (a) the persona only cited **federal** law (§ 30/§ 34 BauGB, § 7 BauNVO), which is legitimate for any state and needs no per-state allowlist; (b) it named Berlin authorities from the model's own knowledge, not from the (empty) state delta; and (c) **both hard blockers fired**, so `resolveProcedure` never reached its generic `§ 65 BauO {CODE}` branch — `procedures` is empty in `state`. **A Berlin case that needed a Berlin-specific procedure article (not a federal one, no hard blocker) would have exposed Bug 26 on PDF export.** So Berlin's cleanliness here is real but partly circumstantial.

---

## 6. SYNTHESIS — what the real data proves vs. the audit's theory

1. **The persona-content leak is largely remediated.** 4 of 5 projects (both NRW, Berlin, and the Frankfurt-Hessen content) are state-correct. The instruction-only anti-Bayern block (`_antiBayernLeak`, no runtime filter) **empirically held** for real non-Bayern projects — better than the theoretical worst case. The one saturated project is the oldest (05-08, `sv=0`), an early-build/probe artifact.

2. **Two leak fingerprints are still live in current data:**
   - **`city='muenchen'` frozen on both Hessen rows** (Bug 42) — a Frankfurt project carrying a München city tag. Render surfaces keyed on `city` (the München authority calendar, Bug 27) will misfire on these.
   - **Layer-C citation firewall resolved `active=bayern` for a Hessen project** (§2b) — downgraded a legitimate federal `GEG § 50`. This is a **new lead** (possible bundesland-resolution bug in the firewall, independent of the prompt composer) not isolated in the original audit; §2b gives the exact trace to pull to confirm it.

3. **Bug 26 (`§ 65 BauO {CODE}` fabrication) does NOT appear in any stored `state`.** It is a **PDF/result-render-time** defect, not a chat-state one — the persona emitted correct or federal citations, and the one stub-state project (Berlin) avoided the generic procedure branch via hard blockers. This refines the audit: the "ships wrong citation" risk for stub states would surface on **export/result render**, not in `projects.state`, and would require a stub-state case that (a) needs a state-specific procedure article and (b) has no hard blocker. **Recommend a forensic PDF render of a synthetic Sachsen/Brandenburg T-01-no-blocker case to see Bug 26 fire** before v1.0.25 scoping.

4. **`state_version` is non-zero and tracks turns** (0/10/7/6/5) — corroborates SCHEMA_DRIFT_RECONCILIATION.md: the ghost-deployed 0033 trigger is apparently live in prod.

### For v1.0.25 scoping
- The data **lowers** the urgency of "persona content leak" (mostly fixed) and **raises** two specific, narrower targets: the `city='muenchen'` hardcode (Bug 42, also fixes the calendar leak Bug 27's input) and the **Layer-C `active=bayern` resolution** lead (§2b — pull the trace first to confirm it's a code bug vs. a stale-row artifact).
- Bug 26 should be reproduced on an export render (not chat) before being scoped — it's real in code but did not manifest in these 5 chat states.

*Bayern SHA verified MATCH. No production code or data modified by this probe. All quoted strings are verbatim from `projects.state`; addresses are public landmarks from test projects; `owner_id` masked to first-8 hex.*
