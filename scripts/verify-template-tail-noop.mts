// ───────────────────────────────────────────────────────────────────────
// verify:template-tail-noop — Bucket B0 regression guard.
//
// Asserts that for every (templateId, bundesland) pair, the resolver
// returns BLOCKS[templateId] BYTE-IDENTICAL to today, EXCEPT for cells
// explicitly listed in ACKNOWLEDGED_OVERRIDES. This pins the B0 "build
// rails without changing output" invariant against future drift, AND
// requires Bucket B authors to explicitly acknowledge each newly-filled
// (template × state) cell — preventing accidental silent additions of
// authored content.
//
// Boundary: this gate covers Block 2 of the multi-block prompt array
// (the per-template tail). Bayern SHA covers Block 1 (the bundesland-
// keyed prefix). Together they pin the full prompt against drift.
//
// HOW TO ADD A VERIFIED OVERRIDE (Bucket B proper):
//   1. Replace the (T, bundesland) cell's `null` in
//      src/legal/templates/stateOverrides.ts with the verified addendum.
//   2. Add the matching key (`<T>:<bundesland>`) to ACKNOWLEDGED_OVERRIDES
//      below.
//   3. Re-run `npm run prebuild` — gate should be green.
// ───────────────────────────────────────────────────────────────────────

import { BLOCKS, getTemplateBlock } from '../src/legal/templates/index.ts'
import { listRegisteredStates } from '../src/legal/legalRegistry.ts'
import type { TemplateId } from '../src/types/projectState.ts'

