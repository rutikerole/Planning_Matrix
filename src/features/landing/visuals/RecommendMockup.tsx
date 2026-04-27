import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { AnimatedReveal } from '@/components/shared/AnimatedReveal'
import { MockupCard } from './MockupCard'

const ITEMS = [
  'mockups.recommendItem1',
  'mockups.recommendItem2',
  'mockups.recommendItem3',
  'mockups.recommendItem4',
  'mockups.recommendItem5',
] as const

export function RecommendMockup() {
  const { t } = useTranslation()
  return (
    <MockupCard>
      <div className="flex items-center justify-between mb-5">
        <span className="eyebrow text-muted-foreground">
          {t('mockups.recommendLabel')}
        </span>
        <span className="size-1.5 rounded-full bg-clay" aria-hidden="true" />
      </div>

      <h4 className="font-display text-[20px] text-ink mb-4 leading-tight">
        {t('mockups.recommendTitle')}
      </h4>

      <ul className="flex flex-col gap-2.5 mb-5">
        {ITEMS.map((key, i) => (
          <AnimatedReveal key={key} as="li" delay={0.15 + i * 0.1} y={6}>
            <span className="flex items-center gap-3 text-[13px] text-ink/85">
              <span
                aria-hidden="true"
                className="size-4 rounded-full bg-clay/15 inline-flex items-center justify-center shrink-0"
              >
                <Check className="size-2.5 text-clay stroke-[3]" />
              </span>
              <span className="leading-tight">{t(key)}</span>
            </span>
          </AnimatedReveal>
        ))}
      </ul>

      <div className="flex items-center justify-between pt-4 border-t border-border-strong/35">
        <span className="text-[12px] text-muted-foreground">
          {t('mockups.recommendFooter')}
        </span>
        <span className="text-[12px] text-clay font-medium tabular-nums">5 / 5</span>
      </div>
    </MockupCard>
  )
}
