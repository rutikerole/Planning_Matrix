#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// Four-class campaign Phase 5a — cost ProcedureType pin.
//
// detectProcedure mapped a procedure to its cost multiplier by REGEX over text,
// checking `baugenehmigungsverfahren`→art60 (1.25) BEFORE `vereinfacht`→art58
// (1.0). So "Vereinfachtes Baugenehmigungsverfahren" (which contains
// "Baugenehmigungsverfahren") wrongly costed at 1.25. Fix: read the structured
// kind (the procedure TITLE / procedureLabel) with correct precedence.
//
// THE REGRESSION TO HUNT: this shifts the cost-engine multiplier. T-01 is the only
// engine-path template (T-02/06/07/08 = bands, T-03/04/05 = stubs post-P1), and its
// BASELINE must keep mult 1.0 (art58_vereinfacht and unknown are both 1.0) → no
// cost change. Pinned BEFORE and AFTER the fix.
//
// Run: npx tsx scripts/smoke-cost-procedure.mts   (npm run smoke:cost-procedure)
// ───────────────────────────────────────────────────────────────────────

import { buildCostBreakdown, detectKlasse, detectProcedure, resolveCostKlasse } from '../src/features/result/lib/costNormsMuenchen.ts'
import { resolveCostProcedureType } from '../src/features/result/lib/resolveProcedures.ts'

let passed = 0
let failed = 0
function ok(cond: boolean, msg: string): void {
  if (cond) { console.log(`  ✓ ${msg}`); passed++ }
  else { console.log(`  ✗ ${msg}`); failed++ }
}
// art58_vereinfacht and unknown both map to multiplier 1.0; art60 = 1.25, art57 = 0.7.
const MULT_1_0 = new Set(['art58_vereinfacht', 'unknown'])

console.log('\n[smoke-cost-procedure] FIX-PROOF — a simplified procedure must cost at 1.0 (art58), not 1.25 (art60)…')
ok(detectProcedure('Vereinfachtes Baugenehmigungsverfahren · § 52 LBO BW') === 'art58_vereinfacht',
  `"Vereinfachtes Baugenehmigungsverfahren" → art58_vereinfacht (was art60·1.25): got ${detectProcedure('Vereinfachtes Baugenehmigungsverfahren · § 52 LBO BW')}`)
ok(detectProcedure('Simplified building permit · § 63 SächsBO') === 'art58_vereinfacht',
  `"Simplified building permit" → art58_vereinfacht: got ${detectProcedure('Simplified building permit · § 63 SächsBO')}`)

console.log('\n[smoke-cost-procedure] NO-REGRESSION — the other kinds + the T-01 baseline must be unchanged…')
ok(detectProcedure('Reguläres Baugenehmigungsverfahren (§ 65 BauO NRW)') === 'art60_baugenehmigung',
  `"Reguläres Baugenehmigungsverfahren" → art60_baugenehmigung (unchanged): got ${detectProcedure('Reguläres Baugenehmigungsverfahren (§ 65 BauO NRW)')}`)
ok(detectProcedure('Genehmigungsfreistellung nach Art. 57 BayBO') === 'art57_freistellung',
  `"Genehmigungsfreistellung" → art57_freistellung (unchanged): got ${detectProcedure('Genehmigungsfreistellung nach Art. 57 BayBO')}`)
// T-01 baseline rationale ("Standardpfad …") contains none of the keywords → unknown (1.0). Must stay.
ok(detectProcedure('Standardpfad für Wohnvorhaben ohne Sonderbau-Tatbestand in Baden-Württemberg') === 'unknown',
  `T-01 baseline rationale "Standardpfad …" → unknown·1.0 (unchanged): got ${detectProcedure('Standardpfad für Wohnvorhaben ohne Sonderbau-Tatbestand in Baden-Württemberg')}`)

console.log('\n[smoke-cost-procedure] T-01 ENGINE-PATH cost stability — baseline must keep a 1.0 multiplier (no cost shift)…')
for (const bundesland of ['bw', 'bayern', 'sachsen', 'nrw'] as const) {
  const t = resolveCostProcedureType({ bundesland, intent: 'neubau_einfamilienhaus' } as never, { templateId: 'T-01', facts: [] } as never)
  ok(MULT_1_0.has(t), `${bundesland} T-01 neubau baseline → 1.0-multiplier type (${t}); cost magnitude unchanged`)
}

console.log('\n[smoke-cost-procedure] Meta-sweep item 2 — GK reads the directive\'s own mandated format…')
// The persona directive (personaBehaviour.ts GEBÄUDEKLASSE bullet) pins key
// `gebaeudeklasse`, value "GK <N>". Cost corpora are `${key} ${value}`
// lowercased → "gebaeudeklasse gk 5". PRE-FIX this returned 'unknown' → the
// GK5 1.85 multiplier silently became 1.0 on all four cost surfaces.
ok(detectKlasse('gebaeudeklasse gk 5') === '5',
  `detectKlasse on the directive shape "gebaeudeklasse gk 5" → 5 (was unknown pre-fix): got ${detectKlasse('gebaeudeklasse gk 5')}`)
ok(detectKlasse('gebäudeklasse 5') === '5', 'legacy prose shape "gebäudeklasse 5" still reads (no regression)')
ok(detectKlasse('gk 3') === '3', 'bare "GK 3" shape reads')
ok(detectKlasse('keine klasse hier') === 'unknown', 'no GK token → unknown (no false positive)')

console.log('\n[smoke-cost-procedure] Meta-sweep item 2 — typed fact outranks corpus prose…')
const FACTS_GK5 = [{ key: 'gebaeudeklasse', value: 'GK 5' }]
ok(resolveCostKlasse(FACTS_GK5, 'irgendeine prose mit gebäudeklasse 2 erwähnung') === '5',
  'typed gebaeudeklasse fact ("GK 5") outranks a contradicting prose mention (GK 2)')
ok(resolveCostKlasse([], 'gebäudeklasse 4 laut planung') === '4', 'no typed fact → corpus heuristic backstop (GK 4)')
ok(resolveCostKlasse([{ key: 'building_class', value: 'GK 3' }], '') === '3', 'key-normalised buildingclass alias reads')

console.log('\n[smoke-cost-procedure] Meta-sweep item 2 — GK5 fixture moves the multiplier (1.85, not 1.0)…')
const gk5 = buildCostBreakdown('art58_vereinfacht', resolveCostKlasse(FACTS_GK5, 'gebaeudeklasse gk 5'))
const gk1 = buildCostBreakdown('art58_vereinfacht', '1')
ok(Math.abs(gk5.total.min / gk1.total.min - 1.85) < 0.01,
  `GK5 fixture costs at KLASSE_MULT 1.85× the GK1 baseline (got ${(gk5.total.min / gk1.total.min).toFixed(2)}×)`)

console.log(`\n[smoke-cost-procedure] ${passed} passed · ${failed} failed`)
if (failed > 0) { console.error('[smoke-cost-procedure] FAIL'); process.exit(1) }
console.log('[smoke-cost-procedure] OK')
process.exit(0)
