// audit:zindex — D-13 drift guard for the central z-index scale.
//
// Rule: page-level stacking (|z| >= 10) must route through the token
// scale defined in src/styles/globals.css (--z-behind … --z-skiplink)
// via `z-[var(--z-…)]` (Tailwind) or `z-index: var(--z-…)` (CSS).
// Component-local micro-stacking (z-0, z-auto, z-[1]…z-[9]) is free.
//
// Legacy surfaces not yet migrated are pinned in ALLOWLIST below —
// shrink it, never grow it. New raw z-index values anywhere else fail
// the prebuild.
//
// Run: npm run audit:zindex

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const SRC = join(ROOT, 'src')

// Legacy debt — surfaces outside the Phase-D UI sweep. Do NOT add to
// this list; migrate the file to the token scale instead.
const ALLOWLIST = [
  'features/landing/',
  'features/auth/',
  'features/wizard/',
  'features/not-found/',
  'features/admin/AtelierConsoleLayout.tsx',
]

// Tailwind numeric classes >= 10 (z-10/20/30/40/50, incl. -z-10) and
// arbitrary values that are not var(--z-…) and not a 1-digit literal.
const TW_RAW = /(?<![\w-])-?z-(?:10|20|30|40|50)(?![\w-])|(?<![\w-])-?z-\[(?!var\(--z-)(?!\d\])[^\]]+\]/g
// Raw CSS declarations with |value| >= 10.
const CSS_RAW = /z-index:\s*-?(?:[1-9]\d+)\b/g

const failures = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      walk(full)
      continue
    }
    if (!/\.(tsx?|css)$/.test(name)) continue
    const rel = relative(SRC, full)
    if (ALLOWLIST.some((a) => rel.startsWith(a) || rel === a)) continue
    const lines = readFileSync(full, 'utf8').split('\n')
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\/?\*)/.test(line)) return // comments
      for (const re of [TW_RAW, CSS_RAW]) {
        re.lastIndex = 0
        const m = re.exec(line)
        if (m) failures.push(`src/${rel}:${i + 1} → ${m[0]}`)
      }
    })
  }
}

walk(SRC)

if (failures.length > 0) {
  console.error(
    `[audit:zindex] FAIL — ${failures.length} raw z-index value(s) outside the token scale.\n` +
      'Use z-[var(--z-…)] from the scale in src/styles/globals.css (search "--z-").\n',
  )
  for (const f of failures) console.error('  ' + f)
  process.exit(1)
}
console.log('[audit:zindex] OK — all page-level z-index values route through the --z-* token scale.')
