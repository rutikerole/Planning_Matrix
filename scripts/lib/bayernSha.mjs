// ───────────────────────────────────────────────────────────────────────
// Bayern composed-prefix SHA helper.
//
// Shared by scripts/verify-bayern-sha.mjs (debug CLI) and
// scripts/smokeWalk.mjs (regression gate). Single source of truth so
// the two paths cannot drift.
//
// Re-derives composeLegalContext('bayern') from the raw slice files and
// hashes the result. The expected baseline was frozen at Phase 11
// commit 1 (667bb44). When Bayern content is intentionally edited,
// update EXPECTED_BAYERN_SHA below and call out the change in the
// commit message.
// ───────────────────────────────────────────────────────────────────────

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createHash } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')

export const EXPECTED_BAYERN_SHA =
  'b18d3f7f9a6fe238c18cec5361d30ea3a547e46b1ef2b16a1e74c533aacb3471'

const SLICE_SEPARATOR = '\n\n---\n\n'
const TAIL =
  '\n\n══════════════════════════════════════════════════════════════════════════' +
  '\nPROJEKTKONTEXT' +
  '\n══════════════════════════════════════════════════════════════════════════' +
  '\n\nEs folgt: Template-Kontext (T-XX), Locale-Hinweis, aktueller Projektzustand' +
  '\n(Grundstück, A/B/C-Bereiche, jüngste Fakten, Top-3-Empfehlungen, zuletzt' +
  '\ngestellte Fragen, jüngste Bauherreneingabe, letzte sprechende Fachperson).\n'

async function readBlock(relPath, exportName) {
  const content = await readFile(join(REPO_ROOT, relPath), 'utf-8')
  const re = new RegExp(`export const ${exportName} =\\s*\`([\\s\\S]*?)\``)
  const m = content.match(re)
  if (!m) throw new Error(`Could not extract ${exportName} from ${relPath}`)
  return m[1]
}

/**
 * Compose the Bayern prefix string and return its SHA-256 hex digest.
 * Mirrors the runtime composeLegalContext('bayern') byte-for-byte.
 */
export async function computeBayernSha() {
  const SHARED   = await readBlock('src/legal/shared.ts',           'SHARED_BLOCK')
  const FEDERAL  = await readBlock('src/legal/federal.ts',          'FEDERAL_BLOCK')
  const BAYERN   = await readBlock('src/legal/bayern.ts',           'BAYERN_BLOCK')
  const MUE      = await readBlock('src/legal/muenchen.ts',         'MUENCHEN_BLOCK')
  const PERS     = await readBlock('src/legal/personaBehaviour.ts', 'PERSONA_BEHAVIOURAL_RULES')
  const TPLS     = await readBlock('src/legal/templates/shared.ts', 'TEMPLATE_SHARED_BLOCK')
  const composed = [SHARED, FEDERAL, BAYERN, MUE, PERS, TPLS].join(SLICE_SEPARATOR) + TAIL
  return {
    sha: createHash('sha256').update(composed).digest('hex'),
    length: composed.length,
  }
}
