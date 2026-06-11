import type { ProjectRow } from '@/types/db'
import type { ProjectState, Role } from '@/types/projectState'
import { deriveBaselineRoles, type RoleGate } from './deriveBaselineRoles'
import {
  buildProcedureCase,
  readFactTriState,
  resolveProcedure,
} from '@/legal/resolveProcedure'
import { stripVersionTokens } from '@/lib/stripVersionTokens'

export interface ResolvedRoles {
  roles: Role[]
  isFromState: boolean
}

/**
 * T-03 cleanup sprint (P1) — classify a role by its FUNCTION so duplicates can be
 * collapsed. The persona emits richer titles than the baseline ("Building-permit-
 * authorised architect (Saxony)" vs "Architect"; "Energy consultant (GEG)" vs
 * "Energy consultant"), so the prior exact-title union let BOTH render — two cards
 * per function and an inflated "Specialists needed" count (Sachsen PDF p8:
 * architect ×2, energy consultant ×2 → 6 instead of ~4). Baseline roles classify
 * by their canonical id; persona roles by title keywords. Returns null for
 * unrecognised roles so they are kept DISTINCT (never wrongly merged/dropped).
 * Specific functions are tested before the generic "architect" catch.
 */
const ROLE_FUNCTION_BY_ID: Record<string, string> = {
  'R-Architekt': 'architect',
  'R-Tragwerksplaner': 'structural',
  'R-Energieberater': 'energy',
  'R-Bauamt': 'authority',
  'R-Vermesser': 'surveyor',
  'R-Brandschutzplaner': 'fire',
  'R-Schallschutzgutachter': 'acoustics',
}
export function roleFunction(r: Role): string | null {
  if (r.id && ROLE_FUNCTION_BY_ID[r.id]) return ROLE_FUNCTION_BY_ID[r.id]
  const t = `${r.title_de ?? ''} ${r.title_en ?? ''}`.toLowerCase()
  if (/tragwerk|structural|statik/.test(t)) return 'structural'
  if (/brandschutz|fire[- ]?(protection|safety)/.test(t)) return 'fire'
  if (/schallschutz|acoustic|sound[- ]?(insulation|protection)/.test(t)) return 'acoustics'
  if (/energ|geg-?nachweis/.test(t)) return 'energy'
  if (/vermess|surveyor|öbvi|öbv\b/.test(t)) return 'surveyor'
  if (/bauamt|bauaufsicht|building authority|permitting|genehmigungsbeh/.test(t)) return 'authority'
  if (/architekt|architect/.test(t)) return 'architect'
  return null
}

/**
 * Collapse roles sharing a FUNCTION into one card — persona-first wins on content
 * AND its needed flag (the established "persona wins, baseline fills gaps" rule,
 * re-keyed from exact title to function). Order-preserving; unrecognised
 * (null-function) roles are kept distinct so a genuinely separate specialist
 * (Schadstoffgutachter, Denkmalpflege, …) is never dropped.
 */
function dedupeByFunction(roles: Role[]): Role[] {
  const slotForFunction = new Set<string>()
  const out: Role[] = []
  for (const r of roles) {
    const fn = roleFunction(r)
    if (fn == null) { out.push(r); continue }
    if (slotForFunction.has(fn)) continue // a same-function role is already kept
    slotForFunction.add(fn)
    out.push(r)
  }
  return out
}

/**
 * RED-1 (T-04 walk) — class-level fact gate, generalising the old
 * forceStructuralWhenCaptured. A specialist whose baseline rationale is
 * CONDITIONAL ("bei strukturellen Eingriffen", "bei wesentlichen Sanierungen")
 * carries a catalog-declared gate (deriveBaselineRoles); this applies it to the
 * role holding that FUNCTION (persona-emitted OR baseline), reading the
 * conditioning fact as a tri-state via the SAME parse the procedure verdict
 * uses, so role and verdict can never disagree:
 *   fact true     → needed
 *   fact false    → gate.onFalse  ('drop' → not-needed | 'conditional' → deferred)
 *   fact unknown  → conditional   (honest deferral; never a confident drop)
 * Always strips the transient `gate` field so it never reaches state/render.
 */
function applyGate(
  role: Role,
  gate: RoleGate,
  facts: ReadonlyArray<{ key: string; value: unknown }>,
): Role {
  const base: Role = { ...role }
  delete (base as { gate?: unknown }).gate
  const raw = readFactTriState(facts, gate.fact)
  // T-05 sprint — inverted gates fire on fact===false (attached buildings);
  // unknown stays unknown (honest deferral) in both directions.
  const v = gate.invert && raw !== undefined ? !raw : raw
  if (v === true) return { ...base, needed: true, conditional: false }
  const mode = v === false ? gate.onFalse : 'conditional'
  if (mode === 'drop') return { ...base, needed: false, conditional: false }
  return {
    ...base,
    needed: false,
    conditional: true,
    rationale_de: gate.conditionalDe,
    rationale_en: gate.conditionalEn,
  }
}

/**
 * v1.0.30 Bug 97 — stub-state citation packs fill permitSubmissionCitation with
 * the internal STUB_VERIFY deferral string ("Detail-§ noch nicht hinterlegt — mit
 * Bauamt oder Architektenkammer abklären"); deriveBaselineRoles interpolates it
 * into "bauvorlageberechtigt nach {cite}" / "licensed under {cite}", leaking
 * framing copy into the architect role description (PDF p.7). Replace it with a
 * clean generic state-law reference. Scrubs both DE and EN stub strings (the EN
 * rationale interpolates the German citation too).
 */
