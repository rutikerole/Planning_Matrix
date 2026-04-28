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
 * Mobile-only sticky top bar (`lg:hidden`). Hamburger left, truncated
 * project name centred, rail icon right (with a 4 px clay badge when an
 * unseen right-rail update is pending — Polish Move 4 fallback for
 * reduced-motion users). 44 × 44 px touch targets.
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
    <div className="lg:hidden sticky top-0 z-20 bg-paper/95 backdrop-blur-[2px] border-b border-border-strong/30">
      <div className="flex items-center justify-between gap-3 px-2 h-14">
        <button
          type="button"
          onClick={onLeftClick}
          aria-label={t('chat.mobile.openLeftRail')}
          aria-expanded={leftOpen}
          className="size-11 inline-flex items-center justify-center rounded-sm text-ink/75 hover:text-ink hover:bg-muted/40 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <HamburgerIcon />
        </button>

        <p
          className="flex-1 min-w-0 text-center text-[13px] font-medium text-ink truncate px-2"
          title={projectName}
        >
          {projectName}
        </p>

        <button
          type="button"
          onClick={onRightClick}
          aria-label={t('chat.mobile.openRightRail')}
          aria-expanded={rightOpen}
          className="relative size-11 inline-flex items-center justify-center rounded-sm text-ink/75 hover:text-ink hover:bg-muted/40 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <RailIcon />
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

function HamburgerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      <line x1="2" y1="4" x2="14" y2="4" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <line x1="2" y1="12" x2="14" y2="12" />
    </svg>
  )
}

function RailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      {/* three vertically-stacked dots, the rail-rows-as-dots motif */}
      <circle cx="8" cy="3.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="8" cy="12.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}
