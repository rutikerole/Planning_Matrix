import { useTranslation } from 'react-i18next'

interface Props {
  projectName: string
  onLeftClick: () => void
  onRightClick: () => void
  rightBadge: boolean
  leftOpen: boolean
  rightOpen: boolean
}

/**
 * Phase 3.2 #45 — mobile top bar in atelier register.
 *
 * Layout:
 *   ┌────────────┬───────────────────────────────────────┬──────────┐
 *   │  ⟦ tab ⟧  │   PROJEKT                              │  ⟧ tab ⟦ │
 *   │            │   {Project name}  ·  italic clay rule │           │
 *   └────────────┴───────────────────────────────────────┴──────────┘
 *
 * Center column reads as a miniature German A1 title block: PROJEKT
 * eyebrow (Inter 9 tracking-0.22em uppercase clay) over the project
 * name in Inter 13 medium ink, hairline rule beneath. Triggers on
 * either side are folded-paper-tab icons (chamfered corner + fold
 * shadow), 44×44 touch targets — drafting-blue stroke at 60%.
 */
export function MobileTopBar({
  projectName,
  onLeftClick,
  onRightClick,
  rightBadge,
  leftOpen,
  rightOpen,
}: Props) {
  const { t } = useTranslation()

  return (
    <div className="lg:hidden sticky top-0 z-20 bg-paper/95 backdrop-blur-[2px] border-b border-ink/15">
      <div className="flex items-stretch gap-1 px-2 h-16">
        <button
          type="button"
          onClick={onLeftClick}
          aria-label={t('chat.mobile.openLeftRail')}
          aria-expanded={leftOpen}
          className="size-11 self-center inline-flex items-center justify-center rounded-sm text-drafting-blue/75 hover:text-drafting-blue hover:bg-paper-tinted transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <FoldedTabIcon side="left" />
        </button>

        {/* Title block — eyebrow + name + hairline rule */}
        <div
          className="flex-1 min-w-0 flex flex-col justify-center text-center px-2"
          title={projectName}
        >
          <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-clay/85 leading-none">
            {t('chat.mobile.eyebrow', { defaultValue: 'Projekt' })}
          </p>
          <p className="text-[13px] font-medium text-ink truncate mt-1">
            {projectName.split('·')[0]?.trim() ?? projectName}
          </p>
          <span aria-hidden="true" className="block h-px w-12 bg-ink/20 self-center mt-1.5" />
        </div>

        <button
          type="button"
          onClick={onRightClick}
          aria-label={t('chat.mobile.openRightRail')}
          aria-expanded={rightOpen}
          className="relative size-11 self-center inline-flex items-center justify-center rounded-sm text-drafting-blue/75 hover:text-drafting-blue hover:bg-paper-tinted transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <FoldedTabIcon side="right" />
          {rightBadge && (
            <span
              aria-hidden="true"
              className="absolute top-2.5 right-2.5 size-1 rounded-full bg-clay"
            />
          )}
        </button>
      </div>
    </div>
  )
}

/** Folded-paper tab icon — 22×22 with one corner cut diagonally + fold shadow. */
function FoldedTabIcon({ side }: { side: 'left' | 'right' }) {
  // Mirror horizontally for the right side so the fold reads as the
  // edge of a tab pulling out from that side.
  const transform = side === 'right' ? 'scale(-1, 1) translate(-22, 0)' : undefined
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <g transform={transform}>
        {/* Tab body — rectangle with the top-right corner chamfered */}
        <path d="M 3 3 L 15 3 L 19 7 L 19 19 L 3 19 Z" />
        {/* Fold — small triangle showing the back of the page */}
        <path d="M 15 3 L 15 7 L 19 7" strokeOpacity="0.55" />
        {/* Two horizontal rules suggesting tab content */}
        <path d="M 6 11 L 16 11" strokeOpacity="0.45" />
        <path d="M 6 14 L 14 14" strokeOpacity="0.4" />
      </g>
    </svg>
  )
}
