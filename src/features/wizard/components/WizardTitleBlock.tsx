import { useTranslation } from 'react-i18next'
import { NorthArrow } from '@/features/chat/components/NorthArrow'

interface Props {
  /** Roman numeral marking the current step ("I" or "II"). */
  numeral: string
  /** i18n key for the eyebrow line (without the · numeral · suffix). */
  eyebrowKey: string
  /** Headline copy — already translated by the caller, with the
   *  trailing question/period stripped (the colored punct is rendered
   *  separately by `punct`). */
  headline: string
  /** Final punctuation glyph rendered in clay (`?` or `.`). */
  punct: '?' | '.'
  /** Translated subhead. */
  sub: string
  /** Optional id for the headline (so a button group can reference it
   *  via aria-labelledby). */
  headlineId?: string
}

/**
 * Phase 3.3 #48 — title block for the wizard's paper sheet.
 *
 * Same convention as the chat workspace's TitleBlock + Phase 3.2's
 * dashboard welcome block: eyebrow → Roman numeral on a hairline rule
 * → headline (Instrument Serif, period in clay) → italic sub. A small
 * NorthArrow rosette anchors the top-right corner of the sheet, same
 * draw-in animation on first mount as the chat workspace.
 */
export function WizardTitleBlock({
  numeral,
  eyebrowKey,
  headline,
  punct,
  sub,
  headlineId,
}: Props) {
  const { t } = useTranslation()
  return (
    <header className="relative flex flex-col gap-5 sm:gap-6">
      {/* North arrow rosette — top-right of the sheet */}
      <span aria-hidden="true" className="absolute top-0 right-0 -translate-y-1">
        <NorthArrow />
      </span>

      <p className="eyebrow inline-flex items-center text-foreground/65 pr-12">
        <span className="accent-dot" aria-hidden="true" />
        {t(eyebrowKey)}
      </p>

      {/* Roman numeral on a hairline rule that crosses the sheet */}
      <div className="flex items-center gap-3 pr-12">
        <span className="font-serif italic text-[14px] text-clay-deep tabular-figures leading-none w-6 shrink-0">
          {numeral}
        </span>
        <span aria-hidden="true" className="block flex-1 h-px bg-ink/15" />
      </div>

      <h1
        id={headlineId}
        className="font-display text-[clamp(36px,5vw,52px)] text-ink leading-[1.05] -tracking-[0.02em]"
      >
        {headline}
        <span className="text-clay">{punct}</span>
      </h1>

      <p className="font-serif italic text-[15px] sm:text-[16px] text-ink/65 leading-relaxed max-w-[28rem]">
        {sub}
      </p>
    </header>
  )
}
