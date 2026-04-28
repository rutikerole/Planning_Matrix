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
 * Phase 3.2 #45 — peek slice in atelier register.
 *
 * 60px paper-tinted slice at the right edge of the viewport, shown
 * for 4s when a new recommendation arrives. Drafting-blue spine on
 * the inner edge (matches the drawer spine), italic-Serif "Notiz"
 * label rotated vertically, plus a small clay accent dot.
 * lg:hidden — desktop is unaffected. Reduced-motion users see the
 * badge dot in MobileTopBar instead.
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
          className="lg:hidden fixed top-16 bottom-0 right-0 z-30 w-[60px] bg-paper-tinted border-l border-ink/15 shadow-[-8px_0_24px_-12px_hsl(220_15%_11%/0.22)] flex flex-col items-center pt-6 gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-inset"
        >
          {/* Drafting-blue spine on the inner (left) edge of the peek */}
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-px bg-drafting-blue/45"
          />
          <span aria-hidden="true" className="size-1.5 rounded-full bg-clay" />
          <span
            className="font-serif italic text-[11px] text-clay/85 leading-none"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {t('chat.mobile.peekLabel')}
          </span>
        </m.button>
      )}
    </AnimatePresence>
  )
}
