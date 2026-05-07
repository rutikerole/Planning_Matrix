# Phase 11 — OQ3 Geoportal Research

**Goal.** Half-day prep for Phase 15 (Geoportal Integration). Confirm which top-5 states have a public WMS endpoint callable from a Vercel Edge Function — no API keys, no registration walls, no IP whitelisting.

**The right question.** "Has a Geoportal" is not the same as "has a usable B-Plan WMS for our stack." Many states have a Geoportal *website* (a viewer) without a state-aggregated B-Plan layer, because Bebauungspläne are **municipal artifacts** in Germany. The right question per state is: **does the state aggregate municipal B-Plan data via an INSPIRE PLU (Planned Land Use) WMS service we can call server-side?**

**Validation method.** Quick web research only — actual `GetCapabilities` calls and CSP-header probing happen at Phase 15 kickoff, not now.

---

## Findings per state

### Bayern — München (baseline, already shipped)

- WMS host: `geoportal.muenchen.de` (city-level).
- Layer: `gsm_wfs:vablock_stadtbezirk` + `vagrund_baug_umgriff_veredelt_in_kraft`.
- Status: **shipped**, proxied via `bplan-lookup` Edge Function with `bplan_lookup_rate_limits` (30/min).
- Note: this is a **city-level** WMS, not a state-level aggregator. The pattern does not transfer wholesale to the four other top states, where the equivalent service is at the LBO state level (or sometimes per-Gemeinde).

### NRW — usable, in active rollout

- WMS host: `https://www.wms.nrw.de/` (state-level GDI).
- Public, OGC-compliant, no auth.
- B-Plan coverage: **state-aggregated INSPIRE PLU service** under construction. Per `bauleitplanung.nrw`, NRW municipalities have been required to publish XPlanung-conformant B-Pläne since **2022-10-05**; aggregation into state-level INSPIRE PLU is "in fortlaufender Entwicklung."
- Open data dataset entry: `https://open.nrw/dataset/bebauungsplane-xplanung-du`.
- Recommendation: usable for Phase 15. Specific layer URL must be resolved via `GetCapabilities` at integration time. Coverage will be patchy — surface honest "kein B-Plan-Polygon für diese Adresse" responses where the aggregator returns nothing.

### Baden-Württemberg — usable but **operational caveat**

- WMS host: LGL-BW Geoportal + Open GeoData portal `https://opengeodata.lgl-bw.de/`.
- Public, OGC-compliant, no auth.
- B-Plan coverage: 804 Bebauungsplan-tagged entries on `daten-bw.de` open-data portal. Aggregation layered through the LGL-BW Geodatendienste catalog.
- **CRITICAL OPERATIONAL NOTE.** Per the search-result hit on the LGL-BW status page: **final deactivation of certain services is scheduled for 2026-02-05**. This is a service-modernisation cutover; the new endpoints presumably replace the old, but Phase 15 must verify the post-cutover service URLs at integration time. Building against pre-cutover URLs would ship a broken integration on day-one.
- Recommendation: usable in principle. **Resolve the post-2026-02-05 endpoint situation before any Phase 15 code lands** — that is a 30-min `GetCapabilities` + portal-status check, but it must happen.

### Niedersachsen — usable for cadastre, B-Plan unclear

