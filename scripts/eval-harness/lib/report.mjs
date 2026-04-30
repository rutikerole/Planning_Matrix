// Phase 7 — markdown report generation.
//
// Renders one self-contained markdown file per harness run.
// GitHub-flavoured Markdown only — tables, code blocks, headings,
// no HTML. Renders cleanly in `eval-results/` directory listings
// and in PR previews.

function fmt(n) {
  return new Intl.NumberFormat('en-US').format(n)
}

// Crude — reflects current Anthropic Sonnet 4.5 list pricing.
// Ratios used: input $3 / output $15 / cache-read $0.30 / cache-write $3.75
// per million tokens. Treat as ±25 % orientation, not invoice precision.
function estimateUsd(t) {
  if (!t) return 0
  return (
    (t.inputTokens * 3 +
      t.outputTokens * 15 +
      t.cacheReadTokens * 0.3 +
      t.cacheWriteTokens * 3.75) /
    1_000_000
  )
}

function tag(passed, errored) {
  if (errored) return 'ERRORED'
  return passed ? 'PASS' : 'FAIL'
}

function escape(text) {
  return String(text ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

function renderAssertionGroup(label, records) {
  const lines = []
  lines.push(`#### ${label}`)
  lines.push('')
  for (const r of records) {
    const mark = r.pass ? '✓' : '❌'
    lines.push(`- ${mark} ${escape(r.message)}`)
    if (!r.pass && r.detail) {
      const detail = JSON.stringify(r.detail).slice(0, 400)
      lines.push(`  - detail: \`${detail}\``)
    }
  }
  lines.push('')
  return lines.join('\n')
}

function renderTranscript(transcript) {
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return '_(no transcript captured)_'
  }
  const lines = []
  lines.push('| # | Specialist | Input type | Completion | Excerpt (DE) |')
  lines.push('|---|---|---|---|---|')
  for (let i = 0; i < transcript.length; i++) {
    const m = transcript[i] ?? {}
    const excerpt = (m.message_de ?? m.content_de ?? '').slice(0, 140)
    lines.push(
      `| ${i + 1} | ${m.specialist ?? '—'} | ${m.input_type ?? '—'} | ${m.completion_signal ?? '—'} | ${escape(excerpt)} |`,
    )
  }
  return lines.join('\n')
}

// ─── Public — generateReport ────────────────────────────────────────────

export function generateReport({ runId, results, env }) {
  const ranTests = results.filter((r) => !r.skipped)
  const passed = ranTests.filter((r) => r.verdict?.passed)
  const failed = ranTests.filter((r) => !r.errored && !r.verdict?.passed)
  const errored = ranTests.filter((r) => r.errored)

  const totals = ranTests.reduce(
    (acc, r) => {
      const t = r.totals ?? {}
      acc.inputTokens += t.inputTokens ?? 0
      acc.outputTokens += t.outputTokens ?? 0
      acc.cacheReadTokens += t.cacheReadTokens ?? 0
      acc.cacheWriteTokens += t.cacheWriteTokens ?? 0
      acc.latencyMs += t.latencyMs ?? 0
      return acc
    },
    { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, latencyMs: 0 },
  )
  const usd = estimateUsd(totals)

  const lines = []
  lines.push(`# Eval harness report — ${runId}`)
  lines.push('')
  lines.push('## Run metadata')
  lines.push('')
  lines.push(`- **Run ID:** \`${runId}\``)
  lines.push(`- **Target:** \`${env?.SUPABASE_URL ?? '(unknown)'}\``)
  if (env?.commitSha) lines.push(`- **Commit:** \`${env.commitSha}\``)
  lines.push(`- **Tests run:** ${ranTests.length} of ${results.length}`)
  lines.push(`- **Passed:** ${passed.length}`)
  lines.push(`- **Failed:** ${failed.length}`)
  lines.push(`- **Errored:** ${errored.length}`)
  if (results.some((r) => r.skipped)) {
    lines.push(`- **Skipped:** ${results.filter((r) => r.skipped).length}`)
  }
  lines.push('')
  lines.push('## Token + cost')
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('|---|---|')
  lines.push(`| Input tokens | ${fmt(totals.inputTokens)} |`)
  lines.push(`| Output tokens | ${fmt(totals.outputTokens)} |`)
  lines.push(`| Cache read tokens | ${fmt(totals.cacheReadTokens)} |`)
  lines.push(`| Cache write tokens | ${fmt(totals.cacheWriteTokens)} |`)
  lines.push(`| Total latency (ms, summed) | ${fmt(totals.latencyMs)} |`)
  lines.push(`| **Estimated cost (USD)** | **${usd.toFixed(4)}** |`)
  lines.push('')
  lines.push('## Verdicts')
  lines.push('')
  lines.push('| ID | Verdict | Turns | In tokens | Out tokens |')
  lines.push('|---|---|---|---|---|')
  for (const r of results) {
    const verdict = r.errored ? 'ERRORED' : r.skipped ? 'SKIPPED' : tag(r.verdict?.passed ?? false, false)
    const turns = r.transcript?.length ?? 0
    const inTok = r.totals?.inputTokens ?? 0
    const outTok = r.totals?.outputTokens ?? 0
    lines.push(`| \`${r.id}\` | **${verdict}** | ${turns} | ${fmt(inTok)} | ${fmt(outTok)} |`)
  }
  lines.push('')

  for (const r of results) {
    if (r.skipped) {
      lines.push(`### ${r.id} — SKIPPED`)
      lines.push('')
      lines.push('No `eval_conversation_script` defined for this test project.')
      lines.push('')
      continue
    }
    lines.push(`### ${r.id} — ${r.errored ? 'ERRORED' : tag(r.verdict?.passed ?? false, false)}`)
    lines.push('')
    if (r.errored) {
      lines.push('Error:')
      lines.push('```')
      lines.push(r.error ?? '(no error message)')
      lines.push('```')
      lines.push('')
      continue
    }
    lines.push('#### Transcript')
    lines.push('')
    lines.push(renderTranscript(r.transcript))
    lines.push('')
    lines.push('#### Assertions')
    lines.push('')
    const groups = r.verdict?.groups ?? {}
    if (groups.facts) lines.push(renderAssertionGroup('must_contain_facts', groups.facts))
    if (groups.anchors)
      lines.push(renderAssertionGroup('must_contain_recommendations_anchors', groups.anchors))
    if (groups.forbidden) lines.push(renderAssertionGroup('must_not_contain', groups.forbidden))
    if (groups.voices)
      lines.push(renderAssertionGroup('expected_specialist_voices_at_least', groups.voices))
    if (groups.signal) lines.push(renderAssertionGroup('completion_signal', groups.signal))
  }

  lines.push('---')
  lines.push('')
  lines.push('## How to reproduce')
  lines.push('')
  lines.push('```bash')
  lines.push('cp scripts/eval-harness/.env.local.example .env.local')
  lines.push('# fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EVAL_HARNESS_TEST_USER_PASSWORD')
  lines.push('npm run eval:run')
  lines.push('```')
  lines.push('')
  lines.push('See `scripts/eval-harness/README.md` for the full operational model.')
  lines.push('')
  return lines.join('\n')
}
