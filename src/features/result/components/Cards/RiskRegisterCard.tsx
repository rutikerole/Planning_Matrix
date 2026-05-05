import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { composeRisks, type ScoredRisk } from '../../lib/composeRisks'

interface Props {
  project: ProjectRow
  state: Partial<ProjectState>
}

/**
 * Phase 8.3 (C.2) — risk register action card. 4th card on the
 * Overview tab. Surfaces top 3 risks computed from state evidence ×
 * catalog impact; each risk gets a 3×3 likelihood×impact dot matrix
 * and an un-risk note. "+ N more →" expands the full list inline.
 */
export function RiskRegisterCard({ project, state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const [expanded, setExpanded] = useState(false)
  const { visible, total } = composeRisks({
    project,
    state,
    limit: expanded ? 12 : 3,
  })
  const remaining = total - visible.length

  return (
    <article className="flex flex-col gap-3 p-4 sm:p-[18px] bg-paper-card border border-ink/12 rounded-[10px]">
      <header className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none">
          {t('result.workspace.risks.eyebrow')}
        </span>
        <span className="text-[10.5px] italic font-serif text-clay/85 leading-none">
          {t('result.workspace.risks.count', { count: total })}
        </span>
      </header>
      {visible.length === 0 ? (
        <p className="text-[11.5px] italic text-clay/85 leading-snug">
          {t('result.workspace.risks.empty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {visible.map((r) => (
            <RiskRow key={r.entry.id} risk={r} lang={lang} />
          ))}
        </ul>
      )}
      {remaining > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="self-start text-[11px] italic text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft"
        >
          {t('result.workspace.risks.showMore', { count: remaining })}
        </button>
      )}
    </article>
  )
}

function RiskRow({ risk, lang }: { risk: ScoredRisk; lang: 'de' | 'en' }) {
  const { t } = useTranslation()
  const title = lang === 'en' ? risk.entry.titleEn : risk.entry.titleDe
  const unrisk = lang === 'en' ? risk.entry.unriskEn : risk.entry.unriskDe
  return (
    <li className="grid grid-cols-[1fr_36px] gap-2 items-start">
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-[12.5px] font-medium text-ink leading-snug">{title}</p>
        <p className="font-serif italic text-[10.5px] text-clay leading-snug">
          <span className="not-italic font-medium uppercase tracking-[0.16em] text-clay/72 text-[9.5px] mr-1">
            {t('result.workspace.risks.unrisksThisPrefix')}
          </span>
          {unrisk}
        </p>
      </div>
      <DotMatrix likelihood={risk.likelihood} impact={risk.impact} />
    </li>
  )
}

function DotMatrix({
  likelihood,
  impact,
}: {
  likelihood: 1 | 2 | 3
  impact: 1 | 2 | 3
}) {
  // 3×3 grid; row 0 = highest likelihood (3), col 2 = highest impact (3).
  const cells: Array<{ row: number; col: number }> = []
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      cells.push({ row, col })
    }
  }
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-3 gap-[2px] w-9 h-9 shrink-0"
      role="presentation"
    >
      {cells.map(({ row, col }) => {
        const cellLikelihood = 3 - row
        const cellImpact = col + 1
        const isFilled =
          cellLikelihood === likelihood && cellImpact === impact
        const tone =
          likelihood * impact >= 6
            ? 'bg-clay'
            : likelihood * impact >= 4
              ? 'bg-clay/60'
              : 'bg-clay/40'
        return (
          <span
            key={`${row}-${col}`}
            className={
              'block rounded-[1px] ' +
              (isFilled ? tone : 'bg-ink/10')
            }
          />
        )
      })}
    </div>
  )
}
