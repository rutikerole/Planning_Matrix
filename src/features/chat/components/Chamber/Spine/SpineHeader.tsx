// Phase 7.5 — SpineHeader.
//
// Sticky top of the Spine. Wordmark, project name, plot, round
// counter, slim 2 px progress bar.

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'

interface Props {
  projectName: string
  plotAddress: string | null
  percent: number
  round: number
  totalEstimate: number
}

export function SpineHeader({ projectName, plotAddress, percent, round, totalEstimate }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const cleanName = projectName.split('·')[0]?.trim() ?? projectName
  const plot = plotAddress?.replace(/^[^,]+,\s*/, '') // drop street, keep "52k · 80799 München"-ish portion
  const fallbackStreet = plotAddress?.split(',')[0]?.trim() ?? ''

  return (
    <header className="sticky top-0 bg-paper-card px-4 pt-4 pb-3.5 border-b border-[var(--hairline,rgba(26,22,18,0.08))] z-[1]">
      {/* Wordmark */}
      <Link
        to="/dashboard"
        className="inline-flex font-serif italic text-[11px] text-clay-deep hover:text-clay leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card rounded-sm"
      >
        <span className="italic">{t('chat.chamber.wordmark').split(' ')[0]}</span>
        <span className="not-italic font-sans tracking-[0.02em] ml-1">
          {t('chat.chamber.wordmark').split(' ').slice(1).join(' ')}
        </span>
      </Link>

      {/* Project name */}
      <p
        className="mt-3 text-[12.5px] font-medium text-ink leading-[1.3] line-clamp-2"
        title={projectName}
      >
        {cleanName}
      </p>
      {fallbackStreet && (
        <p className="text-[12.5px] font-medium text-ink leading-[1.3]" title={plotAddress ?? ''}>
          {fallbackStreet}
        </p>
      )}

      {/* Plot suffix line */}
      {plot && plot !== plotAddress && (
        <p className="mt-1 text-[10px] text-clay leading-tight tabular-figures">
          {plot}
        </p>
      )}

      {/* Round + percent */}
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-clay leading-none">
          {t('chat.spine.header.round', { current: round, total: totalEstimate })}
        </p>
        <p className="font-serif italic text-[12px] text-ink tabular-figures leading-none">
          {percent}<span className="text-[10px] text-ink/55">%</span>
        </p>
      </div>

      {/* Progress bar */}
      <div className="mt-1.5 h-[2px] w-full bg-[var(--hairline,rgba(26,22,18,0.10))] rounded-full overflow-hidden">
        <div
          aria-hidden="true"
          className="h-full bg-clay rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, percent))}%`,
            transition: reduced
              ? 'none'
              : 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </header>
  )
}
