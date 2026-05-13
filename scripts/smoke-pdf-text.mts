// ───────────────────────────────────────────────────────────────────────
// v1.0.17 — Runtime PDF text-extraction smoke gate.
//
// 5th daily gate. Renders the fixture project PDF via Node + pdf-lib
// (using a Node-side bytes loader for TTFs), extracts text via
// pdf-parse, and asserts ligature integrity — no ċ/Č/Ĉ glyph
// corruption, no zero-widths, no literal U+FB0x ligature codepoints
// — plus structural integrity (every expected string appears).
//
// Empirically proves the v1.0.17 ligature kill (Commit 1.1) worked:
// previous JS-layer fixes (v1.0.11/12/16) passed SOURCE checks but
// the rendered PDF still had ċ/Č on every page. The features: liga
// /dlig/clig: false fix at embedFont supersedes those — pdf-parse
// extraction is the empirical confirmation no JS-layer check can
// provide.
//
// Exit 0 if all assertions pass; exit 1 if any fail.
// ───────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Shim import.meta.env for Node (Vite-only global). Set to a
// minimal stub that satisfies code paths checking import.meta.env.DEV
// or import.meta.env.PROD. Smoke runs are neither dev nor prod —
// they're test, so both flags false (suppresses dev console.warn).
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

// ─── Node font loader ────────────────────────────────────────────────
import type { FontBytesLoader } from '../src/lib/fontLoader.ts'

