import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
 * via the LanguageSwitcher already wired in AuthNav.
 */
export function AuthShell({ photoStem, phraseKey, titleKey, children }: Props) {
  const { t, i18n } = useTranslation()

  useEffect(() => {
    document.title = t(titleKey)
  }, [t, titleKey, i18n.resolvedLanguage])

  return (
    <div className="relative min-h-dvh flex bg-paper">
      <AuthNav />

      {/* Skip-to-content for keyboard users */}
      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-ink focus:text-paper focus:px-3 focus:py-2 focus:rounded-sm focus:text-sm"
      >
        {t('common.skipToContent')}
      </a>

      <main
        id="auth-main"
        className="relative w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-10 lg:px-14 xl:px-20 pt-24 pb-12 lg:pt-32"
      >
        {children}
      </main>

      <AuthPhotoPane stem={photoStem} phrase={t(phraseKey)} />
    </div>
  )
}
