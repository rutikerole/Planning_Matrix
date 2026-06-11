#!/usr/bin/env -S npx tsx
// T-05 sprint Phase 2.5-B — T-08 (Sonstiges) composer-parity gate.
// T-08 keeps the HONEST-DEFERRAL baseline BY DESIGN: standard-§ · ASSUMED ·
// confirm-with-authority framing (an unknown project type must not get a
// confident simplified claim). Decision-first killed the old web split
// (web previously claimed "Vereinfachtes · CALCULATED" while the PDF said
// standard-ASSUMED).
import { makeOk, finish, assertBaseline, assertFlip, mkProject, mkState, type Tally } from './lib/composerParity.mts'
import { buildProcedureCase, resolveProcedure } from '../src/legal/resolveProcedure.ts'

const t: Tally = { pass: 0, fail: 0 }
const ok = makeOk(t)
const P = { templateId: 'T-08', intent: 'sonstige', bundesland: 'sachsen' }

console.log('T-08 — honest-deferral baseline (by design) + flip:')
assertBaseline(ok, P, { kind: 'standard', citation: /§ 64 SächsBO/, confidence: 'ASSUMED' })
const d0 = resolveProcedure(buildProcedureCase(mkProject(P, mkState(P, [])), mkState(P, [])))
ok(/bestätigen|confirm/.test(d0.reasoning_de + d0.reasoning_en), 'deferral framing asks for authority confirmation')
assertFlip(ok, P, 'vereinfachtes Verfahren nach § 63 SächsBO', { kind: 'vereinfachtes', citation: /§ 63 SächsBO/ })
// Meta-sweep item 3c — Bayern fixture + the verfahrensfrei DIRECTION (the most
// common real T-08 outcome: garage/Dach-PV) which no T-08 flip ever tested.
console.log('T-08 — Bayern fixture (deferral baseline + verfahrensfrei flip):')
const PB = { templateId: 'T-08', intent: 'sonstige', bundesland: 'bayern' }
assertBaseline(ok, PB, { kind: 'standard', citation: /BayBO Art\. 60/, confidence: 'ASSUMED' })
assertFlip(ok, PB, 'verfahrensfrei nach BayBO Art. 57', { kind: 'verfahrensfrei', citation: /BayBO Art\. 57/ })
finish('smoke-t08-composer', t)
