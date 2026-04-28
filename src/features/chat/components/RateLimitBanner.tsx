// ───────────────────────────────────────────────────────────────────────
// Phase 4.1 #125 — RateLimitBanner
//
// Surfaces above the workspace when the chat-turn function rejected the
// most recent submit with HTTP 429. Reads from chatStore.lastRateLimit
// (set by useChatTurn's onError, cleared by the success path or by the
// dismiss button below). Same quiet-bar register as OfflineBanner.
// ───────────────────────────────────────────────────────────────────────

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
          className="bg-paper border-b border-border-strong/30"
        >
          <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-14 py-2 flex items-center gap-3">
            <p className="flex-1 text-[12px] text-clay/85 italic">
              {t('chat.banner.rateLimit', {
                defaultValue:
                  'Sie haben in dieser Stunde sehr viele Nachrichten gesendet ({{count}} von {{max}}). Bitte warten Sie bis {{time}}.',
                count: rateLimit.currentCount,
                max: rateLimit.maxCount,
                time: resetTime,
              })}
            </p>
            <button
              type="button"
              onClick={() => setRateLimit(null)}
              className="text-[11px] uppercase tracking-[0.16em] text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
              aria-label={t('chat.banner.rateLimitDismiss', {
                defaultValue: 'Hinweis ausblenden',
              })}
            >
              {t('chat.banner.rateLimitDismiss', {
                defaultValue: 'Hinweis ausblenden',
              })}
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
