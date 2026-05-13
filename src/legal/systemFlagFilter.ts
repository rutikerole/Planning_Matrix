// ───────────────────────────────────────────────────────────────────────
// v1.0.23 Bug N — system-flag filter for user-facing tables.
//
// Wizard / coverage-mode / internal-state flags travel through
// projects.state.facts as ordinary fact entries (e.g.
// `plot.outside_munich_acknowledged`). User-facing render paths must
// filter them out so the PDF Key Data table and the UI overview do
// not surface internal flow markers as project facts.
//
// Rules:
//   • Any key starting with `system.` or `_internal` or `_system`
//   • Any key ending with `_acknowledged` or `.acknowledged`
//   • Explicit allowlist: `plot.outside_munich_acknowledged` (the
//     known v1.0.20 leak — kept enumerated so future renames stay
//     covered while the rule list grows organically.)
//
// This module is intentionally tiny and pure so call-sites stay
// readable and the rule set is easy to extend.
// ───────────────────────────────────────────────────────────────────────

const EXPLICIT_SYSTEM_KEYS: ReadonlyArray<string> = [
  'plot.outside_munich_acknowledged',
] as const

export function isSystemFlagKey(key: string): boolean {
  const k = key.toLowerCase()
  if (EXPLICIT_SYSTEM_KEYS.includes(k)) return true
  if (k.startsWith('system.')) return true
  if (k.startsWith('_internal')) return true
  if (k.startsWith('_system')) return true
  if (k.endsWith('_acknowledged')) return true
  if (k.endsWith('.acknowledged')) return true
  return false
}
