#!/usr/bin/env -S npx tsx
// T-05 sprint Phase 2.5-B — T-07 (Anbau) composer-parity gate.
// Same audit headline class as T-06: no intent branch → masking standard-
// ASSUMED default + web split. Now: simplified baseline, Anbau framing.
import { readFileSync } from 'node:fs'
import { makeOk, finish, assertBaseline, assertFlip, mkProject, mkState, type Tally } from './lib/composerParity.mts'
import {
  beseitigungCitationFor,
  buildProcedureCase,
  classifyVerdictDirection,
  procedureLabel,
  resolveProcedure,
} from '../src/legal/resolveProcedure.ts'
import { resolveProcedures, selectProcedures } from '../src/features/result/lib/resolveProcedures.ts'
import { gkCarveOutValue, gkDerivationCarveOut } from '../src/legal/deriveGebaeudeklasse.ts'

const t: Tally = { pass: 0, fail: 0 }
const ok = makeOk(t)
const P = { templateId: 'T-07', intent: 'anbau', bundesland: 'nrw' }

console.log('T-07 — intent baseline + flip:')
assertBaseline(ok, P, { kind: 'vereinfachtes', citation: /§ 64 BauO NRW/, confidence: 'CALCULATED' })
const d0 = resolveProcedure(buildProcedureCase(mkProject(P, mkState(P, [])), mkState(P, [])))
ok(/Anbau/.test(d0.reasoning_de), 'baseline uses the Anbau framing (no cross-intent bleed)')
assertFlip(ok, P, 'verfahrensfrei nach § 62 BauO NRW', { kind: 'verfahrensfrei', citation: /§ 62 BauO NRW/ })
// Meta-sweep item 3c — Bayern fixture (walks are München-gated; the 75-m³
// Verfahrensfreiheit tier is BayBO Art. 57 Abs. 1 Nr. 1 a content).
console.log('T-07 — Bayern fixture (Art.-format citations):')
const PB = { templateId: 'T-07', intent: 'anbau', bundesland: 'bayern' }
assertBaseline(ok, PB, { kind: 'vereinfachtes', citation: /BayBO Art\. 59/, confidence: 'CALCULATED' })
assertFlip(ok, PB, 'verfahrensfrei nach BayBO Art. 57', { kind: 'verfahrensfrei', citation: /BayBO Art\. 57/ })

