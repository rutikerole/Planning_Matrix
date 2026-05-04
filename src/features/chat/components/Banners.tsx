import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'

/**
 * Top-of-workspace status strips. Hidden by default; surface only
 * when needed. Inter 12 clay copy, paper backdrop, hairline bottom
 * border. No icons, no shadow, no chrome — quiet bar.
 *
 * Phase 5 — when offline, also surface the queue depth so the user
 * knows how many of their inputs are buffered for replay-on-reconnect.
 */
export function OfflineBanner() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const queueDepth = useChatStore((s) => s.offlineQueue.length)

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {!online && (
        <m.div
          initial={reduced ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: reduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          role="status"
          className="bg-paper border-b border-border-strong/30"
        >
          <div className="mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-14 py-2 text-[12px] text-clay/85 italic">
            {t('chat.banner.offline')}
            {queueDepth > 0 ? (
              <span className="ml-2 not-italic font-mono text-[11px] tracking-[0.16em] text-clay">
                · {t('chat.banner.offlineQueued', { count: queueDepth })}
              </span>
            ) : null}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
