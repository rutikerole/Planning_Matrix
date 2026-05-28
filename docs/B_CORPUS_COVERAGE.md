# B — Corpus coverage audit for the 28 cells in scope

Branch: `audit/b-corpus-coverage`. Date: 2026-05-28. Scope: read-only audit.
Bayern SHA verified at start: `cdf3c625…23f9daaf`. **No code, no §§ authored.**
This doc answers `SPRINT_PLAN.md` open question #2: for the 28 cells in
Bucket B (BW/HE/NW/NI × T-02..T-08), does the corpus already hold the
verified §§ needed, or must they be primary-source researched?

## TL;DR

**Almost everything is already in the corpus.** All 28 cells in scope are
classified `covered: true` by the corpus designers' own
`scripts/legal-corpus/_meta/coverage-matrix.json`, with **zero `core_missing`
archetypes anywhere**. Spot-verified against the raw `paragraphs` data in
the 4 state JSONs — the claim holds.

The two non-defects:
- **`pv_pflicht`** (BW/HE/NI/NW × T-01/T-02 only) — handled by separate
  state KSG/Klimaschutzgesetze, not the Bauordnung. Classified
  `optional_not_in_bauo` by the corpus designers. **Not a research gap.**
- **`nutzungsaenderung` in NRW** (T-03/T-04) — NRW's BauO handles change
  of use through general procedure §§, not a dedicated §. Same
  classification. **Not a research gap.**

The one genuine, classified-out-of-scope gap:
- **State `Denkmalschutz` §-level citations** for T-03/T-05 — Land-DSchG
  laws live outside the BauO corpus. Federal `BauGB § 172` is captured
  for Erhaltungssatzung; state DSchG § numbers are not. Workaround
  exists (cite `denkmalSchutzAct` + authority from
  `src/legal/stateCitations.ts:109` etc.; defer specific §).

**Revised B2 estimate: ~1.5 sprints**, down from the SPRINT_PLAN's
~3–4 sprints. Reason: the legal-research bottleneck I worried about in
SPRINT_PLAN open question #2 was already done in Phase A of the corpus.
B2 is now mostly prose authoring + light architect review of the
conditions phrasing, NOT primary-source § discovery.

## Methodology

1. **Template requirements** extracted from `scripts/legal-corpus/templates/t0X-*.json`'s
   `state_archetypes` array.
2. **State coverage** extracted from `scripts/legal-corpus/states/{bw,hessen,nrw,niedersachsen}.json`'s
   `paragraphs.*.archetypes` index, grouped by archetype.
3. **Cross-reference** against the corpus designers' pre-existing
   `_meta/coverage-matrix.json` for the authoritative "is this cell covered?"
   classification (`covered`, `core_missing`, `optional_not_in_bauo`).
4. **Spot verification** by reading §§ 50, 63, 64, 65, 70 of NRW's corpus
   to confirm the depth (verbatim heading, primary-source URL, archetype
   tag, scope_summary). The capture is real, not vapor.

No new §§ were authored. No state Bauordnung was edited. The audit
reads JSON only.

## Template archetype requirements

For each of the 7 templates in scope (T-02..T-08), state-side archetypes
the template's tail needs (federal archetypes like `bauplanungsrecht`
and `energie` are excluded — they're covered by `federal.json` for every
state):

| Template | Archetype needs (state-side) | Count |
|---|---|---|
| **T-02 MFH** | gebaeudeklasse, abstandsflaechen, stellplaetze, verfahren_freistellung, verfahren_vereinfacht, verfahren_regulaer, bauvorlageberechtigung, bautechnische_nachweise, brandschutz, sonderbauten, pv_pflicht, bauantrag_bauvorlagen | 12 |
| **T-03 Sanierung** | verfahrensfrei, verfahren_vereinfacht, bautechnische_nachweise, brandschutz, denkmalschutz, nutzungsaenderung, bauantrag_bauvorlagen | 7 |
| **T-04 Umnutzung** | nutzungsaenderung, brandschutz, stellplaetze, bautechnische_nachweise, verfahren_vereinfacht, verfahren_regulaer, bauvorlageberechtigung, bauantrag_bauvorlagen | 8 |
| **T-05 Abbruch** | abbruch_beseitigung, denkmalschutz, verfahrensfrei, bauvorlageberechtigung | 4 |
| **T-06 Aufstockung** | abstandsflaechen, gebaeudeklasse, bautechnische_nachweise, brandschutz, verfahren_vereinfacht, stellplaetze, bauantrag_bauvorlagen | 7 |
| **T-07 Anbau** | abstandsflaechen, bautechnische_nachweise, verfahren_freistellung, verfahren_vereinfacht, stellplaetze, bauantrag_bauvorlagen | 6 |
| **T-08 Sonstiges** | abstandsflaechen, verfahrensfrei, verfahren_freistellung, verfahren_vereinfacht, verfahren_regulaer, bauvorlageberechtigung, bautechnische_nachweise, bauantrag_bauvorlagen | 8 |

