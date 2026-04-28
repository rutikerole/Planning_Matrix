import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'

interface Props {
  visible: boolean
  onTap: () => void
  onDismiss: () => void
}

const PEEK_HOLD_MS = 4000

/**
 * 60-px slice of the right rail visible at the right edge of the
 * viewport when a new recommendation arrives. Holds for 4 s then
 * retracts; tap to expand into the full drawer. lg:hidden — desktop
 * is unaffected. Reduced-motion users see the badge dot in
 * MobileTopBar instead (this component does not render).
 */
export function MobileRightRailPeek({ visible, onTap, onDismiss }: Props) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!visible || reduced) return
    const timer = setTimeout(onDismiss, PEEK_HOLD_MS)
    return () => clearTimeout(timer)
  }, [visible, reduced, onDismiss])

  if (reduced) return null

  return (
    <AnimatePresence>
      {visible && (
        <m.button
          type="button"
          onClick={onTap}
          aria-label={t('chat.mobile.peekTap')}
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 60, opacity: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="lg:hidden fixed top-14 bottom-0 right-0 z-30 w-[60px] bg-paper border-l border-border-strong/40 shadow-[-8px_0_24px_-12px_hsl(220_15%_11%/0.18)] flex flex-col items-center pt-6 gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-inset"
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-clay" />
          <span
            className="text-[9px] font-medium uppercase tracking-[0.18em] text-clay/85"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {t('chat.mobile.peekLabel')}
          </span>
        </m.button>
      )}
    </AnimatePresence>
  )
}
