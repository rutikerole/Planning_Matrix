import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { DraftingBoard } from '@/features/loader/components/DraftingBoard'

/**
 * Dashboard empty state. Reuses the loader's drafting-board SVG —
 * static (no stroke-draw motion) since this is a calm waiting state,
 * not a transition.
 */
export function EmptyState() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-8 py-20 text-center">
      <DraftingBoard />

      <div className="flex flex-col items-center gap-3 max-w-[28rem]">
        <h2 className="font-serif text-[clamp(1.75rem,3vw,2rem)] leading-tight text-pm-ink">
          {t('dashboard.empty.h')}
        </h2>
        <p className="font-sans text-[15px] italic leading-relaxed text-pm-clay">
          {t('dashboard.empty.sub')}
        </p>
      </div>

      <Link
        to="/projects/new"
        className="inline-flex items-center justify-center bg-pm-clay px-5 py-2.5 font-sans text-[14px] text-pm-paper transition-colors hover:bg-pm-clay-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
      >
        {t('dashboard.empty.cta')}
      </Link>

      <span aria-hidden="true" className="block h-px w-24 bg-pm-hair" />

      <p className="max-w-[34rem] font-sans text-[14px] leading-relaxed text-pm-ink-mid">
        {t('dashboard.empty.note')}
      </p>
    </div>
  )
}
