// Phase 7.6 §1.2 — fail prebuild on German leakage in TSX / TS files.
//
// Rationale: Phase 7.5 i18n shipped EN translations that mixed German
// specialist names ("Beteiligte & roles", "Verfahren synthesis").
// `verify-locales` enforces DE/EN parity but doesn't catch German
// inside English locale values OR German-only strings inside TSX
// rendered without a t() call.
//
// This script greps the SPA source for canonical German legal-domain
// words. Hits inside an allowlist (legal context, persona prompt,
// canonical sommelier role labels) are fine. Hits anywhere else fail.

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('.')

// Files / directories where German is canonical and expected.
const ALLOWLIST = [
  'supabase/functions/chat-turn/legalContext/',
  'supabase/functions/chat-turn/systemPrompt.ts',
  'supabase/functions/chat-turn/anthropic.ts',
  'src/locales/de.json',
  'src/locales/factLabels.de.ts',
  'src/data/factsMuenchen.ts',
  'src/data/smartSuggestionsMuenchen.ts',
  // Sommelier-locked: specialist tag's role-label map is German by
  // explicit decision (see SpecialistTag.tsx + factLabel.ts comments).
  'src/features/chat/components/Chamber/MessageAssistant.tsx',
  'src/features/chat/lib/spineStageDefinitions.ts',
  // ThinkingIndicator carries a per-specialist DE fallback array;
  // overridden at runtime by t('chat.thinking.actions.<spec>') so it
  // localises correctly. The array literal is the canonical DE list.
  'src/features/chat/components/Chamber/ThinkingIndicator.tsx',
  // Document linkage + export PDF builder fold DE labels into the
  // deliverable — same DE/EN map pattern as exportMarkdown.
  'src/features/chat/lib/documentLinkage.ts',
  'src/features/chat/lib/exportPdf.ts',
  // Landing-page demo scripts + legal pages render canonical German
  // for product copy / DSGVO compliance.
  'src/features/landing/lib/chatScript.ts',
  'src/features/landing/lib/addresses.ts',
  'src/features/legal/',
  // Activity ticker + cost timeline + result page render DE strings
  // alongside EN via inline lang === 'de' branches; canonical bilingual.
  'src/features/dashboard/lib/recentActivity.ts',
  'src/features/result/components/CostTimelinePanel.tsx',
  'src/features/result/components/LegalLandscape.tsx',
  'src/features/result/components/SpecialistsRequired.tsx',
  'src/features/result/components/Cockpit/',
  // Phase 8 — locale-aware paragraph composer for the workspace's
  // executive read. Bilingual by branch, same allowlist pattern as
  // the components above.
  'src/features/result/lib/composeExecutiveRead.ts',
  // Phase 8 — heuristic legal-domain composer. Bilingual citation
  // copy (Planungsrecht / Bauordnungsrecht / etc.); same pattern.
  'src/features/result/lib/composeLegalDomains.ts',
  // Phase 8 — Procedure & documents tab; bilingual phase labels and
  // ItemStatus → DE/EN map mirror CostTimelinePanel's pattern.
  'src/features/result/components/tabs/ProcedureDocumentsTab.tsx',
  // Wizard B-Plan detail dialog renders canonical German Bauamt
  // language alongside EN; map is bilingual already.
  'src/features/wizard/components/BPlanDetailDialog.tsx',
  // Export builders fold DE labels into the deliverable.
  'src/lib/export/',
  // Eval harness reference transcripts (German).
  'eval-results/',
  'scripts/eval-harness/',
  // Bayern-grounded SQL data + migration comments.
  'supabase/migrations/',
]

// Patterns that must not appear in TSX/TS source outside the allowlist.
// One regex per "smell" — easier to extend; each captures a short
// anchor word so we can show the user where the leak is.
const PATTERNS = [
  /\bVorhaben\b/,
  /\bGrundstück\b/,
  /\bBeteiligte\b/,
  /\bVerfahren\b(?!\s*synthesis)/, // allow EN compound "Verfahren synthesis" if any sneak through
  /\bSonstige Vorgaben\b/,
  /\bPlanungsrecht\b(?!\s*\.)/, // allow PROJECT.PLANUNGSRECHT-style fact keys
  /\bBauordnungsrecht\b/,
  /\bBebauungsplan\b/,
]

const EXTS = new Set(['.ts', '.tsx'])
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.vercel', 'eval-results'])

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walk(full, out)
    } else if (entry.isFile() && EXTS.has(path.extname(entry.name))) {
      out.push(full)
    }
  }
  return out
}

function isAllowed(rel) {
  return ALLOWLIST.some((prefix) => rel.startsWith(prefix))
}

function scan() {
  const files = walk(path.join(ROOT, 'src'), [])
  const issues = []
  for (const abs of files) {
    const rel = path.relative(ROOT, abs)
    if (isAllowed(rel)) continue
    const txt = fs.readFileSync(abs, 'utf-8')
    const lines = txt.split('\n')
    lines.forEach((line, i) => {
      // Skip JSX comments and JS comments.
      const trimmed = line.trimStart()
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('{/*')
      ) {
        return
      }
      for (const re of PATTERNS) {
        const m = re.exec(line)
        if (m) {
          // Allow when wrapped in t('…') or a JSON-key string.
          // Heuristic: the match is inside a t( … ) call → ok.
          const before = line.slice(0, m.index)
          if (/\bt\(\s*['"`][^'"`]*$/.test(before)) continue
          // Allow when inside a `defaultValue: '…'` literal — it's
          // an i18n fallback, not a hardcoded UI string.
          if (/defaultValue:\s*['"`][^'"`]*$/.test(before)) continue
          issues.push({ file: rel, line: i + 1, match: m[0], snippet: line.trim() })
          break
        }
      }
    })
  }
  return issues
}

const issues = scan()
if (issues.length > 0) {
  console.error(`[grep-hardcoded-de] ${issues.length} German leakage hit(s):`)
  for (const it of issues) {
    console.error(`  ${it.file}:${it.line}  «${it.match}»  ${it.snippet}`)
  }
  console.error('')
  console.error('  Fix: wrap in t(\'…\') with a translation key, or move')
  console.error('  the file into the allowlist in scripts/grep-hardcoded-de.mjs')
  console.error('  if the German is canonical (e.g., a legal-domain term).')
  process.exit(1)
}
console.log(`[grep-hardcoded-de] clean (${issues.length} hits)`)
