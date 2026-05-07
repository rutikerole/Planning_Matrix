#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────
// Bayern composed-prefix SHA verifier.
//
// Prints the current SHA + the frozen expected baseline. Exits 0 on
// match, 1 on mismatch. Used during Phase 12 commit-by-commit work
// to confirm Bayern is untouched after every state-content commit
// without running the full smokeWalk static gate.
//
// Run:
//   node scripts/verify-bayern-sha.mjs
//   npm run verify:bayern-sha
// ───────────────────────────────────────────────────────────────────────

import { computeBayernSha, EXPECTED_BAYERN_SHA } from './lib/bayernSha.mjs'

const { sha, length } = await computeBayernSha()
const ok = sha === EXPECTED_BAYERN_SHA

console.log(`Bayern composed-prefix length: ${length} chars`)
console.log(`Bayern composed-prefix SHA-256: ${sha}`)
console.log(`Expected baseline:              ${EXPECTED_BAYERN_SHA}`)
console.log(ok ? '✓ MATCH — Bayern unchanged' : '✗ MISMATCH — Bayern content drifted')
process.exit(ok ? 0 : 1)
