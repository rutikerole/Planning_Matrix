// Phase 7.5 — SpineHeader.
// Phase 7.6 §1.7 — wordmark dropped (the global <AppHeader> carries it
// now). The header now reads as: project name + plot + round counter
// + percent + 2 px clay progress bar.
// Phase 7.8 §2.1 — typography aligned to Screenshot 1: project name
// 14.5 px, plot 12 px (clay), round caps 10 px tracking 0.20em, percent
// 13 px italic Georgia. Sub-line spacing tightened.
// Phase 7.9 §2.2 — wordmark crown re-introduced at the top of the
// SpineHeader (now that the global AppHeader is unmounted on chat).
// 18 × 18 axonometric building glyph + "Planning Matrix" lockup
// (Inter 500 + italic Georgia 500), hairline-bottom separating it
// from the project section. Click → /dashboard.

import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { Wordmark } from '@/components/shared/Wordmark'

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
    <header className="sticky top-0 bg-paper-card z-[1]">
      {/* Phase 7.9 §2.2 — wordmark crown. 18 × 18 glyph + "Planning
        * Matrix" lockup; click routes to /dashboard. Padding 18-18-14
        * matches the prototype rhythm. */}
      <Link
        to="/dashboard"
        className="flex items-center px-5 pt-5 pb-4 border-b border-[rgba(26,22,18,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-1"
      >
        <Wordmark size="md" asLink={false} />
      </Link>

      <div className="px-5 pt-5 pb-4 border-b border-[var(--hairline,rgba(26,22,18,0.08))]">
        {/* Phase 7.6 §1.5 — 12.5 → 14 px, plot 10 → 11 px.
          * Phase 7.8 §2.1 — Reading Room: name 14.5 px, plot 12 px,
          * round caps 10 px / 0.20em.
          * Phase 7.9 §2.8 — round caps 9.5 px / 0.22em.
          * Width-300 bump — name 14.5 → 16, plot 12 → 13.5, caps
          * 9.5 → 10.5, percent 13 → 14.5, % glyph 11 → 12. */}
        <p
          className="text-[16px] font-medium text-ink leading-[1.3] line-clamp-2"
          title={projectName}
        >
          {cleanName}
        </p>
        {fallbackStreet && (
          <p className="text-[16px] font-medium text-ink leading-[1.3]" title={plotAddress ?? ''}>
            {fallbackStreet}
          </p>
        )}

        {/* Plot suffix line */}
        {plot && plot !== plotAddress && (
          <p className="mt-1.5 text-[13.5px] text-clay leading-tight tabular-figures">
            {plot}
          </p>
        )}

        {/* Round + percent */}
        <div className="mt-4 flex items-baseline justify-between gap-2">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-clay font-medium leading-none">
            {t('chat.spine.header.round', { current: round, total: totalEstimate })}
          </p>
          <p className="font-serif italic text-[14.5px] text-ink tabular-figures leading-none">
            {percent}<span className="text-[12px] text-ink/55">%</span>
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
      </div>
    </header>
  )
}