// ── fix/t07-prewalk item 1 — anzeige on a NON-demolition intent must never
// render demolition wording. Pre-fix: procedureLabel's kind table hardcoded
// "Anzeigeverfahren (Abbruchanzeige)" and the intent-blind keyword branch
// stamped "Anzeigepflichtige Beseitigung" + the state DEMOLITION § fallback
// onto any template whose verdict said "anzeigepflichtig" (T-07 Bayern
// Art. 57 Abs. 7 / BB § 62 BbgBO are instructed wording). The label feeds the
// web primary card, At-a-Glance, PDF S05, PDF Key Data and the .md export.
const demolDe = /Beseitigung|Abbruch/
const demolEn = /demolition|removal/i
console.log('T-07 — anzeige kind is intent-aware (fix/t07-prewalk item 1):')
const ANZ = 'anzeigepflichtig nach BayBO Art. 57 Abs. 7 (formlose Anzeige, 2 Wochen vor Baubeginn)'
const sAnz = mkState(PB, [{ key: 'verfahren_indikation', value: ANZ }])
const dAnz = resolveProcedure(buildProcedureCase(mkProject(PB, sAnz), sAnz))
ok(dAnz.kind === 'anzeige', `anbau anzeige verdict → kind anzeige (got ${dAnz.kind})`)
ok(/BayBO Art\. 57/.test(dAnz.citation), `anbau anzeige cites the verdict's § (got "${dAnz.citation}")`)
ok(
  !demolDe.test(dAnz.reasoning_de) && !demolEn.test(dAnz.reasoning_en),
  'anbau anzeige reasoning carries no demolition wording',
)
ok(
  !demolDe.test(procedureLabel('anzeige', 'de', dAnz.intent)) &&
    !demolEn.test(procedureLabel('anzeige', 'en', dAnz.intent)),
  'anbau anzeige label carries no demolition token (label feeds all 5 surfaces)',
)
// cite-less anzeige verdict must NOT inherit the state demolition § fallback.
const sAnz2 = mkState(PB, [{ key: 'verfahren_indikation', value: 'anzeigepflichtig, formlose Textform' }])
const dAnz2 = resolveProcedure(buildProcedureCase(mkProject(PB, sAnz2), sAnz2))
const demolCit = beseitigungCitationFor('bayern')
ok(
  dAnz2.kind === 'anzeige' && (demolCit === '' || !dAnz2.citation.includes(demolCit)),
  `cite-less anbau anzeige does NOT inherit the demolition § ("${demolCit}"; got "${dAnz2.citation}")`,
)
// Web primary card (the At-a-Glance / .md title source) — no demolition token.
const selAnz = selectProcedures(resolveProcedures(mkProject(PB, sAnz), sAnz).procedures)
ok(
  !demolDe.test(selAnz.primary?.title_de ?? '') && !demolEn.test(selAnz.primary?.title_en ?? ''),
  `web primary card title carries no demolition token (got "${selAnz.primary?.title_de}")`,
)
// T-05 no-over-fix: demolition wording on abbruch is byte-UNCHANGED.
const P5 = { templateId: 'T-05', intent: 'abbruch', bundesland: 'nrw' }
const s5 = mkState(P5, [{ key: 'verfahren_indikation', value: 'anzeigepflichtig — Abbruchanzeige nach § 62 Abs. 3 BauO NRW' }])
const d5 = resolveProcedure(buildProcedureCase(mkProject(P5, s5), s5))
ok(
  d5.kind === 'anzeige' && /Beseitigung/.test(d5.reasoning_de) && /demolition/i.test(d5.reasoning_en),
  'T-05 abbruch anzeige keeps the demolition reasoning (no over-fix)',
)
ok(
  procedureLabel('anzeige', 'de', 'abbruch') === 'Anzeigeverfahren (Abbruchanzeige)' &&
    procedureLabel('anzeige', 'en', 'abbruch') === 'Notification procedure (demolition notice)',
  'T-05 abbruch anzeige label byte-unchanged',
)
// Wiring pins — the surfaces actually pass the decision intent to the label.
const pdfSrc = readFileSync(new URL('../src/features/chat/lib/exportPdf.ts', import.meta.url), 'utf8')
ok(
  /procedureLabel\(procedureDecision\.kind,\s*lang,\s*procedureDecision\.intent\)/.test(pdfSrc),
  'exportPdf S05 + Key Data label call sites pass the decision intent',
)
const rpSrc = readFileSync(new URL('../src/features/result/lib/resolveProcedures.ts', import.meta.url), 'utf8')
ok(
  /procedureLabel\(decision\.kind,\s*'de',\s*decision\.intent\)/.test(rpSrc) &&
    /procedureLabel\(decision\.kind,\s*'en',\s*decision\.intent\)/.test(rpSrc),
  'resolveProcedures web titles pass the decision intent',
)

// ── fix/t07-prewalk item 3 — kenntnisgabe is a FIRST-CLASS verfahren kind
// (the T-05-Sachsen class recurring: BW × T-07 routes qualifying Anbauten via
// § 51 LBO BW Kenntnisgabe, but the classifier had no kenntnisgabe token and
// no decision branch — an obedient persona's verdict fell to the template-
// blind vereinfachtes baseline, contradicting the consultation).
console.log('T-07 — kenntnisgabe first-class kind (fix/t07-prewalk item 3):')
ok(
  classifyVerdictDirection('Kenntnisgabeverfahren nach § 51 LBO BW') === 'kenntnisgabe',
  'classifyVerdictDirection knows kenntnisgabe',
)
const PBW = { templateId: 'T-07', intent: 'anbau', bundesland: 'bw' }
const sKg = mkState(PBW, [
  { key: 'verfahren_indikation', value: 'Kenntnisgabeverfahren nach § 51 LBO BW (qualifizierter Bebauungsplan liegt vor)' },
])
const dKg = resolveProcedure(buildProcedureCase(mkProject(PBW, sKg), sKg))
ok(dKg.kind === 'kenntnisgabe', `BW Kenntnisgabe verdict → kind kenntnisgabe (got ${dKg.kind})`)
ok(/§ 51 LBO BW/.test(dKg.citation), `kenntnisgabe cites § 51 LBO BW (got "${dKg.citation}")`)
ok(dKg.confidence === 'CALCULATED', 'kenntnisgabe verdict honored CALCULATED')
ok(
  !demolDe.test(procedureLabel('kenntnisgabe', 'de', 'anbau')) &&
    /Kenntnisgabe/.test(procedureLabel('kenntnisgabe', 'de', 'anbau')),
  'kenntnisgabe label is the institute name, no demolition token',
)
// Neighbor directions unchanged (no over-fix).
ok(classifyVerdictDirection('anzeigepflichtig nach Art. 57 Abs. 7') === 'anzeige', 'anzeige direction unchanged')
ok(classifyVerdictDirection('verfahrensfrei nach § 61 SächsBO') === 'free', 'free direction unchanged')
ok(classifyVerdictDirection('vereinfachtes Baugenehmigungsverfahren § 64') === 'simplified', 'simplified direction unchanged')
ok(classifyVerdictDirection('Genehmigungsfreistellung nach § 62 SächsBO') === null, 'freistellung stays branch-matched (direction null, unchanged)')

