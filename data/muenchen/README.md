# `data/muenchen/` — Landeshauptstadt München data slice

> The active v1 city for Planning_Matrix.
> `data/erlangen/` stays at the repo root as the architectural reference / future second city — do not delete.

---

## Purpose

After Phase 4 (revised) the strategic active city is **München (Landeshauptstadt)**. The decisive technical reasons:

1. **München exposes a full Bebauungspläne WMS API** at `https://geoportal.muenchen.de/geoserver/plan/wms` with GetFeatureInfo, plus a WFS for Stadtbezirke. Erlangen has no equivalent. The API enables a live-B-Plan lookup UX (Phase 6) that is structurally impossible without it.
2. **Larger Satzungen + Stadtbezirke surface** stress-tests the directory shape introduced for Erlangen — 3 Bauamt sub-offices vs Erlangen's single office, 25 Stadtbezirke, ~50 district-level Erhaltungssatzungen.
3. **Open Data + GovData presence** for München is materially better than for any city smaller.

Two consumers:

- **Phase 5 (shipped)** — composed `legalContext/muenchen.ts` (352 LOC), switched `compose.ts` to import the München block in the active slot, flipped the wizard PLZ gate from 4 Erlangen postcodes to the 70 München Stadtgebiet postcodes, widened the `projects.city` CHECK constraint via migration `0010_projects_city_muenchen.sql`, and renamed the SPA-side `factsErlangen.ts` / `smartSuggestionsErlangen.ts` / `costNormsErlangen.ts` to their München equivalents. Erlangen remains parked as a sleeping module (see `data/erlangen/README.md` for parking detail).
- **Phase 7** — runs each `test-projects/*.json` as a deterministic-seed conversation; asserts the resulting `ProjectState` matches the `expected_output` block. Failures are accuracy regressions.

Phase 4 (revised) was **data-only** by design — no TypeScript, no Edge Function code. The actual code-side pivot (slice composition, wizard gate, schema migration, SPA renames) shipped in Phase 5.

---

## Directory layout

```
data/muenchen/
├── README.md                              ← this file
├── _meta/
│   └── sources.json                       ← canonical URL registry for München
├── bauamt.json                            ← Referat für Stadtplanung und Bauordnung —
│                                            3-office structure (Mitte / Ost / West) routed by
│                                            Stadtbezirk
├── stadtbezirke.json                      ← 25 entries from WFS gsm_wfs:vablock_stadtbezirk;
│                                            each carries the bauamt_office routing key
├── bplan-index.json                       ← API-harvested representative subset (Phase 6 wires
│                                            the live API; this is the cold snapshot)
├── satzungen/
│   ├── stellplatz.json                    ← StellplatzS-LHM (München Stellplatzsatzung)
│   ├── werbeanlagen.json
│   ├── freiflaechengestaltung.json
│   ├── baumschutz.json                    ← Baumschutzverordnung — frequently invoked
│   ├── einfriedungen.json
│   ├── erhaltungssatzungen-overview.json  ← STRUCTURAL OVERVIEW only (~50 district-level
│                                            Erhaltungssatzungen — full inventory is quarterly
│                                            refresh work, not Phase-4 scope)
│   └── denkmalschutz.json                 ← BLfD reference + iconic anchors (NOT a transcription)
├── fachplaner/
│   ├── architekten.json                   ← BAYAK München filter
│   ├── vermessungsstellen.json            ← ADBV München + private; NOT "ÖbVI" (Bayern terminology
│                                            is critical — see Phase 2.5 finding)
│   ├── tragwerksplaner.json               ← BAYIKA filter
│   ├── brandschutz.json                   ← BAYAK Prüfsachverständige (Bayern quirk: Brandschutz
│                                            at BAYAK, not BAYIKA)
│   └── energieberater.json                ← BAFA filter
└── test-projects/                         ← 7 archetypes — verified München addresses
    ├── 01-maxvorstadt-innenstadt.json
    ├── 02-perlach-aussenbereich.json
    ├── 03-haidhausen-sanierung.json
    ├── 04-ramersdorf-umnutzung.json
    ├── 05-sonderbau-versammlungsstaette.json
    ├── 06-bauturbo-eligibility.json
    └── 07-altstadt-denkmal.json
```

