// Phase 7 Chamber — RateLimitBanner.

import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'

export function RateLimitBanner() {
  const { t, i18n } = useTranslation()
  const reduced = useReducedMotion()
  const rateLimit = useChatStore((s) => s.lastRateLimit)
  const setRateLimit = useChatStore((s) => s.setRateLimit)
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const resetTime = rateLimit
    ? new Date(rateLimit.resetAt).toLocaleTimeString(
        lang === 'en' ? 'en-GB' : 'de-DE',
        { hour: '2-digit', minute: '2-digit' },
      )
    : ''

  return (
    <AnimatePresence>
      {rateLimit && (
        <m.div
          initial={reduced ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: reduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          role="status"
          className="fixed top-0 left-0 right-0 z-40 bg-paper-card border-b border-[var(--hairline-strong)]"
        >
          <div className="mx-auto max-w-[1280px] px-4 md:px-6 py-2 flex items-center gap-3">
            <p className="flex-1 text-[12.5px] text-clay/85 italic">
              {t('chat.banner.rateLimit', {
                count: rateLimit.currentCount,
                max: rateLimit.maxCount,
                time: resetTime,
              })}
            </p>
            <button
              type="button"
              onClick={() => setRateLimit(null)}
              className="text-[11px] uppercase tracking-[0.16em] text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 rounded-sm"
            >
              {t('chat.banner.rateLimitDismiss')}
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