Source: `scripts/legal-corpus/templates/t0X-*.json:state_archetypes`.

## Per-state archetype coverage (verified §§ in corpus today)

Format: archetype → list of §§ tagged in this state's corpus. `(p)`/`(s)` = primary-source / secondary-mirror tier. Empty = MISSING.

### BW — `LBO` (Landesbauordnung Baden-Württemberg) — tier secondary-mirror

| Archetype | Tagged §§ (file:scripts/legal-corpus/states/bw.json) |
|---|---|
| gebaeudeklasse | § 2 |
| abstandsflaechen | § 5, § 6, § 7 |
| stellplaetze | § 37 |
| verfahren_freistellung | § 51 |
| verfahren_vereinfacht | § 52 |
| verfahren_regulaer | § 58 |
| verfahrensfrei | § 50 |
| bauvorlageberechtigung | § 43, § 63, § 63a, § 63b, § 63d |
| bautechnische_nachweise | § 13, § 73a |
| brandschutz | § 15, § 26, § 27c |
| sonderbauten | § 38 |
| pv_pflicht | (none — KlimaG BW handles it) |
| bauantrag_bauvorlagen | § 53 |
| denkmalschutz | (none — DSchG BW out of BauO scope) |
| nutzungsaenderung | § 65, § 27f, § 28d |
| abbruch_beseitigung | § 65 |

### Hessen — `HBO` (Hessische Bauordnung) — tier secondary-mirror

| Archetype | Tagged §§ |
|---|---|
| gebaeudeklasse | § 2 |
| abstandsflaechen | § 6 |
| stellplaetze | § 52 |
| verfahren_freistellung | § 64, § 64a |
| verfahren_vereinfacht | § 65 |
| verfahren_regulaer | § 66 |
| verfahrensfrei | § 63 |
| bauvorlageberechtigung | § 67 |
| bautechnische_nachweise | § 12, § 68 |
| brandschutz | § 14 |
| sonderbauten | § 53 |
| pv_pflicht | (none — separate law) |
| bauantrag_bauvorlagen | § 69 |
| denkmalschutz | (none — HDSchG out of BauO scope) |
| nutzungsaenderung | § 92 |
| abbruch_beseitigung | § 82, § 63a |

### NRW — `BauO NRW` — tier **primary-source** (only state at primary tier among the 4)

| Archetype | Tagged §§ |
|---|---|
| gebaeudeklasse | § 2 |
| abstandsflaechen | § 6 |
| stellplaetze | § 48 |
| verfahren_freistellung | § 63 |
| verfahren_vereinfacht | § 64 |
| verfahren_regulaer | § 65 |
| verfahrensfrei | § 62 |
| bauvorlageberechtigung | § 67 |
| bautechnische_nachweise | § 12, § 68 |
| brandschutz | § 14, § 26, § 30, § 33 |
| sonderbauten | § 50 |
| pv_pflicht | (none — separate law) |
| bauantrag_bauvorlagen | § 70 |
| denkmalschutz | (none — DSchG NRW out of BauO scope) |
| nutzungsaenderung | **(none in NRW BauO)** — handled by general procedure §§ |
| abbruch_beseitigung | § 62, § 82 |

### Niedersachsen — `NBauO` — tier secondary-mirror

| Archetype | Tagged §§ |
|---|---|
| gebaeudeklasse | § 2 |
| abstandsflaechen | § 5, § 7 |
| stellplaetze | § 46, § 47, § 48 |
| verfahren_freistellung | § 62 |
| verfahren_vereinfacht | § 63 |
| verfahren_regulaer | § 64 |
| verfahrensfrei | § 60 |
| bauvorlageberechtigung | § 53 |
| bautechnische_nachweise | § 12, § 65 |
| brandschutz | § 14, § 26, § 30, § 33 |
| sonderbauten | § 51 |
| pv_pflicht | (none — separate law) |
| bauantrag_bauvorlagen | § 67 |
| denkmalschutz | (none — NDSchG out of BauO scope) |
| nutzungsaenderung | § 85a |
| abbruch_beseitigung | § 60, § 79 |

