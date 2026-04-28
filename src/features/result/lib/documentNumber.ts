/**
 * Phase 3.5 #60 — Atelier-Briefing document number.
 *
 * Format: `PM-XXXX-XXXX` derived deterministically from the project id.
 * Example: project uuid `a3f2c891-...` → `PM-A3F2-C891`.
 *
 * Locale-independent. Stable across renders. Uppercase.
 */
export function buildDocumentNumber(projectId: string): string {
  const stripped = projectId.replace(/-/g, '').toUpperCase()
  const left = stripped.slice(0, 4)
  const right = stripped.slice(4, 8)
  return `PM-${left}-${right}`
}
