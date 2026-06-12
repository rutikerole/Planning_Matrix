#!/usr/bin/env -S npx tsx
// T-05 sprint Phase 2.5-B — T-06 (Aufstockung) composer-parity gate.
// THE audit headline: T-06 had NO intent branch and rendered "Standard
// building permit … ASSUMED" on every state (masking default + web split).
import { makeOk, finish, assertBaseline, assertFlip, mkProject, mkState, type Tally } from './lib/composerParity.mts'
import { buildProcedureCase, resolveProcedure } from '../src/legal/resolveProcedure.ts'
import { deriveGebaeudeklasse, gkDerivationCarveOut, isExplicitKlasseFactKey } from '../src/legal/deriveGebaeudeklasse.ts'
import { composeDoNext } from '../src/features/result/lib/composeDoNext.ts'
import { deriveBaselineRoles } from '../src/features/result/lib/deriveBaselineRoles.ts'
import { buildExportMarkdown } from '../src/lib/export/exportMarkdown.ts'
import { aggregateQualifiers } from '../src/features/result/lib/qualifierAggregate.ts'
import { computeOpenItems } from '../src/features/result/lib/computeOpenItems.ts'
import { readFile as readFileFs } from 'node:fs/promises'
const readFile = (p: string) => readFileFs(p, 'utf8')

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

// ── fix/t06-walk1 — BW/Stuttgart walk-1 regression pins ────────────────────
// Walk evidence (storey-addition-schwabstra-e-2026-06-11.md): the persona
// re-minted the same action under two fresh ids across rounds, so "Commission
// a structural engineer …" occupied top-3 slots 1 AND 2 (composeDoNext's
// dedupe was id-only). Pin the EXACT walk pair: post-fix exactly ONE
// structural-engineer item survives (the richer-rationale one), and
// non-duplicates are never dropped.
console.log('T-06 — walk-1: recommendation semantic dedup (composeDoNext):')
const walkRecs = [
  {
    id: 'rec-walk-bestandsstatik', rank: 1,
    title_de: 'Tragwerksplaner:in für die Bestandsstatik beauftragen',
    title_en: 'Commission a structural engineer for the Bestandsstatik',
    detail_de: 'Lastreserven der Bestandsdecken (Baujahr 1957) prüfen.',
    detail_en: 'A structural engineer assesses the load reserves of the existing floors (built 1957).',
  },
  {
    id: 'rec-walk-bestandsaufnahme', rank: 2,
    title_de: 'Tragwerksplaner:in für die Bestandsaufnahme beauftragen',
    title_en: 'Commission a structural engineer for the existing building survey',
    detail_de: 'Ortsbesichtigung und statische Berechnung der Deckentragfähigkeit (Gebäude von 1957). Ohne statische Bewertung kann kein Bauantrag eingereicht werden.',
    detail_en: 'On-site inspection and structural calculation of ceiling load capacity (building from 1957). Existing archive plans can serve as a starting point; no Bauantrag can be submitted without a structural assessment.',
  },
  {
    id: 'rec-walk-bplan', rank: 3,
    title_de: 'Bebauungsplan beim Stadtplanungsamt Stuttgart anfragen',
    title_en: 'Enquire about the Bebauungsplan at Stuttgart city planning office',
    detail_de: 'Klären, ob ein B-Plan die zulässige Geschosszahl festschreibt.',
    detail_en: 'Establish whether a Bebauungsplan fixes the permissible number of storeys.',
  },
]
const walkProject = { id: 'walk1', name: 'Walk 1', plot_address: 'Schwabstraße 71', bundesland: 'bw', intent: 'aufstockung', template_id: 'T-06', status: 'in_progress' } as never
const walkState = { templateId: 'T-06', facts: [], procedures: [], documents: [], roles: [], recommendations: walkRecs } as never
const doNext = composeDoNext({ project: walkProject, state: walkState, lang: 'en' })
const structuralItems = doNext.filter((i) => /structural engineer|tragwerksplaner/i.test(i.title))
ok(structuralItems.length === 1, `walk-1 dup pair dedupes to ONE structural-engineer item (got ${structuralItems.length})`)
ok(/existing building survey/i.test(structuralItems[0]?.title ?? ''), 'the richer-rationale duplicate survives (building survey, not the thin Bestandsstatik rec)')
ok(doNext[0] === structuralItems[0], 'survivor keeps the duplicate group’s best slot (slot 1)')
ok(doNext.some((i) => /bebauungsplan/i.test(i.title)), 'non-duplicate rec (Bebauungsplan enquiry) is never dropped')
// Non-dup control: same action stem, DIFFERENT actor → both survive.
const controlState = { templateId: 'T-06', facts: [], procedures: [], documents: [], roles: [], recommendations: [
  { ...walkRecs[0] },
  { id: 'rec-walk-energie', rank: 2, title_de: 'Energieberater:in beauftragen', title_en: 'Commission an energy consultant', detail_de: 'GEG-Nachweis.', detail_en: 'GEG certificate.' },
] } as never
const doNextControl = composeDoNext({ project: walkProject, state: controlState, lang: 'en' })
ok(
  doNextControl.filter((i) => /structural engineer|energy consultant/i.test(i.title)).length === 2,
  'same action stem + different actor is NOT a duplicate (both recs survive)',
)

