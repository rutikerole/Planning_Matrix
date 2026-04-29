# `data/erlangen/` — Erlangen city-truth slice

> The falsifiable factual slice that grounds Planning Matrix's accuracy claim for v1.
> Phase 3 (system-prompt grounding) consumes this; Phase 4 (eval harness) asserts against it.

---

## Purpose

`AUDIT_REPORT.md` §6 narrowed v1 to **Erlangen** with a falsifiable bar: a finite ground-truth set per city, per quarter, with every datum cited. This directory is that ground truth.

Two consumers, both deferred to later phases:

- **Phase 3** (system prompt) — composes `legalContext/erlangen.md` into the model's persona block from this slice. The model sees the verified Bauamt name, real Stellplatzsatzung values, named B-Plan numbers — not generic "Bauamt der Gemeinde" hedges.
- **Phase 4** (eval harness) — runs each `test-projects/*.json` as a deterministic-seed conversation; asserts the resulting `ProjectState` matches the `expected_output` block. Failures are accuracy regressions.

Phase 2 (this directory) is **data-only**. No TypeScript, no Edge Function code, no system-prompt edits.

---

## Directory layout

```
data/erlangen/
├── README.md                      ← this file
├── _meta/
│   ├── sources.json               ← canonical URL registry (every fact cites a source_id from here)
│   └── schema.json                ← JSON Schema (draft 2020-12) every other file validates against
├── bauamt.json                    ← Bauaufsichtsamt der Stadt Erlangen — directory entry
├── bplan-index.json               ← representative B-Plan index (geoportal-sourced)
├── satzungen/
│   ├── stellplatz.json
│   ├── gestaltung-innenstadt.json
│   ├── erhaltung-burgberg.json
│   ├── denkmalliste.json
│   └── niederschlagswasser.json
├── fachplaner/
│   ├── architekten.json
│   ├── oebvi.json
│   ├── tragwerksplaner.json
│   ├── brandschutz.json
│   └── energieberater.json
└── test-projects/
    ├── 01-hauptstrasse-innenstadt.json
    ├── 02-tennenlohe-aussenbereich.json
    ├── 03-bruck-sanierung.json
    ├── 04-eltersdorf-umnutzung.json
    ├── 05-sonderbau-schule.json
    ├── 06-bauturbo-eligibility.json
    └── 07-denkmal-schlossgarten.json
```

---

## Conventions

- **JSON for structured data, Markdown for human narrative only.** This README and any future `NOTES.md` are the only Markdown files.
- **`snake_case` field names** — matches the JSON examples in the Phase-2 brief and is the DB convention this slice will eventually feed into.
- **`_schemaVersion`** at the top of every JSON file. Bumped on a breaking shape change. The shape contract lives in `_meta/schema.json`.
- **`retrieved_on: "YYYY-MM-DD"`** mandatory on every file and on every individual `online_services` / `source_url_specific` entry where the URL was verified separately. The slice is dated, end-to-end.
- **`source_ids: ["..."]`** mandatory on every fact-bearing file. IDs are keys into `_meta/sources.json#/sources` so URLs are canonical and de-duplicated.
- **`_pending: "<reason and source to consult>"`** is the **honest gap marker**. Used everywhere a value could not be verified from a primary source. Phase 2's discipline: a complete-with-gaps slice ships; a fabricated slice destroys trust.
- **German-only fields stay German verbatim.** Do not translate `Bauaufsichtsamt`, `Stellplatzsatzung`, `Genehmigungsfreistellung`, `BayBO`, etc. Optional `*_en` mirrors are added on free-text narrative fields (test-project summaries, discipline labels).
- **No private contact data.** Fachplaner directories carry only what the public registry (BAYAK, BAYIKA, BAFA) lists. No personal phone numbers, no private emails.
- **Real addresses only** in test projects. Cross-checked against the Erlangen Geoportal / Stadt Erlangen web. Do not invent house numbers.

---

## Refresh cadence

**Quarterly.** The `retrieved_on` dates on each file are the bar. The next-due date for any file is `retrieved_on + 90 days`. Owner: founder until a dedicated curator joins.

The cheapest health check is:

```sh
# any file older than 90 days is a refresh candidate
find data/erlangen -name '*.json' -exec sh -c '
  d=$(grep -m1 retrieved_on "$1" | sed -E "s/.*\"([0-9]{4}-[0-9]{2}-[0-9]{2})\".*/\1/")
  echo "$d  $1"
' _ {} \; | sort
```

---

## How a new city slice is added (template path)

When v2 adds a second city (München / Augsburg / wherever the founder picks):

1. Copy `data/erlangen/` to `data/<slug>/`.
2. Bump every `retrieved_on` to the new fetch date.
3. Replace every Erlangen-specific URL/ID/postcode with the new city's equivalents.
4. Re-run the verification sweep (every URL must return 200 or be `_pending`).
5. Phase 3 widens `legalContext/<bundesland>.md` to compose the second city's slice in.
6. Phase 4 adds the new city's `test-projects/*.json` to the eval harness CI gate.

**The schema does not change.** New cities ride on the same shape contract.

---

## What we know vs what we don't know (honesty paragraph)

This slice is dated **2026-04-29**. The Bauaufsichtsamt directory entry is fully verified against the Stadt Erlangen portal (address, hours, phone, email all extracted from `https://erlangen.de/amt/37761`). The five Satzungen carry their official names and source URLs; specific numerical values (e.g. the Stellplatzsatzung's Stp/WE ratio) are extracted where the Satzung's PDF was reachable, and `_pending` where it wasn't — see each Satzung file's `_pending_block`. The B-Plan index is **explicitly a representative subset** drawn from the Stadt Erlangen page `https://erlangen.de/aktuelles/bplaene_rechtsgueltig` (Stand 19.02.2026); the city does not publish a structured CSV/GeoJSON download, so a full inventory of all rechtskräftige B-Pläne is `_pending`. The Fachplaner directories sample the relevant public registries (BAYAK, BAYIKA, BAFA energy expert list) — entries are limited because the registries don't all expose city-filtered downloads. Test projects use real Erlangen addresses cross-checked against the Stadt Erlangen pages.

**The honest gap list lives in the per-file `_pending` flags.** Run this to enumerate every gap:

```sh
grep -rn '"_pending"' data/erlangen/
```

Every `_pending` is a known-unknown. There is no fabricated value. If a fact does not have a citation, it is flagged.

---

## Out of scope for Phase 2

- System-prompt edits — Phase 3.
- `legalContext/_shared.md` / `federal.md` / `bayern.md` / `erlangen.md` files — Phase 3.
- Eval harness code, Playwright spec, CI gate — Phase 4.
- Any TypeScript or `src/`/`supabase/` change — out of scope.
- Renaming `factsBayern.ts` etc. — Phase 3 alongside the legalContext refactor.

---

— Erlangen-first. Quality over breadth. Every gap honestly flagged.
