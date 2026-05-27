# Legal Corpus — Schema Contract (Phase A: Legal Spine)

This directory is the **single source of truth** for every German building-law
§/Art. citation the app makes. It is *data only* — Phase A. Wiring it into the
pipeline / tabs / PDF is **Phase B**; tone + cost/timeline calibration is
**Phase C**. Do not add rendering logic here.

The build-time verifier (`scripts/verify-citations.mjs`) reads this corpus and
checks every citation in `src/legal/` against it.

```
scripts/legal-corpus/
  federal.json          BauGB · BauNVO · GEG  (gesetze-im-internet.de, primary)
  states/<code>.json    one per Bundesland (16)
  templates/tNN-*.json  one per template (8) — archetype references, not §-text
  _meta/sources.json    URL registry + reliability tier per source
  _meta/unverified.json  every § we could not verify + avenues tried
  _meta/coverage-matrix.json  16×8 grid of per-cell verification depth
```

## State JSON shape (`states/<code>.json`)

```jsonc
{
  "_meta": {
    "bundesland": "nrw",                 // BundeslandCode (src/legal/states/_types.ts)
    "law_short": "BauO NRW",             // exactly as cited in src/legal/
    "law_full_de": "Bauordnung für das Land Nordrhein-Westfalen (Landesbauordnung 2018 – BauO NRW 2018)",
    "marker": "§",                       // "§" for all states except Bayern ("Art.")
    "current_version_stand": "2024-01-01",
    "last_amendment_de": "Gesetz vom 31.10.2023 (GV. NRW. S. 1172)",
    "sources": ["recht.nrw.de/...", "baunormenlexikon.de/..."],  // keys into _meta/sources.json
    "verification_summary": { "primary-source": 9, "secondary-mirror": 75, "unverified": 0 }
  },
  "paragraphs": {
    "6": {
      "marker": "§ 6",
      "heading_de_official": "Abstandsflächen",          // VERBATIM amtliche Überschrift
      "heading_source_url": "https://recht.nrw.de/...",  // the URL it was fetched from
      "heading_fetched_at": "2026-05-27",
      "verification_tier": "primary-source",             // see tiers below
      "archetypes": ["abstandsflaechen"],                // 0..n; links to template archetypes
      "scope_summary_de": "...",     // OUR gloss — required for cited/archetype §§, optional otherwise
      "scope_summary_en": "...",
      "procedure_relevance": "applies-to: T-01,T-02,..."  // optional, archetype §§ only
    }
  }
}
```

### Verification tiers (honesty ladder)
- `primary-source` — fetched verbatim from an **official** portal/PDF
  (gesetze-im-internet.de federal; recht.nrw.de; an official ministry/GVBl PDF).
- `secondary-mirror` — fetched verbatim from a **quasi-official aggregator**
  (baunormenlexikon.de etc.). Real text, not the official portal.
- `unverified` — **no acceptable source returned the text.** The § number is
  carried (so the verifier resolves the citation) but the heading is `null` or a
  best-effort placeholder and the entry is logged in `_meta/unverified.json`
  with avenues tried. **Never** fill a heading from training data.

## Archetype taxonomy (template ↔ state bridge)

Templates do not cite raw §§ — states number their §§ differently. A template
declares the *concerns* it touches; each state tags its §§ with the matching
archetype; Phase B resolves template → archetype → that state's §.

```
bauplanungsrecht        BauGB §§ 30/34/35 admissibility (federal)
verfahrensfrei          verfahrensfreie Bauvorhaben
verfahren_freistellung  Genehmigungsfreistellung
verfahren_vereinfacht   vereinfachtes Baugenehmigungsverfahren
verfahren_regulaer      (volles) Baugenehmigungsverfahren
abstandsflaechen        setback rule
gebaeudeklasse          building-class definitions
bauvorlageberechtigung  who may sign/submit (Entwurfsverfasser entitlement)
bautechnische_nachweise structural / Standsicherheit certificate
bauantrag_bauvorlagen   application + required documents
stellplaetze            parking / bicycle spaces
sonderbauten            special buildings
abbruch_beseitigung     demolition / removal of structures
nutzungsaenderung       change of use
brandschutz             fire safety
denkmalschutz           monument protection (separate DSchG law)
energie                 GEG §§ 10/48/80 (federal)
pv_pflicht              photovoltaic obligation (state-specific where it exists)
```

## Template JSON shape (`templates/tNN-*.json`)
Archetype references + procedure-routing logic + cost/timeline metadata
**shape** (NOT calibrated values — calibration is Phase C). See any template
file for the concrete shape.

## Hard rules
1. Verbatim headings only. URL + fetch date on every heading. `unverified` is
   honest; fabrication is not.
2. Primary source > mirror > prior repo text. Log contradictions in `_meta`.
3. Phase A is data. No rendering, no Edge Function, no migration, no Bayern-SHA
   move.