---

## Schema

Reuses **`data/erlangen/_meta/schema.json`** by reference. The only Phase-4-revised extension is **additive**: an optional `sub_offices` array on the `Bauamt` definition, formalising München's 3-office routing (Mitte / Ost / West). Erlangen's single-office `bauamt.json` continues to validate — the new property is optional, no required fields touched.

The schema extension carries an inline JSDoc comment in `data/erlangen/_meta/schema.json` documenting Phase 4's addition.

---

## Conventions (mirror Erlangen)

- **JSON for structured data, Markdown for human narrative only.** This README is the only Markdown file.
- **`snake_case`** field names — matches Erlangen + the JSON examples in the brief.
- **`_schemaVersion: 1`** at the top of every JSON file.
- **`retrieved_on: "YYYY-MM-DD"`** mandatory on every file and on every individually-verified `online_services` / `source_url_specific` entry.
- **`source_ids: ["..."]`** mandatory on every fact-bearing file. IDs are keys into `_meta/sources.json#/sources`.
- **`_pending: "<reason and source>"`** = honest gap marker. Used everywhere a value couldn't be verified from a primary source. A complete-with-gaps slice ships; a fabricated slice destroys trust.
- **German-only fields stay German verbatim.** `Bauaufsichtsamt`, `Stellplatzsatzung`, `BayBO`, `Bebauungsplan` etc. do not translate.
- **No private contact data** in Fachplaner directories. Public registry data only.
- **Real addresses only** in test projects. Verified against the München Geoportal.

---

## License posture (read first — Phase 6 prerequisite)

The München Bebauungspläne WMS API is operated by the Landeshauptstadt München / Kommunalreferat — GeodatenService. Production use **requires a Nutzungsvereinbarung** (usage agreement). Contact: `geoportal@muenchen.de`. Phase 4 (the cold snapshot in `bplan-index.json`) and Phase 5 (the system-prompt grounding) work without the agreement; **Phase 6 (the live API integration) does not**.

`bplan-index.json` carries `license_status: "needs_nutzungsvereinbarung"` to make this impossible to miss.

---

## Refresh cadence

**Quarterly.** The `retrieved_on` dates on each file are the bar. Owner: founder.

```sh
# any file older than 90 days is a refresh candidate
find data/muenchen -name '*.json' -exec sh -c '
  d=$(grep -m1 retrieved_on "$1" | sed -E "s/.*\"([0-9]{4}-[0-9]{2}-[0-9]{2})\".*/\1/")
  echo "$d  $1"
' _ {} \; | sort
```

---

## What we know vs what we don't know

This slice is dated **2026-04-30**. The Bauamt 3-office routing is fully verified against the official Stadt-München B-Plan page. The 25 Stadtbezirke come verbatim from the WFS feature service. Satzung values where the PDF was extractable land verbatim with section references; values that needed a section-reference traversal are `_pending`. The B-Plan index is a representative API-harvested subset (Phase 6's job is the live integration). Fachplaner directories: ADBV München fully verified (it's a public office); other disciplines are sample-with-`_pending` because BAYAK / BAYIKA / BAFA registries don't expose URL-parameter filtering for programmatic harvest.

The **honest gap list** lives in the per-file `_pending` flags:

```sh
grep -rn '"_pending"' data/muenchen/
```

---

## Out of scope for Phase 4 (revised)

- System-prompt edits — Phase 5.
- `legalContext/muenchen.ts` composition — Phase 5.
- Wizard postcode gate flip (Erlangen → München) — Phase 5.
- Live B-Plan API integration with map UX — Phase 6.
- Eval harness code — Phase 7.
- Renaming `factsErlangen.ts` → `factsMuenchen.ts` — Phase 5.

---

— München-first. Erlangen as architectural reference. Every gap honestly flagged.