// ── fix/t07-prewalk item 2 — derived-GK Key-Data carve-out extends to T-07.
// An Anbau modifies an EXISTING building and can change the GK via the
// NE-size/count thresholds (a Nutzungseinheit crossing 400 m² flips GK 1/2→3
// or 4→5); the derivation is static math with no pre/post-extension model —
// the same rationale that carved out T-06. Pre-fix gkDerivationCarveOut
// returned null for T-07, so PDF Key Data + At-a-Glance printed a freshly
// derived (plausibly pre-extension) GK. The carve-out is the proven single
// source consumed by both surfaces (pinned in smoke-t06-composer).
console.log('T-07 — derived-GK carve-out (fix/t07-prewalk item 2):')
ok(gkDerivationCarveOut('T-07') === 'extension', `gkDerivationCarveOut('T-07') === 'extension' (got ${gkDerivationCarveOut('T-07')})`)
ok(
  /Anbau/.test(gkCarveOutValue('extension', 'de')) && /extension/i.test(gkCarveOutValue('extension', 'en')),
  'extension carve-out text names the Anbau case in both languages',
)
ok(
  !/Aufstockung|Nutzungsänderung/.test(gkCarveOutValue('extension', 'de')),
  'extension carve-out text is its own, not T-04/T-06 copy',
)
ok(
  gkDerivationCarveOut('T-04') === 'use-conversion' && gkDerivationCarveOut('T-06') === 'storey-addition',
  'T-04/T-06 carve-outs unchanged (no over-fix)',
)
ok(
  gkDerivationCarveOut('T-01') === null && gkDerivationCarveOut('T-03') === null && gkDerivationCarveOut('T-02') === null,
  'T-01/T-02/T-03 still derive normally (no over-fix)',
)

// ── fix/t07-walk1 item 1 — phantom procedure conflict (CLASS-3). The Hessen
// walk 1 PDF flagged "Conflicting procedure signals" on a §65-vs-§65 project:
// the persona's rationale explained the simplified verdict with "Brutto-
// Rauminhalt … übersteigt jede verfahrensfreie Schwelle" / "exceeds any
// verfahrensfreie threshold", and buildProcedureCase RE-classified that full
// title+rationale blob → 'free' while the fact classified 'simplified' →
// false conflict → ASSUMED downgrade. See docs/T07_HESSEN_WALK1_DIAGNOSIS.
console.log('T-07 — phantom procedure conflict (fix/t07-walk1 item 1):')

// 1b — classifyVerdictDirection must not read an EXCEEDED/negated verfahrensfrei
// token as a free verdict (the genehmigungsfrei(?!gestellt) lineage).
ok(classifyVerdictDirection('Brutto-Rauminhalt 144 m³ übersteigt jede verfahrensfreie Schwelle') !== 'free',
  'exceedance DE ("übersteigt … verfahrensfreie Schwelle") is NOT free')
ok(classifyVerdictDirection('Gross volume 144 m³ exceeds any verfahrensfreie threshold') !== 'free',
  'exceedance EN ("exceeds any verfahrensfreie threshold") is NOT free')
ok(classifyVerdictDirection('die verfahrensfreie Grenze wird überschritten') !== 'free',
  'exceedance DE verb-after ("verfahrensfreie Grenze … überschritten") is NOT free')
ok(classifyVerdictDirection('liegt oberhalb der verfahrensfreien Schwelle') !== 'free',
  'exceedance DE ("oberhalb der verfahrensfreien Schwelle") is NOT free')
// no over-fix: a BELOW/within mention and a bare verdict are still free.
ok(classifyVerdictDirection('das Vorhaben liegt unterhalb der verfahrensfreien Schwelle') === 'free',
  'BELOW the threshold ("unterhalb der verfahrensfreien Schwelle") IS still free (no over-fix)')
