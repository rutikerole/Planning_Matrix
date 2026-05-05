import { useTranslation } from 'react-i18next'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import {
  buildCostBreakdown,
  detectKlasse,
  detectProcedure,
  formatEurRange,
} from '../../lib/costNormsMuenchen'
import { useResolvedRoles } from '../../hooks/useResolvedRoles'

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

  const procedures = state.procedures ?? []
  const facts = state.facts ?? []
  const areas = state.areas

  const primaryProcedure =
    procedures.find((p) => p.status === 'erforderlich') ?? procedures[0]
  const procedureLabel = primaryProcedure
    ? lang === 'en'
      ? primaryProcedure.title_en
      : primaryProcedure.title_de
    : t('result.workspace.ataglance.inProgress')

  const klasseFact = facts.find((f) =>
    /gebaeudeklasse|geb_klasse/i.test(f.key),
  )
  const klasseValue =
    typeof klasseFact?.value === 'string'
      ? klasseFact.value
      : klasseFact?.value
        ? String(klasseFact.value)
        : t('result.workspace.ataglance.tbd')

  // Cost — reuse the existing München heuristic engine.
  const corpus = facts
    .map((f) => `${f.key} ${typeof f.value === 'string' ? f.value : ''}`)
    .join(' ')
    .toLowerCase()
  const procedureType = detectProcedure(primaryProcedure?.rationale_de ?? '')
  const klasseDetected = detectKlasse(corpus)
  const cost = buildCostBreakdown(procedureType, klasseDetected)
  const costLabel = facts.length > 0 ? formatEurRange(cost.total, lang) : t('result.workspace.ataglance.tbd')

  // Timeline — coarse range from procedure type.
  const timelineLabel =
    procedureType === 'art57_freistellung'
      ? lang === 'en' ? '~ 2–3 months' : '~ 2–3 Monate'
      : procedureType === 'art60_baugenehmigung'
        ? lang === 'en' ? '~ 6–9 months' : '~ 6–9 Monate'
        : lang === 'en' ? '~ 4–6 months' : '~ 4–6 Monate'

  const specialistsCount = resolved.roles.filter((r) => r.needed).length
  const assumedCount = facts.filter((f) => f.qualifier?.quality === 'ASSUMED').length
  const pendingAreas = areas
    ? (['A', 'B', 'C'] as const).filter(
        (k) => areas[k]?.state === 'PENDING',
      ).length
    : 0
  const openQuestions = assumedCount + pendingAreas

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
