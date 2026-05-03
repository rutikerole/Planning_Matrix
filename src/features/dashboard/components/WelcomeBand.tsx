import { useTranslation } from 'react-i18next'
import { Tagline } from './Tagline'
import { ActivityTicker } from './ActivityTicker'
import { IntelLine } from './IntelLine'
import type { IntelCounts } from '../lib/projectIntel'

interface Props {
  firstName: string | null
  counts: IntelCounts
}

/**
 * v3 dashboard hero — eyebrow + huge serif welcome + tagline +
 * activity ticker. The intel line continues to render below the
 * ticker as a quieter supplement (it's the structured complement
 * to the ticker's free-form latest events).
 */
export function WelcomeBand({ firstName, counts }: Props) {
  const { t } = useTranslation()
  const headline = firstName
    ? t('dashboard.welcome', { name: firstName })
    : t('dashboard.welcomeAnon')

  return (
    <section className="flex flex-col">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
        {t('dashboard.eyebrow')}
      </p>
      <h1 className="mt-4 font-serif text-[clamp(3.5rem,7vw,6rem)] leading-[0.94] -tracking-[0.01em] text-pm-ink">
        {headline.replace(/\.$/, '')}
        <span className="text-pm-clay">.</span>
      </h1>
      <div className="mt-8">
        <Tagline />
      </div>
      <ActivityTicker />
      <div className="mt-6">
        <IntelLine counts={counts} />
      </div>
    </section>
  )
}
