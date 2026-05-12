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

async function runLocale(lang: 'en' | 'de'): Promise<{ passed: number; failed: number }> {
  console.log(`\n[smoke-pdf-text] rendering ${lang}…`)
  const pdfBytes = await renderFixturePdf(lang)
  console.log(`[smoke-pdf-text] ${lang} PDF: ${pdfBytes.length} bytes`)
  const text = await extractPdfText(pdfBytes)
  console.log(`[smoke-pdf-text] ${lang} extracted text: ${text.length} chars`)

  // Common assertions
  let assertions: Assertion[] = [
    ...assertNoCorruption(text),
    { pass: /Königsallee/u.test(text), msg: 'project address rendered' },
    { pass: /Planning\s*Matrix|PLANNING\s*MATRIX/u.test(text), msg: 'wordmark rendered' },
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
