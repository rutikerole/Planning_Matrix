// Stub — real chip selector lands in commit #9.
import { useTranslation } from 'react-i18next'

export function QuestionIntent() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-7">
      <p className="eyebrow inline-flex items-center text-foreground/65">
        <span className="accent-dot" aria-hidden="true" />
        {t('wizard.q1.eyebrow')}
      </p>
      <h1 className="font-display text-display-3 md:text-display-2 text-ink leading-[1.05]">
        {t('wizard.q1.headline').replace(/[?]\s*$/, '')}
        <span className="text-clay">?</span>
      </h1>
      <p className="text-body-lg text-ink/70 leading-relaxed max-w-[28rem]">
        {t('wizard.q1.sub')}
      </p>
      <p className="text-sm text-ink/55 italic">
        {t('wizard.placeholder.q1')}
      </p>
    </div>
  )
}
