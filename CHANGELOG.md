# Changelog

## v1.0.23 — Cosmetic & Cleanup Sprint (2026-05-13)

Closes the 8 remaining P2 cleanup bugs from BACKLOG.md, all surfaced
by the v1.0.20 NRW × T-01 + Berlin × T-01 testing sweep. Combined
with v1.0.21 (7 bugs) and v1.0.22 (6 bugs), every one of the 24
originally-surfaced bugs from that sweep is now closed.

Sprint anchor:
- Bayern composeLegalContext SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
  unchanged across every commit.

### Bugs fixed (in commit order)

1. **Bug L** — "0 m² Fassade" placeholder leak. PDF cost basis line
   renders "Computed from floor area only (façade area not captured)"
   / "Berechnet ausschließlich aus Wohnfläche (Fassade noch nicht
   erfasst)" when `fassadenflaeche_m2` is unset or zero. New
   `costs.basisTemplate.noArea` pdfStrings keys (EN + DE).
2. **Bug N** — system flag filter. New
   `src/legal/systemFlagFilter.ts` with explicit allowlist + prefix/
   suffix rules. PDF Key Data table filters keys matching
   `plot.outside_munich_acknowledged`, `system.*`, `_internal*`,
   `_system*`, `*_acknowledged`, `*.acknowledged` before rendering.
3. **Bug P** — label width truncation. Top-3 Executive + Section
   VIII Recommendations renderers measure pill width + wrap to a
   half-line below the title when overflow would clip. "HOHE
   PRIORITÄT" and "CONFIRM" now render in full.
4. **Bug J** — 30-day banner gating. Cover footer renders
   "ARCHITECT-VERIFIED" / "SUBMITTED · Bauamt confirmation on file"
   when an AUTHORITY+VERIFIED or DESIGNER+VERIFIED fact qualifier is
   present (or project.status is submitted/approved). The 30-day
   validity stamp is suppressed on verified projects.
5. **Bug R** — DESIGNER source downgrade when no designer in loop.
   New `normalizeDesignerWithoutInLoop` in
   `src/lib/qualifierNormalize.ts`. PDF Key Data renders
   `LEGAL · CALCULATED` instead of `DESIGNER · DECIDED` on projects
   without an `invitedDesigner` field set. Bayern verified fixture
   (with `invitedDesigner`) continues to render `DESIGNER ·`
   qualifiers — regression guard.
6. **Bug S** — i18n label coverage. 22 new entries each in
   `factLabels.de.ts` + `factLabels.en.ts` covering the v1.0.21/22
   snake_case fact keys. Cross-language fallback added to
   `factLabel.ts` — when the requested locale's table misses, fall
   back to the other locale's entry (with `[i18n]` prefix in dev) so
   no humanize-fallback labels surface in production rendered text.
7. **Bug O** — state-aware glossary entries. PDF page 12 now
   filters its 12-entry list by project bundesland. Federal entries
   (BauGB, GEG, HOAI, BKI, ÖbVI, LP, KfW, Bauamt,
   Bauvorlageberechtigte/r, Verfahrensfreiheit) always render;
   state-specific BauO + DSchG entries swap per state via
   `getStateCitations`. Stub states render honest-deferral phrasing.
   Bayern adds BayBO + BayDSchG + BLfD entries.
8. **Bug D** — deterministic address blob parser. New
   `src/lib/addressParser.ts` with `parseAddressBlob` returning
   `ParsedAddress { street, hausnummer, plz, stadt }` or
   `UnparsedAddress { fallbackToStructured: true }` on malformed
   input. `plzMatchesBundesland` cross-check for downstream
   sanity-warning UX. Parser shipped + tested; wizard wiring parked
   for v1.0.24.

### New files

- `src/legal/systemFlagFilter.ts` — user-facing-table filter rules.
- `src/lib/addressParser.ts` — deterministic address blob parser.
- `test/fixtures/bayern-t03-verified.json` — Bayern Sanierung
  fixture with AUTHORITY+VERIFIED qualifier + invitedDesigner.

### Gate status (final, on tag)