ok(classifyVerdictDirection('das Vorhaben ist verfahrensfrei nach Art. 57 Abs. 1 Nr. 1 a') === 'free',
  'bare positive verdict ("ist verfahrensfrei nach …") IS still free (no over-fix)')
ok(classifyVerdictDirection('nicht verfahrensfrei') !== 'free',
  'adjacency negation ("nicht verfahrensfrei") still suppressed (preserved)')

// 1a — the conflict must not re-classify the rationale. VERBATIM live case.
const PBW2 = { templateId: 'T-07', intent: 'anbau', bundesland: 'hessen' }
const personaLive = [{
  id: 'p', status: 'erforderlich',
  title_de: 'Vereinfachtes Baugenehmigungsverfahren (§ 65 HBO)',
  title_en: 'Simplified Baugenehmigung procedure (§ 65 HBO)',
  rationale_de: 'Brutto-Rauminhalt 144 m³ übersteigt jede verfahrensfreie Schwelle; kein qualifizierter Bebauungsplan.',
  rationale_en: 'Gross volume 144 m³ exceeds any verfahrensfreie threshold; no qualifying Bebauungsplan.',
  qualifier: { source: 'LEGAL', quality: 'CALCULATED' },
}]
const sLive = mkState(PBW2, [{ key: 'verfahren_indikation', value: 'vereinfachtes Verfahren nach § 65 HBO' }], personaLive)
const pcLive = buildProcedureCase(mkProject(PBW2, sLive), sLive)
const dLive = resolveProcedure(pcLive)
ok(pcLive.verfahren_konflikt === undefined, 'live §65-vs-§65 case: NO verfahren_konflikt set')
ok(dLive.kind === 'vereinfachtes', `live case kind vereinfachtes (got ${dLive.kind})`)
ok(dLive.confidence === 'CALCULATED', `live case confidence CALCULATED, not downgraded (got ${dLive.confidence})`)
ok(!dLive.caveats.some((c) => c.kind === 'verdikt_konflikt'), 'live case: no verdikt_konflikt caveat')

// 1a robustness — a NOVEL exceedance phrasing not in any lexicon must STILL
// produce no conflict (the conflict no longer reads the rationale at all).
const personaNovel = [{
  id: 'p', status: 'erforderlich',
  title_de: 'Vereinfachtes Baugenehmigungsverfahren (§ 65 HBO)',
  title_en: 'Simplified building permit (§ 65 HBO)',
  rationale_de: 'Das Bauvorhaben ist schlicht zu groß, um noch verfahrensfrei bleiben zu können.',
  rationale_en: 'The project is simply far too big to remain verfahrensfrei here.',
  qualifier: { source: 'LEGAL', quality: 'CALCULATED' },
}]
const sNovel = mkState(PBW2, [{ key: 'verfahren_indikation', value: 'vereinfachtes Verfahren nach § 65 HBO' }], personaNovel)
const dNovel = resolveProcedure(buildProcedureCase(mkProject(PBW2, sNovel), sNovel))
ok(!dNovel.caveats.some((c) => c.kind === 'verdikt_konflikt'),
  'NOVEL exceedance phrasing (not in lexicon) still produces NO conflict (rationale never re-classified)')
ok(dNovel.confidence === 'CALCULATED', 'novel-phrasing case stays CALCULATED')

// no over-fix — a GENUINE direction conflict (fact regular vs persona free
// TITLE) must still fire, mirroring smoke-t05-composer:194.
const personaFree = [{
  id: 'pf', status: 'nicht_erforderlich',
  title_de: 'Verfahrensfreier Anbau nach § 61 BbgBO', title_en: 'Permit-free extension under § 61 BbgBO',
  rationale_de: '', rationale_en: '', qualifier: { source: 'LEGAL', quality: 'CALCULATED' },
}]
const sGenuine = mkState({ templateId: 'T-07', intent: 'anbau', bundesland: 'brandenburg' },
  [{ key: 'verfahren_indikation', value: 'reguläres Verfahren nach § 63 BbgBO' }], personaFree)
const dGenuine = resolveProcedure(buildProcedureCase(mkProject({ templateId: 'T-07', intent: 'anbau', bundesland: 'brandenburg' }, sGenuine), sGenuine))
ok(dGenuine.caveats.some((c) => c.kind === 'verdikt_konflikt'),
  'GENUINE regular-vs-free conflict still FIRES (no over-fix)')

finish('smoke-t07-composer', t)
