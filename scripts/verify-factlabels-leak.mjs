// ───────────────────────────────────────────────────────────────────────
// verify:factlabels-leak — Bucket A.1 regression guard.
//
// Closes docs/COVERAGE_TRUTH_TABLE.md §3 L1: pan-German fact-key labels
// must NOT carry Bayern-specific § / authority / region tokens. Such labels
// fire on every non-Bayern project in the Facts UI cards via factLabel.ts:27
// (the resolver only switches DE↔EN, never by bundesland), silently
// asserting Bayern law on Hessen/NRW/SN/… projects.
//
// Mechanism: parse src/locales/factLabels.{de,en}.ts line-by-line, track the
// most recently opened key, and for every `label: '…'` assignment scan the
// string for forbidden tokens. Keys whose NAME itself encodes Bayern scope
// (PV_PFLICHT_BAYERN, BLfD, LBK) are allowlisted — their labels are honest
// reflections of the key, not silent assertions.
//
// Read-only. Append to ALLOWLIST only when the key name encodes the scope
// (so a non-Bayern project would never emit the key in the first place).
// ───────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const FILES = [
  'src/locales/factLabels.de.ts',
  'src/locales/factLabels.en.ts',
]

// Keys whose name encodes Bayern scope. Labels for these keys may legitimately
// name Bayern / BLfD / LBK — the scope is honest, not silent.
const ALLOWLIST = new Set([
  'ENERGY.PV_PFLICHT_BAYERN',
  'HERITAGE.BLfD_ENQUIRY_REQUIRED',
  'PLOT.LBK_SUB_OFFICE',
])

// Forbidden tokens in label text. \b boundaries guard against false positives
// inside other words. Order doesn't matter — first match wins per label.
const FORBIDDEN = [
  { token: 'BayBO', re: /\bBayBO\b/ },
  { token: 'BayDSchG', re: /\bBayDSchG\b/ },
  { token: 'BayNatSchG', re: /\bBayNatSchG\b/ },
  { token: 'Bayerisch', re: /\bBayerisch\w*\b/ },
  { token: 'Bavarian', re: /\bBavarian\b/ },
  { token: 'Bavaria', re: /\bBavaria\b/ },
  { token: 'Bayern', re: /\bBayern\b/ },
  { token: 'München', re: /\bMünchen\b/ },
  { token: 'Munich', re: /\bMunich\b/ },
  { token: 'BAYAK', re: /\bBAYAK\b/ },
]

const violations = []
let labelsScanned = 0

for (const rel of FILES) {
  const path = join(ROOT, rel)
  const text = readFileSync(path, 'utf8')
  const lines = text.split('\n')
  let currentKey = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const keyMatch = line.match(/^\s*['"]([^'"]+)['"]\s*:\s*\{/)
    if (keyMatch) currentKey = keyMatch[1]
    const labelMatch = line.match(/label\s*:\s*['"]([^'"]+)['"]/)
    if (labelMatch && currentKey) {
      labelsScanned++
      if (ALLOWLIST.has(currentKey)) continue
      const label = labelMatch[1]
      for (const { token, re } of FORBIDDEN) {
        if (re.test(label)) {
          violations.push({
            file: rel,
            line: i + 1,
            key: currentKey,
            label,
            token,
          })
          break
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error('[verify:factlabels-leak] FAIL — Bayern token in pan-German fact label:')
  console.error('')
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`)
    console.error(`    key:   '${v.key}'`)
    console.error(`    label: '${v.label}'`)
    console.error(`    token: '${v.token}'`)
    console.error('')
  }
  console.error('Fix: strip the parenthetical state citation from the label.')
  console.error('If the KEY name itself encodes Bayern scope (e.g. *_BAYERN, BLfD_*,')
  console.error('LBK_*), add it to ALLOWLIST in scripts/verify-factlabels-leak.mjs.')
  process.exit(1)
}

console.log(
  `[verify:factlabels-leak] OK — ${labelsScanned} fact labels scanned across ` +
    `${FILES.length} files; no Bayern-specific tokens in pan-German labels.`,
)
console.log(
  `  Allowlisted keys (Bayern scope encoded in key name): ${[...ALLOWLIST].join(', ')}`,
)