// Whitespace-tolerant matcher for the STUB_VERIFY_DE deferral phrase. NOT an
// exact split on the constant: stripVersionTokens (run first) collapses the
// space before the em-dash ("hinterlegt — mit" → "hinterlegt— mit"), so an
// exact match misses. The German phrase is interpolated into BOTH the DE and
// EN role rationales (permitSubmissionCitation is a single German string).
const STUB_DEFERRAL_RX =
  /Detail-§\s*noch\s*nicht\s*hinterlegt\s*[—–-]\s*mit\s*Bauamt\s*oder\s*Architektenkammer\s*abklären/g

function scrubStubCitation(s: string, lang: 'de' | 'en'): string {
  return s.replace(
    STUB_DEFERRAL_RX,
    lang === 'en' ? 'applicable state law' : 'geltendem Landesrecht',
  )
}

/** v1.0.29 Bug 67/82 + v1.0.30 Bug 97 — scrub internal version tokens AND the
 *  stub-state citation deferral from user-facing role copy. */
function sanitizeRole(r: Role): Role {
  return {
    ...r,
    rationale_de: scrubStubCitation(stripVersionTokens(r.rationale_de ?? ''), 'de'),
    rationale_en: scrubStubCitation(stripVersionTokens(r.rationale_en ?? ''), 'en'),
    qualifier: r.qualifier
      ? { ...r.qualifier, reason: stripVersionTokens(r.qualifier.reason ?? '') || r.qualifier.reason }
      : r.qualifier,
  }
}

/**
 * Phase 8.5 (A.3) — pure variant of useResolvedRoles (Phase 8.1).
 * For non-React callers (PDF + export pipelines).
 */
export function resolveRoles(
  project: ProjectRow,
  state: Partial<ProjectState>,
): ResolvedRoles {
  const persona = (state.roles ?? []).map(sanitizeRole)
  // T-05 sprint (item g) — the demolition role set consumes the canonical
  // ProcedureDecision kind (verfahrensfrei → contractor-led; anzeige →
  // notification-led; permit kinds → application-led). Computed for abbruch
  // only — every other intent's baseline is byte-identical to before.
  const procedureKind =
    project.intent === 'abbruch'
      ? resolveProcedure(buildProcedureCase(project, state)).kind
      : undefined
  const baselineRaw = deriveBaselineRoles({
    intent: project.intent,
    bundesland: project.bundesland,
    procedureKind,
  })

  // RED-1 — capture catalog-declared conditional gates by role FUNCTION, so the
  // gate applies to whichever role holds that function after the merge (the
  // persona's emission, if any, OR the baseline). Built from the raw baseline
  // before sanitize; gate copy is clean authored text needing no scrub.
  const gateByFunction = new Map<string, RoleGate>()
  for (const r of baselineRaw) {
    const fn = roleFunction(r)
    if (fn && r.gate) gateByFunction.set(fn, r.gate)
  }
  const baseline = baselineRaw.map(sanitizeRole)

  // v1.0.29 Bug 67 — union floor: a thin persona emission (the Hamburg T-02 walk
  // emitted ONE role yet the persona had named five) must not suppress the
  // deterministic baseline. T-03 cleanup (P1) — the floor is now deduped by role
  // FUNCTION (persona-first wins) instead of exact title, so a richer persona
  // title and the baseline for the SAME function collapse to one card and the
  // specialist count reflects DISTINCT roles (Sachsen PDF p8: architect ×2 +
  // energy ×2 → one each). persona.length===0 → just the deduped baseline.
  const merged = dedupeByFunction([...persona, ...baseline])

  // RED-1 — apply the fact gates to the merged roles. Generalises the old
  // captured-TRUE-only forceStructuralWhenCaptured to the full tri-state
  // (true → needed, false → drop/conditional per gate, unknown → conditional),
  // and adds the energy/GEG gate. Ungated functions (incl. all new-build roles)
  // pass through unchanged, so new-build structural stays unconditionally needed.
  const facts = state.facts ?? []
  const gated = merged.map((r) => {
    const fn = roleFunction(r)
    const gate = fn ? gateByFunction.get(fn) : undefined
    return gate ? applyGate(r, gate, facts) : r
  })

  // Thin-state P2 + four-class CLASS-1 contract — a captured load-bearing
  // intervention forces the structural engineer NEEDED for ANY template,
  // overriding a contradicting persona needed:false. For renovation the gate
  // above already yields needed on true; this ALSO covers new-build / demolition
  // / addition templates whose structural role carries no gate (so removing the
  // old forceStructuralWhenCaptured doesn't drop that contract). Only forces ON
  // (true); false/unknown are handled by the renovation gate, never here.
  const structuralIntervention =
    readFactTriState(facts, 'eingriff_tragende_teile') === true
  const finalRoles = structuralIntervention
    ? gated.map((r) =>
        roleFunction(r) === 'structural' && !r.needed
          ? { ...r, needed: true, conditional: false }
          : r,
      )
    : gated

  return { roles: finalRoles, isFromState: persona.length > 0 }
}
