// ───────────────────────────────────────────────────────────────────────
// v1.0.26 (C11) — 16-state PDF smoke MATRIX.
//
// A broader sibling to scripts/smoke-pdf-text.mts (which stays the
// narrower NRW + 2-stub gate; this file does NOT modify it). The matrix
// renders one plain-residential T-01 fixture per Bundesland — all 16 —
// through the SAME buildExportPdf pipeline and asserts per-state
// invariants:
//
//   UNIVERSAL (every cell, both locales):
//     • no fabricated "§ NN BauO {UPPERCASE-SLUG}" citation — the Bug 26
//       regression guard, generalized to all 16 states. NRW is the ONE
//       legitimate "BauO {CODE}" (its real code IS "BauO NRW"), so the
//       guard carves NRW out via negative-lookahead; every other slug
//       uppercased after "BauO " is a fabrication.
//     • no uppercased-registry-slug fabrication (explicit alternation).
//     • no Bayern-leak token in a NON-Bayern PDF (Schwabing / BLfD /
//       BayBO / BayDSchG / München authority names / München|Munich —
//       the last also catches a Bug 27 calendar leak).
//     • DE+EN parity: core section headers present in BOTH locales; EN
//       text not collapsed to blanks relative to DE.
//     • no ligature corruption (Bug 22/43 guard, generalized).
//     • page count ≥ an empirically-derived cohort floor (Decision 2 —
//       NOT coupled ±2 to the T-03-verified Bayern cell).
//
//   PER-TIER (tier read from the localization pack, not hardcoded):
//     • SUBSTANTIVE (pack regular.citation non-empty: bayern/nrw/bw/
//       hessen/niedersachsen) → PDF MUST carry the state's real
//       Bauordnung code bound to a §/Art. anchor.
//     • STUB (pack regular.citation empty: the other 11) → PDF MUST
//       carry honest "in Vorbereitung"/"being finalized" framing and
//       NO "BauO {anything}" fabrication.
//     • STADTSTAAT (berlin/hamburg/bremen) → as stub, PLUS the
//       cityBlock=null render path must not throw (any render throw is
//       a cell failure).
//
// The Bayern cell uses bayern-t03-verified.json (canonical smoke
// fixture; T-03 Sanierung, verified) and gets the POSITIVE Bayern-leak
// check (BayBO MUST be present — it is the legitimate leak source).
//
// Exit 0 if all 16 cells pass, 1 if any fail. Failure detail → stderr.
// ───────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// ─── Vite env shim (mirrors smoke-pdf-text.mts; Node has no import.meta.env) ──
declare global {
  // eslint-disable-next-line no-var
  var __viteEnvShim: boolean
}
if (!globalThis.__viteEnvShim) {
  // @ts-expect-error — augmenting Node's import.meta with Vite's env
  ;(import.meta as { env?: object }).env = { DEV: false, PROD: false, MODE: 'test' }
  globalThis.__viteEnvShim = true
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = join(__dirname, '..')

// ─── Node font loader + fetch shim ──────────────────────────────────
// Duplicated from smoke-pdf-text.mts on purpose: that file is the locked
// narrower gate and must stay untouched, so the shared seam is copied
// rather than refactored into an import that would modify it.
let shimmedFetch = false
function shimFetch(): void {
  const originalFetch = (globalThis as { fetch?: typeof fetch }).fetch
  ;(globalThis as { fetch: unknown }).fetch = async (
    url: string | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const urlStr = typeof url === 'string' ? url : url.toString()
    if (urlStr.startsWith('/fonts/') || urlStr.startsWith('fonts/')) {
      const rel = urlStr.replace(/^\//, '')
      try {
        const buf = readFileSync(join(REPO_ROOT, 'public', rel))
        return new Response(new Uint8Array(buf), {
          status: 200,
          headers: { 'content-type': 'font/ttf' },
        })
      } catch {
        return new Response(null, { status: 404 })
      }
    }
    if (originalFetch) return originalFetch(url, init)
    return new Response(null, { status: 404 })
  }
  shimmedFetch = true
}

async function renderFixturePdf(lang: 'en' | 'de', fixtureFile: string): Promise<Uint8Array> {
  const fixturePath = join(REPO_ROOT, fixtureFile)
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'))
  if (typeof (globalThis as { fetch?: unknown }).fetch === 'undefined' || !shimmedFetch) {
    shimFetch()
  }
  const { buildExportPdf } = await import('../src/features/chat/lib/exportPdf.ts')
  return await buildExportPdf({
    project: fixture.project,
    messages: fixture.messages,
    events: fixture.events,
    lang,
    bauherrName: 'Test Bauherr',
  })
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { createRequire } = await import('node:module')
  const require = createRequire(import.meta.url)
  const { PDFParse } = require('pdf-parse')
  const parser = new PDFParse({ data: Buffer.from(bytes) })
  const result = await parser.getText()
  return result.text as string
}

async function pageCount(bytes: Uint8Array): Promise<number> {
  const { PDFDocument } = await import('pdf-lib')
  const doc = await PDFDocument.load(bytes)
  return doc.getPageCount()
}

// ─── Matrix definition ──────────────────────────────────────────────
type Slug =
  | 'bayern' | 'nrw' | 'bw' | 'hessen' | 'niedersachsen'
  | 'sachsen' | 'brandenburg' | 'thueringen' | 'sachsen-anhalt'
  | 'rlp' | 'saarland' | 'sh' | 'mv'
  | 'berlin' | 'hamburg' | 'bremen'

interface Cell {
  slug: Slug
  file: string
  /** Stadtstaat cells get the explicit no-crash emphasis in reporting. */
  stadtstaat?: boolean
}

const CELLS: Cell[] = [
  { slug: 'bayern', file: 'test/fixtures/bayern-t03-verified.json' },
  { slug: 'nrw', file: 'test/fixtures/nrw-t01-duesseldorf-plain.json' },
  { slug: 'bw', file: 'test/fixtures/bw-t01-stuttgart-plain.json' },
  { slug: 'hessen', file: 'test/fixtures/hessen-t01-frankfurt-plain.json' },
  { slug: 'niedersachsen', file: 'test/fixtures/niedersachsen-t01-hannover-plain.json' },
  { slug: 'sachsen', file: 'test/fixtures/sachsen-t01-leipzig.json' },
  { slug: 'brandenburg', file: 'test/fixtures/brandenburg-t01-potsdam.json' },
  { slug: 'thueringen', file: 'test/fixtures/thueringen-t01-erfurt-plain.json' },
  { slug: 'sachsen-anhalt', file: 'test/fixtures/sachsen-anhalt-t01-magdeburg-plain.json' },
  { slug: 'rlp', file: 'test/fixtures/rheinland-pfalz-t01-mainz-plain.json' },
  { slug: 'saarland', file: 'test/fixtures/saarland-t01-saarbruecken-plain.json' },
  { slug: 'sh', file: 'test/fixtures/schleswig-holstein-t01-kiel-plain.json' },
  { slug: 'mv', file: 'test/fixtures/mecklenburg-vorpommern-t01-schwerin-plain.json' },
  { slug: 'berlin', file: 'test/fixtures/berlin-t01-suburb-plain.json', stadtstaat: true },
  { slug: 'hamburg', file: 'test/fixtures/hamburg-t01-suburb-plain.json', stadtstaat: true },
  { slug: 'bremen', file: 'test/fixtures/bremen-t01-suburb-plain.json', stadtstaat: true },
]

// ─── Assertion helpers ──────────────────────────────────────────────

// Uppercased registry slugs. The three states whose REAL official short-name
// is "BauO {x}" — NRW (BauO NRW), Berlin (BauO Bln), Sachsen-Anhalt (BauO LSA)
// — are NOT in this list; every other state uses SächsBO/BbgBO/HBauO/etc., so
// "BauO Sachsen"/"BauO BERLIN" etc. remain fabrications. Used to detect the
// Bug 26 fabrication class across states.
const FABRICATED_SLUGS =
  'SACHSEN|BRANDENBURG|THUERINGEN|SACHSEN-ANHALT|RLP|SAARLAND|SH|MV|BERLIN|HAMBURG|BREMEN|BW|HESSEN|NIEDERSACHSEN|BAYERN'
const explicitFabricationRx = new RegExp(`\\bBauO\\s+(?:${FABRICATED_SLUGS})\\b`, 'u')
// The Bug 26 fabrication class is a SECTION NUMBER bound to "BauO {code}"
// (e.g. "§ 65 BauO Sachsen" / "§ 65 BauO SACHSEN"). Catches both proper- and
// upper-case. Carved out: the three REAL "BauO {x}" short-names NRW / Bln / LSA
// (Phase B corpus-backed Berlin + Sachsen-Anhalt, so "§ 61 BauO Bln" and
// "§ 60 BauO LSA" are now legitimate, not fabricated). Deliberately does NOT
// match the honest glossary TERM "BauO Sachsen · Bauordnung" (glossary.ts:119 —
// no preceding "§ NN"), which the smoke-pdf-text gate asserts present.
const genericFabricationRx = /§\s*\d+[a-zäöü]?\s+BauO\s+(?!(?:NRW|Bln|LSA)\b)[A-ZÄÖÜ]/u

const LIGATURE_CHECKS: Array<[RegExp, string]> = [
  [/‌/u, 'zero-width non-joiner U+200C'],
  [/[ﬀ-ﬅ]/u, 'literal U+FB0x ligature codepoint'],
  [/ċ/u, 'ċ glyph corruption (U+010B)'],
  [/Č/u, 'Č glyph corruption (U+010C)'],
  [/Ĉ/u, 'Ĉ glyph corruption (U+0108)'],
]

// Bayern-only tokens. Forbidden in every NON-Bayern PDF; the München|Munich
// entry also catches a Bug 27 calendar leak (München calendar on all states).
const BAYERN_LEAK_TOKENS: Array<{ rx: RegExp; label: string }> = [
  { rx: /\bBayBO\b/u, label: 'BayBO (Bayern building code)' },
  { rx: /\bBLfD\b/u, label: 'BLfD (Bayern monument authority)' },
  { rx: /\bBayDSchG\b/u, label: 'BayDSchG (Bayern monument act)' },
  { rx: /\bBayerisches\s+Denkmalschutzgesetz\b/u, label: 'Bayerisches Denkmalschutzgesetz' },
  { rx: /\bBayerische\s+Architektenkammer\b/u, label: 'Bayerische Architektenkammer' },
  { rx: /\bByAK\b/u, label: 'ByAK (Bayern chamber)' },
  { rx: /\bBayernHeim\b/u, label: 'BayernHeim (Bayern funding)' },
  { rx: /\bSchwabing\b/u, label: 'Schwabing (München district)' },
  { rx: /\bMaxvorstadt\b/u, label: 'Maxvorstadt (München district)' },
  { rx: /\bAltstadt-Lehel\b/u, label: 'Altstadt-Lehel (München district)' },
  { rx: /Referat\s+für\s+Stadtplanung\s+und\s+Bauordnung/u, label: 'Referat für Stadtplanung und Bauordnung (München authority)' },
  { rx: /Ensemble\s+Altstadt\s+München/u, label: 'Ensemble Altstadt München' },
  { rx: /\bBayerische\s+Denkmalliste\b/u, label: 'Bayerische Denkmalliste' },
  { rx: /\bStPlS\b/u, label: 'StPlS (München Stellplatzsatzung)' },
  { rx: /\bMünchen\b/u, label: 'München (city leak — incl. Bug 27 calendar)' },
  { rx: /\bMunich\b/u, label: 'Munich (city leak — incl. Bug 27 calendar)' },
  { rx: /\bMarienplatz\b/u, label: 'Marienplatz (München landmark)' },
]

// Core section headers — parity proxy (must exist in BOTH locales).
const SECTION_HEADERS = {
  de: ['Inhaltsverzeichnis', 'A · B · C Status', 'Geschätzte Planungs- & Beratungskosten', 'Geschätzter Zeitplan'],
  en: ['Table of contents', 'A · B · C status', 'Estimated consultation cost', 'Estimated timeline'],
} as const

const HONEST_FRAMING_RX = /in Vorbereitung|being finalized|in preparation/u

/** "§ 65 BauO NRW" → "BauO NRW"; "§ 58 LBO" → "LBO"; "BayBO Art. 59" → "BayBO". */
function bauordnungShortName(citation: string): string {
  return citation
    .replace(/^§\s*\d+[a-zäöü]?\s*/u, '')
    .replace(/\s*Art\.\s*\d+.*$/u, '')
    .trim()
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface CellResult {
  slug: Slug
  tier: 'substantive' | 'stub'
  stadtstaat: boolean
  dePages: number
  enPages: number
  deLen: number
  enLen: number
  failures: string[]
}

async function checkCell(
  cell: Cell,
  getStateLocalization: (s: string) => { procedure: { regular: { citation: string } } },
): Promise<CellResult> {
  const failures: string[] = []
  const loc = getStateLocalization(cell.slug)
  const regCitation = loc.procedure.regular.citation
  const tier: 'substantive' | 'stub' = regCitation.trim().length > 0 ? 'substantive' : 'stub'

  // Render both locales (throws are cell failures — covers Stadtstaat
  // cityBlock=null path "must not crash").
  const texts: Partial<Record<'de' | 'en', string>> = {}
  const pages: Record<'de' | 'en', number> = { de: 0, en: 0 }
  for (const lang of ['de', 'en'] as const) {
    try {
      const bytes = await renderFixturePdf(lang, cell.file)
      pages[lang] = await pageCount(bytes)
      texts[lang] = await extractPdfText(bytes)
    } catch (e) {
      failures.push(`${lang} render threw: ${(e as Error).message}`)
    }
  }

  const deText = texts.de
  const enText = texts.en
  if (deText === undefined || enText === undefined) {
    return {
      slug: cell.slug, tier, stadtstaat: !!cell.stadtstaat,
      dePages: pages.de, enPages: pages.en, deLen: deText?.length ?? 0, enLen: enText?.length ?? 0,
      failures,
    }
  }

  // UNIVERSAL — per locale
  for (const [lang, text] of [['de', deText], ['en', enText]] as const) {
    if (explicitFabricationRx.test(text)) {
      const ctx = text.match(/.{0,20}BauO\s+[A-ZÄÖÜ-]{2,}.{0,10}/u)
      failures.push(`${lang}: fabricated "BauO {UPPERCASE-SLUG}" — "${ctx?.[0] ?? ''}"`)
    }
    if (genericFabricationRx.test(text)) {
      const ctx = text.match(/§\s*\d+[a-zäöü]?\s+BauO\s+\S{1,16}/u)
      failures.push(`${lang}: fabricated "§ NN BauO {code}" citation — "${ctx?.[0] ?? ''}"`)
    }
    for (const [rx, msg] of LIGATURE_CHECKS) {
      if (rx.test(text)) failures.push(`${lang}: ligature corruption — ${msg}`)
    }
    // Bayern-leak: forbidden in non-Bayern, the leak SOURCE in Bayern.
    if (cell.slug !== 'bayern') {
      for (const { rx, label } of BAYERN_LEAK_TOKENS) {
        if (rx.test(text)) {
          const ctx = text.match(new RegExp(`.{0,30}${rx.source}.{0,30}`, 'u'))
          failures.push(`${lang}: Bayern-leak "${label}" — "${ctx?.[0] ?? ''}"`)
        }
      }
    }
    // Phase-C item #2 F1 — Niedersachsen-leak: "NBauO" is forbidden in every
    // non-NI PDF (the § 14/§ 60 NBauO Brandschutz/verfahrensfrei cross-state
    // leak). NI legitimately renders NBauO.
    if (cell.slug !== 'niedersachsen' && /\bNBauO\b/u.test(text)) {
      const ctx = text.match(/.{0,30}NBauO.{0,15}/u)
      failures.push(`${lang}: Niedersachsen-leak "NBauO" — "${ctx?.[0] ?? ''}"`)
    }
    // Phase-C item #2 F7 — procedure-name doubling must not appear.
    const dbl = text.match(/Baugenehmigungsverfahren \(Baugenehmigungsverfahren|Verfahren \(Vereinfachtes Baugenehmigungsverfahren/u)
    if (dbl) failures.push(`${lang}: procedure-name doubling — "${dbl[0]}"`)
    // Phase-C item #2 F16 — Area B must not re-append the procedure § as a chip
    // when the reason already cites it (the standard-branch reason ends
    // "…bestätigen." and self-cites; a trailing "(§ …)" / "(… Art. …)" = the
    // double-citation regression).
    const dupCite = text.match(/best[äa]tigen\.\s*\((?:§|[A-Za-zÄÖÜ]+\s+Art\.)/u)
    if (dupCite) failures.push(`${lang}: Area-B duplicate procedure citation — "${dupCite[0]}"`)
    // Parity: core section headers present in this locale.
    for (const header of SECTION_HEADERS[lang]) {
      if (!text.includes(header)) failures.push(`${lang}: missing section header "${header}" (DE/EN parity)`)
    }
  }

  // UNIVERSAL — cross-locale blank-EN guard.
  if (enText.length < deText.length * 0.4) {
    failures.push(`EN text collapsed vs DE (en=${enText.length} de=${deText.length}; <40% — silent ?? '' fallback?)`)
  }

  // POSITIVE Bayern-leak check on the Bayern cell.
  if (cell.slug === 'bayern') {
    if (!/\bBayBO\b/u.test(deText) || !/\bBayBO\b/u.test(enText)) {
      failures.push('bayern: expected BayBO present in both locales (legitimate leak source)')
    }
  }

  // PER-TIER
  if (tier === 'substantive') {
    const shortName = bauordnungShortName(regCitation)
    const esc = escapeRe(shortName)
    const sectionBefore = new RegExp(`(?:§\\s*\\d+[a-zäöü]?|Art\\.\\s*\\d+)\\s+${esc}`, 'u')
    const sectionAfter = new RegExp(`${esc}\\s+(?:Art\\.\\s*\\d+|§\\s*\\d+)`, 'u')
    for (const [lang, text] of [['de', deText], ['en', enText]] as const) {
      if (!sectionBefore.test(text) && !sectionAfter.test(text)) {
        failures.push(`${lang}: substantive state missing real citation "${shortName}" + §/Art. anchor`)
      }
    }
  } else {
    // STUB — honest framing present. The "no fabricated § citation"
    // guard is the universal explicit/generic fabrication check above
    // (which correctly PASSES the honest glossary TERM "BauO {Land} ·
    // Bauordnung" and FAILS any "§ NN BauO {code}" citation form).
    for (const [lang, text] of [['de', deText], ['en', enText]] as const) {
      if (!HONEST_FRAMING_RX.test(text)) {
        failures.push(`${lang}: stub state missing honest "in Vorbereitung"/"being finalized" framing`)
      }
    }
  }

  return {
    slug: cell.slug, tier, stadtstaat: !!cell.stadtstaat,
    dePages: pages.de, enPages: pages.en, deLen: deText.length, enLen: enText.length,
    failures,
  }
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

function renderTable(results: CellResult[]): string {
  const W = 23
  const top = `┌${'─'.repeat(W + 2)}┬──────┬─────────────────────────────────────────┐`
  const sep = `├${'─'.repeat(W + 2)}┼──────┼─────────────────────────────────────────┤`
  const bot = `└${'─'.repeat(W + 2)}┴──────┴─────────────────────────────────────────┘`
  const head = `│ ${'Bundesland'.padEnd(W)} │ Pass │ ${'Failures'.padEnd(39)} │`
  const rows = results.map((r) => {
    const name = `${r.slug}${r.stadtstaat ? ' *' : ''}`
    const pass = r.failures.length === 0 ? ' ✓  ' : ' ✗  '
    const fail = r.failures.length === 0 ? '—'.padEnd(39) : `${r.failures.length} (see stderr)`.padEnd(39)
    return `│ ${name.padEnd(W)} │ ${pass} │ ${fail} │`
  })
  return [top, head, sep, ...rows, bot, '  * = Stadtstaat (cityBlock=null path)'].join('\n')
}

async function main(): Promise<void> {
  // Imported AFTER the env shim has run at module top-level.
  const { getStateLocalization } = await import('../src/legal/stateLocalization.ts')

  // Headline-band leak guard. The COST_BANDS_BY_TEMPLATE basis line is
  // template-keyed, not state-aware. phase-c/item-4 widened this from the four
  // headline-rendered templates (T-02/06/07/08) to ALL 8: T-01/T-03/T-05 are now
  // cleaned state-neutral too, so the guard covers the full table and a city/§
  // token in ANY band fails CI (locks the cleanup; no latent leak waiting on a
  // gating change). "Münchner" (adjectival) added per the audit G4 gap. Static.
  const { COST_BANDS_BY_TEMPLATE } = await import('../src/features/result/lib/costNormsMuenchen.ts')
  const bandLeakRx = /München|Münchner|Munich|\bBayBO\b|\bBLfD\b|\bBayDSchG\b|\bStPlS\b/u
  const bandLeaks: string[] = []
  for (const t of ['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06', 'T-07', 'T-08'] as const) {
    const b = COST_BANDS_BY_TEMPLATE[t]
    for (const [k, v] of [['basisDe', b.basisDe], ['basisEn', b.basisEn]] as const) {
      const m = v.match(bandLeakRx)
      if (m) bandLeaks.push(`${t}.${k}: "${m[0]}" — headline band renders for all states, must be state-neutral`)
    }
  }
  if (bandLeaks.length) {
    console.error('[smoke-pdf-matrix] FAIL — headline-band city/Bayern leak:')
    for (const l of bandLeaks) console.error(`  ✗ ${l}`)
    process.exit(1)
  }
  console.log('[smoke-pdf-matrix] headline-band leak guard OK (all 8 templates state-neutral)')

  // ── Phase-C item #2 citation-leak guard (F1/F2/F3/F7) ────────────────
  // requiredDocumentsForCase emitted the Niedersachsen else-fallback ("§ 14
  // NBauO" Brandschutz, "§ 60 NBauO" verfahrensfrei) for EVERY non-NI
  // substantive state once Phase B flipped the 11 stubs, plus a hard-coded
  // "§ 9" stamped onto every state's DSchG. These now resolve per state from
  // the citation pack; resolveProcedure no longer doubles the procedure name.
  // Assert across all 16 states × the three leak-prone doc paths — the matrix
  // PDF render below only exercises T-01/neubau, never verfahrensfrei/denkmal.
  const { requiredDocumentsForCase } = await import('../src/legal/requiredDocuments.ts')
  const { getStateCitations } = await import('../src/legal/stateCitations.ts')
  const { resolveProcedure } = await import('../src/legal/resolveProcedure.ts')
  const DOUBLING_RX =
    /Baugenehmigungsverfahren \(Baugenehmigungsverfahren|Verfahren \(Vereinfachtes Baugenehmigungsverfahren/u
  const docBase = (slug: Slug, over: Record<string, unknown>) => ({
    procedureKind: 'standard', intent: 'neubau', bundesland: slug,
    eingriff_tragende_teile: false, eingriff_aussenhuelle: false,
    denkmalschutz: false, geg_trigger: false, ...over,
  })
  const citLeaks: string[] = []
  for (const cell of CELLS) {
    const slug = cell.slug
    const cit = getStateCitations(slug)
    const ownsNBauO = slug === 'niedersachsen'
    const findCit = (over: Record<string, unknown>, key: string): string =>
      requiredDocumentsForCase(docBase(slug, over) as never).find((d) => d.key === key)?.citation ?? ''
    // F1 — Brandschutz (neubau path)
    const brand = findCit({}, 'brandschutznachweis')
    if (brand !== cit.brandschutzCitation) citLeaks.push(`${slug}: Brandschutz "${brand}" ≠ pack "${cit.brandschutzCitation}"`)
    if (!ownsNBauO && /\bNBauO\b/.test(brand)) citLeaks.push(`${slug}: Niedersachsen-leak in Brandschutz "${brand}"`)
    // F2 — verfahrensfrei (Anzeige-Formular path)
    const anz = findCit({ procedureKind: 'verfahrensfrei' }, 'anzeige_formular')
    if (anz !== cit.permitFreeCitation) citLeaks.push(`${slug}: verfahrensfrei "${anz}" ≠ pack "${cit.permitFreeCitation}"`)
    if (!ownsNBauO && /\bNBauO\b/.test(anz)) citLeaks.push(`${slug}: Niedersachsen-leak in verfahrensfrei "${anz}"`)
    // F3 — Denkmal-Erlaubnis: no hard-coded "§ 9", no foreign §
    const denk = findCit({ denkmalschutz: true }, 'denkmalschutz_erlaubnis')
    if (/§\s*9\b/.test(denk)) citLeaks.push(`${slug}: hard-coded "§ 9" on DSchG "${denk}"`)
    if (!ownsNBauO && /\bNBauO\b/.test(denk)) citLeaks.push(`${slug}: Niedersachsen-leak in Denkmal "${denk}"`)
    // F7 — procedure-name doubling (standard + umnutzung composers)
    const procBase = { bundesland: slug, eingriff_tragende_teile: false, eingriff_aussenhuelle: false, denkmalschutz: false, ensembleschutz: false }
    for (const intent of ['neubau', 'umnutzung'] as const) {
      const d = resolveProcedure({ ...procBase, intent } as never)
      if (DOUBLING_RX.test(d.reasoning_de)) citLeaks.push(`${slug}/${intent}: procedure-name doubling — "${d.reasoning_de.slice(0, 70)}…"`)
    }
  }
  if (citLeaks.length) {
    console.error('[smoke-pdf-matrix] FAIL — Phase-C item #2 citation leak / doubling:')
    for (const l of citLeaks) console.error(`  ✗ ${l}`)
    process.exit(1)
  }
  console.log('[smoke-pdf-matrix] citation-leak guard OK (16 states × Brandschutz/verfahrensfrei/Denkmal — no NBauO leak, no "§ 9" stamp, no doubling)')

  console.log(`[smoke-pdf-matrix] rendering ${CELLS.length} states × 2 locales…\n`)
  const results: CellResult[] = []
  for (const cell of CELLS) {
    process.stdout.write(`  · ${cell.slug}… `)
    const r = await checkCell(cell, getStateLocalization as never)
    results.push(r)
    console.log(
      `${r.failures.length === 0 ? '✓' : '✗'} (de ${r.dePages}p/${r.deLen}c · en ${r.enPages}p/${r.enLen}c)`,
    )
  }

  // Cohort page-count floor (Decision 2 — empirical, not coupled to Bayern).
  const allPages = results.flatMap((r) => [r.dePages, r.enPages]).filter((n) => n > 0)
  const floor = Math.max(6, Math.floor(median(allPages) * 0.5))
  for (const r of results) {
    if (r.dePages > 0 && r.dePages < floor) r.failures.push(`DE page count ${r.dePages} below cohort floor ${floor}`)
    if (r.enPages > 0 && r.enPages < floor) r.failures.push(`EN page count ${r.enPages} below cohort floor ${floor}`)
  }
  console.log(`\n[smoke-pdf-matrix] cohort page median ${median(allPages)} → floor ${floor}`)

  // Report
  console.log('\n' + renderTable(results) + '\n')
  const failed = results.filter((r) => r.failures.length > 0)
  if (failed.length > 0) {
    console.error('\n[smoke-pdf-matrix] FAILURE DETAIL:')
    for (const r of failed) {
      console.error(`\n  ${r.slug} (${r.tier}${r.stadtstaat ? ', Stadtstaat' : ''}):`)
      for (const f of r.failures) console.error(`    ✗ ${f}`)
    }
  }

  const passCount = results.length - failed.length
  console.log(`\n[smoke-pdf-matrix] ${passCount}/${results.length} states pass.`)
  if (failed.length > 0) {
    console.log('[smoke-pdf-matrix] FAIL — see violations above.')
    process.exit(1)
  }
  console.log('[smoke-pdf-matrix] OK — 16/16.')
  process.exit(0)
}

main().catch((err) => {
  console.error('[smoke-pdf-matrix] ERROR:', err)
  process.exit(1)
})
