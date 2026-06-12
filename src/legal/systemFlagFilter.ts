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

// ── fix/t06-walk2 — template-foreign typed-fact quarantine ─────────────
// The A.5/D.5 TYPISIERTE PROJEKT-FAKTEN directive ships in EVERY
// template's prompt, so a typed contract key can leak onto a foreign
// template (walk-2: `abbruch_typ=teilabbruch · ASSUMED` on a T-06
// Aufstockung — the persona reasoned about the partial roof demolition
// and obeyed the T-05 contract). The fact still PERSISTS (information
// kept, Logs see it raw); deliverable surfaces treat it as
// TEMPLATE-FOREIGN: excluded from PDF Key Data, .md Eckdaten, the
// verify-with-architect / exec-flags path (computeOpenItems) and the
// quality denominator + confidence inputs (aggregateQualifiers).
// Quarantine is READ-time on purpose: legacy facts carry no persist-time
// tag, so readers need this derivation anyway — and the edge graph stays
// untouched. Directive-side template scoping rides the SHA bundle
// (SPRINT_PLAN, persona directive bundle).
// Registry: ONLY keys whose contract is genuinely template-scoped.
// Universal keys (gebaeudeklasse, denkmalschutz, …) must NOT be listed.
const TYPED_KEY_APPLICABLE_TEMPLATES: Readonly<Record<string, readonly string[]>> = {
  // T-05 sprint 2.75 — drives the Beseitigungs- vs Änderungs-Routing;
  // meaningless (and exec-flag noise) on every other template.
  abbruch_typ: ['T-05'],
}

export function isTemplateForeignFact(
  key: string,
  templateId: string | null | undefined,
): boolean {
  const allowed = TYPED_KEY_APPLICABLE_TEMPLATES[key.toLowerCase()]
  if (!allowed) return false
  return templateId == null || !allowed.includes(templateId)
}

/** Combined deliverable-surface filter: system flags + template-foreign
 *  typed facts. Single predicate so the five surfaces cannot drift. */
export function isDeliverableFactKey(
  key: string,
  templateId: string | null | undefined,
): boolean {
  return !isSystemFlagKey(key) && !isTemplateForeignFact(key, templateId)
}
