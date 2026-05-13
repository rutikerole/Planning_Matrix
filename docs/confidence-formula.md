# Confidence formula (v1.0.21+)

The cover-page confidence percent is computed by
`src/features/result/lib/computeConfidence.ts` and the same value is
used inside `useResolvedRoles`, the dashboard list, and the PDF cover.

## Inputs

The formula sources from three project-state surfaces:

1. **Qualifier mix** across the 5 qualifier-bearing categories (facts +
   procedures + documents + roles + recommendations), aggregated via
   `aggregateQualifiers`. Each qualifier carries a weight:
   - `DECIDED` × 1.0
   - `CALCULATED + VERIFIED` × 0.85
   - `ASSUMED + UNKNOWN` × 0.4

2. **Section completeness** across the project's defined sections,
   from `computeSectionCompleteness`. Weighting was dropped to 0 in
   v1.0.6 (Bug 4) so the header value cannot be inflated by section
   completeness above the fact-quality mix; v1.0.7 (Bug 8) further
   widened the qualifier scope to match the DataQualityDonut. The
   sectionScore is still tracked in the breakdown but does not
   contribute to the composite total.

3. **Hard blockers** (v1.0.21+) — see below.

## Hard-blocker penalty (v1.0.21)

A project can carry one or more *hard blockers* in its
`projects.state.facts`:

- `mk_gebietsart` — MK use-type (§ 7 BauNVO).
- `denkmalschutz` — listed building or ensemble.
- `sonderbau_scope` — Sonderbau-Tatbestand.
- `bauvoranfrage_hard_blocker` — catch-all flag set by the persona
  when a specific blocker fact has not been enumerated.

A hard blocker means the system *cannot bound* the procedure / cost /
timeline. Until a Bauvoranfrage / Vorbescheid clears the issue, every
downstream calculation rests on an unverified admissibility
assumption.

### The penalty

For each active hard blocker, the composite confidence is multiplied
by `HARD_BLOCKER_PENALTY = 0.70`. The penalty composes
multiplicatively across blockers, with a floor of
`CONFIDENCE_FLOOR = 25`:

```
total = max(25, round(rawTotal × 0.70^blockerCount))
```

Examples (using a hypothetical rawTotal of 79%):

| blockers | factor   | rounded total |
| -------- | -------- | ------------- |
| 0        | 1.00     | 79%           |
| 1        | 0.70     | 55%           |
| 2        | 0.49     | 39%           |
| 3        | 0.343    | 27%           |
| 4        | 0.2401   | 25% (floor)   |

### Why 0.70?

A blocker is a structural unknown. Halving (0.50) would over-penalize
since at least the system has SOME signal even when blocked — the
fact-mix is still real. A token discount (e.g. 0.90) would not change
the user's risk perception. 0.70 is the design pivot that:

- One blocker drops a "high confidence" 79% to a "moderate" 55% — the
  bauherr can no longer treat the number as a green light.
- Two blockers drop to 39% — a clear "do not start LP 3 yet" signal.
- Three blockers approach the floor, which is exactly when the user
  should pause and demand a Bauvoranfrage.

### Why a 25% floor?

A blocker-laden project still has meaningful state (verified facts,
calculated procedures, the persona's preliminary recommendations).
Rendering 0% would understate that work and make the UI feel broken;
rendering 25% communicates "structurally compromised, but not zero
signal" — the bauherr knows to schedule a Voranfrage, not to abandon
the project.

### Why multiplicative?

Blockers are not additive — two blockers do not double the risk, they
*compound* it. A Denkmalschutz blocker + a MK-Gebietsart blocker each
gate a different authority path; getting one cleared does not unblock
the other. Multiplication models that compounding more honestly than
addition.

## See also

- `src/features/result/lib/computeConfidence.ts` — implementation.
- `src/legal/resolveProcedure.ts` — `detectHardBlockers` returns the
  same blocker set the penalty counts.
- `docs/V1_SMOKE_WALK_EXECUTION_PLAN.md` — v1.0.20 smoke walk that
  surfaced the v1.0.20 regression where Berlin × T-01 with 2 hard
  blockers still rendered 79% confidence.
