import { useTranslation } from 'react-i18next'
import { IntelLine } from './IntelLine'
import type { IntelCounts } from '../lib/projectIntel'

interface Props {
  /** Resolved first name, or null for the bare "Welcome." headline. */
  firstName: string | null
  counts: IntelCounts
}

/**
 * Top band of the dashboard: eyebrow → headline (Welcome, {firstName}.)
 * → 80px hairline → intelligence line. The action bar (filters,
 * search, CTA) lives in the parent so the welcome band stays
 * decorative.
 */
export function WelcomeBand({ firstName, counts }: Props) {
  const { t } = useTranslation()

  const headline = firstName
    ? t('dashboard.welcome', { name: firstName })
    : t('dashboard.welcomeAnon')

  return (
    <section className="flex flex-col gap-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
        {t('dashboard.eyebrow')}
      </p>
      <h1 className="font-serif text-[clamp(3rem,5vw,5rem)] leading-[1.02] -tracking-[0.022em] text-pm-ink">
        {headline.replace(/\.$/, '')}
        <span className="text-pm-clay">.</span>
      </h1>
      <span aria-hidden="true" className="block h-px w-20 bg-pm-ink/20" />
      <IntelLine counts={counts} />
    </section>
  )
}
