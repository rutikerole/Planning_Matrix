// Phase 7 — eval harness entry point.
//
// Commit 1 scope: scaffold + auth + project lifecycle infra.
// Subsequent commits add chat-turn driver (C2), assertions (C3),
// markdown report (C4), workflow (C5), docs (C6).
//
// Usage:
//   npm run eval:run               run all 7 München test projects
//   npm run eval:run -- --single 01-maxvorstadt-innenstadt
//   npm run eval:dry-run           do not call chat-turn; just exercise infra

import { loadConfig } from './lib/config.mjs'
import { ensureTestUser } from './lib/auth.mjs'
import { createProject, deleteProject, deleteAllOwnedProjects } from './lib/project.mjs'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const singleIdx = args.indexOf('--single')
const singleTest = singleIdx >= 0 ? args[singleIdx + 1] : null

async function main() {
  const config = loadConfig()
  console.log(`[eval] target Supabase: ${config.SUPABASE_URL}`)

  console.log('[eval] ensuring test user…')
  const { accessToken, userId, email } = await ensureTestUser(config)
  console.log(`[eval] signed in as ${email} (uid=${userId})`)

  console.log('[eval] sweeping any leftover projects from previous runs…')
  const cleared = await deleteAllOwnedProjects(config, accessToken, userId)
  if (cleared > 0) console.log(`[eval] deleted ${cleared} stale project(s)`)

  if (dryRun || singleTest === '__infra_smoke__') {
    // Commit 1 infra smoke — create + delete one throwaway project.
    console.log('[eval] dry-run: creating one throwaway project…')
    const row = await createProject(config, accessToken, {
      intent: 'sonstige',
      has_plot: false,
      plot_address: null,
      bundesland: 'bayern',
      city: 'muenchen',
      template_id: 'T-01',
      name: 'eval-harness infra smoke',
    })
    console.log(`[eval] created project ${row.id}`)
    await deleteProject(config, accessToken, row.id)
    console.log(`[eval] deleted project ${row.id}`)
    console.log('[eval] dry-run OK')
    process.exit(0)
  }

  // Subsequent commits land the actual test loop here.
  console.log('[eval] (C2+ will add the test loop here)')
  console.log(`[eval] selected test: ${singleTest ?? 'all 7'}`)
}

main().catch((err) => {
  console.error('[eval] fatal:', err.message ?? err)
  process.exit(1)
})
