// Phase 7.8 §2.2 — ConversationStrip (Manuscript direction).
// Phase 7.9 §2.4 — single-line composition. The previous build
// stacked an italic Georgia "X · speaking now" sub-line beneath the
// caps eyebrow; the prototype carries one label only:
//
//   {SPECIALIST_SHORT} · LIVE                       ◯ 82
//
// And no hairline-bottom — the strip floats invisibly on the paper,
// kept legible by a paper-92% bg + 8 px backdrop-blur over the
// scrolled content.
//
// The 38 px CompactAstrolabe is now a button: tap → StandUp opens
// (re-establishes the access path that the killed AstrolabeStickyHeader
// used to provide).

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { Specialist } from '@/types/projectState'
import { CompactAstrolabe } from './CompactAstrolabe'

interface Props {
  percent: number
  currentSpecialist: Specialist | null
  onDialClick?: () => void
  className?: string
}

export function ConversationStrip({
  percent,
  currentSpecialist,
  onDialClick,
  className,
}: Props) {
  const { t } = useTranslation()

  const specialistShort = currentSpecialist
    ? t(`chat.chamber.specialistShort.${currentSpecialist}`)
    : null

  return (
    <div
      className={cn(
        'sticky top-0 z-20 flex items-center justify-end gap-3',
        'px-4 md:px-8 py-[14px]',
        className,
      )}
      style={{
        background: 'hsl(var(--paper) / 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-clay leading-none whitespace-nowrap">
        {specialistShort
          ? t('chat.chamber.strip.speaking', { specialist: specialistShort })
          : t('chat.chamber.atTopReady')}
      </p>

      <CompactAstrolabe
        percent={percent}
        ariaLabel={t('chat.chamber.astrolabeLabel', { percent })}
        onClick={onDialClick}
      />
    </div>
  )
}
