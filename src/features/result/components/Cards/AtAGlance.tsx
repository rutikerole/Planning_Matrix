import { useTranslation } from 'react-i18next'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import {
  buildCostBreakdown,
  detectAreaSqm,
  detectKlasse,
  detectProcedure,
  formatEurRange,
} from '../../lib/costNormsMuenchen'
import { useResolvedRoles } from '../../hooks/useResolvedRoles'
import { useResolvedProcedures } from '../../hooks/useResolvedProcedures'
import { computeOpenItems } from '../../lib/computeOpenItems'
import {
  deriveGebaeudeklasse,
  deriveGkInputFromFacts,
  formatGebaeudeklasseValue,
} from '@/legal/deriveGebaeudeklasse'

interface Props {
  project: ProjectRow
  state: Partial<ProjectState>
}

/**
 * Phase 8 — Overview tab "At a glance" right column. Six rows: procedure,
 * building class, estimated cost, timeline, specialists needed, open
 * questions. Each row is label + value with a hairline divider; values
 * fall back to em-dash when the underlying state isn't there yet.
 */
export function AtAGlance({ project, state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const resolved = useResolvedRoles(project, state)
  const resolvedProc = useResolvedProcedures(project, state)

  const facts = state.facts ?? []
  const open = computeOpenItems(state, lang)

  const primaryProcedure =
    resolvedProc.procedures.find((p) => p.status === 'erforderlich') ??
    resolvedProc.procedures[0]
  const baseLabel = primaryProcedure
    ? lang === 'en'
      ? primaryProcedure.title_en
      : primaryProcedure.title_de
    : t('result.workspace.ataglance.inProgress')
  const procedureLabel =
    primaryProcedure && !resolvedProc.isFromState
      ? `${baseLabel} · ${t('result.workspace.team.likelyBadge')}`
      : baseLabel

  // Phase 8.5 (C.5): the live Tengstraße project showed "Building
  // class: —" despite the conversation explicitly establishing
  // GK 3. The persona may emit any of several keys
  // (gebaeudeklasse_geplant / gebaeudeklasse_hypothese / geb_klasse_…),
  // or describe it only in message_de without emitting a fact at all.
  // v1.0.22 Bug C — explicit-key path stays; the geometric fallback
  // now routes through the unified deriveGebaeudeklasse (MBO § 2 Abs. 3)
  // so reasoning + qualifier are visible to the bauherr. Honest
  // deferral phrase when Höhe AND Geschosse are both missing — no
  // fabricated GK number.
  const explicitKlasse = resolveBuildingClass(facts, lang)
  const derivedKlasse = deriveGebaeudeklasse(
    deriveGkInputFromFacts(facts, state.templateId ?? null),
  )
  const klasseValue = explicitKlasse
    ? explicitKlasse
    : derivedKlasse.klasse != null
      ? formatGebaeudeklasseValue(derivedKlasse, lang)
      : t('result.workspace.ataglance.tbd')

  // Cost — reuse the München heuristic engine, now with area + zone +
  // region inputs flowing through (A.4).
  const corpus = facts
    .map((f) => `${f.key} ${typeof f.value === 'string' ? f.value : ''}`)
    .join(' ')
    .toLowerCase()
  const procedureType = detectProcedure(primaryProcedure?.rationale_de ?? '')
  const klasseDetected = detectKlasse(corpus)
  const areaSqm = detectAreaSqm(corpus)
  const cost = buildCostBreakdown(procedureType, klasseDetected, {
    areaSqm,
    bundesland: project.bundesland,
  })
  const costLabel = facts.length > 0 ? formatEurRange(cost.total, lang) : t('result.workspace.ataglance.tbd')

  // Timeline — coarse range from procedure type.
  const timelineLabel =
    procedureType === 'art57_freistellung'
      ? lang === 'en' ? '~ 2–3 months' : '~ 2–3 Monate'
      : procedureType === 'art60_baugenehmigung'
        ? lang === 'en' ? '~ 6–9 months' : '~ 6–9 Monate'
        : lang === 'en' ? '~ 4–6 months' : '~ 4–6 Monate'

  const specialistsCount = resolved.roles.filter((r) => r.needed).length
  const openQuestions = open.count

  const rows: Array<{ label: string; value: string }> = [
    { label: t('result.workspace.ataglance.procedure'), value: procedureLabel },
    { label: t('result.workspace.ataglance.buildingClass'), value: klasseValue },
    { label: t('result.workspace.ataglance.estimatedCost'), value: costLabel },
    { label: t('result.workspace.ataglance.timeline'), value: timelineLabel },
    { label: t('result.workspace.ataglance.specialists'), value: String(specialistsCount) },
    { label: t('result.workspace.ataglance.openQuestions'), value: String(openQuestions) },
  ]

  return (
    <section
      aria-labelledby="atglance-eyebrow"
      className="flex flex-col gap-3 lg:border-l lg:border-ink/12 lg:pl-6"
    >
      <p
        id="atglance-eyebrow"
        className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none"
      >
        {t('result.workspace.ataglance.eyebrow')}
      </p>
      <ul className="flex flex-col">
        {rows.map((row, idx) => (
          <li
            key={row.label}
            className={
              'flex items-center justify-between gap-3 py-2.5 ' +
              (idx === 0 ? '' : 'border-t border-ink/12')
            }
          >
            <span className="text-[11.5px] text-clay leading-snug">{row.label}</span>
            <span
              className="text-[12.5px] font-medium text-ink leading-snug tabular-nums text-right truncate"
              title={row.value}
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Phase 8.5 (C.5) — try several explicit fact keys for building class,
 * then derive from BayBO Art. 2(3) thresholds (height + storeys) when
 * no explicit fact is present.
 */
function resolveBuildingClass(
  facts: { key: string; value: unknown }[],
  lang: 'de' | 'en',
): string | null {
  // 1. Explicit keys, in priority order. Persona may emit any of these.
  const KEYS = [
    'gebaeudeklasse_geplant',
    'gebaeudeklasse_hypothese',
    'geb_klasse',
    'gk_geplant',
    'gebaeudeklasse',
  ]
  for (const k of KEYS) {
    const f = facts.find((x) => x.key.toLowerCase() === k)
    if (!f) continue
    if (typeof f.value === 'string' && f.value.trim().length > 0) {
      return prettyClass(f.value)
    }
    if (typeof f.value === 'number') return `GK ${f.value}`
  }

  // 2. Generic regex fallback for any key containing "klasse".
  const regexHit = facts.find((f) =>
    /gebaeudeklasse|geb_klasse|gk_/i.test(f.key),
  )
  if (regexHit && typeof regexHit.value === 'string') {
    return prettyClass(regexHit.value)
  }
  // v1.0.22 Bug C — the geometric fallback (deriveGkFromGeometry)
  // was retired in favour of the unified MBO § 2 Abs. 3 derivation in
  // src/legal/deriveGebaeudeklasse.ts. The caller now consumes that
  // helper directly so the GK row carries reasoning + qualifier
  // alongside the number, and honest deferral fires when Höhe AND
  // Geschosse are both missing.
  void lang
  return null
}

function prettyClass(raw: string): string {
  // Persona may emit "GK 3", "Gebäudeklasse 3", "GK3", "3" etc.
  const trimmed = raw.trim()
  if (/^gk\s*\d/i.test(trimmed)) {
    return trimmed.replace(/^gk\s*/i, 'GK ')
  }
  if (/^geb(ä|ae)udeklasse\s*\d/i.test(trimmed)) {
    return trimmed.replace(/^geb(ä|ae)udeklasse\s*/i, 'GK ')
  }
  if (/^\d+$/.test(trimmed)) return `GK ${trimmed}`
  return trimmed
}

// v1.0.22 — numericValue retired alongside deriveGkFromGeometry.
