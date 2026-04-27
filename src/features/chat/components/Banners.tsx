import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'

/**
 * Top-of-workspace status strips. Hidden by default; surface only
 * when needed. Inter 12 clay copy, paper backdrop, hairline bottom
 * border. No icons, no shadow, no chrome — quiet bar.
 */
export function OfflineBanner() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

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
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
