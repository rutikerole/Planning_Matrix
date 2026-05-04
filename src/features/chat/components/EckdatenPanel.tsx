import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Fact } from '@/types/projectState'
import type { ProjectRow } from '@/types/db'
import { factLabel, factValueWithUnit } from '@/lib/factLabel'
import { INTENT_TO_I18N } from '@/features/wizard/lib/selectTemplate'
import { useFreshSet } from '../lib/useFreshSet'

const VISIBLE_LIMIT = 5

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

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI']

/**
 * Phase 3.2 #40 — Eckdaten as architectural-schedule blocks.
 *
 * Each row is a 24px Roman-numeral column (font-serif italic clay-deep)
 * separated from the entry body by a vertical hairline. The body is a
 * three-line block:
 *   • label    — Inter 10 uppercase tracking-0.18em clay
 *   • value    — Inter 14 medium ink
 *   • qualifier — Inter 9 italic clay/60 uppercase
 *
 * Up to 6 rows: derived (intent, plot if any) + most-recent extracted
 * facts. Reads like the Eckdaten block of a German A1 Bauantrag form.
 */
export function EckdatenPanel({ project, facts }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const reduced = useReducedMotion()

  const derived: RailFact[] = [
    {
      id: 'derived:intent',
      key: t('chat.rail.intentLabel'),
      value: (() => {
        const slug =
          (INTENT_TO_I18N as Record<string, string>)[project.intent] ?? 'sonstige'
        return t(`wizard.q1.options.${slug}.label`, {
          defaultValue: t('wizard.q1.options.sonstige.label'),
        })
      })(),
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
    key: factLabel(f.key, lang).label,
    value: factValueWithUnit(f.key, f.value, lang),
    qualifier: `${f.qualifier.source} · ${f.qualifier.quality}`,
    evidence: f.evidence ?? f.qualifier.reason,
  }))

  const all = [...derived, ...fromState]

  // Phase 7 Pass 5 — cap the right rail to 5 visible items so a
  // 1080 px viewport doesn't need to scroll. Items 6+ collapse under
  // a "show all (N)" / "show less" toggle.
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? all : all.slice(0, VISIBLE_LIMIT)
  const hiddenCount = all.length - visible.length

  // Phase 7 Move 10b — flag newly-arriving fact rows for the 2.4 s
  // clay edge-bar fade. First-mount items are seeded as seen, so
  // existing facts don't pulse on initial render.
  const getRowId = useCallback((row: RailFact) => row.id, [])
  const freshIds = useFreshSet(visible, getRowId)

  return (
    <div className="flex flex-col gap-3 border-t border-border/40 pt-6">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow text-foreground/60 text-[11px] tracking-[0.18em]">
          {t('chat.rail.facts')}
        </p>
        <span className="font-serif italic text-[9px] text-clay/60 tabular-figures">
          {String(visible.length).padStart(2, '0')} / {String(all.length).padStart(2, '0')}
        </span>
      </div>
      <ul className="flex flex-col">
        <AnimatePresence initial={false}>
          {visible.map((row, idx) => (
            <m.li
              key={row.id}
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: reduced ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                'relative grid grid-cols-[24px_1fr] gap-x-3 py-3',
                idx > 0 && 'border-t border-border/30',
              )}
              title={row.evidence ?? ''}
            >
              {/* Phase 7 Move 10b — clay 2 px edge bar that fades
                * over 2.4 s when this fact was just added. */}
              {freshIds.has(row.id) && (
                <span
                  aria-hidden="true"
                  className="absolute -left-1 top-1 bottom-1 w-[2px] bg-clay rounded-[2px] pm-fresh-edge"
                />
              )}
              {/* Roman numeral column with right-edge hairline */}
              <span className="font-serif italic text-[12px] text-clay-deep tabular-figures leading-none pt-1 border-r border-border/40 pr-2 text-center">
                {ROMAN[idx] ?? String(idx + 1)}
              </span>
              {/* Body block — label / value / qualifier.
                * Pass 4 — long mono labels (e.g. "BAUMSCHUTZVERORDNUNG
                * PRUEFUNG ERFORDERLICH" / "STELLPLAETZE KFZ ANZAHL
                * NACHGEWIESEN") used to wrap to 3 lines with the
                * default 0.18em tracking. Drop tracking to 0.08em
                * past 24 chars; clamp to 2 lines on every label so
                * the qualifier badge below never gets pushed off
                * grid. word-break stays at the CSS default so wraps
                * happen on word boundaries only. */}
              <div className="flex flex-col gap-1 min-w-0">
                <span
                  className={cn(
                    'text-[11px] text-clay/85 uppercase leading-[1.25] line-clamp-2',
                    row.key.length > 24
                      ? 'tracking-[0.08em]'
                      : 'tracking-[0.18em]',
                  )}
                >
                  {row.key}
                </span>
                <span className="text-[13px] font-medium text-ink leading-[1.35] break-words">
                  {row.value}
                </span>
                <span className="text-[9px] text-clay/60 italic uppercase tracking-[0.14em] tabular-nums">
                  {row.qualifier}
                </span>
              </div>
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
      {(hiddenCount > 0 || expanded) && all.length > VISIBLE_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start mt-1 font-mono text-[9.5px] tracking-[0.14em] uppercase text-ink-mute hover:text-clay transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-sm"
        >
          {expanded
            ? t('chat.rail.showLess', { defaultValue: '← show less' })
            : t('chat.rail.showAll', {
                count: all.length,
                defaultValue: `show all (${all.length})`,
              })}
        </button>
      )}
    </div>
  )
}