// Append `<T>:<bundesland>` (e.g. `'T-02:nrw'`) when a content author
// fills a verified state-specific addendum.
const ACKNOWLEDGED_OVERRIDES: ReadonlySet<string> = new Set<string>([
  // B2 batch 1 — NRW × T-02..T-08 authored 2026-05-28. §§ verified via
  // verify:template-tail-citations against corpus (primary-source tier
  // for NRW; federal verified for BauGB/BauNVO/GEG).
  'T-02:nrw',
  'T-03:nrw',
  'T-04:nrw',
  'T-05:nrw',
  'T-06:nrw',
  'T-07:nrw',
  'T-08:nrw',
  // B2 batch 2 — NI × T-02..T-08 authored 2026-05-28. §§ verified
  // (mirror-tier NBauO; cited via baunormenlexikon.de + voris).
  // Mirror-tier discipline applied: § 62 cited as "sonstige genehmigungs-
  // freie" per heading (NOT "Genehmigungsfreistellung" institute); § 79
  // intentionally omitted from T-05 (heading is enforcement, not owner-
  // initiated demolition).
  'T-02:niedersachsen',
  'T-03:niedersachsen',
  'T-04:niedersachsen',
  'T-05:niedersachsen',
  'T-06:niedersachsen',
  'T-07:niedersachsen',
  'T-08:niedersachsen',
  // B2 batch 3 — BW × T-02..T-08 authored 2026-05-28. §§ verified
  // (mirror-tier LBO; baunormenlexikon.de + dejure.org). Mirror-tier
  // discipline applied: § 51 Kenntnisgabeverfahren cited as the named
  // BW-specific institute (corpus confirms heading + gloss); § 65
  // intentionally omitted from T-04/T-05 (heading is enforcement, not
  // owner-initiated procedure); § 73a intentionally omitted from client-
  // facing prose (heading is admin meta on Technische Baubestimmungen,
  // not substantive Nachweis-§); § 27f + § 28d cited as narrow
  // substantive Anforderungen for specific Eingriffs-Tatbestände.
  'T-02:bw',
  'T-03:bw',
  'T-04:bw',
  'T-05:bw',
  'T-06:bw',
  'T-07:bw',
  'T-08:bw',
  // B2 batch 4 — Hessen × T-02..T-08 authored 2026-05-28. §§ verified
  // (mirror-tier HBO; baunormenlexikon.de). Mirror-tier discipline:
  // § 64a Erweiterte Genehmigungsfreistellung für Wohngebäude cited as
  // named institute (corpus confirms); § 63a (Abbruch/Beseitigung) cited
  // as owner-side Anker for T-05; § 82 (Nutzungsverbot/Beseitigungs-
  // anordnung) intentionally omitted (heading is enforcement); § 92
  // (Frist Umnutzung ex-Land-/Forstwirtschaft) cited only with narrow
  // explicit scope. § 14 cited alone for brandschutz (corpus tags only
  // § 14 for HBO brandschutz archetype — not the multi-§ pattern of
  // NRW/NI/BW). § 68 substantive Nachweis-§ (unlike BW § 73a admin-meta).
  'T-02:hessen',
  'T-03:hessen',
  'T-04:hessen',
  'T-05:hessen',
  'T-06:hessen',
  'T-07:hessen',
  'T-08:hessen',
  // C1 batch — Berlin × T-01..T-08 authored 2026-05-28. §§ verified
  // (mirror-tier BauO Bln; baunormenlexikon.de). Path 2'' discipline:
  // cells authored from corpus, banner STAYS ON (systemBlock untouched).
  // Stadtstaat framing: Bauaufsicht beim Bezirksamt + LDA + Untere
  // Denkmalschutzbehörde. § 80 (Beseitigung/Nutzungsuntersagung)
  // omitted from T-05 (enforcement, same discipline as NI § 79).
  // § 14 + § 26 cited for brandschutz (only those two tagged in corpus).
  'T-01:berlin',
  'T-02:berlin',
  'T-03:berlin',
  'T-04:berlin',
  'T-05:berlin',
  'T-06:berlin',
  'T-07:berlin',
  'T-08:berlin',
  // C2 batch — Hamburg × T-01..T-08 authored 2026-05-28. §§ verified
  // (mirror-tier HBauO; baunormenlexikon.de; HBauO-Fassung 06.01.2025).
  // Path 2'' discipline: cells authored from corpus, banner STAYS ON
  // (systemBlock untouched). Stadtstaat framing: Bauaufsicht beim
  // Bezirksamt + Denkmalschutzamt Hamburg. § 80 (Beseitigung/Nutzungs-
  // untersagung/Anpassung) omitted from T-05 (enforcement, same
  // discipline as Berlin § 80). § 14+26+30+33 brandschutz spread
  // (all four tagged in HBauO, unlike Berlin's two).
  'T-01:hamburg',
  'T-02:hamburg',
  'T-03:hamburg',
  'T-04:hamburg',
  'T-05:hamburg',
  'T-06:hamburg',
  'T-07:hamburg',
  'T-08:hamburg',
  // C3 batch — Bremen × T-01..T-08 authored 2026-05-28. §§ verified
  // (mirror-tier BremLBO; baunormenlexikon.de; Neufassung 29.05.2024 /
  // Brem.GBl. S. 380). Path 2'' discipline: cells authored from corpus,
  // banner STAYS ON (systemBlock untouched). Stadtstaat framing: 2 Stadt-
  // gemeinden (Bremen + Bremerhaven) je eigenes Bauordnungsamt; 1 Land.
  // Denkmal: Landesamt für Denkmalpflege Bremen (LfD) + untere Behörde
  // der Stadtgemeinde. § 79 (Beseitigung/Nutzungsuntersagung) omitted
  // from T-05 (enforcement — Bremen's § 80 is "Bauüberwachung" not
  // enforcement, so the enforcement § here is § 79, same heading-discipline
  // as NI § 79). § 14+26+30+33 brandschutz spread (all four tagged in
  // BremLBO, same depth as Hamburg).
  'T-01:bremen',
  'T-02:bremen',
  'T-03:bremen',
  'T-04:bremen',
  'T-05:bremen',
  'T-06:bremen',
  'T-07:bremen',
  'T-08:bremen',
  // C4 batch — Sachsen × T-01..T-08 authored 2026-05-28. §§ verified
  // (mirror-tier SächsBO; baunormenlexikon.de + revosax.sachsen.de;
  // SächsBO i.d.F. Gesetz v. 01.03.2024 SächsGVBl. S. 169). First
  // Flächenland. Path 2'' discipline: cells authored from corpus, banner
  // STAYS ON (systemBlock untouched). Flächenland authority framing:
  // 3 kreisfreie Städte (Leipzig/Dresden/Chemnitz) + 10 Landkreise; untere
  // Bauaufsichtsbehörde je nach Standort bei Stadt-Bauaufsicht bzw.
  // Landratsamt (NOT Stadtstaat Bezirksamt). § 80 (Beseitigung/Nutzungs-
  // untersagung) omitted from T-05 (classic enforcement, same discipline
  // as Berlin/Hamburg § 80). § 79 (Einstellung von Arbeiten) and § 81
  // (Bauüberwachung) also omitted from cells (admin/enforcement-adjacent).
  // § 88a (Technische Baubestimmungen) omitted (admin meta, BW § 73a
  // precedent). 4-§ brandschutz spread (§ 14 + § 26 + § 30 + § 33) —
  // heading-evident citation, NOT HBO § 14-alone precedent (HBO's § 26 =
  // Zertifizierung, structurally different). Corpus archetype-tagging
  // under-tags brandschutz for SächsBO (only § 14 tagged); recommend
  // future re-tag for § 26/30/33. v1.0.30 Leipzig T-04 walk confirms
  // § 33 SächsBO Rettungsweg as real persona citation.
  'T-01:sachsen',
  'T-02:sachsen',
  'T-03:sachsen',
  'T-04:sachsen',
  'T-05:sachsen',
  'T-06:sachsen',
  'T-07:sachsen',
  'T-08:sachsen',
])

