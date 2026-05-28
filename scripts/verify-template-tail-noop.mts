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

// Empty at B0. Append `<T>:<bundesland>` (e.g. `'T-02:nrw'`) when a
// content author fills a verified state-specific addendum.
const ACKNOWLEDGED_OVERRIDES: ReadonlySet<string> = new Set<string>([])

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
