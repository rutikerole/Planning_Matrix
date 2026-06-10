#!/usr/bin/env -S npx tsx
// ───────────────────────────────────────────────────────────────────────
// ITEM E — DOC NO vs displayed-Created date alignment (UTC basis).
//
// deriveDocNo builds PM-YYYY-MMDD-… from created_at via getUTCDate. The
// displayed "Created" date (PDF cover + .md header) used LOCAL TZ, so across
// the UTC-midnight boundary they disagreed by one day (docno "0610" on a
// local-"11 June" doc). Both displays now use timeZone:'UTC' → aligned.
//
// Deterministic regardless of the machine TZ (the whole point of the fix).
// Run: npx tsx scripts/smoke-docno-date.mts  (npm run smoke:docno-date)
// ───────────────────────────────────────────────────────────────────────

import { deriveDocNo, formatCoverDate } from '../src/features/chat/lib/pdfSections/cover.ts'
import { buildExportMarkdown } from '../src/lib/export/exportMarkdown.ts'

let pass = 0
let fail = 0
const ok = (cond: boolean, msg: string): void => {
  if (cond) { pass++; console.log(`  ✓ ${msg}`) }
  else { fail++; console.error(`  ✗ ${msg}`) }
}

// created_at at 23:30 UTC June 10 — June 11 in any positive-offset TZ (CEST).
const iso = '2026-06-10T23:30:00Z'
const id = 'c1b4cbf5eec14a2692219f19beeec10b'

const docno = deriveDocNo(id, iso, 'Change of use')
ok(/^PM-2026-0610-/.test(docno), `docno is UTC-dated 0610: ${docno}`)

const cover = formatCoverDate(iso, 'en')
ok(/\b10 June 2026\b/.test(cover), `PDF cover date UTC-aligned to the docno (10 June, not 11): "${cover}"`)

const project = { id, name: 'Change of use', created_at: iso, bundesland: 'saarland', intent: 'umnutzung', template_id: 'T-04', status: 'in_progress', state: {} } as never
const md = buildExportMarkdown({ project, events: [], lang: 'en' })
const created = md.split('\n').find((l) => l.startsWith('**Created:')) ?? ''
ok(/10 June 2026/.test(created), `markdown Created header UTC-aligned to the docno: "${created.trim()}"`)

// Non-vacuous: the docno MM-DD day must equal the displayed day (no off-by-one).
const docnoDay = docno.match(/^PM-2026-06(\d\d)-/)?.[1]
ok(docnoDay === '10' && /10 June/.test(cover) && /10 June/.test(created), `docno day (${docnoDay}) == displayed day (10) — no off-by-one`)

console.log(`\n${pass} passed · ${fail} failed`)
if (fail > 0) process.exit(1)