const nodeFontLoader: FontBytesLoader = {
  load: async (path: string) => {
    try {
      // path is '/fonts/Inter-Regular.ttf' — strip leading slash + prepend public/
      const rel = path.replace(/^\//, '')
      const buf = readFileSync(join(REPO_ROOT, 'public', rel))
      return new Uint8Array(buf).buffer as ArrayBuffer
    } catch {
      return null
    }
  },
}

// ─── Fixture loading + PDF rendering ────────────────────────────────
async function renderFixturePdf(
  lang: 'en' | 'de',
  fixtureFile: string = 'test/fixtures/nrw-t03-koenigsallee.json',
): Promise<Uint8Array> {
  const fixturePath = join(REPO_ROOT, fixtureFile)
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'))

  // Inject the Node font loader by monkey-patching the module's
  // default loader for this Node smoke pass.
  const { loadBrandFonts: _origLoad } = await import('../src/lib/fontLoader.ts')
  // Wrap loadBrandFonts to use nodeFontLoader by default.
  // exportPdf calls loadBrandFonts(doc) without a loader, so we have
  // to patch the symbol. Simplest: import the actual exportPdf and
  // call it with the fixture; the fontLoader's default is
  // browserFontLoader which uses fetch() — which doesn't exist in
  // Node. So we need a different approach: bypass exportPdf's
  // internal loadBrandFonts call by pre-loading fonts ourselves.
  // But exportPdf doesn't expose a fonts-injection seam.
  //
  // Pragmatic v1.0.17 ship: provide a Node fetch polyfill so
  // browserFontLoader works in Node. Node 18+ has global fetch; we
  // shim it with a file:// URL handler.
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

let shimmedFetch = false
function shimFetch(): void {
  const originalFetch = (globalThis as { fetch?: typeof fetch }).fetch
  ;(globalThis as { fetch: unknown }).fetch = async (
    url: string | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const urlStr = typeof url === 'string' ? url : url.toString()
    if (urlStr.startsWith('/fonts/') || urlStr.startsWith('fonts/')) {
      // Map browser-style /fonts/X.ttf to public/fonts/X.ttf on disk
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

// ─── Assertions ─────────────────────────────────────────────────────
interface Assertion {
  pass: boolean
  msg: string
}

function assertContains(text: string, needles: string[]): Assertion[] {
  return needles.map((n) => ({
    pass: text.includes(n),
    msg: `contains "${n}"`,
  }))
}

function assertNoCorruption(text: string): Assertion[] {
  const checks: Array<[RegExp, string]> = [
    [/‌/u, 'no zero-width non-joiner U+200C'],
    [/[ﬀ-ﬅ]/u, 'no literal U+FB0x ligature codepoints'],
    [/ċ/u, 'no ċ glyph corruption (U+010B)'],
    [/Č/u, 'no Č glyph corruption (U+010C)'],
    [/Ĉ/u, 'no Ĉ glyph corruption (U+0108)'],
  ]
  return checks.map(([rx, msg]) => ({
    pass: !rx.test(text),
    msg,
  }))
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // pdf-parse v2 uses a PDFParse class instead of v1's default-function.
  const { createRequire } = await import('node:module')
  const require = createRequire(import.meta.url)
  const { PDFParse } = require('pdf-parse')
  const parser = new PDFParse({ data: Buffer.from(bytes) })
  const result = await parser.getText()
  return result.text as string
}

/**
 * v1.0.18 Feature 3 — count URI link annotations in a rendered PDF.
 * pdf-parse doesn't expose annotations, so we re-parse via pdf-lib
 * and walk the page tree's Annots arrays.
 */
async function countUriAnnotations(bytes: Uint8Array): Promise<number> {
  const { PDFDocument, PDFName, PDFDict, PDFString, PDFHexString } =
    await import('pdf-lib')
  const doc = await PDFDocument.load(bytes)
  let count = 0
  for (const page of doc.getPages()) {
    const annots = page.node.lookup(PDFName.of('Annots'))
    if (!annots || typeof (annots as { asArray?: unknown }).asArray !== 'function')
      continue
    const arr = (annots as { asArray: () => Array<unknown> }).asArray()
    for (const item of arr) {
      // Resolve indirect reference if needed
      const resolved =
        item && typeof (item as { tag?: string }).tag === 'string'
          ? doc.context.lookup(item as never)
          : item
      if (!(resolved instanceof PDFDict)) continue
      const action = resolved.lookup(PDFName.of('A'))
      if (!(action instanceof PDFDict)) continue
      const subtype = action.lookup(PDFName.of('S'))
      if (!(subtype instanceof PDFName)) continue
      if (subtype.asString() !== '/URI') continue
      const uri = action.lookup(PDFName.of('URI'))
      if (uri instanceof PDFString || uri instanceof PDFHexString) {
        count++
      }
    }
  }
  return count
}

async function runLocale(lang: 'en' | 'de'): Promise<{ passed: number; failed: number }> {
  console.log(`\n[smoke-pdf-text] rendering ${lang}…`)
  const pdfBytes = await renderFixturePdf(lang)
  console.log(`[smoke-pdf-text] ${lang} PDF: ${pdfBytes.length} bytes`)
  const text = await extractPdfText(pdfBytes)
  console.log(`[smoke-pdf-text] ${lang} extracted text: ${text.length} chars`)
  const uriCount = await countUriAnnotations(pdfBytes)
  console.log(`[smoke-pdf-text] ${lang} URI annotations: ${uriCount}`)

  // Common assertions
  let assertions: Assertion[] = [
    ...assertNoCorruption(text),
    { pass: /Königsallee/u.test(text), msg: 'project address rendered' },
    { pass: /Planning\s*Matrix|PLANNING\s*MATRIX/u.test(text), msg: 'wordmark rendered' },
    { pass: /≈/u.test(text), msg: '≈ (U+2248) almost-equals symbol intact in timeline subtitle' },
    { pass: /m²/u.test(text), msg: 'm² (U+00B2 superscript) intact in costs subtitle' },
    // v1.0.18 Bug 35 — context-checked: " ² " with leading + trailing
    // space is ALWAYS a bug (legitimate m² has no leading space).
    { pass: !/\s²\s/u.test(text), msg: 'no orphan ² substitutions (v1.0.18 Bug 35 guard)' + (/\s²\s/u.test(text) ? ` — context: "${text.match(/.{0,20}\s²\s.{0,20}/u)?.[0] ?? ''}"` : '') },
    { pass: !/\s²LEGAL|\s²CLIENT|\s²DESIGNER/u.test(text), msg: 'no ² before qualifier labels' },
    // v1.0.18 Bug 37 — Key Data value + qualifier pill must not
    // collide. Negative-pattern: no concatenated "NRWLEGAL" /
    // "BauOLEGAL" (no-space concatenations would only happen on
    // overflow).
    { pass: !/NRWLEGAL|BauOLEGAL/u.test(text), msg: 'no value/qualifier collision (Bug 37 guard)' },
    // v1.0.18 Feature 4 — validity stamp present on cover
    {
      pass: lang === 'en'
        ? /VALID FOR 30 DAYS/u.test(text)
        : /GÜLTIG 30 TAGE/u.test(text),
      msg: 'validity stamp present on cover',
    },
    // v1.0.18 Feature 2 — confidence column present on cover
    {
      pass: lang === 'en'
        ? /CONFIDENCE/u.test(text) && /\d+%/u.test(text)
        : /VERTRAUEN/u.test(text) && /\d+%/u.test(text),
      msg: 'confidence column + percent value on cover',
    },
    // v1.0.21 Bug M — NRW Königsallee fixture has 0 active hard
    // blockers (denkmalschutz=false). Confidence must be ≥ 60% — i.e.
    // the multiplicative penalty does NOT fire on a clean project.
    // Regression guard.
    (() => {
      const pctMatch = text.match(/(\d{1,3})\s*%/u)
      const pct = pctMatch ? parseInt(pctMatch[1] ?? '0', 10) : 0
      return {
        pass: pct >= 60,
        msg: `confidence ≥ 60 on clean NRW project (got ${pct}, Bug M regression guard)`,
      }
    })(),
    // v1.0.18 Feature 1 — QR code label present on cover
    {
      pass: lang === 'en'
        ? /SCAN TO OPEN/u.test(text)
        : /PROJEKT ÖFFNEN/u.test(text),
      msg: 'QR code label present on cover',
    },
    // v1.0.18 Feature 3 — § citation hyperlinks. The Key Data
    // fixture has "verfahrensfrei nach § 62 BauO NRW" which
    // should emit at least 1 URI annotation.
    {
      pass: uriCount >= 1,
      msg: `at least 1 URI link annotation present (found ${uriCount})`,
    },
    // v1.0.19 Bug 40 — procedure consistency: ALL three renderers
    // (Areas B, Procedures card, Key Data row) display the SAME
    // procedure language. Locale-specific keywords below.
    {
      pass:
        lang === 'en'
          ? (text.match(/permit-free|Permit-free|PERMIT-FREE/g) ?? []).length >= 3
          : (text.match(/verfahrensfrei|VERFAHRENSFREI/g) ?? []).length >= 3,
      msg: 'procedure language consistent across Areas / Procedures / Key Data (≥3 occurrences)',
    },
    {
      pass: (text.match(/§\s*62\s+BauO\s+NRW/g) ?? []).length >= 3,
      msg: '§ 62 BauO NRW cited on Areas B + Procedure card + Key Data row',
    },
    {
      pass: !/§\s*64\s+BauO\s+NRW\s+ERFORDERLICH/u.test(text) &&
            !/§\s*64\s+BauO\s+NRW\s+REQUIRED/u.test(text),
      msg: 'no contradictory § 64 + ERFORDERLICH/REQUIRED for verfahrensfrei case (Bug 40 guard)',
    },
    // v1.0.19 Bug 41+42 — Documents auto-populated
    {
      pass: lang === 'en'
        ? /Site plan|site plan|Lageplan/u.test(text)
        : /Lageplan/u.test(text),
      msg: 'Lageplan (ÖbVI) present in Documents',
    },
    {
      pass: lang === 'en'
        ? /thermal-insulation|Wärmeschutznachweis/u.test(text)
        : /Wärmeschutznachweis/u.test(text),
      msg: 'GEG-Wärmeschutznachweis present in Documents (Bug 41 promotion)',
    },
    {
      pass: lang === 'en'
        ? /Energy certificate|Energieausweis/u.test(text)
        : /Energieausweis/u.test(text),
      msg: 'Energieausweis present in Documents',
    },
    {
      pass: !/No documents recorded yet|Noch keine Dokumente erfasst/u.test(text),
      msg: 'Documents page no longer empty (Bug 42 guard)',
    },
    // v1.0.19 Bug 43 — Abstandsflächen-Hinweis
    {
      pass: /Abstandsflächen/u.test(text),
      msg: 'Abstandsflächen-Hinweis surfaces in Areas (Bug 43)',
    },
    {
      pass: /§\s*6\s*Abs\.\s*8\s+BauO\s+NRW/u.test(text),
      msg: '§ 6 Abs. 8 BauO NRW 25-cm-Dämmungs-Privileg cited',
    },
    // v1.0.19 Bug 44 — Area A qualifier honesty + Stadtarchiv caveat
    {
      pass: /Stadtarchiv/u.test(text),
      msg: 'Stadtarchiv Düsseldorf verification caveat present in Areas A',
    },
    // v1.0.20 Polish 1 — Area A + C bodies render as TWO paragraphs.
    // The pre-paragraph word ("zulässig" for Area A; "ragen" or
    // "Auflagen" for Area C in DE) should NOT directly butt up
    // against the caveat/Hinweis lead word on the same line in
    // extracted text — pdf-parse separates paragraphs with newlines
    // when there's a positional vertical gap.
    {
      pass: lang === 'en'
        ? /permitted\.\s*$/m.test(text) || /\n[\s\S]{0,4}Verify specific/m.test(text)
        : /zulässig\.\s*$/m.test(text) || /\n[\s\S]{0,4}Konkreten Bebauungsplan/m.test(text),
      msg: 'Area A renders as two paragraphs (observation + Stadtarchiv caveat)',
    },
    {
      pass: lang === 'en'
        ? /LEGAL\s*·\s*ASSUMED/u.test(text)
        : /RECHTLICH\s*·\s*ANGENOMMEN/u.test(text),
      msg: 'Area A qualifier honestly tagged ASSUMED (Bug 44, localized for v1.0.20 Polish 2)',
    },
    // v1.0.20 Polish 2 — qualifier pills localized in DE PDF
    // v1.0.22 Bug Q — assertion updated to track the post-Bug Q
    // normalization. CLIENT-source qualifiers can no longer reach
    // VERIFIED; pre-existing fixture rows with CLIENT+VERIFIED are
    // normalized at render to CLIENT+DECIDED (BAUHERR · ENTSCHIEDEN).
    {
      pass: lang === 'en'
        ? /CLIENT\s*·\s*DECIDED/u.test(text)
        : /BAUHERR\s*·\s*ENTSCHIEDEN/u.test(text),
      msg: 'CLIENT · DECIDED qualifier renders localized (post-Bug Q normalization)',
    },
    {
      pass: lang === 'en'
        ? /LEGAL\s*·\s*CALCULATED/u.test(text)
        : /RECHTLICH\s*·\s*BERECHNET/u.test(text),
      msg: 'LEGAL · CALCULATED qualifier renders localized',
    },
    {
      // DE PDF must NOT show English qualifier labels in pill positions
      pass: lang === 'en'
        ? true
        : !/CLIENT\s*·\s*VERIFIED|LEGAL\s*·\s*CALCULATED|LEGAL\s*·\s*ASSUMED/u.test(text),
      msg: 'DE PDF has zero English qualifier pill labels',
    },
    // v1.0.20 Polish 3 — Bauherr signature row on Verification page
    {
      pass: /Test Bauherr/u.test(text),
      msg: 'Bauherr name pre-printed on Verification page signature row',
    },
    {
      pass: lang === 'en'
        ? /Bauherr\s*·\s*Owner/u.test(text)
        : /Bauherr:in/u.test(text),
      msg: 'Bauherr signature label rendered',
    },
    {
      pass: lang === 'en'
        ? /Co-signature required/u.test(text)
        : /Mit-Unterschrift erforderlich/u.test(text),
      msg: 'Bauherr co-signature note rendered',
    },
  ]

  // Language-specific assertions
  if (lang === 'en') {
    assertions = assertions.concat(
      assertContains(text, [
        'Table of contents',
        'Top 3 next steps',
        'A · B · C status',
        'Estimated cost range',
        'Estimated timeline',
        'GEG',
        'certified',
        'energy consultant',
        'building permit',
        'certification',
        // v1.0.18 Bug 36 guard — both specialists must appear
        'Energy consultant',
        'Structural engineer',
        'NEEDED',
        'NOT NEEDED',
      ]),
    )
  } else {
    assertions = assertions.concat(
      assertContains(text, [
        'Inhaltsverzeichnis',
        'Die 3 nächsten Schritte',
        'A · B · C Status',
        'Geschätzte Kostenspanne',
        'Geschätzter Zeitplan',
        '§',
        'Verfahrensfreiheit',
        'identifiziert',
        'Pflicht',
        'Energieausweis',
        // v1.0.18 Bug 36 guard — both specialists must appear
        'Energieberater',
        'Tragwerksplaner',
        'ERFORDERLICH',
        'NICHT ERFORDERLICH',
      ]),
    )
  }

  let passed = 0
  let failed = 0
  for (const a of assertions) {
    if (a.pass) {
      console.log(`  ✓ ${lang}: ${a.msg}`)
      passed++
    } else {
      console.log(`  ✗ ${lang}: ${a.msg}`)
      failed++
    }
  }
  return { passed, failed }
}

// v1.0.21 — cross-state bleed runner.
//
// Renders a non-NRW project (Berlin × T-01 Pariser Platz) and asserts
// that every NRW-only / Bayern-only / BW-only token is absent. This is
// the smoke-side guard against Bug 23-PRIME (Düsseldorf string on a
// Berlin project), Bug 23 (BayBO Art. 61/62 on every project), Bug 23b
// (BauVorlVO NRW on every project), Bug 23c (Schwabing/BLfD on every
// project), Bug 23d (BayDSchG on non-Bayern), and any future cross-
// state leak.
//
// Token list mirrors crossStateBleedGuard.TOKENS — the harness asserts
// the guard + the upstream state-aware sources are working in concert.
async function runCrossStateBleed(): Promise<{ passed: number; failed: number }> {
  console.log(`\n[smoke-pdf-text] cross-state bleed (Berlin × T-01)…`)
  const fixtureFile = 'test/fixtures/berlin-t01-pariser-platz.json'
  let passed = 0
  let failed = 0
  for (const lang of ['en', 'de'] as const) {
    const pdfBytes = await renderFixturePdf(lang, fixtureFile)
    const text = await extractPdfText(pdfBytes)
    console.log(`[smoke-pdf-text] berlin ${lang} text: ${text.length} chars`)
    // Tokens are added progressively, one commit per bug. The set
    // below tracks the leaks closed so far:
    //   v1.0.21 Commit 1 (Bug 23-PRIME) — Stadtarchiv Düsseldorf + Königsallee
    //   v1.0.21 Commit 2 (Bug 23)       — BayBO Art. 61/62 + Bayern-specific role text
    //   v1.0.21 Commit 3 (Bug 23b)      — BauVorlVO NRW + DSchG NRW + § N BauO NRW
    //   v1.0.21 Commit 4 (Bug 23c)      — BLfD + Schwabing/Maxvorstadt/Lehel + StPlS 926
    //   v1.0.21 Commit 5 (Bug 23d)      — BayDSchG outside Bayern
    // Each subsequent commit extends this list. Bayern-state tokens
    // appear on a Berlin project ONLY when the leak is still open.
    const forbiddenTokens: Array<{ rx: RegExp; label: string }> = [
      // v1.0.21 Commit 1 (Bug 23-PRIME)
      { rx: /\bStadtarchiv\s+Düsseldorf\b/u, label: 'Stadtarchiv Düsseldorf (NRW-only)' },
      { rx: /\bKönigsallee\b/u, label: 'Königsallee (NRW-only)' },
      // v1.0.21 Commit 2 (Bug 23 — specialists)
      { rx: /\bBayBO\s+Art\.\s*61\b/u, label: 'BayBO Art. 61 (Bayern-only permit-submission §)' },
      { rx: /\bBayBO\s+Art\.\s*62\b/u, label: 'BayBO Art. 62 (Bayern-only structural-cert §)' },
      { rx: /Pflicht für Neubauten in Bayern|mandatory for new builds in Bayern/u, label: 'Bayern-only surveyor mandate' },
      // v1.0.21 Commit 3 (Bug 23b — documents)
      { rx: /\bBauVorlVO\s+NRW\b/u, label: 'BauVorlVO NRW (NRW-only Bauvorlagenverordnung)' },
      { rx: /\bDSchG\s+NRW\b/u, label: 'DSchG NRW (NRW-only monument-protection act)' },
      { rx: /§\s*68\s+BauO\s+NRW/u, label: '§ 68 BauO NRW (NRW-only structural §)' },
      { rx: /§\s*64\s+BauO\s+NRW/u, label: '§ 64 BauO NRW (NRW-only permit form §)' },
      { rx: /Untere\s+Denkmalbehörde\s+\(Stadt\s+Düsseldorf\)/u, label: 'Untere Denkmalbehörde Düsseldorf (NRW-only)' },
      // v1.0.21 Commit 4 (Bug 23c — risk register)
      { rx: /\bBLfD\b/u, label: 'BLfD (Bayern-only monument authority)' },
      { rx: /\bSchwabing\b/u, label: 'Schwabing (München district)' },
      { rx: /\bMaxvorstadt\b/u, label: 'Maxvorstadt (München district)' },
      { rx: /\bStPlS\s*926\b/u, label: 'StPlS 926 (München-only Stellplatzsatzung)' },
      { rx: /\bLHM\b/u, label: 'LHM (Landeshauptstadt München — Bayern-only)' },
      { rx: /Bauamt-Sommerrotation\s+München|Munich\s+Bauamt\s+summer\s+rotation/u, label: 'München Bauamt rotation risk (Bayern-only)' },
      // v1.0.21 Commit 5 (Bug 23d — Legal Landscape DSchG)
      { rx: /\bBayDSchG\b/u, label: 'BayDSchG (Bayern-only monument-protection act)' },
      { rx: /\bBayerisches\s+Denkmalschutzgesetz\b/u, label: 'Bayerisches Denkmalschutzgesetz (Bayern-only)' },
    ]
    for (const { rx, label } of forbiddenTokens) {
      const hit = rx.test(text)
      const msg = `Berlin ${lang}: no ${label} leak`
      if (!hit) {
        console.log(`  ✓ ${msg}`)
        passed++
      } else {
        const ctx = text.match(new RegExp(`.{0,40}${rx.source}.{0,40}`, 'u'))
        console.log(`  ✗ ${msg}${ctx ? ` — context: "${ctx[0]}"` : ''}`)
        failed++
      }
    }
    // Positive assertion: the Stadtarchiv caveat MUST mention Berlin's
    // archive (since archivCity for Berlin === 'Berlin').
    const stadtarchivBerlinPresent = /\bStadtarchiv\s+Berlin\b/u.test(text)
    const stadtarchivMsg = `Berlin ${lang}: Stadtarchiv Berlin (state-correct archive) present`
    if (stadtarchivBerlinPresent) {
      console.log(`  ✓ ${stadtarchivMsg}`)
      passed++
    } else {
      console.log(`  ✗ ${stadtarchivMsg}`)
      failed++
    }
    // v1.0.21 Bug E — Berlin fixture has mk_gebietsart + denkmalschutz
    // + bauvoranfrage_hard_blocker set. Procedure card MUST surface
    // "Procedure determination deferred" (EN) / "Verfahrens­bestimmung
    // zurückgestellt" (DE) and MUST NOT surface "Simplified building
    // permit · REQUIRED". Top-3 MUST carry the word BLOCKER.
    const deferredRe = lang === 'en'
      ? /Procedure determination deferred/u
      : /Verfahrens\s*bestimmung\s+zurückgestellt/u
    const deferredHit = deferredRe.test(text)
    const deferredMsg = `Berlin ${lang}: procedure card surfaces "Procedure determination deferred" (Bug E)`
    if (deferredHit) { console.log(`  ✓ ${deferredMsg}`); passed++ }
    else { console.log(`  ✗ ${deferredMsg}`); failed++ }
    const noSimplifiedRequired =
      lang === 'en'
        ? !/Simplified building permit\s*·\s*REQUIRED/u.test(text)
        : !/Vereinfachtes Baugenehmigungsverfahren\s*·\s*ERFORDERLICH/u.test(text)
    const noSimplifiedMsg = `Berlin ${lang}: no "Simplified permit · REQUIRED" while hard blockers active (Bug E guard)`
    if (noSimplifiedRequired) { console.log(`  ✓ ${noSimplifiedMsg}`); passed++ }
    else { console.log(`  ✗ ${noSimplifiedMsg}`); failed++ }
    const blockerInTop3 = /\bBLOCKER\b/u.test(text)
    const blockerMsg = `Berlin ${lang}: Top-3 surfaces the word BLOCKER (Bug E)`
    if (blockerInTop3) { console.log(`  ✓ ${blockerMsg}`); passed++ }
    else { console.log(`  ✗ ${blockerMsg}`); failed++ }
    // v1.0.22 Bug K — EN export must not surface German-verb content
    // (persona-leak guard). The Berlin fixture's persona recommendations
    // ship proper EN copy, so these tokens MUST NOT appear when
    // lang === 'en'. On DE we expect them to appear naturally; the
    // existing DE assertions reach that channel.
    if (lang === 'en') {
      const germanLeakTokens: Array<{ rx: RegExp; label: string }> = [
        { rx: /\bfestgestellt\b/u, label: 'festgestellt (DE verb)' },
        { rx: /\bbeschlossen\b/u, label: 'beschlossen (DE verb)' },
        { rx: /\bidentifiziert\b/u, label: 'identifiziert (DE verb)' },
        { rx: /\bdenkmalrechtliche\s+Erlaubnis\b/u, label: 'denkmalrechtliche Erlaubnis (DE phrase)' },
      ]
      for (const { rx, label } of germanLeakTokens) {
        const hit = rx.test(text)
        const msg = `Berlin en: no ${label} on EN export (Bug K)`
        if (!hit) { console.log(`  ✓ ${msg}`); passed++ }
        else {
          const ctx = text.match(new RegExp(`.{0,40}${rx.source}.{0,40}`, 'u'))
          console.log(`  ✗ ${msg} — context: "${ctx?.[0] ?? ''}"`)
          failed++
        }
      }
    } else {
      // DE regression guard: confirm the DE PDF still has German
      // morphology so we have not accidentally English-ified it.
      const deRegression = /\berforderlich\b/u.test(text)
      const msg = `Berlin de: DE export still carries German content (Bug K regression guard)`
      if (deRegression) { console.log(`  ✓ ${msg}`); passed++ }
      else { console.log(`  ✗ ${msg}`); failed++ }
    }
    // v1.0.22 Bug F — Berlin fixture has hard blockers active, so
    // the Documents section must collapse to the "pending
    // Bauvoranfrage" placeholder rather than confidently enumerating
    // five required Anlagen. Negative guard: no auto-list of named
    // Anlagen leaks through.
    const docBlockedRe = lang === 'en'
      ? /Document requirements pending Bauvoranfrage resolution/u
      : /Dokumentenanforderungen ausstehend.{0,40}Bauvoranfrage/u
    const docBlockedHit = docBlockedRe.test(text)
    const docBlockedMsg = `Berlin ${lang}: Documents collapse to Bauvoranfrage placeholder (Bug F + Bug E)`
    if (docBlockedHit) { console.log(`  ✓ ${docBlockedMsg}`); passed++ }
    else { console.log(`  ✗ ${docBlockedMsg}`); failed++ }
    // v1.0.22 Bug F — no auto-listed Anlagen leak through the
    // blocker placeholder. Lageplan + Bauzeichnungen + Baubeschreibung
    // are the three always-required items requiredDocumentsForCase
    // would emit when not blocked; on the Berlin blocked fixture
    // none must appear in the rendered PDF.
    // Match Documents-section format only: title · ERFORDERLICH/REQUIRED.
    // The string "Amtlicher Lageplan" appears elsewhere (cost item
    // label, role rationale, stateLocalization surveying note) on
    // every NRW/Bayern project; only the Documents-section auto-list
    // would format it as "Amtlicher Lageplan · ERFORDERLICH".
    const noAutoLageplan =
      !/Amtlicher Lageplan\s*·\s*(?:ERFORDERLICH|REQUIRED)/u.test(text) &&
      !/Official site plan\s*·\s*(?:ERFORDERLICH|REQUIRED)/u.test(text)
    const noAutoLageplanMsg = `Berlin ${lang}: no Amtlicher Lageplan · ERFORDERLICH row on blocked project (Bug F guard)`
    if (noAutoLageplan) { console.log(`  ✓ ${noAutoLageplanMsg}`); passed++ }
    else { console.log(`  ✗ ${noAutoLageplanMsg}`); failed++ }
    // v1.0.23 Bug L — when fassadenflaeche_m2 (T-03) or wohnflaeche
    // (T-01) is unset and detectAreaSqm finds no corpus match, the
    // cost basis line uses the honest no-area phrasing instead of
    // "Computed from 0 m² façade" / "Berechnet aus 0 m² Fassade".
    const noAreaRe = lang === 'en'
      ? /façade area not captured|floor area only/u
      : /Fassade noch nicht erfasst|ausschließlich aus Wohnfläche/u
    const noAreaHit = noAreaRe.test(text)
    const noAreaMsg = `Berlin ${lang}: cost basis renders honest no-area fallback (Bug L)`
    if (noAreaHit) { console.log(`  ✓ ${noAreaMsg}`); passed++ }
    else { console.log(`  ✗ ${noAreaMsg}`); failed++ }
    const noZeroM2 = !/\b0\s*m²\s*(?:façade|Fassade)/u.test(text)
    const noZeroM2Msg = `Berlin ${lang}: no literal "0 m² Fassade/façade" leak (Bug L guard)`
    if (noZeroM2) { console.log(`  ✓ ${noZeroM2Msg}`); passed++ }
    else { console.log(`  ✗ ${noZeroM2Msg}`); failed++ }
    // v1.0.23 Bug N — system flags must never reach user-facing
    // tables. The wizard-internal "outside München acknowledged"
    // marker is the prototypical leak; any future system.*/
    // _acknowledged key is filtered by the same gate.
    const noSystemFlag = !/Outside Munich Acknowledged|Outside München Acknowledged/iu.test(text)
    const noSystemFlagMsg = `Berlin ${lang}: no "Outside Munich Acknowledged" system flag leak (Bug N)`
    if (noSystemFlag) { console.log(`  ✓ ${noSystemFlagMsg}`); passed++ }
    else { console.log(`  ✗ ${noSystemFlagMsg}`); failed++ }
    // v1.0.23 Bug P — priority pill labels render their full text
    // even when the title is long. We assert the full label string
    // appears in the rendered PDF text (i.e. no truncation like
    // "HOHE PRIORI" or "CO").
    const fullPriorityRe = lang === 'en'
      ? /HIGH PRIORITY|CONFIRM|RECOMMEND/u
      : /HOHE PRIORITÄT|BESTÄTIGEN|EMPFEHLUNG/u
    const fullPriorityHit = fullPriorityRe.test(text)
    const fullPriorityMsg = `Berlin ${lang}: priority pill label renders without truncation (Bug P)`
    if (fullPriorityHit) { console.log(`  ✓ ${fullPriorityMsg}`); passed++ }
    else { console.log(`  ✗ ${fullPriorityMsg}`); failed++ }
    // v1.0.22 Bug I — Cost basis line uses honest baseline framing,
    // not the v1.0.20 "regional BKI factor (Berlin)" string that
    // promised a regional adjustment the formula does not apply.
    // pdf-parse may split the rendered line across newlines on wrap;
    // use a token-pair check ([\s\S]) to survive that.
    const honestBasisRe = lang === 'en'
      ? /German\s+baseline[\s\S]{0,30}regional\s+variance/u
      : /deutscher\s+Basiswert[\s\S]{0,30}regionale\s+Varianz/u
    const honestBasisHit = honestBasisRe.test(text)
    const honestBasisMsg = `Berlin ${lang}: cost basis line uses honest "German baseline" framing (Bug I)`
    if (honestBasisHit) { console.log(`  ✓ ${honestBasisMsg}`); passed++ }
    else {
      const ctx = lang === 'en'
        ? text.match(/Computed[\s\S]{0,200}/u)?.[0]
        : text.match(/Berechnet[\s\S]{0,200}/u)?.[0]
      console.log(`  ✗ ${honestBasisMsg} — context: ${JSON.stringify(ctx ?? '(not found)')}`)
      failed++
    }
    const noRegionalBkiRe = lang === 'en'
      ? /regional BKI factor/u
      : /regionalem BKI-Faktor/u
    const noRegionalBkiHit = !noRegionalBkiRe.test(text)
    const noRegionalBkiMsg = `Berlin ${lang}: no misleading "regional BKI factor" label (Bug I guard)`
    if (noRegionalBkiHit) { console.log(`  ✓ ${noRegionalBkiMsg}`); passed++ }
    else { console.log(`  ✗ ${noRegionalBkiMsg}`); failed++ }
    // v1.0.22 Bug C — Berlin fixture has no Höhe and no Geschosse
    // facts, so deriveGebaeudeklasse returns honest deferral. The
    // PDF Key Data table must surface the deferral phrase (no
    // fabricated GK number).
    const gkDeferRe = lang === 'en'
      ? /eaves height not recorded/u
      : /Traufhöhe nicht erfasst/u
    const gkDeferHit = gkDeferRe.test(text)
    const gkDeferMsg = `Berlin ${lang}: Gebäudeklasse honest-deferral row present (Bug C)`
    if (gkDeferHit) { console.log(`  ✓ ${gkDeferMsg}`); passed++ }
    else {
      const ctxIdx = lang === 'de' ? text.indexOf('Gebäudeklasse') : text.indexOf('Building class')
      const ctx = ctxIdx >= 0 ? text.slice(Math.max(0, ctxIdx - 40), ctxIdx + 300) : '(label not found)'
      console.log(`  ✗ ${gkDeferMsg} — context: ${JSON.stringify(ctx)}`)
      failed++
    }
    // v1.0.22 Bug C — Berlin fixture must NOT contain a fabricated
    // GK number. The derivation returned klasse=null so no "GK N"
    // string from the derived row.
    const noFabricatedGk = !/\bGK\s+[1-5]\s*·\s*(?:CALCULATED|ASSUMED|BERECHNET|ANGENOMMEN)/u.test(text)
    const noFabricatedGkMsg = `Berlin ${lang}: no fabricated GK number when Höhe is unknown (Bug C guard)`
    if (noFabricatedGk) { console.log(`  ✓ ${noFabricatedGkMsg}`); passed++ }
    else { console.log(`  ✗ ${noFabricatedGkMsg}`); failed++ }
    // v1.0.21 Bug M — Berlin fixture has 2 active hard blockers
    // (mk_gebietsart + denkmalschutz). Confidence must be ≤ 45% per
    // the multiplicative-penalty design in docs/confidence-formula.md.
    // The cover renders the percent next to "CONFIDENCE" (EN) /
    // "VERTRAUEN" (DE); we extract it and assert the bound.
    const pctMatch = text.match(/(\d{1,3})\s*%/u)
    const confidencePct = pctMatch ? parseInt(pctMatch[1] ?? '0', 10) : 0
    const confidenceMsg = `Berlin ${lang}: confidence ≤ 45 with 2 hard blockers (got ${confidencePct})`
    if (confidencePct > 0 && confidencePct <= 45) { console.log(`  ✓ ${confidenceMsg}`); passed++ }
    else { console.log(`  ✗ ${confidenceMsg}`); failed++ }
  }
  return { passed, failed }
}

// v1.0.22 Bug C — unit-style tests for deriveGebaeudeklasse with
// synthetic inputs. Lighter than 4 extra PDF renders; verifies the
// MBO § 2 Abs. 3 logic directly. The end-to-end Berlin + NRW PDF
// assertions in runLocale + runCrossStateBleed cover the rendering
// integration.
// v1.0.22 Bug K — unit-style assertion for the runtime German-leak
// guard. Verifies the fire threshold + EN placeholder + DE passthrough
// in one go so smoke-pdf-text guards against any future regression on
// the rules without needing a full persona-output round-trip.
// v1.0.23 Bug D — address blob parser unit tests. The parser must
// split canonical German addresses into street/hausnummer/plz/stadt
// AND must refuse to parse blobs that lack a PLZ (5-digit code).
async function runAddressParserUnit(): Promise<{ passed: number; failed: number }> {
  console.log(`\n[smoke-pdf-text] address parser (Bug D)…`)
  const { parseAddressBlob, plzMatchesBundesland } = await import(
    '../src/lib/addressParser.ts'
  )
  let passed = 0
  let failed = 0
  const cases: Array<{
    blob: string
    expect:
      | { parsed: true; street: string; hausnummer: string; plz: string; stadt: string }
      | { parsed: false }
  }> = [
    {
      blob: 'Pariser Platz 1, 10117 Berlin',
      expect: { parsed: true, street: 'Pariser Platz', hausnummer: '1', plz: '10117', stadt: 'Berlin' },
    },
    {
      blob: 'Königsallee 30, 40212 Düsseldorf',
      expect: { parsed: true, street: 'Königsallee', hausnummer: '30', plz: '40212', stadt: 'Düsseldorf' },
    },
    {
      blob: 'Hauptstraße 12a, 80331 München',
      expect: { parsed: true, street: 'Hauptstraße', hausnummer: '12a', plz: '80331', stadt: 'München' },
    },
    {
      blob: 'just a string',
      expect: { parsed: false },
    },
  ]
  for (const c of cases) {
    const result = parseAddressBlob(c.blob)
    let ok = false
    let msg = ''
    if (c.expect.parsed === false) {
      ok = result.parsed === false
      msg = `parseAddressBlob('${c.blob}') refuses malformed input`
    } else {
      ok =
        result.parsed === true &&
        result.street === c.expect.street &&
        result.hausnummer === c.expect.hausnummer &&
        result.plz === c.expect.plz &&
        result.stadt === c.expect.stadt
      msg = `parseAddressBlob('${c.blob}') → { ${c.expect.street}, ${c.expect.hausnummer}, ${c.expect.plz}, ${c.expect.stadt} }`
    }
    if (ok) { console.log(`  ✓ ${msg}`); passed++ }
    else {
      console.log(`  ✗ ${msg} (got ${JSON.stringify(result)})`)
      failed++
    }
  }
  // PLZ-bundesland cross-check spot tests.
  const plzCases: Array<{ plz: string; bundesland: string; expect: boolean | null }> = [
    { plz: '80331', bundesland: 'bayern', expect: true },
    { plz: '10117', bundesland: 'berlin', expect: true },
    { plz: '40212', bundesland: 'nrw', expect: true },
    { plz: '80331', bundesland: 'berlin', expect: false },
    { plz: '10117', bundesland: 'bayern', expect: false },
  ]
  for (const c of plzCases) {
    const got = plzMatchesBundesland(c.plz, c.bundesland)
    const ok = got === c.expect
    const msg = `plzMatchesBundesland('${c.plz}', '${c.bundesland}') === ${c.expect}`
    if (ok) { console.log(`  ✓ ${msg}`); passed++ }
    else { console.log(`  ✗ ${msg} (got ${got})`); failed++ }
  }
  return { passed, failed }
}

// v1.0.23 Bug O — glossary page 12 must reflect the project's
// bundesland. Federal entries (BauGB, GEG, HOAI, BKI, ÖbVI, LP, KfW,
// Bauamt, Bauvorlageberechtigte, Verfahrensfreiheit) always present;
// state-specific BauO + DSchG entries swap per bundesland.
async function runGlossaryStateAwareCheck(): Promise<{ passed: number; failed: number }> {
  console.log(`\n[smoke-pdf-text] glossary state-awareness (Bug O)…`)
  let passed = 0
  let failed = 0
  // NRW: BauO NRW present; BayBO / BLfD absent.
  const nrwBytes = await renderFixturePdf('de', 'test/fixtures/nrw-t03-koenigsallee.json')
  const nrwText = await extractPdfText(nrwBytes)
  const nrwBauO = /BauO NRW/u.test(nrwText)
  const nrwNoBaybo = !/BayBO/u.test(nrwText) && !/BLfD/u.test(nrwText)
  const nrwBauGB = /BauGB/u.test(nrwText)
  if (nrwBauO) { console.log(`  ✓ NRW: glossary contains 'BauO NRW' (Bug O)`); passed++ }
  else { console.log(`  ✗ NRW: glossary contains 'BauO NRW' (Bug O)`); failed++ }
  if (nrwNoBaybo) { console.log(`  ✓ NRW: glossary does NOT contain BayBO/BLfD (Bug O guard)`); passed++ }
  else { console.log(`  ✗ NRW: glossary does NOT contain BayBO/BLfD (Bug O guard)`); failed++ }
  if (nrwBauGB) { console.log(`  ✓ NRW: glossary contains 'BauGB' (federal, always)`); passed++ }
  else { console.log(`  ✗ NRW: glossary contains 'BauGB' (federal, always)`); failed++ }
  // Bayern verified: BayBO + BLfD MUST be present (legitimate state).
  const bayBytes = await renderFixturePdf('de', 'test/fixtures/bayern-t03-verified.json')
  const bayText = await extractPdfText(bayBytes)
  const bayBayBO = /BayBO/u.test(bayText)
  const bayBLfD = /BLfD/u.test(bayText)
  if (bayBayBO) { console.log(`  ✓ Bayern: glossary contains 'BayBO' (Bug O)`); passed++ }
  else { console.log(`  ✗ Bayern: glossary contains 'BayBO' (Bug O)`); failed++ }
  if (bayBLfD) { console.log(`  ✓ Bayern: glossary contains 'BLfD' (Bug O)`); passed++ }
  else { console.log(`  ✗ Bayern: glossary contains 'BLfD' (Bug O)`); failed++ }
  // Berlin: honest-deferral phrasing.
  const berBytes = await renderFixturePdf('de', 'test/fixtures/berlin-t01-pariser-platz.json')
  const berText = await extractPdfText(berBytes)
  const berBauOBln = /BauO Berlin/u.test(berText)
  const berNoBayBO = !/BayBO/u.test(berText) && !/BLfD/u.test(berText) && !/BauO NRW/u.test(berText)
  if (berBauOBln) { console.log(`  ✓ Berlin: glossary mentions BauO Berlin (Bug O)`); passed++ }
  else { console.log(`  ✗ Berlin: glossary mentions BauO Berlin (Bug O)`); failed++ }
  if (berNoBayBO) { console.log(`  ✓ Berlin: glossary does NOT contain BayBO/BLfD/BauO NRW (Bug O guard)`); passed++ }
  else { console.log(`  ✗ Berlin: glossary does NOT contain BayBO/BLfD/BauO NRW (Bug O guard)`); failed++ }
  return { passed, failed }
}

// v1.0.23 Bug S — factLabels coverage on PDF page 10. The current
// fixture keys (fassadenflaeche_m2, klasse, denkmalschutz,
// ensembleschutz, eingriff_tragende_teile, eingriff_aussenhuelle,
// mk_gebietsart, bauvoranfrage_hard_blocker, aenderung_aeussere_
// erscheinung, energiestandard) must surface in both locales with
// proper labels — no humanize fallback ("Eingriff Tragende Teile",
// "Mk Gebietsart") leaking on the rendered PDF.
async function runFactLabelCoverageUnit(): Promise<{ passed: number; failed: number }> {
  console.log(`\n[smoke-pdf-text] factLabels coverage (Bug S)…`)
  const { factLabel } = await import('../src/lib/factLabel.ts')
  const { factLabelsDe } = await import('../src/locales/factLabels.de.ts')
  const { factLabelsEn } = await import('../src/locales/factLabels.en.ts')
  let passed = 0
  let failed = 0
  // Curated list — every fact key in the two smoke fixtures.
  const KEYS = [
    'fassadenflaeche_m2',
    'klasse',
    'energiestandard',
    'denkmalschutz',
    'ensembleschutz',
    'eingriff_tragende_teile',
    'eingriff_aussenhuelle',
    'aenderung_aeussere_erscheinung',
    'mk_gebietsart',
    'bauvoranfrage_hard_blocker',
  ]
  // Compute the humanize-fallback label exactly the way
  // src/lib/factLabel.ts:humanize does so the detector is precise.
  const humanize = (k: string): string =>
    k.split('.').map((seg) =>
      seg.split('_').map((w) => {
        if (w.length === 0) return w
        if (w === w.toUpperCase() && w.length <= 4) return w
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      }).join(' '),
    ).join(' · ')
  for (const lang of ['de', 'en'] as const) {
    const table = lang === 'en' ? factLabelsEn : factLabelsDe
    for (const key of KEYS) {
      const result = factLabel(key, lang)
      const explicitlyRegistered = key in table || key.toUpperCase() in table
      const usesHumanize = !explicitlyRegistered && result.label === humanize(key)
      const msg = `${lang}: factLabel('${key}') is registered (got '${result.label}')`
      if (explicitlyRegistered && !usesHumanize) { console.log(`  ✓ ${msg}`); passed++ }
      else { console.log(`  ✗ ${msg}`); failed++ }
    }
  }
  return { passed, failed }
}

// v1.0.23 Bug R — DESIGNER source must downgrade to LEGAL when no
// designer is invited. Renders both fixtures (Berlin / NRW with no
// invitedDesigner) and asserts no DESIGNER pill renders on page 10.
// The Bayern verified fixture HAS invitedDesigner, so DESIGNER pills
// must continue to render (regression guard).
async function runDesignerDowngradeCheck(): Promise<{ passed: number; failed: number }> {
  console.log(`\n[smoke-pdf-text] DESIGNER source downgrade (Bug R)…`)
  let passed = 0
  let failed = 0
  // Without invited designer → DESIGNER must be absent.
  for (const [label, fixturePath] of [
    ['Berlin', 'test/fixtures/berlin-t01-pariser-platz.json'],
    ['NRW', 'test/fixtures/nrw-t03-koenigsallee.json'],
  ] as const) {
    for (const lang of ['en', 'de'] as const) {
      const bytes = await renderFixturePdf(lang, fixturePath)
      const text = await extractPdfText(bytes)
      const designerPillRe = lang === 'en'
        ? /\bDESIGNER\s*·/u
        : /\bARCHITEKT:IN\s*·/u
      const noDesignerHit = !designerPillRe.test(text)
      const msg = `${label} ${lang}: no DESIGNER pill on project without invitedDesigner (Bug R)`
      if (noDesignerHit) { console.log(`  ✓ ${msg}`); passed++ }
      else { console.log(`  ✗ ${msg}`); failed++ }
    }
  }
  // Bayern verified fixture HAS invitedDesigner → DESIGNER pill CAN
  // render (regression guard — don't break the legitimate path).
  for (const lang of ['en', 'de'] as const) {
    const bytes = await renderFixturePdf(lang, 'test/fixtures/bayern-t03-verified.json')
    const text = await extractPdfText(bytes)
    const designerPillRe = lang === 'en'
      ? /\bDESIGNER\s*·/u
      : /\bARCHITEKT:IN\s*·/u
    const designerHit = designerPillRe.test(text)
    const msg = `Bayern verified ${lang}: DESIGNER pill renders when invitedDesigner set (Bug R regression guard)`
    if (designerHit) { console.log(`  ✓ ${msg}`); passed++ }
    else { console.log(`  ✗ ${msg}`); failed++ }
  }
  return { passed, failed }
}

// v1.0.23 Bug J — render the Bayern verified fixture and assert the
// 30-day "GÜLTIG 30 TAGE" / "VALID FOR 30 DAYS" stamp is replaced by
// the verification banner.
async function runVerifiedBannerCheck(): Promise<{ passed: number; failed: number }> {
  console.log(`\n[smoke-pdf-text] verified-project cover banner (Bug J)…`)
  let passed = 0
  let failed = 0
  for (const lang of ['en', 'de'] as const) {
    const bytes = await renderFixturePdf(lang, 'test/fixtures/bayern-t03-verified.json')
    const text = await extractPdfText(bytes)
    const verifiedRe = lang === 'en'
      ? /ARCHITECT-VERIFIED|SUBMITTED · Bauamt/u
      : /ARCHITEKT-VERIFIZIERT|EINGEREICHT · Bauamt/u
    const verifiedHit = verifiedRe.test(text)
    const verifiedMsg = `Bayern verified ${lang}: cover shows verification banner (Bug J)`
    if (verifiedHit) { console.log(`  ✓ ${verifiedMsg}`); passed++ }
    else { console.log(`  ✗ ${verifiedMsg}`); failed++ }
    const no30 = lang === 'en'
      ? !/VALID FOR 30 DAYS/u.test(text)
      : !/GÜLTIG 30 TAGE/u.test(text)
    const no30Msg = `Bayern verified ${lang}: no 30-day stamp on verified project (Bug J guard)`
    if (no30) { console.log(`  ✓ ${no30Msg}`); passed++ }
    else { console.log(`  ✗ ${no30Msg}`); failed++ }
  }
  return { passed, failed }
}

// v1.0.24 Bug R extension — normalizeDesignerWithoutInLoop now fires
// at Top-3 + Section VIII (in addition to v1.0.23's Key Data path).
// Unit-tests the gate function across the full quality matrix so a
// future maintainer touching Top-3 / Section VIII / KeyData can't
// silently regress.
async function runDesignerExtUnit(): Promise<{ passed: number; failed: number }> {
  console.log(`\n[smoke-pdf-text] DESIGNER-without-in-loop gate matrix (Bug R ext)…`)
  const { normalizeDesignerWithoutInLoop } = await import('../src/lib/qualifierNormalize.ts')
  let passed = 0
  let failed = 0
  const cases: Array<{
    name: string
    input: { source: string; quality: string }
    hasInvitedDesigner: boolean
    expectSource: string
    expectQuality: string
  }> = [
    {
      name: 'DESIGNER+CALCULATED, no designer → LEGAL+CALCULATED',
      input: { source: 'DESIGNER', quality: 'CALCULATED' },
      hasInvitedDesigner: false,
      expectSource: 'LEGAL',
      expectQuality: 'CALCULATED',
    },
    {
      name: 'DESIGNER+DECIDED, no designer → LEGAL+ASSUMED',
      input: { source: 'DESIGNER', quality: 'DECIDED' },
      hasInvitedDesigner: false,
      expectSource: 'LEGAL',
      expectQuality: 'ASSUMED',
    },
    {
      name: 'DESIGNER+ASSUMED, no designer → LEGAL+ASSUMED',
      input: { source: 'DESIGNER', quality: 'ASSUMED' },
      hasInvitedDesigner: false,
      expectSource: 'LEGAL',
      expectQuality: 'ASSUMED',
    },
    {
      name: 'DESIGNER+VERIFIED, no designer → LEGAL+ASSUMED',
      input: { source: 'DESIGNER', quality: 'VERIFIED' },
      hasInvitedDesigner: false,
      expectSource: 'LEGAL',
      expectQuality: 'ASSUMED',
    },
    {
      name: 'DESIGNER+CALCULATED, WITH designer → DESIGNER+CALCULATED (regression guard)',
      input: { source: 'DESIGNER', quality: 'CALCULATED' },
      hasInvitedDesigner: true,
      expectSource: 'DESIGNER',
      expectQuality: 'CALCULATED',
    },
    {
      name: 'LEGAL+CALCULATED unchanged regardless of designer state',
      input: { source: 'LEGAL', quality: 'CALCULATED' },
      hasInvitedDesigner: false,
      expectSource: 'LEGAL',
      expectQuality: 'CALCULATED',
    },
  ]
  for (const c of cases) {
    const result = normalizeDesignerWithoutInLoop(c.input, c.hasInvitedDesigner)
    const ok = result.source === c.expectSource && result.quality === c.expectQuality
    const msg = `${c.name}`
    if (ok) { console.log(`  ✓ ${msg}`); passed++ }
    else {
      console.log(`  ✗ ${msg} (got source=${result.source} quality=${result.quality})`)
      failed++
    }
  }
  return { passed, failed }
}

// v1.0.24 Bug Q extension — write-time gate now blocks
// CLIENT/USER/BAUHERR+VERIFIED in addition to DESIGNER+VERIFIED.
// Tests confirm the TS impl (parallel to the Deno tests in
// supabase/functions/chat-turn/qualifierGate.test.ts).
async function runWriteTimeGateUnit(): Promise<{ passed: number; failed: number }> {
  console.log(`\n[smoke-pdf-text] write-time qualifier gate (Bug Q ext)…`)
  const { gateQualifiersByRole } = await import('../src/lib/projectStateHelpers.ts')
  let passed = 0
  let failed = 0
  const mk = (source: string, quality: string) => ({
    specialist: 'moderator' as const,
    message_de: 'm',
    message_en: 'm',
    input_type: 'none' as const,
    extracted_facts: [{ key: 'test_key', value: 1, source: source as never, quality: quality as never }],
  })
  const cases: Array<{
    name: string
    input: ReturnType<typeof mk>
    expectEvents: number
    expectSource: string
    expectQuality: string
  }> = [
    {
      name: 'CLIENT+VERIFIED → CLIENT+DECIDED (Bug Q ext)',
      input: mk('CLIENT', 'VERIFIED'),
      expectEvents: 1,
      expectSource: 'CLIENT',
      expectQuality: 'DECIDED',
    },
    {
      name: 'BAUHERR+VERIFIED → CLIENT+DECIDED (alias)',
      input: mk('BAUHERR', 'VERIFIED'),
      expectEvents: 1,
      expectSource: 'CLIENT',
      expectQuality: 'DECIDED',
    },
    {
      name: 'USER+VERIFIED → CLIENT+DECIDED (alias)',
      input: mk('USER', 'VERIFIED'),
      expectEvents: 1,
      expectSource: 'CLIENT',
      expectQuality: 'DECIDED',
    },
    {
      name: 'AUTHORITY+VERIFIED → unchanged (legitimate signal)',
      input: mk('AUTHORITY', 'VERIFIED'),
      expectEvents: 0,
      expectSource: 'AUTHORITY',
      expectQuality: 'VERIFIED',
    },
    {
      name: 'LEGAL+VERIFIED → unchanged (legitimate signal)',
      input: mk('LEGAL', 'VERIFIED'),
      expectEvents: 0,
      expectSource: 'LEGAL',
      expectQuality: 'VERIFIED',
    },
    {
      name: 'CLIENT+DECIDED → unchanged (no-op when not VERIFIED)',
      input: mk('CLIENT', 'DECIDED'),
      expectEvents: 0,
      expectSource: 'CLIENT',
      expectQuality: 'DECIDED',
    },
  ]
  for (const c of cases) {
    const events = gateQualifiersByRole(c.input, 'client')
    const fact = c.input.extracted_facts[0]
    const ok =
      events.length === c.expectEvents &&
      fact.source === c.expectSource &&
      fact.quality === c.expectQuality
    const msg = `${c.name}`
    if (ok) { console.log(`  ✓ ${msg}`); passed++ }
    else {
      console.log(`  ✗ ${msg} (got events=${events.length} source=${fact.source} quality=${fact.quality})`)
      failed++
    }
  }
  return { passed, failed }
}

// v1.0.23 Bug N — unit-style tests for system-flag filter.
async function runSystemFlagFilterUnit(): Promise<{ passed: number; failed: number }> {
  console.log(`\n[smoke-pdf-text] system-flag filter (Bug N)…`)
  const { isSystemFlagKey } = await import('../src/legal/systemFlagFilter.ts')
  let passed = 0
  let failed = 0
  const cases: Array<{ key: string; expect: boolean }> = [
    { key: 'plot.outside_munich_acknowledged', expect: true },
    { key: 'system.coverage_mode', expect: true },
    { key: '_internal_render_token', expect: true },
    { key: '_system_seed', expect: true },
    { key: 'gdpr.acknowledged', expect: true },
    { key: 'opt_in_acknowledged', expect: true },
    { key: 'fassadenflaeche_m2', expect: false },
    { key: 'klasse', expect: false },
    { key: 'denkmalschutz', expect: false },
    { key: 'mk_gebietsart', expect: false },
  ]
  for (const c of cases) {
    const got = isSystemFlagKey(c.key)
    const ok = got === c.expect
    const msg = `isSystemFlagKey('${c.key}') === ${c.expect}`
    if (ok) { console.log(`  ✓ ${msg}`); passed++ }
    else { console.log(`  ✗ ${msg} (got ${got})`); failed++ }
  }
  return { passed, failed }
}

// v1.0.22 Bug B — assertion that the Overview DataQualityDonut, the
// cover confidence percent, and the PDF verification page all source
// from aggregateQualifiers(state) with the SAME denominator. The bug
// in v1.0.20 was that the verification page walked facts only while
// the donut walked all five qualifier-bearing categories.
async function runDenominatorUnit(): Promise<{ passed: number; failed: number }> {
  console.log(`\n[smoke-pdf-text] qualifier denominator unification (Bug B)…`)
  const { aggregateQualifiers } = await import('../src/features/result/lib/qualifierAggregate.ts')
  let passed = 0
  let failed = 0
  for (const [label, fixturePath] of [
    ['NRW Königsallee', 'test/fixtures/nrw-t03-koenigsallee.json'],
    ['Berlin Pariser Platz', 'test/fixtures/berlin-t01-pariser-platz.json'],
  ] as const) {
    const fixture = JSON.parse(readFileSync(join(REPO_ROOT, fixturePath), 'utf-8'))
    const state = fixture.project.state ?? {}
    const agg = aggregateQualifiers(state)
    const factsLen = (state.facts ?? []).length
    const procsLen = (state.procedures ?? []).length
    const docsLen = (state.documents ?? []).length
    const rolesLen = (state.roles ?? []).length
    const recsLen = (state.recommendations ?? []).length
    const expectedTotal = factsLen + procsLen + docsLen + rolesLen + recsLen
    const totalsMatch = agg.total === expectedTotal
    const msgT = `${label}: aggregateQualifiers walks all 5 categories (expected ${expectedTotal}, got ${agg.total})`
    if (totalsMatch) { console.log(`  ✓ ${msgT}`); passed++ }
    else { console.log(`  ✗ ${msgT}`); failed++ }
    // The bucket counts must sum to total (no items dropped).
    const sumOfCounts =
      agg.counts.DECIDED +
      agg.counts.CALCULATED +
      agg.counts.VERIFIED +
      agg.counts.ASSUMED +
      agg.counts.UNKNOWN
    const sumMatch = sumOfCounts === agg.total
    const msgS = `${label}: bucket counts sum to total (sum ${sumOfCounts}, total ${agg.total})`
    if (sumMatch) { console.log(`  ✓ ${msgS}`); passed++ }
    else { console.log(`  ✗ ${msgS}`); failed++ }
  }
  return { passed, failed }
}

// v1.0.22 Bug Q — unit-style tests for the qualifier normalization
// rules. Verifies CLIENT/USER/BAUHERR + VERIFIED gets downgraded to
// DECIDED, DESIGNER + VERIFIED gets downgraded to DECIDED, and the
// legitimate paths (LEGAL + VERIFIED, AUTHORITY + VERIFIED) pass
// through unchanged.
async function runQualifierNormalizeUnit(): Promise<{ passed: number; failed: number }> {
  console.log(`\n[smoke-pdf-text] qualifier normalization (Bug Q)…`)
  const { normalizeQualifier } = await import('../src/lib/qualifierNormalize.ts')
  let passed = 0
  let failed = 0
  const cases: Array<{
    name: string
    input: { source: string; quality: string }
    expectSource: string
    expectQuality: string
    expectDowngraded: boolean
  }> = [
    {
      name: 'CLIENT + VERIFIED → CLIENT + DECIDED',
      input: { source: 'CLIENT', quality: 'VERIFIED' },
      expectSource: 'CLIENT',
      expectQuality: 'DECIDED',
      expectDowngraded: true,
    },
    {
      name: 'BAUHERR + VERIFIED → CLIENT + DECIDED (alias map)',
      input: { source: 'BAUHERR', quality: 'VERIFIED' },
      expectSource: 'CLIENT',
      expectQuality: 'DECIDED',
      expectDowngraded: true,
    },
    {
      name: 'USER + VERIFIED → CLIENT + DECIDED (alias map)',
      input: { source: 'USER', quality: 'VERIFIED' },
      expectSource: 'CLIENT',
      expectQuality: 'DECIDED',
      expectDowngraded: true,
    },
    {
      name: 'DESIGNER + VERIFIED → DESIGNER + DECIDED (no architect loop yet)',
      input: { source: 'DESIGNER', quality: 'VERIFIED' },
      expectSource: 'DESIGNER',
      expectQuality: 'DECIDED',
      expectDowngraded: true,
    },
    {
      name: 'AUTHORITY + VERIFIED → AUTHORITY + VERIFIED (passthrough)',
      input: { source: 'AUTHORITY', quality: 'VERIFIED' },
      expectSource: 'AUTHORITY',
      expectQuality: 'VERIFIED',
      expectDowngraded: false,
    },
    {
      name: 'LEGAL + VERIFIED → LEGAL + VERIFIED (passthrough)',
      input: { source: 'LEGAL', quality: 'VERIFIED' },
      expectSource: 'LEGAL',
      expectQuality: 'VERIFIED',
      expectDowngraded: false,
    },
    {
      name: 'CLIENT + DECIDED → CLIENT + DECIDED (no-op when not VERIFIED)',
      input: { source: 'CLIENT', quality: 'DECIDED' },
      expectSource: 'CLIENT',
      expectQuality: 'DECIDED',
      expectDowngraded: false,
    },
  ]
  for (const c of cases) {
    const result = normalizeQualifier(c.input)
    const ok =
      result.source === c.expectSource &&
      result.quality === c.expectQuality &&
      result.downgraded === c.expectDowngraded
    const msg = `${c.name}`
    if (ok) { console.log(`  ✓ ${msg}`); passed++ }
    else {
      console.log(`  ✗ ${msg} (got source=${result.source} quality=${result.quality} downgraded=${result.downgraded})`)
      failed++
    }
  }
  return { passed, failed }
}

async function runGermanLeakGuardUnit(): Promise<{ passed: number; failed: number }> {
  console.log(`\n[smoke-pdf-text] German-leak guard (Bug K)…`)
  const { sanitizeGermanContentOnEnglish } = await import('../src/legal/germanLeakGuard.ts')
  let passed = 0
  let failed = 0
  const cases: Array<{ name: string; text: string; lang: 'en' | 'de'; expectPlaceholder: boolean }> = [
    {
      name: 'EN with 3 German content tokens → placeholder',
      text: 'Zwei harte Blocker festgestellt — Voranfrage-Strategie beschlossen, Denkmalschutz identifiziert.',
      lang: 'en',
      expectPlaceholder: true,
    },
    {
      name: 'EN with proper English content → passthrough',
      text: 'Two hard blockers identified by the Bauamt; pre-decision recommended.',
      lang: 'en',
      expectPlaceholder: false,
    },
    {
      name: 'DE with German content → passthrough (regression guard)',
      text: 'Zwei harte Blocker festgestellt — Voranfrage erforderlich.',
      lang: 'de',
      expectPlaceholder: false,
    },
    {
      name: 'EN with single legal anchor "Bauamt" → passthrough (no false-positive)',
      text: 'Check with the local Bauamt before LP 3.',
      lang: 'en',
      expectPlaceholder: false,
    },
  ]
  for (const c of cases) {
    const result = sanitizeGermanContentOnEnglish(c.text, c.lang)
    const isPlaceholder = /\(German content; English translation pending\)/.test(result)
    const ok = c.expectPlaceholder ? isPlaceholder : !isPlaceholder
    const msg = `${c.name}`
    if (ok) { console.log(`  ✓ ${msg}`); passed++ }
    else { console.log(`  ✗ ${msg} (got: ${JSON.stringify(result.slice(0, 60))})`); failed++ }
  }
  return { passed, failed }
}

async function runDeriveGkUnit(): Promise<{ passed: number; failed: number }> {
  console.log(`\n[smoke-pdf-text] Gebäudeklasse derivation (MBO § 2 Abs. 3)…`)
  const { deriveGebaeudeklasse } = await import('../src/legal/deriveGebaeudeklasse.ts')
  let passed = 0
  let failed = 0
  const cases: Array<{
    name: string
    input: Parameters<typeof deriveGebaeudeklasse>[0]
    expectKlasse: number | null
    expectQualifier: 'CALCULATED' | 'ASSUMED'
  }> = [
    {
      name: '2-storey EFH 6m eaves freistehend → GK 1',
      input: {
        hoeheM: 6,
        geschosse: 2,
        freistehend: true,
        nutzungseinheitenAnzahl: 1,
        nutzungseinheitenGroesseMaxM2: 180,
        templateId: 'T-01',
      },
      expectKlasse: 1,
      expectQualifier: 'CALCULATED',
    },
    {
      name: '2-storey EFH 9m eaves freistehend → GK 4',
      input: {
        hoeheM: 9,
        geschosse: 2,
        freistehend: true,
        nutzungseinheitenAnzahl: 1,
        nutzungseinheitenGroesseMaxM2: 180,
        templateId: 'T-01',
      },
      expectKlasse: 4,
      expectQualifier: 'CALCULATED',
    },
    {
      name: '4-storey MFH 12m eaves → GK 4',
      input: {
        hoeheM: 12,
        geschosse: 4,
        freistehend: false,
        nutzungseinheitenAnzahl: 8,
        nutzungseinheitenGroesseMaxM2: 120,
        templateId: 'T-02',
      },
      expectKlasse: 4,
      expectQualifier: 'CALCULATED',
    },
    {
      name: '6-storey MFH 18m eaves → GK 5',
      input: {
        hoeheM: 18,
        geschosse: 6,
        freistehend: false,
        nutzungseinheitenAnzahl: 12,
        nutzungseinheitenGroesseMaxM2: 130,
        templateId: 'T-02',
      },
      expectKlasse: 5,
      expectQualifier: 'CALCULATED',
    },
    {
      name: 'EFH unknown eaves → honest deferral (klasse=null)',
      input: { templateId: 'T-01' },
      expectKlasse: null,
      expectQualifier: 'ASSUMED',
    },
  ]
  for (const c of cases) {
    const result = deriveGebaeudeklasse(c.input)
    const ok =
      result.klasse === c.expectKlasse && result.qualifier === c.expectQualifier
    const msg = `${c.name} (got klasse=${result.klasse ?? 'null'} qualifier=${result.qualifier})`
    if (ok) { console.log(`  ✓ ${msg}`); passed++ }
    else { console.log(`  ✗ ${msg}`); failed++ }
  }
  return { passed, failed }
}

async function main(): Promise<void> {
  const en = await runLocale('en')
  const de = await runLocale('de')
  const bleed = await runCrossStateBleed()
  const gkUnit = await runDeriveGkUnit()
  const germanLeak = await runGermanLeakGuardUnit()
  const qualifierUnit = await runQualifierNormalizeUnit()
  const denominator = await runDenominatorUnit()
  const sysFlag = await runSystemFlagFilterUnit()
  const verifiedBanner = await runVerifiedBannerCheck()
  const designerDowngrade = await runDesignerDowngradeCheck()
  const factLabelCoverage = await runFactLabelCoverageUnit()
  const glossaryStateAware = await runGlossaryStateAwareCheck()
  const addressParser = await runAddressParserUnit()
  const writeTimeGate = await runWriteTimeGateUnit()
  const designerExt = await runDesignerExtUnit()
  const totalFailed =
    en.failed +
    de.failed +
    bleed.failed +
    gkUnit.failed +
    germanLeak.failed +
    qualifierUnit.failed +
    denominator.failed +
    sysFlag.failed +
    verifiedBanner.failed +
    designerDowngrade.failed +
    factLabelCoverage.failed +
    glossaryStateAware.failed +
    addressParser.failed +
    writeTimeGate.failed +
    designerExt.failed
  const totalPassed =
    en.passed +
    de.passed +
    bleed.passed +
    gkUnit.passed +
    germanLeak.passed +
    qualifierUnit.passed +
    denominator.passed +
    sysFlag.passed +
    verifiedBanner.passed +
    designerDowngrade.passed +
    factLabelCoverage.passed +
    glossaryStateAware.passed +
    addressParser.passed +
    writeTimeGate.passed +
    designerExt.passed
  console.log(`\n[smoke-pdf-text] ${totalPassed} passed · ${totalFailed} failed`)
  if (totalFailed > 0) {
    console.log('[smoke-pdf-text] FAIL — see violations above.')
    process.exit(1)
  }
  console.log('[smoke-pdf-text] OK')
  process.exit(0)
}

main().catch((err) => {
  console.error('[smoke-pdf-text] ERROR:', err)
  process.exit(1)
})