// Walk evidence: Team card Surveyor rationale read "mandatory for new builds"
// on a storey addition (NEW_BUILD_ROLES shared text). Rationale is now
// Bestand-aware at the factory (covers T-07 Anbau too); neubau keeps the
// original text byte-identical (both directions pinned → non-vacuous).
console.log('T-06 — walk-1: Bestand-aware Surveyor rationale (deriveBaselineRoles):')
const vermesserAuf = deriveBaselineRoles({ intent: 'aufstockung', bundesland: 'bw' }).find((r) => r.id === 'R-Vermesser')
ok(!!vermesserAuf && !/new builds/i.test(vermesserAuf.rationale_en) && !/Neubauten/.test(vermesserAuf.rationale_de),
  'aufstockung Surveyor rationale no longer claims "new builds"/"Neubauten"')
ok(!!vermesserAuf && /permit application/i.test(vermesserAuf!.rationale_en) && /Bauantrag/.test(vermesserAuf!.rationale_de),
  'aufstockung Surveyor rationale is Bauantrag-framed (Bestand-appropriate)')
const vermesserAnbau = deriveBaselineRoles({ intent: 'anbau', bundesland: 'bw' }).find((r) => r.id === 'R-Vermesser')
ok(!!vermesserAnbau && !/Neubauten/.test(vermesserAnbau.rationale_de), 'anbau (T-07) gets the Bestand variant too — rationale-layer fix, not a T-06 string patch')
const vermesserNeu = deriveBaselineRoles({ intent: 'neubau_einfamilienhaus', bundesland: 'bw' }).find((r) => r.id === 'R-Vermesser')
ok(!!vermesserNeu && /Neubauten/.test(vermesserNeu.rationale_de) && /new builds/i.test(vermesserNeu.rationale_en),
  'neubau Surveyor rationale unchanged (variant did not leak)')

// Walk evidence: the free-form transition fact `gk_sprung` ("GK 2/3 auf
// GK 4") matched the old inline `gk_` prefix regexes — suppressing the PDF
// derived-GK row and eligible to render AS the class on At-a-Glance. The
// predicate is now single-sourced (isExplicitKlasseFactKey) for both
// surfaces: transition keys are NOT class-bearing; canonical class keys are.
console.log('T-06 — walk-1: gk_sprung is not a class-bearing key (isExplicitKlasseFactKey):')
ok(isExplicitKlasseFactKey('gk_sprung') === false, 'gk_sprung alone does NOT suppress the derived-GK row')
ok(isExplicitKlasseFactKey('gebaeudeklasse'), 'canonical gebaeudeklasse stays class-bearing')
ok(isExplicitKlasseFactKey('gebaeudeklasse_geplant') && isExplicitKlasseFactKey('geb_klasse'), 'gebaeudeklasse_geplant / geb_klasse stay class-bearing')
ok(isExplicitKlasseFactKey('gk_geplant') && isExplicitKlasseFactKey('klasse'), 'gk_geplant / klasse stay class-bearing')
ok(isExplicitKlasseFactKey('kenntnisgabeverfahren_anwendbar') === false, 'unrelated walk-1 free-form key is not class-bearing (control)')

