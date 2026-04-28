// ───────────────────────────────────────────────────────────────────────
// Phase 3.9 #91 — MobileAuthShell
//
// Dedicated mobile chrome for the six auth pages. The existing
// AuthShell hides its photo pane on <lg via Tailwind, but the form
// keeps left-aligned padding tuned for the desktop split-screen
// layout. On a 375 px phone that reads as awkward whitespace.
//
// MobileAuthShell:
//   • Centred logo at the top (16 px below safe-area-top)
//   • Content stack vertically centred in the remaining viewport
//   • Form max-width 92 % of viewport
//   • No photo pane references
//   • <SkipLink> from #89 already mounts at the providers root
//   • Same AnimatePresence-friendly motion shell as AuthShell
//
// Usage: each auth page branches via useViewport().isMobile and
// passes the form content as children. The form (EmailField,
// PasswordField, SubmitButton) stays unchanged — those components
// already use 16 px text-base + 48 px buttons on mobile.
// ───────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'
import { Wordmark } from '@/components/shared/Wordmark'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'

interface Props {
  /** i18n key for the document title (`<title>`). */
  titleKey: string
  /** i18n key for the page heading (e.g. "Anmelden"). */
  headingKey: string
  /** i18n key for the subtitle below the heading. */
  subtitleKey: string
  /** Optional default value if heading translation is missing. */
  headingDefault?: string
  /** Optional default value if subtitle translation is missing. */
  subtitleDefault?: string
  children: ReactNode
}

export function MobileAuthShell({
  titleKey,
  headingKey,
  subtitleKey,
  headingDefault,
  subtitleDefault,
  children,
}: Props) {
  const { t, i18n } = useTranslation()
  const reduced = useReducedMotion()

  useEffect(() => {
    document.title = t(titleKey)
    document.documentElement.lang = i18n.resolvedLanguage ?? 'de'
  }, [t, titleKey, i18n.resolvedLanguage])

  return (
    <m.div
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
      transition={{ duration: reduced ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative min-h-dvh flex flex-col bg-paper pt-safe pb-safe"
      data-pm-mobile-auth="true"
    >
      {/* Top row — wordmark + language switcher. */}
      <div className="flex items-center justify-between px-4 py-3">
        <Wordmark size="xs" />
        <LanguageSwitcher />
      </div>

      <main
        id="root"
        className="flex-1 flex flex-col justify-center px-6 pb-6"
      >
        <div className="w-full max-w-[480px] mx-auto flex flex-col gap-6">
          <header className="flex flex-col gap-1.5">
            <h1 className="font-display text-[28px] text-ink leading-tight -tracking-[0.018em]">
              {t(headingKey, { defaultValue: headingDefault ?? '' })}
            </h1>
            <p className="font-serif italic text-[14px] text-clay/72 leading-relaxed">
              {t(subtitleKey, { defaultValue: subtitleDefault ?? '' })}
            </p>
          </header>

          {children}
        </div>
      </main>
    </m.div>
  )
}
