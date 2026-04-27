import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import type { Fact } from '@/types/projectState'
import type { ProjectRow } from '@/types/db'

interface Props {
  project: ProjectRow
  facts: Fact[]
}

interface RailFact {
  id: string
  key: string
  value: string
  qualifier: string
  evidence?: string
}

/**
 * Eckdaten — top facts about the project. Pre-seeds with intent + plot
 * derived from the project columns (always visible from turn 0), then
 * appends the most recent extracted facts up to a total of 6 rows.
 *
 * Each row is the three-row block per Polish Move 3:
 *   • label  (clay 10 tracking-0.18em uppercase)
 *   • value  (Inter 14 medium ink)
 *   • qualifier badge (Inter 9 clay/60 italic uppercase)
 *
 * New facts fade in with 12px y-rise + opacity over 240ms (reduced-
 * motion: instant). Hover row → tooltip with evidence if set.
 */
export function EckdatenPanel({ project, facts }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  const derived: RailFact[] = [
    {
      id: 'derived:intent',
      key: t('chat.rail.intentLabel'),
      value: t(`wizard.q1.options.${project.intent}`),
      qualifier: 'CLIENT · DECIDED',
    },
  ]
  if (project.has_plot && project.plot_address) {
    derived.push({
      id: 'derived:plot',
      key: t('chat.rail.plotLabel'),
      value: project.plot_address,
      qualifier: 'CLIENT · DECIDED',
    })
  }

  const fromState: RailFact[] = facts.map((f) => ({
    id: `fact:${f.key}`,
    key: f.key,
    value: typeof f.value === 'string' ? f.value : JSON.stringify(f.value),
    qualifier: `${f.qualifier.source} · ${f.qualifier.quality}`,
    evidence: f.evidence ?? f.qualifier.reason,
  }))

  const all = [...derived, ...fromState].slice(0, 6)

  return (
    <div className="flex flex-col gap-3 border-t border-border/40 pt-6">
      <p className="eyebrow text-foreground/60 text-[10px] tracking-[0.18em]">
        {t('chat.rail.facts')}
      </p>
      <ul className="flex flex-col gap-5">
        <AnimatePresence initial={false}>
          {all.map((row) => (
            <m.li
              key={row.id}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: reduced ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-1"
              title={row.evidence ?? ''}
            >
              <span className="text-[10px] text-clay/85 uppercase tracking-[0.18em]">
                {row.key}
              </span>
              <span className="text-[14px] font-medium text-ink leading-snug break-words">
                {row.value}
              </span>
              <span className="text-[9px] text-clay/60 italic uppercase tracking-[0.14em] tabular-nums">
                {row.qualifier}
              </span>
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}
