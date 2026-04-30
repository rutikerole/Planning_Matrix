// Phase 7 — eval harness entry point.
//
// Commit 3 scope: assertions + per-test verdict + exit code propagation.
// Commit 4 layers markdown report on top.
//
// Usage:
//   npm run eval:run                           run all 7 München test projects
//   npm run eval:run -- --single 01-maxvorstadt-innenstadt
//   npm run eval:dry-run                       infra-only smoke; no chat-turn calls

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from './lib/config.mjs'
import { ensureTestUser } from './lib/auth.mjs'
import { createProject, deleteProject, deleteAllOwnedProjects } from './lib/project.mjs'
import { runConversation } from './lib/chat.mjs'
import { evaluateTest } from './lib/assertions.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = join(SCRIPT_DIR, '..', '..')
const TEST_PROJECTS_DIR = join(ROOT, 'data', 'muenchen', 'test-projects')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const singleIdx = args.indexOf('--single')
const singleTest = singleIdx >= 0 ? args[singleIdx + 1] : null

function loadTestProjects() {
  const out = []
  for (const name of readdirSync(TEST_PROJECTS_DIR).sort()) {
    if (!name.endsWith('.json')) continue
    const path = join(TEST_PROJECTS_DIR, name)
    const parsed = JSON.parse(readFileSync(path, 'utf8'))
    out.push({ filename: name, path, data: parsed })
  }
  return out
}

async function runOne(config, accessToken, project) {
  const { id, input, eval_conversation_script: script } = project
  if (!Array.isArray(script) || script.length === 0) {
    console.log(`[eval] ${id}: SKIPPED — no eval_conversation_script`)
    return { id, skipped: true }
  }

  console.log(`\n[eval] === ${id} ===`)
  const row = await createProject(config, accessToken, {
    intent: input.intent,
    has_plot: input.has_plot,
    plot_address: input.plot_address ?? null,
    bundesland: input.bundesland ?? 'bayern',
    city: input.city ?? 'muenchen',
    template_id: input.template_id,
    name: `eval-harness ${id}`,
  })
  const projectId = row.id

  let result, verdict, error
  try {
    result = await runConversation({
      config,
      accessToken,
      projectId,
      script,
    })
    verdict = evaluateTest({
      test: project,
      transcript: result.transcript,
      finalProjectState: result.finalProjectState,
    })
    const tag = verdict.passed ? 'PASS' : 'FAIL'
    console.log(
      `[eval] ${id}: ${tag} — ${result.transcript.length} turn(s), ` +
        `tokens(in/out/cR/cW)=${result.totals.inputTokens}/${result.totals.outputTokens}/${result.totals.cacheReadTokens}/${result.totals.cacheWriteTokens}`,
    )
    if (!verdict.passed) {
      const failures = Object.entries(verdict.groups)
        .flatMap(([group, records]) =>
          records.filter((r) => !r.pass).map((r) => `${group}: ${r.message}`),
        )
      for (const f of failures) console.log(`         ✗ ${f}`)
    }
  } catch (err) {
    error = err.message ?? String(err)
    console.error(`[eval] ${id}: ERRORED — ${error}`)
  } finally {
    await deleteProject(config, accessToken, projectId).catch((err) =>
      console.error(`[eval] cleanup failed for ${projectId}:`, err.message),
    )
  }

  return {
    id,
    skipped: false,
    errored: !!error,
    error,
    transcript: result?.transcript ?? [],
    finalProjectState: result?.finalProjectState ?? null,
    totals: result?.totals ?? null,
    verdict: verdict ?? null,
  }
}

async function main() {
  const config = loadConfig()
  console.log(`[eval] target Supabase: ${config.SUPABASE_URL}`)

  console.log('[eval] ensuring test user…')
  const { accessToken, userId, email } = await ensureTestUser(config)
  console.log(`[eval] signed in as ${email} (uid=${userId})`)

  console.log('[eval] sweeping any leftover projects from previous runs…')
  const cleared = await deleteAllOwnedProjects(config, accessToken, userId)
  if (cleared > 0) console.log(`[eval] deleted ${cleared} stale project(s)`)

  if (dryRun) {
    const row = await createProject(config, accessToken, {
      intent: 'sonstige',
      has_plot: false,
      plot_address: null,
      bundesland: 'bayern',
      city: 'muenchen',
      template_id: 'T-01',
      name: 'eval-harness infra smoke',
    })
    console.log(`[eval] dry-run: created project ${row.id}; deleting…`)
    await deleteProject(config, accessToken, row.id)
    console.log('[eval] dry-run OK')
    return
  }

  const allTests = loadTestProjects()
  const tests = singleTest
    ? allTests.filter((t) => t.data.id === singleTest)
    : allTests
  if (tests.length === 0) {
    console.error(`[eval] no test matched "${singleTest}"`)
    process.exit(1)
  }
  console.log(`[eval] running ${tests.length} test(s)…`)

  const results = []
  for (const test of tests) {
    results.push(await runOne(config, accessToken, test.data))
  }

  // ─── Summary + exit code ───────────────────────────────────────────────
  const total = results.length
  const passed = results.filter((r) => r.verdict?.passed).length
  const failed = results.filter((r) => !r.skipped && !r.verdict?.passed).length
  const errored = results.filter((r) => r.errored).length

  console.log('\n[eval] === summary ===')
  for (const r of results) {
    if (r.errored) console.log(`  ${r.id}: ERRORED — ${r.error}`)
    else if (r.skipped) console.log(`  ${r.id}: SKIPPED`)
    else if (r.verdict?.passed) console.log(`  ${r.id}: PASS`)
    else console.log(`  ${r.id}: FAIL`)
  }
  console.log(`\n[eval] ${passed} / ${total} passed (${failed} failed, ${errored} errored)`)

  // Commit 4 wires the markdown report; for now stdout is the surface.
  process.exit(passed === total - results.filter((r) => r.skipped).length ? 0 : 1)
}

main().catch((err) => {
  console.error('[eval] fatal:', err.message ?? err)
  process.exit(1)
})
