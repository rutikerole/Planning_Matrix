# Changelog

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
