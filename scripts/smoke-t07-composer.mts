#!/usr/bin/env -S npx tsx
// T-05 sprint Phase 2.5-B — T-07 (Anbau) composer-parity gate.
// Same audit headline class as T-06: no intent branch → masking standard-
// ASSUMED default + web split. Now: simplified baseline, Anbau framing.
import { makeOk, finish, assertBaseline, assertFlip, mkProject, mkState, type Tally } from './lib/composerParity.mts'
import { buildProcedureCase, resolveProcedure } from '../src/legal/resolveProcedure.ts'

const t: Tally = { pass: 0, fail: 0 }
const ok = makeOk(t)
const P = { templateId: 'T-07', intent: 'anbau', bundesland: 'nrw' }

console.log('T-07 — intent baseline + flip:')
assertBaseline(ok, P, { kind: 'vereinfachtes', citation: /§ 64 BauO NRW/, confidence: 'CALCULATED' })
const d0 = resolveProcedure(buildProcedureCase(mkProject(P, mkState(P, [])), mkState(P, [])))
ok(/Anbau/.test(d0.reasoning_de), 'baseline uses the Anbau framing (no cross-intent bleed)')
assertFlip(ok, P, 'verfahrensfrei nach § 62 BauO NRW', { kind: 'verfahrensfrei', citation: /§ 62 BauO NRW/ })
finish('smoke-t07-composer', t)
