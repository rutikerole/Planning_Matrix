// Phase 7.8 §2.2 — ConversationStrip (Manuscript direction).
//
// A sticky, top-right band inside the conversation column. It replaces
// the killed `topRegion` (full Astrolabe + 7-sigil row) and the
// AstrolabeStickyHeader on the conversation surface.
//
// Composition (left → right):
//   eyebrow (caps)  {SPECIALIST_SHORT} · LIVE   (font-mono 10 px clay)
//   sub             italic Georgia 11 px clay — display name "speaking now"
//   compact dial    38 px CompactAstrolabe with italic % number
//
// Geometry:
//   - 56 px height
//   - paper-92% bg + 8 px backdrop-blur for a frosted page feel
//   - 0.5 px hairline-bottom border (--hairline)
//   - position: sticky; top: 0 (sticks inside the chamber-main scroll
//     context — Phase 7.6 viewport-grid already ensures the page body
//     itself doesn't scroll)
//
// What it deliberately omits, vs. AstrolabeStickyHeader:
//   - wordmark, project name, plot suffix (those live in Spine /
//     <AppHeader>)
//   - SpecialistTeam strip (killed in §2.4)
//   - overflow menu (kept on AstrolabeStickyHeader for mobile only)

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { Specialist } from '@/types/projectState'
import { CompactAstrolabe } from './CompactAstrolabe'

interface Props {
  percent: number
  currentSpecialist: Specialist | null
  className?: string
}

export function ConversationStrip({
  percent,
  currentSpecialist,
  className,
}: Props) {
  const { t } = useTranslation()

  const specialistShort = currentSpecialist
    ? t(`chat.chamber.specialistShort.${currentSpecialist}`)
    : null
  const specialistDisplay = currentSpecialist
    ? t(`chat.chamber.specialistDisplay.${currentSpecialist}`)
    : null

  return (
    <div
      className={cn(
        'sticky top-0 z-20 flex items-center justify-end gap-3 px-4 md:px-6 h-14',
        'border-b border-[var(--hairline,rgba(26,22,18,0.10))]',
        className,
      )}
      style={{
        background: 'hsl(var(--paper) / 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div className="flex flex-col items-end gap-0.5 min-w-0">
        {specialistShort ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-clay leading-none whitespace-nowrap">
            {t('chat.chamber.strip.speaking', { specialist: specialistShort })}
          </p>
        ) : (
          <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-clay leading-none whitespace-nowrap">
            {t('chat.chamber.atTopReady')}
          </p>
        )}
        {specialistDisplay && (
          <p
            className="text-[11px] italic text-clay leading-tight whitespace-nowrap"
            style={{ fontFamily: "Georgia, 'Instrument Serif', serif" }}
          >
            {specialistDisplay} · {t('chat.chamber.stage.speakingNow')}
          </p>
        )}
      </div>

      <CompactAstrolabe
        percent={percent}
        ariaLabel={t('chat.chamber.astrolabeLabel', { percent })}
      />
    </div>
  )
}