## The 28-cell coverage table

`H` = HAVE — every core archetype the template needs is tagged in this
state's corpus. `H*` = HAVE with one non-defect `optional_not_in_bauo`
flag (separate-law archetype, not a corpus defect). `P` = PARTIAL —
core archetype present but author must work around an optional gap.
No `M` (MISSING) anywhere. Tier suffix: `(p)` primary-source, `(s)`
secondary-mirror.

| State | T-02 | T-03 | T-04 | T-05 | T-06 | T-07 | T-08 |
|---|---|---|---|---|---|---|---|
| **BW** | H* (s) | H (s) | H (s) | H (s) | H (s) | H (s) | H (s) |
| **Hessen** | H* (s) | H (s) | H (s) | H (s) | H (s) | H (s) | H (s) |
| **NRW** | H* (p) | H* (p) | H* (p) | H (p) | H (p) | H (p) | H (p) |
| **NI** | H* (s) | H (s) | H (s) | H (s) | H (s) | H (s) | H (s) |

Source: `scripts/legal-corpus/_meta/coverage-matrix.json:20-360`. Spot-
verified against raw `paragraphs` data — no discrepancy.

### Cell-by-cell footnotes

- `H*` on `T-02` everywhere — `pv_pflicht` flagged but classified
  `optional_not_in_bauo` (handled by separate state KSG / KlimaSchutzG).
  Bucket B author should mention PV requirement in the addendum but
  cite the state's KSG, not the BauO.
- `H*` on `T-03 NRW` and `T-04 NRW` — `nutzungsaenderung` flagged as
  optional-not-in-bauo (NRW handles change-of-use via general procedure
  §§ rather than a dedicated §). Author writes prose around § 63/§ 64
  (NRW's freistellung/vereinfacht) without a dedicated nutzungsaenderung §.
- **Denkmalschutz on T-03 and T-05** — separate Land-DSchG laws live
  outside the BauO corpus. `src/legal/stateCitations.ts:79-182` gives
  authors the verified `denkmalSchutzAct` short-name + `denkmalAuthorityDe`
  for each state; specific §§ of those DSchG laws are NOT in corpus and
  would be primary-source-research if the addendum wants to cite them.
  **Workaround:** the addendum can name the law + authority (verified)
  without a specific § ("DSchG NRW vor der Sanierung anzuhören; Antrag
  beim LVR-Amt für Denkmalpflege im Rheinland bzw. LWL-Denkmalpflege
  Westfalen"). Honest, useful, no fabrication.

## Per-state HAVE/MISSING counts

For each state, count of archetype-cells that need work outside the
corpus (primary-source research) vs already-verified-in-corpus, summed
over the 7 in-scope templates:

| State | Already verified in corpus | Optional-not-in-BauO (workaround exists) | True research gap | Tier |
|---|---|---|---|---|
| BW | **all 7 cells covered** | `pv_pflicht` × 1 (T-02), `denkmalschutz` × 2 (T-03/T-05) | 0 | secondary-mirror |
| Hessen | **all 7 cells covered** | `pv_pflicht` × 1 (T-02), `denkmalschutz` × 2 (T-03/T-05) | 0 | secondary-mirror |
| NRW | **all 7 cells covered** | `pv_pflicht` × 1, `nutzungsaenderung` × 2 (T-03/T-04), `denkmalschutz` × 2 | 0 | **primary-source** |
| NI | **all 7 cells covered** | `pv_pflicht` × 1, `denkmalschutz` × 2 | 0 | secondary-mirror |

**Zero true research gaps.** All flagged items have a documented
workaround (separate state law + authority captured in
`stateCitations.ts`) that the author can cite without fabrication.

## The research list — what a human still needs to verify

For each cell, the author needs to:

1. **Pick the right §§ from the state's archetype index** (table above).
   This is a lookup, not research — but the author should sanity-check
   that the chosen § applies to the template's project shape (e.g. NRW
   `§ 63` Freistellung's preconditions actually fit T-02 MFH; the
   matrix says yes but the author should read the scope_summary).
2. **Write the addendum prose** that overrides the Bayern-shaped base.
   Each addendum needs ~5–10 lines of prose covering: procedure routing
   for that template shape, Sonderbau triggers if relevant, brandschutz
   trigger, document list reference, role list reference. The §§ are
   the anchors; the prose ties them together.
3. **Sanity-check secondary-mirror tier** (BW, HE, NI) — for high-
   confidence production prose, the author should cross-verify the §§
   against the state's official portal (recht-rlp.de, landesrecht-bw.de,
   recht.nrw.de, voris.niedersachsen.de). NRW is already primary-source;
   the other 3 are secondary-mirror only. This is *defense in depth*,
   not blocking — secondary-mirror sources (baunormenlexikon.de etc.)
   are operationally reliable. Build the addendum from corpus first,
   cross-verify before final commit.
