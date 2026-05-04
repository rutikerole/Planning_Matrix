// Phase 7.5 — SpineHeader.
// Phase 7.6 §1.7 — wordmark dropped (the global <AppHeader> carries it
// now). The header now reads as: project name + plot + round counter
// + percent + 2 px clay progress bar.
// Phase 7.8 §2.1 — typography aligned to Screenshot 1: project name
// 14.5 px, plot 12 px (clay), round caps 10 px tracking 0.20em, percent
// 13 px italic Georgia. Sub-line spacing tightened.

import { useTranslation } from 'react-i18next'
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
      {/* Project name (wordmark moved to <AppHeader> in commit 3).
        * Phase 7.6 §1.5 — 12.5 → 14 px, plot 10 → 11 px, round 9 → 10.5 px.
        * Phase 7.8 §2.1 — Reading Room scale: name 14 → 14.5 px,
        * plot 11 → 12 px, round caps 10.5 → 10 px tracking 0.20em. */}
      <p
        className="text-[14.5px] font-medium text-ink leading-[1.3] line-clamp-2"
        title={projectName}
      >
        {cleanName}
      </p>
      {fallbackStreet && (
        <p className="text-[14.5px] font-medium text-ink leading-[1.3]" title={plotAddress ?? ''}>
          {fallbackStreet}
        </p>
      )}

      {/* Plot suffix line */}
      {plot && plot !== plotAddress && (
        <p className="mt-1 text-[12px] text-clay leading-tight tabular-figures">
          {plot}
        </p>
      )}

      {/* Round + percent */}
      <div className="mt-3.5 flex items-baseline justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-clay leading-none">
          {t('chat.spine.header.round', { current: round, total: totalEstimate })}
        </p>
        <p className="font-serif italic text-[13px] text-ink tabular-figures leading-none">
          {percent}<span className="text-[11px] text-ink/55">%</span>
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