| Gate                        | Status                              |
| --------------------------- | ----------------------------------- |
| `npm run verify:bayern-sha` | ✓ MATCH                             |
| `npm run smoke:citations`   | ✓ static gate green                 |
| `npm run smoke:pdf-text`    | ✓ 245 passed · 0 failed (+64 over v1.0.22's 181) |
| `npx tsc --noEmit`          | ✓ clean                             |
| `npm run build`             | ✓ 273.4 KB gz (ceiling 300 KB)      |

### Fixture growth this sprint

- `smoke:pdf-text`: +64 assertions (181 → 245). Distribution by
  commit:
    - Bug L: +4 (honest no-area + no-0m² × langs)
    - Bug N: +12 (10 unit cases + 2 PDF render × langs)
    - Bug P: +2 (full priority label × langs)
    - Bug J: +4 (verified banner + no-30-day × langs)
    - Bug R: +6 (no-DESIGNER × 2 fixtures × langs + regression)
    - Bug S: +20 (factLabel coverage × 10 keys × 2 locales)
    - Bug O: +7 (NRW + Bayern + Berlin state-aware checks)
    - Bug D: +9 (4 parse cases + 5 PLZ-bundesland)
- `smoke:citations`: 0 new static checks (Bug O allowlist update
  preserves the existing gate).

### Autonomous decisions

- **Bug L**: Gated only on the cost-basis line. `factValueWithUnit`
  doesn't currently emit "0 X unit" for any rendered fact; wider
  audit parked for v1.0.24 if a future smoke walk surfaces another
  instance.
- **Bug N**: Extracted filter into `src/legal/systemFlagFilter.ts`
  module so future UI tables (LedgerPeek facts column, etc.) can
  adopt the same gate by import.
- **Bug P**: Wrap-below approach chosen over widen-pill — more
  robust to future label additions.
- **Bug J**: ARCHITEKT treated as alias of DESIGNER (canonical Source
  enum). Persona-emitted ARCHITEKT is chat-turn-normalized to
  DESIGNER before state persistence.
- **Bug R**: Gate applied at Key Data render path only; Top-3 +
  Section VIII rows don't currently carry DESIGNER source on the
  smoke fixtures. v1.0.24 can extend if a future smoke walk surfaces
  a leak there.
- **Bug S**: Registered snake_case fact keys directly instead of
  converting to DOMAIN.SUBKEY shape — chat-turn persona emits
  snake_case as the canonical key.
- **Bug O**: BKI glossary entry rolled the v1.0.22 Path B honesty
  notice into the definition itself, so the bauherr reading the
  glossary sees the same discipline as the cost-formula label.
- **Bug D**: Parser shipped + tested as a pure helper. Wizard
  integration parked for v1.0.24 — the wizard's current
  blob-verbatim flow needs empirical validation before swapping in
  the parsed shape.

## v1.0.22 — Data Integrity Sprint (2026-05-13)

Closes 6 P1 data-integrity defects deferred from the v1.0.21 BACKLOG:
Building class derivation (C), Documents UI/PDF unification (F),
i18n leak on persona output (K), VERIFIED qualifier authority guard
(Q), Donut/cover denominator unification (B), and Cost-formula
honesty (I).

Sprint anchor:
- Bayern composeLegalContext SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
  unchanged across every commit.

### Bugs fixed (in commit order)

1. **Bug C** — Unified MBO § 2 Abs. 3 Gebäudeklasse derivation.
   `src/legal/deriveGebaeudeklasse.ts` (new) returns
   `{ klasse, qualifier, reasoning }`. Threaded through UI overview
   (AtAGlance) and PDF Key Data. Honest deferral when Höhe AND
   Geschosse are both missing — never a fabricated GK number.
2. **Bug F** — Documents UI/PDF unification via new
   `src/features/result/lib/resolveDocuments.ts`. Both surfaces
   consume the same envelope (required + on-file + blockedByVoranfrage).
   When v1.0.21 Bug E's hard blockers fire, both surfaces collapse
   to a single "pending Bauvoranfrage" placeholder.
3. **Bug K** — i18n leak on dynamic persona output.
   `src/legal/germanLeakGuard.ts` (new) runtime guard
   `sanitizeGermanContentOnEnglish` scans for ≥ 2 German morphology
   tokens on EN exports and renders an honest placeholder
   ("(German content; English translation pending)") rather than
   surfacing mixed-language strings. Applied to Top-3 + Recommendations
   surfaces.
4. **Bug Q** — VERIFIED qualifier authority guard.
   `src/lib/qualifierNormalize.ts` (new) + extended
   `getQualifierLabel` in pdfPrimitives. CLIENT / USER / BAUHERR +
   VERIFIED → CLIENT + DECIDED; DESIGNER + VERIFIED → DESIGNER +
   DECIDED (architect-loop verification ships post-v1.0.22).
   LEGAL/AUTHORITY + VERIFIED pass through. Read-time defense in
   depth on top of the write-time gate.
5. **Bug B** — Donut/cover denominator unification. PDF Verification
   page now sources from `aggregateQualifiers(state)` (all 5
   categories) instead of walking facts only. Donut + cover percent +
   verification page share the underlying counts.
6. **Bug I** — Honest BKI regional-factor framing (Path B). Cost-row
   labels in pdfStrings + stateLocalization rewritten to drop the
   misleading "regional BKI factor (X)" claim. New text: "HOAI Zone
   III · German baseline (regional variance ±10%)". `docs/cost-
   formula.md` documents the decision and the Path A trigger for
   v1.0.23+ once authoritative BKI data lands.

### New files

- `src/legal/deriveGebaeudeklasse.ts` — MBO § 2 Abs. 3 unified GK
  derivation.
- `src/legal/germanLeakGuard.ts` — runtime guard against German
  morphology on EN exports.
- `src/lib/qualifierNormalize.ts` — VERIFIED authority guard.
- `src/features/result/lib/resolveDocuments.ts` — unified UI/PDF
  document resolver.
- `docs/cost-formula.md` — Path A/B rationale for the cost-formula
  honest-framing decision.

### Gate status (final, on tag)

| Gate                        | Status                              |
| --------------------------- | ----------------------------------- |
| `npm run verify:bayern-sha` | ✓ MATCH                             |
| `npm run smoke:citations`   | ✓ static gate green                 |
| `npm run smoke:pdf-text`    | ✓ 181 passed · 0 failed (+37 over v1.0.21's 144) |
| `npx tsc --noEmit`          | ✓ clean                             |
| `npm run build`             | ✓ 272.7 KB gz (ceiling 300 KB)      |

### Fixture growth this sprint

- `smoke:pdf-text`: +37 assertions (144 → 181). Distribution by
  commit:
    - Bug C: +9 (5 unit cases + 4 PDF render: honest-deferral +
      no-fabricated-GK × langs)
    - Bug F: +4 (blocked placeholder + no auto-Lageplan × langs)
    - Bug K: +9 (4 unit cases + 4 EN-leak + 1 DE regression)
    - Bug Q: +7 (7 unit cases for normalization rules)
    - Bug B: +4 (denominator structural assertions × 2 fixtures × 2
      invariants)
    - Bug I: +4 (honest baseline phrase + no BKI factor × langs)
- `smoke:citations`: 2 static checks rewired to track v1.0.22
  behavior (basisTemplate honest framing + Bug 41+42 already done
  in v1.0.21).

### Autonomous decisions

- Bug K: persona-prompt fix (root-cause repair in chat-turn edge
  function) deferred to v1.0.23 or a chat-side sprint. Runtime guard
  is sufficient as a user-facing fix; full root-cause fix needs
  separate empirical validation that no Bayern fixture is regressed.
- Bug Q: read-time normalization applied (in getQualifierLabel)
  rather than extending the chat-turn write-time gate. Same surface
  covered; chat-turn gate extension parked for v1.0.23.
- Bug I: Path B chosen per sprint spec recommendation. REGION_MULT
  table preserved for Path A wiring once authoritative BKI data
  lands; only the user-facing label is honest about the current
  no-op state.
- Bug C fixtures: 5 unit-style assertions in the smoke harness instead
  of 4 extra PDF renders (would have added ~25 s per smoke run).
  End-to-end PDF integration still tested on the Berlin fixture.

## v1.0.21 — Bundesland Truth Sprint (2026-05-13)

Closes 7 P0/P1 defects surfaced by the v1.0.20 NRW × T-01 Königsallee
30 (11 bugs) and Berlin × T-01 Pariser Platz 1 (13 bugs) test cells.
Every fix is state-aware: Bayern continues to render verified BayBO §§
and BLfD references; non-Bayern projects render the state-correct
citation; the 11 minimum-content Bundesländer (Berlin / Hamburg /
Bremen / Brandenburg / MV / RLP / Saarland / Sachsen / Sachsen-Anhalt /
SH / Thüringen) render honest-deferral placeholders. No fabricated
citations on unverified states.

Sprint anchor:
- Bayern composeLegalContext SHA `b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471`
  unchanged across every commit. Verified by `npm run verify:bayern-sha`.

### Bugs fixed (in commit order)

1. **Bug 23-PRIME** — Cross-project content bleed (Stadtarchiv
   Düsseldorf / Königsallee leaking onto every project regardless of
   bundesland).
2. **Bug 23** — State-aware Specialists § citations (BayBO Art. 61 /
   Art. 62 was leaking onto Berlin / NRW / Hessen / NS / BW PDFs).
3. **Bug 23b** — State-aware Documents BauVorlagen citations
   (BauVorlVO NRW / § 64 BauO NRW / § 68 BauO NRW / DSchG NRW were
   leaking onto every project).
4. **Bug 23c** — State-aware Risk Register filters
   (Schwabing-Ensemble / BLfD / StPlS 926 / München Bauamt rotation
   were leaking onto non-Bayern projects; one entry had a `'Bayern'`
   uppercase typo that broke the existing filter).
5. **Bug 23d** — State-aware Legal Landscape DSchG citation
   (BayDSchG was the Sonstige-Vorgaben Denkmalschutz row label for
   every project; BayBO Domain-B matchers fired regardless of
   bundesland).
6. **Bug E** — Hard Blocker propagation to Procedure tab + PDF
   (MK use-type + Denkmalschutz + Sonderbau + a generic catch-all
   flag now short-circuit `resolveProcedure` to `bauvoranfrage` with
   explicit blocker reasoning, surface a BLOCKER card in the Top-3,
   and re-title the procedure card "Procedure determination
   deferred").
7. **Bug M** — Confidence formula multiplicative hard-blocker penalty
   (0.70 per active blocker, floor at 25; design rationale in
   `docs/confidence-formula.md`). Berlin × T-01 with 2 blockers drops
   from 79% (v1.0.20) to 35% (v1.0.21); NRW Königsallee clean
   project unchanged at 72%.

### New files

- `src/legal/stateCitations.ts` — single state-aware citation pack
  (archivCity, bauVorlagenAct, permitFormCitation,
  permitSubmissionCitation, structuralCertCitation,
  abstandsFlaechenCitation, denkmalSchutzAct, denkmalAuthority).
- `src/legal/crossStateBleedGuard.ts` — runtime sanitizer for any
  rendered string; logs + replaces tokens from states other than
  `project.bundesland`.
- `test/fixtures/berlin-t01-pariser-platz.json` — Berlin Neubau-EFH
  smoke fixture with hard blockers set (mk_gebietsart + denkmalschutz
  + bauvoranfrage_hard_blocker).
- `docs/confidence-formula.md` — formula documentation including the
  0.70 / 25 design pivots.
- `BACKLOG.md` (top-level) — v1.0.22+ deferred bugs.

### Gate status (final, on tag)

| Gate                        | Status                          |
| --------------------------- | ------------------------------- |
| `npm run verify:bayern-sha` | ✓ MATCH                         |
| `npm run smoke:citations`   | ✓ static gate green             |
| `npm run smoke:pdf-text`    | ✓ 144 passed · 0 failed (+48 over v1.0.20's 96) |
| `npx tsc --noEmit`          | ✓ clean                         |
| `npm run build`             | ✓ 269.7 KB gz (ceiling 300 KB)  |

### Fixture growth this sprint

- `smoke:pdf-text`: +48 assertions over v1.0.20 (was 96, now 144).
  Distribution by commit:
    - Commit 1 (Bug 23-PRIME): +6 (Stadtarchiv + Königsallee absence +
      Stadtarchiv Berlin presence × EN + DE)
    - Commit 2 (Bug 23): +6 (3 Bayern-only specialist tokens × langs)
    - Commit 3 (Bug 23b): +10 (5 NRW-only document tokens × langs)
    - Commit 4 (Bug 23c): +12 (6 Bayern-only risk tokens × langs)
    - Commit 5 (Bug 23d): +4 (2 Bayern DSchG tokens × langs)
    - Commit 6 (Bug E): +6 (3 hard-blocker assertions × langs)
    - Commit 7 (Bug M): +4 (2 confidence bounds × langs)
- `smoke:citations`: 1 static-citation check rewired to verify the
  new state-aware indirection (requiredDocuments → stateCitations).

## v1.0.20 — Cosmetic Polish Sprint

See `docs/HANDOFF.md` §9 ladder.

## Earlier versions

See `docs/HANDOFF.md` §9 for the full v1.0.0 → v1.0.20 ladder.
