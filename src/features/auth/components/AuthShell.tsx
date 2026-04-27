import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'
import { AuthNav } from './AuthNav'
import { AuthPhotoPane } from './AuthPhotoPane'

interface Props {
  /** Photo stem (without size/format suffix) for the right-side pane. */
  photoStem: string
  /** i18n key for the italic-serif phrase laid over the photo. */
  phraseKey: string
  /** i18n key for the document title (`<title>`). */
  titleKey: string
  children: ReactNode
}

/**
 * Split-screen auth layout shell. Above lg: form on the left half,
 * atmospheric photo + phrase on the right. Below lg: photo hidden,
 * form takes the full screen on warm paper.
 *
 * Sets <title> from the passed i18n key and updates <html lang>
 * via the LanguageSwitcher already wired in AuthNav. Wrapped in a
 * motion.div so AnimatePresence (mounted at the router) can crossfade
 * between auth routes — gated by useReducedMotion for accessibility.
 */
export function AuthShell({ photoStem, phraseKey, titleKey, children }: Props) {
  const { t, i18n } = useTranslation()
  const reduced = useReducedMotion()

  useEffect(() => {
    document.title = t(titleKey)
    document.documentElement.lang = i18n.resolvedLanguage ?? 'de'
    const setMeta = (selector: string, value: string) => {
      const el = document.querySelector(selector)
      if (el) el.setAttribute('content', value)
    }
    setMeta('meta[property="og:title"]', t(titleKey))
    setMeta('meta[name="twitter:title"]', t(titleKey))
    setMeta('meta[property="og:url"]', window.location.href)
  }, [t, titleKey, i18n.resolvedLanguage])

  return (
    <m.div
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
      transition={{ duration: reduced ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative min-h-dvh flex bg-paper"
    >
      <AuthNav />

      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-ink focus:text-paper focus:px-3 focus:py-2 focus:rounded-sm focus:text-sm"
      >
        {t('common.skipToContent')}
      </a>

      <main
        id="auth-main"
        className="relative w-full lg:w-1/2 flex items-start justify-center px-6 sm:px-10 lg:px-14 xl:px-20 pt-24 sm:pt-28 lg:pt-[16vh] xl:pt-[18vh] pb-16 lg:pb-24"
      >
        {children}
      </main>

      <AuthPhotoPane stem={photoStem} phrase={t(phraseKey)} />
    </m.div>
  )
}
