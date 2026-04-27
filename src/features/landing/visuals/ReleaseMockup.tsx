import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { MockupCard } from './MockupCard'

export function ReleaseMockup() {
  const { t } = useTranslation()
  return (
    <MockupCard>
      <div className="flex items-center justify-between mb-5">
        <span className="eyebrow text-muted-foreground">
          {t('mockups.releaseLabel')}
        </span>
        <span className="size-1.5 rounded-full bg-clay" aria-hidden="true" />
      </div>

      <p className="text-[12px] text-muted-foreground uppercase tracking-[0.14em] mb-1.5">
        {t('mockups.releaseRole')}
      </p>
      <p className="font-display text-[22px] text-ink leading-tight mb-1">
        {t('mockups.releaseName')}
      </p>
      <p className="text-[12px] text-muted-foreground/85 mb-7 tabular-nums">
        {t('mockups.releaseChamber')}
      </p>

      {/* VERIFIED stamp */}
      <div className="flex items-center justify-end mb-6">
        <span
          aria-label={t('mockups.stampVerified')}
          className="inline-flex items-center gap-1.5 -rotate-[7deg] border-[1.5px] border-clay/70 px-2.5 py-1 text-clay font-medium text-[10px] tracking-[0.22em] uppercase"
        >
          <Check className="size-3 stroke-[3]" aria-hidden="true" />
          {t('mockups.stampVerified')}
        </span>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border-strong/35">
        <span className="text-[12px] text-muted-foreground">
          {t('mockups.releaseFooter')}
        </span>
        <span
          aria-hidden="true"
          className="inline-block size-1.5 rounded-full bg-clay"
        />
      </div>
    </MockupCard>
  )
}