4. **For T-03 / T-05 denkmal-touching cells**, decide between:
   - (a) Honest deferral: cite `denkmalSchutzAct` short-name +
     `denkmalAuthorityDe` only. No DSchG §.
   - (b) Primary-source lookup of the state's DSchG `Genehmigung von
     Maßnahmen` § (a one-off research task per state, ~½ hour each).
   For B2 first pass, recommend (a) — gets us to "honest substantive"
   fast. Bucket C can deepen later.

## Revised B2 estimate

The SPRINT_PLAN's pre-audit estimate for B2 (author 28 verified
template-tail overrides) was **~3–4 sprints** based on "one §-set per
cell, reviewed by an architect, each cell ≈ ½–1 day". That assumed
discovery + lookup + research + prose + review. With this audit:

| Activity | Pre-audit ASSUMED | Post-audit ACTUAL |
|---|---|---|
| Discover the right §§ per cell | ~½ day | **~10 min lookup in corpus per cell** |
| Primary-source verify per § | ~½ day | **NRW done already (primary); BW/HE/NI need cross-verify if going to production** |
| Author the addendum prose | ~½ day | **~1 hour per cell (5-10 lines around verified §§)** |
| Architect / counsel review | ~½ day | **~½ hour per cell (sanity check, not research)** |
| **Per cell** | **~2 days** | **~1.5–2 hours** |
| **28 cells total** | **~56 days (~3–4 sprints)** | **~42–56 hours (~1.5 sprints single-engineer)** |

**Revised B2: ~1.5 sprints**, down from ~3–4. The compression comes
entirely from corpus capture work that was done in Phase A and is now
being claimed for B2's benefit. The capture is real and verified — not
vapor.

Open question: do BW/HE/NI need primary-source verification before
shipping production prose? If yes (defense-in-depth), add ~½ sprint
of cross-verification across the 3 secondary-mirror states. Total
ceiling: **~2 sprints**.

## Recommended authoring order (highest leverage first)

Most-HAVE-coverage states + simplest templates first → fast safe wins
that prove the rail's value, then complexity:

1. **NRW × T-08 Sonstiges** (8 archetypes, primary-source tier, no
   denkmal/pv complications) — easiest first cell. Proves the rail
   end-to-end with primary-verified §§.
2. **NRW × T-07 Anbau** (6 archetypes, primary) — short tail, well-
   bounded.
3. **NRW × T-06 Aufstockung** (7 archetypes, primary).
4. **NRW × T-02 MFH** (12 archetypes, primary, pv_pflicht workaround) —
   the longest tail but every § is primary-source. Tests the addendum
   shape under maximum load.
5. **NRW × T-04 Umnutzung** (8 archetypes, primary, nutzungsaenderung
   workaround flagged) — exercises the optional-not-in-bauo
   acknowledgement.
6. **NRW × T-05 Abbruch** (4 archetypes, primary, denkmal workaround).
7. **NRW × T-03 Sanierung** (7 archetypes, primary, denkmal + nutzungs-
   aenderung workarounds).
8. **NI × T-02..T-08** — Niedersachsen second (secondary-mirror but the
   widest § coverage among the 3 secondary states; multiple §§ per
   archetype gives the author optionality).
9. **BW × T-02..T-08** — Baden-Württemberg third (secondary-mirror,
   moderate § count).
10. **Hessen × T-02..T-08** — Hessen last (secondary-mirror, smallest §
    count per archetype = least redundancy if a § turns out wrong).

This order lets the author ship NRW (7 cells) at primary-source
confidence before touching any secondary-mirror state — strongest
demos earliest. After NRW, the per-state pattern is established and
each subsequent state is mostly mechanical.

## Open questions + push-back

### 1. Should the cross-verify gate be added now or after B2 cells exist?

The B0 spike's `verify:template-tail-noop` gate (`spike/b0-state-aware-
templates`) catches drift in *already-authored* cells. There's currently
no gate that catches "this addendum cites a § that doesn't exist in the
state's corpus." A future enhancement could parse the addendum strings
and verify each citation token matches a real entry in
`scripts/legal-corpus/states/{state}.json`. Worth ~½ day of additional
gate work; defer until the first 2–3 cells are authored to see what
citation pattern emerges.

### 2. Is `coverage-matrix.json`'s `optional_not_in_bauo` classification
trustworthy?

The matrix was authored at corpus-Phase-A time, presumably by the same
person who tagged the §§. Spot-checking: NRW `nutzungsaenderung` truly
is not a dedicated § in BauO NRW (the law lists no `Nutzungsänderung`
heading; change-of-use rides on the general procedure §§). The other
flags are also defensible. **Verdict: trustworthy.**

### 3. PV-Pflicht — should B2 cite the state KSG?

BW has KlimaG BW (PV obligation since 2022). NRW has separate
regulation. NI has Klimagesetz. Hessen has nothing dedicated yet. The
corpus does NOT capture these laws — they're cross-domain. For B2 prose
I'd recommend mentioning the obligation EXISTS (informational) without
citing a specific § unless someone does the primary-source pull. That's
~½ day for all 4 states if we want explicit §§; otherwise it's a
soft reference. Open question — Bucket B leader's call.

### 4. Should Bucket B add the federal `BauGB § 172`
(Erhaltungssatzung) to T-03/T-05 cells?

The federal corpus has it tagged for denkmalschutz. The audit's L1
fix (factLabels) already preserved BauGB § 172 as a federal label. The
template T-03/T-05 base blocks may or may not mention it. Worth a spot
check: if the Bayern-shaped base already cites § 172, no addendum work
needed. If not, every state's addendum should add it (one mechanical
line: "Im Erhaltungssatzungs-Bereich gilt zusätzlich BauGB § 172;
Genehmigungspflicht beim Bauamt einholen.").

### 5. Where does my estimate stop being trustworthy?

I'm confident on the corpus-capture side (everything is in there). I'm
LESS confident on:
- How long an architect's review actually takes per cell when they
  have to read the addendum + cross-check against their training. The
  ½ hour estimate could double if the architect is conservative.
- Whether BW/HE/NI secondary-mirror tier will pass legal sanity check
  on first try. If 1 in 10 §§ turns out to need correction (the audit's
  prior history shows some BW/NI §§ were already corrected in
  `phase-c/legal-correctness`), B2 sliding by ~½ sprint is plausible.

Honest range: **B2 = 1.5–2.5 sprints**, single-engineer + architect-on-
call. Compresses with parallelism + adds risk if many secondary-mirror
§§ need primary cross-verify.

## What this audit DID and did NOT do

**Did:**
- Read the 4 in-scope state corpus files end-to-end.
- Read all 8 template corpus files for archetype requirements.
- Cross-referenced against the pre-existing `_meta/coverage-matrix.json`.
- Spot-verified §-entry depth (heading + tier + archetype + scope_summary).
- Counted MISSING vs PARTIAL vs HAVE per cell using the corpus designers'
  own classification.
- Revised the B2 estimate from ~3–4 sprints to ~1.5–2 sprints with the
  honest range explained.

**Did NOT:**
- Author any §§. Wrote zero state-correct legal prose.
- Verify §§ against the actual state portal — only against the
  in-repo corpus capture. Trusts that capture (which has primary-
  source URLs + fetch dates per §).
- Spot-check the 11 stub states (Bucket C territory, gated separately).
- Pre-judge which cells get filled first for product reasons — that's
  founder + architect call, this doc just gives the technical-cost
  ordering.
- Touch any code, Bayern path, DESIGN_DNA, Phase 7.9 surface.

## File:line index

- `scripts/legal-corpus/_meta/coverage-matrix.json:20-360` — coverage classification per cell
- `scripts/legal-corpus/SCHEMA.md:60-86` — archetype taxonomy (template ↔ state bridge)
- `scripts/legal-corpus/templates/t0X-*.json:state_archetypes` — template requirements
- `scripts/legal-corpus/states/{bw,hessen,nrw,niedersachsen}.json:paragraphs.*.archetypes` — state coverage
- `scripts/legal-corpus/federal.json` — BauGB / BauNVO / GEG with archetype tags
- `src/legal/stateCitations.ts:79-182` — substantive per-state citation packs (denkmalSchutzAct, denkmalAuthorityDe etc.)
- `docs/B0_TEMPLATE_STATE_RAILS.md` — the rail infrastructure that consumes addendums (separate branch `spike/b0-state-aware-templates`)
- `docs/SPRINT_PLAN.md` open question #2 — the question this audit answers
