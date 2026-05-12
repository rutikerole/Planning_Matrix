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
async function renderFixturePdf(lang: 'en' | 'de'): Promise<Uint8Array> {
  const fixturePath = join(REPO_ROOT, 'test/fixtures/nrw-t03-koenigsallee.json')
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
    {
      pass: /LEGAL\s*·\s*ASSUMED/u.test(text),
      msg: 'Area A qualifier honestly tagged LEGAL · ASSUMED (Bug 44)',
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

async function main(): Promise<void> {
  const en = await runLocale('en')
  const de = await runLocale('de')
  const totalFailed = en.failed + de.failed
  const totalPassed = en.passed + de.passed
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
