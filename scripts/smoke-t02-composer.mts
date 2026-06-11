#!/usr/bin/env -S npx tsx
// T-05 sprint Phase 2.5-B — T-02 (Neubau MFH) composer-parity gate.
// Pins: simplified intent baseline · Sonderbau gate forces the REGULAR
// procedure (RED-1 class) · verdict flip · DIN 4109 conditional present.
import { makeOk, finish, assertBaseline, assertFlip, mkProject, mkState, type Tally } from './lib/composerParity.mts'
import { buildProcedureCase, resolveProcedure } from '../src/legal/resolveProcedure.ts'
import { requiredDocumentsForCase } from '../src/legal/requiredDocuments.ts'

const t: Tally = { pass: 0, fail: 0 }
const ok = makeOk(t)
const P = { templateId: 'T-02', intent: 'neubau_mehrfamilienhaus', bundesland: 'sachsen' }

console.log('T-02 — intent baseline + flip:')
assertBaseline(ok, P, { kind: 'vereinfachtes', citation: /§ 63 SächsBO/, confidence: 'CALCULATED' })
assertFlip(ok, P, 'vereinfachtes Verfahren nach § 63 SächsBO', { kind: 'vereinfachtes', citation: /§ 63 SächsBO/ })

console.log('T-02 — Sonderbau gate (RED-1 class):')
const sbState = mkState(P, [
  { key: 'sonderbau_tatbestand_kita', value: 'KiTa' },
  { key: 'sonderbau_tatbestand_grossgarage', value: 'Großgarage > 1.000 m²' },
  { key: 'anzahl_sonderbau_tatbestaende', value: 2 },
])
const dSb = resolveProcedure(buildProcedureCase(mkProject(P, sbState), sbState))
ok(dSb.kind === 'standard' && /§ 64 SächsBO/.test(dSb.citation), `2 Sonderbau triggers → REGULAR procedure § 64 (got ${dSb.kind} · ${dSb.citation})`)
ok(dSb.confidence === 'CALCULATED', 'Sonderbau-forced regular is CALCULATED')

console.log('T-02 — §-leak guards:')
const docs = requiredDocumentsForCase({ procedureKind: 'vereinfachtes', intent: 'neubau', bundesland: 'sachsen', eingriff_tragende_teile: false, eingriff_aussenhuelle: false, denkmalschutz: false, geg_trigger: false } as never)
ok(docs.some((d) => d.key === 'schallschutznachweis'), 'DIN 4109 sound-insulation conditional present (MFH set)')
ok(!docs.some((d) => d.key === 'asbest_voruntersuchung'), 'no Asbest/PCB on a new build (Y-4)')
finish('smoke-t02-composer', t)
