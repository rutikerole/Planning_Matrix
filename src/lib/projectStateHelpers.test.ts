// @ts-nocheck — node:test types may not be installed in tsconfig.app.json's lib;
// this file runs via `node --test src/lib/projectStateHelpers.test.ts` once a
// transform-types loader is available, or once Vitest is added in Phase 4.
// For now it documents the expected behaviour and serves as a runnable
// regression for the Top-3 numbering fix (Phase 3.1 commit #29) and the
// recommendations cap (commit #30 / D14).
//
// Run (Node 22+ with --experimental-transform-types):
//   node --experimental-transform-types --test src/lib/projectStateHelpers.test.ts

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  applyRecommendationsDelta,
  initialProjectState,
  normalizeRecommendations,
} from './projectStateHelpers'

test('applyRecommendationsDelta normalises overlapping ranks to 1..N (Phase 3.1 #29)', () => {
  const seeded = initialProjectState('T-01')
  const next = applyRecommendationsDelta(seeded, [
    {
      op: 'upsert',
      id: 'rec_a',
      rank: 1,
      title_de: 'A',
      title_en: 'A',
      detail_de: '...',
      detail_en: '...',
    },
    {
      op: 'upsert',
      id: 'rec_b',
      rank: 1, // overlapping rank
      title_de: 'B',
      title_en: 'B',
      detail_de: '...',
      detail_en: '...',
    },
    {
      op: 'upsert',
      id: 'rec_c',
      rank: 2,
      title_de: 'C',
      title_en: 'C',
      detail_de: '...',
      detail_en: '...',
    },
  ])

  // Expected: ranks become 1, 2, 3 (sorted by rank then createdAt).
  // rec_a and rec_b both have rank 1; createdAt tiebreaker is applied.
  assert.equal(next.recommendations.length, 3)
  assert.deepEqual(
    next.recommendations.map((r) => r.rank),
    [1, 2, 3],
  )
  // rec_c had rank 2, should land at position 3 after rec_a/rec_b's tie resolves.
  assert.equal(next.recommendations[2].id, 'rec_c')
})

test('normalizeRecommendations caps at 12 entries dropping the highest ranks', () => {
  const fifteen = Array.from({ length: 15 }, (_, i) => ({
    id: `rec_${i}`,
    rank: i + 1,
    title_de: `T${i}`,
    title_en: `T${i}`,
    detail_de: '',
    detail_en: '',
    ctaLabel_de: undefined,
    ctaLabel_en: undefined,
    createdAt: new Date(Date.now() + i).toISOString(),
  }))
  const capped = normalizeRecommendations(fifteen)
  assert.equal(capped.length, 12)
  assert.deepEqual(
    capped.map((r) => r.rank),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  )
  assert.equal(capped[0].id, 'rec_0')
  assert.equal(capped[11].id, 'rec_11')
})