- WMS host: LGLN at `https://opendata.lgln.niedersachsen.de/doorman/noauth/` (the path token `noauth` is the state's explicit signal for unauthenticated public access).
- Confirmed public unauthenticated WMS endpoints:
  - `https://opendata.lgln.niedersachsen.de/doorman/noauth/dop_wms` (orthophotos).
  - `https://www.geobasisdaten.niedersachsen.de/doorman/noauth/bestand?SERVICE=WMS&REQUEST=GetCapabilities` (cadastre / Bestandsdaten).
- B-Plan-specific state-aggregated layer: **not confirmed**. Single B-Plan example surfaced in the search (`Niedersachsenpark A1 - Nr. 9` in geoportal.de catalog) appears to be a per-Gemeinde service, not state aggregation.
- Recommendation: usable for cadastral context (Flurstücke / Bestand) in Phase 15. State-level B-Plan WMS requires confirmation via GDI-NI catalog scan at Phase 15 kickoff. If absent, accept "no state-level B-Plan in NS" and surface honest fallback in the persona.

### Hessen — usable, HVBG-hosted

- WMS host: HVBG (Hessische Verwaltung für Bodenmanagement und Geoinformation) via `https://www.geoportal.hessen.de/` and `https://hvbg.hessen.de/geoinformation/`.
- Public, OGC-compliant (WMS 1.1.1 + 1.3.0), free.
- Open Data introduced **2022-02-01**; "free for automated retrieval as long as Berechtigtes-Interesse review is not required."
- B-Plan-specific surface: `https://bauleitplanung.hessen.de/interaktive-karten/` is a viewer-only map portal; the underlying WMS is exposed through Geoportal Hessen but not published as a single URL on the viewer page (verified via WebFetch).
- Recommendation: usable. Specific INSPIRE PLU / Bauleitplanung layer URL must be resolved via the Geoportal Hessen catalog at Phase 15 integration time. Hessen has the cleanest state-level open-data posture of the four.

---

## Summary table

| State | Public WMS host | OGC standard | B-Plan state aggregation | Phase 15 verdict |
| ----- | --------------- | ------------ | ------------------------ | ---------------- |
| Bayern (München) | `geoportal.muenchen.de` | WMS | city-level, complete | **shipped** |
| NRW | `wms.nrw.de` | WMS | INSPIRE PLU, in rollout — patchy coverage | **usable**, layer URL TBD |
| BW | `opengeodata.lgl-bw.de` + LGL-BW | WMS | open-data tagged dataset, 804 entries | **usable with caveat** — 2026-02-05 service cutover |
| Niedersachsen | `opendata.lgln.niedersachsen.de/doorman/noauth/` | WMS | cadastre confirmed; state-level B-Plan unconfirmed | **partially usable** — B-Plan needs catalog scan |
| Hessen | `geoportal.hessen.de` (HVBG) | WMS 1.1.1 / 1.3.0 | available via Geoportal | **usable**, layer URL TBD |

---

## Phase 15 scope implication

The realistic Phase 15 scope is **not** "WMS proxy for all 4 top states on day 1." It is:

1. **München** — refactor existing `bplan-lookup` Edge Function into the per-state proxy pattern. (Already shipped functionally; just architectural cleanup.)
2. **Hessen + NRW** — new proxies with `GetCapabilities`-derived layer URLs. **Most likely to ship cleanly.**
3. **BW** — proxy contingent on resolving the 2026-02-05 service cutover. Add this on a "if endpoints stable post-cutover" gate, not on a "ships in Phase 15" assumption.
4. **Niedersachsen** — cadastral WMS proxy ships; B-Plan WMS conditional on a positive Phase-15-kickoff catalog scan. If absent, persona surfaces "kein öffentlicher WMS für Niedersächsische Bauleitpläne — Anfrage bei der zuständigen Gemeinde erforderlich."

Per-state research at Phase 15 kickoff (allow 1 day, not 30 minutes) must precede any per-state proxy implementation. The current half-day pass establishes go / no-go feasibility; it does not produce production-ready endpoint URLs.

---

## What this changes for Phase 11

**Nothing structural.** Phase 11 builds the StateDelta framework so any state can resolve to a slice. Phase 15 is when each state's actual WMS lookup gets wired. Phase 11 commits 1–3 do **not** depend on this research outcome — they depend only on the StateDelta interface being clean enough to host per-state WMS-proxy plumbing later.

**Operational note for Phase 15 planning:** budget per-state research (1 day) + per-state proxy implementation (~1.5 days each) + per-state CSP additions to `vercel.json`. Realistic Phase 15 ships München-refactor + Hessen + NRW; BW and NS as conditional follow-ups. That maps to the roadmap's "Time: 2 weeks" estimate without contradiction.
