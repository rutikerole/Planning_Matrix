// ───────────────────────────────────────────────────────────────────────
// v1.0.30 Bug 88 (C2 bonus) — pdfStrings.ts EN/DE parity gate.
//
// `verify:locales` covers only src/locales/{de,en}.json. The PDF string
// table (src/features/chat/lib/pdfStrings.ts) is a separate, hand-maintained
// pair of sibling objects `EN` + `DE`. A key added to one and not the other
// silently falls through `pdfStr()` to the raw key in the exported PDF —
// exactly the class of leak the T-04 walk surfaced. This gate fails the build
// on any drift between the two blocks.
//
// Wired as part of `prebuild` in package.json. Run standalone via
// `npm run verify:pdfstrings`.
// ───────────────────────────────────────────────────────────────────────
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FILE = path.resolve(__dirname, '../src/features/chat/lib/pdfStrings.ts')

const src = fs.readFileSync(FILE, 'utf-8')

/** Slice the file between two anchor markers (end exclusive). */
function block(startMarker, endMarker) {
  const start = src.indexOf(startMarker)
  if (start === -1) {
    console.error(`[verify:pdfstrings] anchor not found: ${startMarker}`)
    process.exit(1)
  }
  const end = src.indexOf(endMarker, start + startMarker.length)
  if (end === -1) {
    console.error(`[verify:pdfstrings] anchor not found: ${endMarker}`)
    process.exit(1)
  }
  return src.slice(start, end)
}

/** Collect the 2-space-indented object keys ('key':) from a block. */
function keysOf(blockText) {
  const set = new Set()
  const re = /^ {2}'([^']+)':/gm
  let m
  while ((m = re.exec(blockText)) !== null) set.add(m[1])
  return set
}

const enKeys = keysOf(block('const EN: PdfStrings = {', 'const DE: PdfStrings = {'))
const deKeys = keysOf(block('const DE: PdfStrings = {', 'export const PDF_STRINGS'))

const missingInDe = [...enKeys].filter((k) => !deKeys.has(k))
const missingInEn = [...deKeys].filter((k) => !enKeys.has(k))

if (missingInDe.length || missingInEn.length) {
  console.error('[verify:pdfstrings] FAIL — EN/DE parity violated in pdfStrings.ts:')
  if (missingInDe.length) console.error(`  missing in DE: ${missingInDe.join(', ')}`)
  if (missingInEn.length) console.error(`  missing in EN: ${missingInEn.join(', ')}`)
  process.exit(1)
}

console.log(`[verify:pdfstrings] OK — ${enKeys.size} keys, EN/DE parity ✓`)