// ── fix/t06-walk2 — Thüringen/Jena walk-2 regression pins ──────────────────
// Walk evidence (storey-addition-wagnergasse-2026-06-12 PDF/.md): FOUR
// duplicate structural-engineer recs (Section VIII items 01/02/04/06)
// because the PDF Section VIII + Executive AND the .md Top-3 raw-sort
// state.recommendations (no dedup), and the walk-1 verb lexicon was an
// open set ("Appoint"/"bestellen" not enumerated). Class fix: ONE shared
// resolveRecommendations selector (actor+TOPIC discrimination) consumed by
// every surface. Plus: abbruch_typ (a T-05 contract key) leaked onto T-06
// and rendered on five surfaces; plot.outside_munich_acknowledged leaked
// into the .md Eckdaten + quality denominator (isSystemFlagKey existed but
// only the PDF consumed it).
const Q = { source: 'LEGAL', quality: 'CALCULATED', setAt: 'x', setBy: 'system' }
const walk2Recs = [
  { id: 'r1', rank: 1, title_en: 'Engage a structural engineer for existing-building assessment', title_de: 'Tragwerksplaner:in zur Bestandsbewertung hinzuziehen', detail_en: 'Commission a structural engineer registered in Thuringia to assess the load-bearing capacity of the existing floors and walls (building from 1955). Legal basis: § 72 ThürBO.', detail_de: 'Lastreserven prüfen. § 72 ThürBO.' },
  { id: 'r2', rank: 2, title_en: 'Appoint a structural engineer to assess the existing structure', title_de: 'Tragwerksplaner:in zur Bewertung des Bestands bestellen', detail_en: 'Appoint a structural engineer registered in Thuringia. Contact: Kammer der Ingenieure Thüringen (KIT).', detail_de: 'Kammer der Ingenieure Thüringen (KIT).' },
  { id: 'r3', rank: 3, title_en: 'Clarify second means of escape — contact Feuerwehr Jena and Bauamt', title_de: 'Zweiten Rettungsweg klären — Feuerwehr Jena und Bauamt kontaktieren', detail_en: 'Have the fire brigade confirm ladder reach. § 36 ThürBO.', detail_de: 'Anleiterbarkeit bestätigen lassen. § 36 ThürBO.' },
  { id: 'r4', rank: 4, title_en: 'Commission a structural engineer for existing-building assessment', title_de: 'Tragwerksplaner:in für die Bestandsaufnahme beauftragen', detail_en: 'A structural assessment of the existing floors and walls (built 1955) is mandatory under § 72 ThürBO before any permit application. Use the Kammer der Ingenieure Thüringen (KIT) register.', detail_de: 'Statische Bewertung zwingend nach § 72 ThürBO; KIT-Verzeichnis nutzen.' },
  { id: 'r5', rank: 5, title_en: 'Clarify parking space obligation with Bauamt Jena', title_de: 'Stellplatzpflicht beim Bauamt Jena klären', detail_en: 'Ask Bauamt Jena whether additional parking spaces are required under § 52 ThürBO.', detail_de: 'Stellplatzfrage nach § 52 ThürBO klären.' },
  { id: 'r6', rank: 6, title_en: 'Engage a structural engineer for existing-building assessment', title_de: 'Tragwerksplaner:in mit Erfahrung im Nachkriegsbestand einschalten', detail_en: 'Engage a structural engineer experienced in post-war building stock. KIT maintains a public register at kit-ht.de.', detail_de: 'Nachkriegsbestand-Erfahrung; KIT-Register.' },
]
const isStructural = (s: string) => /structural engineer|tragwerksplaner/i.test(s)
const w2Project = (recs: unknown[], facts: unknown[] = []) => ({
  id: 'w2', name: 'Storey addition Wagnergasse', plot_address: 'Wagnergasse 25, 07743 Jena',
  intent: 'aufstockung', bundesland: 'thueringen', template_id: 'T-06', status: 'in_progress',
  created_at: '2026-06-12T00:00:00Z',
  state: { templateId: 'T-06', facts, procedures: [], documents: [], roles: [], recommendations: recs },
}) as never

