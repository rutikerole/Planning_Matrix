// Phase 3 dev-only: print the composed legalContext prefix.
// Run via:  node scripts/dev/print-composed-prompt.mjs
//
// Re-imports each slice as plain text via the file system rather
// than via the TS module graph (Deno-side `.ts` imports don't
// resolve in Node without transpile). Approximate token count =
// chars / 4 (rough English-text rule of thumb; German runs slightly
// higher).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..', '..')
const slicesDir = join(root, 'supabase/functions/chat-turn/legalContext')

// Phase 5: active city is München. Erlangen slice is parked (see
// legalContext/compose.ts comment). Update this list whenever the
// composer's active-city slice changes.
const files = ['shared.ts', 'federal.ts', 'bayern.ts', 'muenchen.ts']

const blocks = files.map((f) => {
  const src = readFileSync(join(slicesDir, f), 'utf8')
  // Crude: slice between the FIRST backtick and the LAST backtick.
  const start = src.indexOf('`')
  const end = src.lastIndexOf('`')
  return src.slice(start + 1, end)
})

const composed = blocks.join('\n\n---\n\n') + `

══════════════════════════════════════════════════════════════════════════
PROJEKTKONTEXT
══════════════════════════════════════════════════════════════════════════

Es folgt der aktuelle Projektzustand: Template, Grundstück, A/B/C-Bereiche,
jüngste Fakten, vorhandene Top-3-Empfehlungen, zuletzt gestellte Fragen,
jüngste Bauherreneingabe und letzte sprechende Fachperson.
`

console.log(composed)
console.error('---')
console.error(`Composed prompt: ${composed.length.toLocaleString()} chars`)
console.error(`Approx tokens (chars/4): ${Math.round(composed.length / 4).toLocaleString()}`)
console.error(`Per-slice line counts:`)
files.forEach((f, i) => {
  console.error(`  ${f.padEnd(14)} ${blocks[i].split('\n').length.toString().padStart(4)} lines`)
})