interface Violation {
  template: TemplateId
  bundesland: string
  detail: string
}

const violations: Violation[] = []
let cellsChecked = 0
let baseChecksOk = 0

const templates = Object.keys(BLOCKS) as TemplateId[]
const states = listRegisteredStates()

// Control: getTemplateBlock(T) with no bundesland must equal BLOCKS[T].
for (const t of templates) {
  const base = BLOCKS[t]
  const noBundesland = getTemplateBlock(t)
  if (noBundesland !== base) {
    violations.push({
      template: t,
      bundesland: '(no-bundesland)',
      detail: 'getTemplateBlock(T) without bundesland diverges from BLOCKS[T]',
    })
  } else {
    baseChecksOk++
  }
}

// Per-cell: for every (T, bundesland), the resolver must return BLOCKS[T]
// unless the cell is in ACKNOWLEDGED_OVERRIDES.
for (const t of templates) {
  const base = BLOCKS[t]
  for (const b of states) {
    cellsChecked++
    const resolved = getTemplateBlock(t, b)
    if (resolved === base) continue
    const key = `${t}:${b}`
    if (ACKNOWLEDGED_OVERRIDES.has(key)) continue
    violations.push({
      template: t,
      bundesland: b,
      detail: `resolver returned ${resolved.length} chars vs BLOCKS[T] ${base.length} chars; cell ${key} not in ACKNOWLEDGED_OVERRIDES`,
    })
  }
}

if (violations.length > 0) {
  console.error('[verify:template-tail-noop] FAIL — unacknowledged state override drift:')
  console.error('')
  for (const v of violations) {
    console.error(`  ${v.template} × ${v.bundesland}`)
    console.error(`    ${v.detail}`)
    console.error('')
  }
  console.error('Fix:')
  console.error('  • Either remove the override from src/legal/templates/stateOverrides.ts,')
  console.error('  • Or add the (template, state) key to ACKNOWLEDGED_OVERRIDES in this gate')
  console.error('    after verifying the addendum cites only §§ from primary-source review.')
  process.exit(1)
}

console.log(
  `[verify:template-tail-noop] OK — ${baseChecksOk}/${templates.length} no-bundesland controls + ` +
    `${cellsChecked} (template × state) cells verified byte-identical to BLOCKS[T].`,
)
console.log(`  Acknowledged authored overrides: ${ACKNOWLEDGED_OVERRIDES.size}`)