console.log('T-06 — walk-2: shared recommendations selector (the 01/02/04/06 dup set):')
const w2State = { templateId: 'T-06', facts: [], procedures: [], documents: [], roles: [], recommendations: walk2Recs } as never
const w2DoNext = composeDoNext({ project: w2Project(walk2Recs), state: w2State, lang: 'en' })
ok(w2DoNext.filter((i) => isStructural(i.title)).length === 1, `walk-2 verbatim 4-dup set → ONE structural item on the card (got ${w2DoNext.filter((i) => isStructural(i.title)).length})`)
const w2Md = buildExportMarkdown({ project: w2Project(walk2Recs), events: [], lang: 'en' })
const w2MdTop = w2Md.split('## Top 3')[1]?.split('---')[0] ?? ''
ok((w2MdTop.match(/structural engineer/gi) ?? []).length <= 2, '.md Top-3 carries ONE structural rec (title+detail), not the raw rank-1+rank-2 dup pair')
ok(/escape|Rettungsweg/i.test(w2MdTop) && /parking|Stellplatz/i.test(w2MdTop), '.md Top-3 backfills with the genuine non-duplicates (escape + parking)')
// Novel-verb pair — in NO lexicon, must still collapse (topic+actor, not verbs).
const novelRecs = [
  { id: 'n1', rank: 1, title_en: 'Retain a structural engineer to review the load-bearing structure', title_de: 'Tragwerksplaner:in zur Prüfung der Tragstruktur gewinnen', detail_en: 'Short.', detail_de: 'Kurz.' },
  { id: 'n2', rank: 2, title_en: 'Bring in a structural engineer for the existing floors', title_de: 'Tragwerksplaner:in für die Bestandsdecken einbeziehen', detail_en: 'Much richer rationale with all the load-bearing detail the bauherr needs.', detail_de: 'Reichere Begründung.' },
  { id: 'n3', rank: 3, title_en: 'Clarify parking space obligation with Bauamt Jena', title_de: 'Stellplatzpflicht beim Bauamt klären', detail_en: 'Distinct topic.', detail_de: 'Anderes Thema.' },
]
const novelOut = composeDoNext({ project: w2Project(novelRecs), state: { templateId: 'T-06', facts: [], procedures: [], documents: [], roles: [], recommendations: novelRecs } as never, lang: 'en' })
ok(novelOut.filter((i) => isStructural(i.title)).length === 1, `NOVEL verbs (Retain/Bring in/gewinnen/einbeziehen) still collapse — topic axis, not verb lexicon (got ${novelOut.filter((i) => isStructural(i.title)).length})`)
ok(novelOut.some((i) => /parking|Stellplatz/i.test(i.title)), 'distinct topic survives the novel-verb dedup (never drop non-duplicates)')
// Cross-surface: PDF Section VIII + Executive must consume the SAME selector
// (source pin — the raw `state.recommendations` sort is the CLASS-1 split).
const exportPdfSrcW2 = await readFile('src/features/chat/lib/exportPdf.ts')
const exportMdSrcW2 = await readFile('src/lib/export/exportMarkdown.ts')
ok(/resolveRecommendations\(/.test(exportPdfSrcW2) && !/state\.recommendations \?\? \[\]\)\s*\n?\s*\.slice\(\)\s*\n?\s*\.sort/.test(exportPdfSrcW2), 'exportPdf Section VIII + Executive consume resolveRecommendations (no raw rank-sort)')
ok(/resolveRecommendations\(/.test(exportMdSrcW2), '.md Top-3 consumes resolveRecommendations (no raw rank-sort)')

console.log('T-06 — walk-2: abbruch_typ template-foreign quarantine:')
const foreignFacts = [
  { key: 'abbruch_typ', value: 'teilabbruch', qualifier: { ...Q, quality: 'ASSUMED' } },
  { key: 'baujahr', value: 1955, qualifier: { ...Q, quality: 'DECIDED', source: 'CLIENT' } },
]
const mdForeign = buildExportMarkdown({ project: w2Project([], foreignFacts), events: [], lang: 'en' })
ok(!/abbruch/i.test(mdForeign.split('## Key data')[1] ?? mdForeign), 'T-06 .md Eckdaten suppresses the T-05 contract key abbruch_typ')
const aggT06 = aggregateQualifiers({ templateId: 'T-06', facts: foreignFacts } as never)
ok(aggT06.total === 1, `T-06 quality denominator excludes the foreign key (got total ${aggT06.total}, want 1)`)
const openT06 = computeOpenItems({ templateId: 'T-06', facts: foreignFacts } as never, 'en', 4, 'thueringen')
ok(!openT06.topPriority.some((i) => /abbruch/i.test(i.label)) && !openT06.topPriority.some((i) => /abbruch/i.test(i.id)), 'T-06 verify-with-architect/exec flags exclude abbruch_typ')
// Control — same key on T-05 renders + counts normally.
const aggT05 = aggregateQualifiers({ templateId: 'T-05', facts: foreignFacts } as never)
ok(aggT05.total === 2, `T-05 keeps abbruch_typ in the denominator (got total ${aggT05.total}, want 2)`)
const mdT05 = buildExportMarkdown({ project: { ...(w2Project([], foreignFacts) as Record<string, unknown>), intent: 'abbruch', template_id: 'T-05', state: { templateId: 'T-05', facts: foreignFacts, procedures: [], documents: [], roles: [], recommendations: [] } } as never, events: [], lang: 'en' })
ok(/abbruch/i.test(mdT05.split(/## Key data|## Eckdaten/)[1] ?? ''), 'T-05 .md still renders abbruch_typ (quarantine is template-scoped, not a blanket hide)')

console.log('T-06 — walk-2: internal system-flag suppression on the remaining surfaces:')
const internalFacts = [
  { key: 'plot.outside_munich_acknowledged', value: true, qualifier: { ...Q, quality: 'DECIDED', source: 'CLIENT' } },
  { key: 'baujahr', value: 1955, qualifier: { ...Q, quality: 'DECIDED', source: 'CLIENT' } },
]
const mdInternal = buildExportMarkdown({ project: w2Project([], internalFacts), events: [], lang: 'en' })
ok(!/outside.?munich|acknowledged/i.test(mdInternal), '.md never renders plot.outside_munich_acknowledged (PDF was already clean — v1.0.23 isSystemFlagKey)')
const aggInternal = aggregateQualifiers({ templateId: 'T-06', facts: internalFacts } as never)
ok(aggInternal.total === 1, `quality denominator excludes system flags (got total ${aggInternal.total}, want 1)`)

finish('smoke-t06-composer', t)
