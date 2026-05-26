import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { DraftingBoard } from '@/features/loader/components/DraftingBoard'
import { Tagline } from './Tagline'

interface Props {
  /** Resolved first name for the welcome line; null → anonymous welcome. */
  firstName: string | null
}

/**
 * Dashboard empty state — a single centred "atelier stage". DashboardPage
 * drops this into a `flex-1` main and centres it, with the footer pinned
 * below, so the whole first-run screen lands in one viewport with no
 * scroll. It folds the welcome identity (eyebrow + name + tagline) and the
 * start-a-project prompt into one composition so the CTA sits in the
 * optical centre.
 *
 * Reuses the loader's drafting-board SVG, shrunk to a quiet mark via
 * `.dash-empty-mark` (dashboard.css) and static — no stroke-draw motion,
 * since this is a calm waiting state, not a transition.
 */
export function EmptyState({ firstName }: Props) {
  const { t } = useTranslation()
  const headline = firstName
    ? t('dashboard.welcome', { name: firstName })
    : t('dashboard.welcomeAnon')

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
        {t('dashboard.eyebrow')}
      </p>

      <div className="flex flex-col items-center gap-3">
        <h1 className="font-serif text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[0.96] -tracking-[0.01em] text-pm-ink">
          {headline.replace(/\.$/, '')}
          <span className="text-pm-clay">.</span>
        </h1>
        <Tagline />
      </div>

      <DraftingBoard className="dash-empty-mark" />

      <div className="flex max-w-[28rem] flex-col items-center gap-2">
        <h2 className="font-serif text-[clamp(1.5rem,2.6vw,1.875rem)] leading-tight text-pm-ink">
          {t('dashboard.empty.h')}
        </h2>
        <p className="font-sans text-[15px] italic leading-relaxed text-pm-clay">
          {t('dashboard.empty.sub')}
        </p>
      </div>

      <Link
        to="/projects/new"
        className="inline-flex items-center justify-center gap-2 bg-pm-clay px-6 py-3 font-sans text-[14px] text-pm-paper transition-colors hover:bg-pm-clay-deep motion-safe:hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {t('dashboard.empty.cta')}
      </Link>

      <span aria-hidden="true" className="block h-px w-24 bg-pm-hair" />

      <p className="max-w-[34rem] font-sans text-[13.5px] leading-relaxed text-pm-ink-mid">
        {t('dashboard.empty.note')}
      </p>
    </div>
  )
}
