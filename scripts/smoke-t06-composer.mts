#!/usr/bin/env -S npx tsx
// T-05 sprint Phase 2.5-B — T-06 (Aufstockung) composer-parity gate.
// THE audit headline: T-06 had NO intent branch and rendered "Standard
// building permit … ASSUMED" on every state (masking default + web split).
import { makeOk, finish, assertBaseline, assertFlip, mkProject, mkState, type Tally } from './lib/composerParity.mts'
import { buildProcedureCase, resolveProcedure } from '../src/legal/resolveProcedure.ts'
import { deriveGebaeudeklasse, gkDerivationCarveOut } from '../src/legal/deriveGebaeudeklasse.ts'

const t: Tally = { pass: 0, fail: 0 }
const ok = makeOk(t)
const P = { templateId: 'T-06', intent: 'aufstockung', bundesland: 'sachsen' }

console.log('T-06 — intent baseline (the audit headline) + flip:')
assertBaseline(ok, P, { kind: 'vereinfachtes', citation: /§ 63 SächsBO/, confidence: 'CALCULATED' })
const d0 = resolveProcedure(buildProcedureCase(mkProject(P, mkState(P, [])), mkState(P, [])))
ok(/Aufstockung/.test(d0.reasoning_de), 'baseline uses the Aufstockung framing (no cross-intent bleed)')
assertFlip(ok, P, 'reguläres Verfahren nach § 64 SächsBO', { kind: 'standard', citation: /§ 64 SächsBO/ })
assertFlip(ok, P, 'verfahrensfrei nach § 61 SächsBO', { kind: 'verfahrensfrei', citation: /§ 61 SächsBO/ })
// Meta-sweep item 3c — Bayern fixture. The product's live walks are München-
// gated and the T-06 template content is Bayern-first (Art. 46 Abs. 6 / Art. 81
// privileges), but every composer fixture was Sachsen. Pin the BayBO Art.-format
// path end-to-end.
console.log('T-06 — Bayern fixture (Art.-format citations):')
const PB = { templateId: 'T-06', intent: 'aufstockung', bundesland: 'bayern' }
assertBaseline(ok, PB, { kind: 'vereinfachtes', citation: /BayBO Art\. 59/, confidence: 'CALCULATED' })
assertFlip(ok, PB, 'verfahrensfrei nach BayBO Art. 57', { kind: 'verfahrensfrei', citation: /BayBO Art\. 57/ })
assertFlip(ok, PB, 'reguläres Baugenehmigungsverfahren nach BayBO Art. 60', { kind: 'standard', citation: /BayBO Art\. 60/ })

// Meta-sweep item 3a+3b — T-06 GK mechanics.
console.log('T-06 — GK mechanics (carve-out + conservative freistehend default):')
// 3a: a freshly-derived GK row is carved out for T-06 (storey addition can
// change the GK; a derived post-addition number would contradict the persona's
// GK-retention statement). T-04 keeps its use-conversion carve-out; engine-path
// templates still derive.
ok(gkDerivationCarveOut('T-06') === 'storey-addition', "gkDerivationCarveOut('T-06') → storey-addition (derived GK row suppressed)")
ok(gkDerivationCarveOut('T-04') === 'use-conversion', "gkDerivationCarveOut('T-04') → use-conversion (unchanged)")
ok(gkDerivationCarveOut('T-01') === null && gkDerivationCarveOut('T-05') === null, 'T-01/T-05 still derive (no over-carve)')
// 3b: freistehend default is CONSERVATIVE (attached) — was true, the same
// optimistic trap fixed for T-05: an attached urban Aufstockung mis-defaulted
// to freistehend reads GK 1 instead of GK 2.
const gkDefault = deriveGebaeudeklasse({ hoeheM: 6.5, nutzungseinheitenAnzahl: 1, templateId: 'T-06' })
ok(gkDefault.klasse === 2, `T-06 no freistehend fact → conservative GK 2, not GK 1 (got GK ${gkDefault.klasse})`)
ok(gkDefault.qualifier === 'ASSUMED', `T-06 defaulted freistehend tags ASSUMED (got ${gkDefault.qualifier})`)
const gkCaptured = deriveGebaeudeklasse({ hoeheM: 6.5, nutzungseinheitenAnzahl: 1, templateId: 'T-06', freistehend: true })
ok(gkCaptured.klasse === 1, `captured gebaeude_freistehend=true still overrides to GK 1 (got GK ${gkCaptured.klasse})`)

finish('smoke-t06-composer', t)
