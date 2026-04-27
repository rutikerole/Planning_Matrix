import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { MockupCard } from './MockupCard'

export function CaptureMockup() {
  const { t } = useTranslation()
  return (
    <MockupCard>
      <div className="flex items-center justify-between mb-5">
        <span className="eyebrow text-muted-foreground">
          {t('mockups.captureLabel')}
        </span>
        <span className="size-1.5 rounded-full bg-clay" aria-hidden="true" />
      </div>

      <p className="text-[13px] text-muted-foreground mb-3 leading-relaxed">
        {t('mockups.capturePrompt')}
      </p>

      <div className="rounded-sm border border-ink/20 bg-background px-3.5 py-2.5 mb-5 min-h-[42px] flex items-center">
        <span className="text-[14px] text-ink leading-none">
          {t('mockups.captureAnswer')}
        </span>
        <span
          aria-hidden="true"
          className="ml-0.5 inline-block w-[1.5px] h-[15px] bg-ink animate-blink-cursor align-middle"
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border-strong/35">
        <span className="text-[12px] text-muted-foreground">
          {t('mockups.captureFooter')}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[12px] text-ink/85 font-medium">
          {t('mockups.captureNext')}
          <ArrowRight className="size-3" aria-hidden="true" />
        </span>
      </div>
    </MockupCard>
  )
}
