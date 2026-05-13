# Cost formula (v1.0.22+)

The PDF cover cost range + the Overview cost rows are computed by
`src/features/result/lib/costNormsMuenchen.ts` (`buildCostBreakdown`)
and read from a small set of multiplier tables.

## Inputs

| Input            | Source                                 |
| ---------------- | -------------------------------------- |
| `procedure`      | `detectProcedure(rationale)`           |
| `klasse`         | `detectKlasse(corpus)` or persona fact |
| `areaSqm`        | `detectAreaSqm(corpus)` or template    |
| `bundesland`     | `project.bundesland`                   |

## Multipliers

```ts
PROCEDURE_MULT[procedure]   // 0.7 .. 1.25
KLASSE_MULT[klasse]         // 1.0 .. 1.85
areaFactor(areaSqm)         // 0.5 .. 2.5 (clamped linear ratio)
REGION_MULT[bundesland]     // currently 1.0 for every state
```

## The regional factor is not yet wired

Per v1.0.22 Bug I, the `REGION_MULT` table in
`src/features/result/lib/costNormsMuenchen.ts` currently maps:

```ts
const REGION_MULT: Record<string, number> = {
  Bayern: 1.0,
}
```

Everything else falls through to `1.0` via the `?? 1.0` default. The
v1.0.20 cost-row label promised a regional adjustment ("scales with
floor area × regional BKI factor (Berlin)") but the formula did not
apply one — Berlin numbers were byte-identical to Bayern numbers.

### Why we chose honest framing over fake multipliers (Path B)

The sprint spec offered two paths:

- **Path A** — wire a regional factor table keyed by Bundesland with
  approximate BKI averages (Bayern 1.0, NRW 0.95, Berlin 1.10, …).
- **Path B** — drop the misleading label, render "HOAI Zone III ·
  German baseline (regional variance ±10%)".

We took **Path B**. Path A would require:

1. Authoritative BKI per-state factors (source-cited, audit-traceable).
2. Empirical validation that the chosen factors don't drift more than
   the existing ±10% market variance against real architect quotes.
3. A way to surface the factor's uncertainty so the bauherr doesn't
   read a fabricated multiplier as a calibrated number.

None of these were in scope for the Data Integrity Sprint. Better to
be honest about the limitation than to confidently apply a guessed
multiplier — same discipline that ruled the v1.0.21 Bundesland Truth
Sprint's "honest deferral over fabricated §§".

## When Path A lands (v1.0.23+ or later)

Replace `REGION_MULT` with a populated, source-cited table. Then
revert this doc's "honest framing" section to a "regional factor
documented" section, with the source's per-state values and the
validation evidence. The cost-row label can return to mentioning the
regional factor — but only with a real number behind it.

## See also

- `src/features/result/lib/costNormsMuenchen.ts` — implementation.
- `src/legal/stateLocalization.ts` — `costFactorLabel` per state
  (honest baseline framing in v1.0.22).
- `src/features/chat/lib/pdfStrings.ts` — `costs.basisTemplate`
  (honest baseline framing in v1.0.22).
- `BACKLOG.md` — Bug I follow-up listed under v1.0.23+ "wire real
  regional BKI factors" if/when authoritative data lands.
