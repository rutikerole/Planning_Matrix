import type { ProjectRow } from '@/types/db'
import type { ProjectState, Role } from '@/types/projectState'
import { deriveBaselineRoles } from './deriveBaselineRoles'
import { buildProcedureCase } from '@/legal/resolveProcedure'
import { stripVersionTokens } from '@/lib/stripVersionTokens'

export interface ResolvedRoles {
  roles: Role[]
  isFromState: boolean
}

const normTitle = (s: string): string => s.toLowerCase().replace(/[^a-zäöüß]/g, '')

/** The structural-engineer (Tragwerksplaner) role, by canonical id or title. */
const isStructuralRole = (r: Role): boolean =>
  r.id === 'R-Tragwerksplaner' ||
  /tragwerk|structural/.test(normTitle(r.title_de ?? '') + normTitle(r.title_en ?? ''))

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
 * T-03 thin-state propagation sprint (P2) — the structural engineer MUST render
 * NEEDED whenever the consultation captured a load-bearing intervention
 * (eingriff_tragende_teile=true), for ALL states. resolveRoles never read facts,
 * so a thin-state persona role emitted with needed:false ("Required only if
 * load-bearing elements are affected") silently overrode the captured fact — the
 * MV/Rostock walk captured the Unterzug removal yet the Team tab + PDF said
 * "Structural engineer — NOT NEEDED". When the fact is set we restore the
 * baseline structural role (needed:true, intervention-correct rationale),
 * replacing a contradicting needed:false role or appending it if absent.
 */
function forceStructuralWhenCaptured(
  roles: Role[],
  baseline: Role[],
  captured: boolean,
): Role[] {
  if (!captured) return roles
  const baselineStructural = baseline.find(isStructuralRole)
  const idx = roles.findIndex(isStructuralRole)
  if (idx >= 0) {
    if (roles[idx].needed) return roles
    return roles.map((r, i) =>
      i === idx ? (baselineStructural ?? { ...r, needed: true }) : r,
    )
  }
  return baselineStructural ? [...roles, baselineStructural] : roles
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
  const baseline = deriveBaselineRoles({
    intent: project.intent,
    bundesland: project.bundesland,
  }).map(sanitizeRole)

  // T-03 thin-state sprint (P2) — read the SAME canonical structural-intervention
  // fact the procedure resolver uses (buildProcedureCase), so the specialist
  // determination and the procedure verdict can never disagree on it.
  const structuralCaptured = buildProcedureCase(project, state).eingriff_tragende_teile

  // v1.0.29 Bug 67 — union floor: a thin persona emission (the Hamburg T-02 walk
  // emitted ONE role yet the persona had named five) must not suppress the
  // deterministic baseline. T-03 cleanup (P1) — the floor is now deduped by role
  // FUNCTION (persona-first wins) instead of exact title, so a richer persona
  // title and the baseline for the SAME function collapse to one card and the
  // specialist count reflects DISTINCT roles (Sachsen PDF p8: architect ×2 +
  // energy ×2 → one each). persona.length===0 → just the deduped baseline.
  const merged = dedupeByFunction([...persona, ...baseline])
  return {
    roles: forceStructuralWhenCaptured(merged, baseline, structuralCaptured),
    isFromState: persona.length > 0,
  }
}
