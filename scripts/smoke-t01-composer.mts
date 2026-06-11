#!/usr/bin/env -S npx tsx
// T-05 sprint Phase 2.5-B — T-01 (Neubau EFH) composer-parity gate.
// Pins: simplified intent baseline · verdict flip across 4 surfaces ·
// no Bestand/demolition §-leak (Y-4 asbest guard) · GEG § 10 present.
import { makeOk, finish, assertBaseline, assertFlip, mkProject, mkState, type Tally } from './lib/composerParity.mts'
import { requiredDocumentsForCase } from '../src/legal/requiredDocuments.ts'
import { resolveCostDisplayMode } from '../src/features/result/lib/costNormsMuenchen.ts'

const t: Tally = { pass: 0, fail: 0 }
const ok = makeOk(t)
const P = { templateId: 'T-01', intent: 'neubau_einfamilienhaus', bundesland: 'sachsen' }

console.log('T-01 — intent baseline + flip:')
assertBaseline(ok, P, { kind: 'vereinfachtes', citation: /§ 63 SächsBO/, confidence: 'CALCULATED' })
assertFlip(ok, P, 'reguläres Verfahren nach § 64 SächsBO', { kind: 'standard', citation: /§ 64 SächsBO/ })
assertFlip(ok, P, 'Genehmigungsfreistellung nach § 62 SächsBO', { kind: 'genehmigungsfreigestellt', citation: /§ 62 SächsBO/ })

console.log('T-01 — §-leak guards:')
const docs = requiredDocumentsForCase({ procedureKind: 'vereinfachtes', intent: 'neubau', bundesland: 'sachsen', eingriff_tragende_teile: false, eingriff_aussenhuelle: false, denkmalschutz: false, geg_trigger: false } as never)
ok(!docs.some((d) => d.key === 'asbest_voruntersuchung'), 'no Asbest/PCB pre-investigation on a NEW BUILD (Y-4 guard)')
ok(!docs.some((d) => /beseitigung|entsorgungsnachweise|standsicherheit_nachbar/.test(d.key)), 'no demolition document leak')
ok(docs.some((d) => d.citation === '§ 10 GEG'), 'GEG § 10 NZEB certificate present (new-build set)')
ok(resolveCostDisplayMode('T-01', 'neubau') !== 'demolition', 'cost mode is not demolition')
finish('smoke-t01-composer', t)
