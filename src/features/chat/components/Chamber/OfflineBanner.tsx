// Phase 7 Chamber — OfflineBanner.

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'

export function OfflineBanner() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const queueDepth = useChatStore((s) => s.offlineQueue.length)

  useEffect(() => {
    const onUp = () => setOnline(true)
    const onDown = () => setOnline(false)
    window.addEventListener('online', onUp)
    window.addEventListener('offline', onDown)
    return () => {
      window.removeEventListener('online', onUp)
      window.removeEventListener('offline', onDown)
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
          className="fixed top-0 left-0 right-0 z-40 bg-paper-card border-b border-[var(--hairline-strong,rgba(26,22,18,0.18))]"
        >
          <div className="mx-auto max-w-[1280px] px-4 md:px-6 py-2 text-[12.5px] text-clay/85 italic flex items-center gap-3">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-clay" />
            {t('chat.banner.offline')}
            {queueDepth > 0 && (
              <span className="not-italic font-mono text-[11px] tracking-[0.16em] text-clay">
                · {t('chat.banner.offlineQueued', { count: queueDepth })}
              </span>
            )}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
