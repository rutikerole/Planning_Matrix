#!/usr/bin/env -S npx tsx
// T-05 sprint Phase 2.5-B — T-03 (Sanierung) composer-parity gate.
// Pins: simplified intent baseline (thin state) · verfahrensfrei flip ·
// GEG § 48 (renovation, NEVER the § 10 new-build cert) · asbest present.
import { makeOk, finish, assertBaseline, assertFlip, type Tally } from './lib/composerParity.mts'
import { requiredDocumentsForCase } from '../src/legal/requiredDocuments.ts'

const t: Tally = { pass: 0, fail: 0 }
const ok = makeOk(t)
const P = { templateId: 'T-03', intent: 'sanierung', bundesland: 'mv' }

console.log('T-03 — intent baseline + flip:')
assertBaseline(ok, P, { kind: 'vereinfachtes', citation: /§ 63 LBauO M-V/, confidence: 'CALCULATED' })
assertFlip(ok, P, 'verfahrensfrei nach § 61 LBauO M-V', { kind: 'verfahrensfrei', citation: /§ 61 LBauO M-V/ })

console.log('T-03 — §-leak guards:')
const docs = requiredDocumentsForCase({ procedureKind: 'vereinfachtes', intent: 'sanierung', bundesland: 'mv', eingriff_tragende_teile: false, eingriff_aussenhuelle: true, denkmalschutz: false, geg_trigger: true, fassadenflaeche_m2: 200 } as never)
ok(docs.some((d) => d.citation === '§ 48 GEG'), 'GEG § 48 (Bestand) certificate on envelope renovation')
ok(!docs.some((d) => d.key === 'geg_waermeschutznachweis_neubau'), 'NO § 10 GEG new-build NZEB cert on a renovation (Y-3 class)')
ok(docs.some((d) => d.key === 'asbest_voruntersuchung'), 'Asbest/PCB pre-investigation present (Bestand, pre-1995 default)')
ok(!docs.some((d) => d.key === 'beseitigungsanzeige'), 'no demolition notification leak')
finish('smoke-t03-composer', t)
