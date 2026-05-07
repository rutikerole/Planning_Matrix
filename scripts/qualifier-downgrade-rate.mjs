#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────────
// Phase 13 Week 4 — qualifier-downgrade-rate.mjs
//
// Operator-facing CLI that reads the rolling-7-day qualifier metrics
// from public.qualifier_rates_7d_global / per_project / field_breakdown
// and prints a compact table to stdout. Used for ad-hoc audits during
// the gate's lifetime and as the data source for the 13b conditional
// trigger (>5 downgrade+rejected events / 7-day window with at least
// 100 turns; see 0029_qualifier_metrics_view.sql for the predicate).
//
// Required env (one-time set, mirrors smokeWalk live env discipline):
//   SMOKE_SUPABASE_URL          — https://<project>.supabase.co
//   SMOKE_SUPABASE_SERVICE_KEY  — service-role key (read-only access
//                                   is enough; views grant select to
//                                   authenticated, but the script is
//                                   intended for CI/operator use).
//
// Usage:
//   node scripts/qualifier-downgrade-rate.mjs            # global
//   node scripts/qualifier-downgrade-rate.mjs --per-project
//   node scripts/qualifier-downgrade-rate.mjs --field-breakdown
//
// Exit codes:
//   0 — read succeeded (regardless of the rate value).
//   1 — env missing OR query errored.
//   2 — read succeeded AND the 13b threshold is exceeded
//        (downgraded+rejected > 5 AND turns_count >= 100).
//        Lets CI workflows fail loudly when the gate's false-positive
//        rate looks elevated. Off by default for routine operator runs.
// ───────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SMOKE_SUPABASE_URL
const SERVICE_KEY = process.env.SMOKE_SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '[qualifier-downgrade-rate] missing env. Set SMOKE_SUPABASE_URL and ' +
      'SMOKE_SUPABASE_SERVICE_KEY (service-role key, used for read-only ' +
      'access to the qualifier_rates_7d_* views).',
  )
  process.exit(1)
}

const args = new Set(process.argv.slice(2))
const FAIL_ON_THRESHOLD = args.has('--fail-on-threshold')
const SHOW_PER_PROJECT = args.has('--per-project')
const SHOW_FIELD_BREAKDOWN = args.has('--field-breakdown')

const client = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: globalRow, error: globalErr } = await client
  .from('qualifier_rates_7d_global')
  .select('*')
  .maybeSingle()

if (globalErr) {
  console.error(`[qualifier-downgrade-rate] global query failed: ${globalErr.message}`)
  process.exit(1)
}

const downgraded = Number(globalRow?.downgraded_count ?? 0)
const rejected = Number(globalRow?.rejected_count ?? 0)
const verified = Number(globalRow?.verified_count ?? 0)
const turns = Number(globalRow?.turns_count ?? 0)
const numerator = downgraded + rejected
const denominator = turns
const rate = denominator > 0 ? (numerator / denominator) * 100 : 0
const exceedsThreshold = numerator > 5 && turns >= 100

console.log('')
console.log('━━━ qualifier metrics — rolling 7 days ━━━')
console.log(`  downgraded events       : ${downgraded}`)
console.log(`  rejected events         : ${rejected}`)
console.log(`  verified events         : ${verified}`)
console.log(`  total chat-turns        : ${turns}`)
console.log(`  rate (downgr+rejct/turn): ${rate.toFixed(2)}%`)
console.log(`  13b threshold exceeded  : ${exceedsThreshold ? 'YES' : 'no'}`)
console.log('')

if (SHOW_PER_PROJECT) {
  const { data: perProject, error: ppErr } = await client
    .from('qualifier_rates_7d_per_project')
    .select('*')
    .order('rejected_count', { ascending: false })
    .limit(20)
  if (ppErr) {
    console.error(`[qualifier-downgrade-rate] per-project query failed: ${ppErr.message}`)
    process.exit(1)
  }
  console.log('━━━ per project (top 20 by rejected_count) ━━━')
  if (!perProject?.length) {
    console.log('  (no qualifier events in window)')
  } else {
    for (const row of perProject) {
      console.log(
        `  ${row.project_id.slice(0, 8)}  d=${row.downgraded_count}  r=${row.rejected_count}  v=${row.verified_count}`,
      )
    }
  }
  console.log('')
}

if (SHOW_FIELD_BREAKDOWN) {
  const { data: byField, error: bfErr } = await client
    .from('qualifier_field_breakdown_7d')
    .select('*')
    .order('event_count', { ascending: false })
  if (bfErr) {
    console.error(`[qualifier-downgrade-rate] field-breakdown query failed: ${bfErr.message}`)
    process.exit(1)
  }
  console.log('━━━ by field × transition ━━━')
  if (!byField?.length) {
    console.log('  (no qualifier events in window)')
  } else {
    for (const row of byField) {
      console.log(`  ${(row.field_kind ?? '—').padEnd(18)}${row.transition_kind.padEnd(22)}${row.event_count}`)
    }
  }
  console.log('')
}

if (FAIL_ON_THRESHOLD && exceedsThreshold) {
  console.error(
    '[qualifier-downgrade-rate] 13b threshold exceeded — escalate per ' +
      'PHASE_13_REVIEW.md rollback playbook.',
  )
  process.exit(2)
}
process.exit(0)
