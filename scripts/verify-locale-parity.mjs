// ───────────────────────────────────────────────────────────────────────
// Phase 3.7 #81 — Build-time DE/EN parity gate
//
// Wired as `prebuild` in package.json (Q5 locked: fail build on
// divergence). Catches missing-key regressions before they ship.
// Run standalone via `npm run verify:locales`.
//
// Plain .mjs (no tsx dep). Reads both locale JSON files, computes the
// scalar leaf path set for each, fails if they diverge.
// ───────────────────────────────────────────────────────────────────────

import fs from 'node:fs'
import path from 'node:path'

const FILES = [
  { path: 'src/locales/de.json', label: 'de.json' },
  { path: 'src/locales/en.json', label: 'en.json' },
]

function paths(obj, prefix = '') {
  if (typeof obj !== 'object' || obj === null) return [prefix]
  if (Array.isArray(obj)) {
    return obj.flatMap((v, i) => paths(v, `${prefix}.${i}`))
  }
  return Object.entries(obj).flatMap(([k, v]) =>
    paths(v, prefix ? `${prefix}.${k}` : k),
  )
}

function loadFile(p) {
  const abs = path.resolve(p)
  if (!fs.existsSync(abs)) {
    console.error(`[verify:locales] missing: ${p}`)
    process.exit(1)
  }
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf-8'))
  } catch (err) {
    console.error(`[verify:locales] cannot parse ${p}:`, err)
    process.exit(1)
  }
}

const [de, en] = FILES.map((f) => loadFile(f.path))
const dePaths = new Set(paths(de))
const enPaths = new Set(paths(en))
const onlyDe = [...dePaths].filter((p) => !enPaths.has(p)).sort()
const onlyEn = [...enPaths].filter((p) => !dePaths.has(p)).sort()

if (onlyDe.length > 0 || onlyEn.length > 0) {
  console.error('[verify:locales] FAIL — locale parity violated:')
  if (onlyDe.length > 0) {
    console.error(`  DE has ${onlyDe.length} key(s) EN is missing:`)
    for (const k of onlyDe) console.error(`    - ${k}`)
  }
  if (onlyEn.length > 0) {
    console.error(`  EN has ${onlyEn.length} key(s) DE is missing:`)
    for (const k of onlyEn) console.error(`    - ${k}`)
  }
  process.exit(1)
}

console.log(`[verify:locales] OK — ${dePaths.size} keys, parity ✓`)
