#!/usr/bin/env -S npx tsx
// T-05 sprint Phase 2.5-B — T-06 (Aufstockung) composer-parity gate.
// THE audit headline: T-06 had NO intent branch and rendered "Standard
// building permit … ASSUMED" on every state (masking default + web split).
import { makeOk, finish, assertBaseline, assertFlip, mkProject, mkState, type Tally } from './lib/composerParity.mts'
import { buildProcedureCase, resolveProcedure } from '../src/legal/resolveProcedure.ts'

const t: Tally = { pass: 0, fail: 0 }
const ok = makeOk(t)
const P = { templateId: 'T-06', intent: 'aufstockung', bundesland: 'sachsen' }

console.log('T-06 — intent baseline (the audit headline) + flip:')
assertBaseline(ok, P, { kind: 'vereinfachtes', citation: /§ 63 SächsBO/, confidence: 'CALCULATED' })
const d0 = resolveProcedure(buildProcedureCase(mkProject(P, mkState(P, [])), mkState(P, [])))
ok(/Aufstockung/.test(d0.reasoning_de), 'baseline uses the Aufstockung framing (no cross-intent bleed)')
assertFlip(ok, P, 'reguläres Verfahren nach § 64 SächsBO', { kind: 'standard', citation: /§ 64 SächsBO/ })
assertFlip(ok, P, 'verfahrensfrei nach § 61 SächsBO', { kind: 'verfahrensfrei', citation: /§ 61 SächsBO/ })
finish('smoke-t06-composer', t)
