// Phase 8 — site-wide footer with legal links + cookie reopen.
//
// Rendered on every public + dashboard route EXCEPT the chat
// workspace (chat is a focused experience; footer would feel
// intrusive). Visibility is determined by route in the LandingPage
// already; this component is mounted by the layout shell that wraps
// most routes — chat opts out by not including it.

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CookieBanner } from '@/features/cookies/CookieBanner'

const APP_VERSION = '1.0'

interface Props {
  /** When true, render even on routes that normally hide the footer
   *  (mainly the chat workspace). */
  force?: boolean
}

export function SiteFooter({ force = false }: Props) {
  const { i18n } = useTranslation()
  const isEn = (i18n.resolvedLanguage ?? 'de') === 'en'
  const { pathname } = useLocation()
  const [reopenBanner, setReopenBanner] = useState(false)

  // Hide on chat workspace + result pages so the focused experience
  // isn't broken by an always-visible footer. Force via prop if needed.
  const isFocusedRoute =
    /^\/projects\/[0-9a-f-]+(\/.*)?$/i.test(pathname) ||
    pathname.startsWith('/result/share/')
  if (isFocusedRoute && !force) return null

  return (
    <>
      <footer className="border-t border-border/40 bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <p className="font-display text-[18px] text-ink leading-none">
              Planning Matrix
            </p>
            <p className="font-serif italic text-[12px] text-clay/85">
              {isEn ? 'München · v' : 'München · v'}
              {APP_VERSION}
            </p>
          </div>
          <nav aria-label={isEn ? 'Legal navigation' : 'Rechtliche Navigation'}>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink/80">
              <li>
                <Link
                  to="/impressum"
                  className="hover:text-ink underline-offset-4 hover:underline decoration-clay/55"
                >
                  Impressum
                </Link>
              </li>
              <li>
                <Link
                  to="/datenschutz"
                  className="hover:text-ink underline-offset-4 hover:underline decoration-clay/55"
                >
                  {isEn ? 'Privacy' : 'Datenschutz'}
                </Link>
              </li>
              <li>
                <Link
                  to="/agb"
                  className="hover:text-ink underline-offset-4 hover:underline decoration-clay/55"
                >
                  {isEn ? 'Terms' : 'AGB'}
                </Link>
              </li>
              <li>
                <Link
                  to="/cookies"
                  className="hover:text-ink underline-offset-4 hover:underline decoration-clay/55"
                >
                  Cookies
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setReopenBanner(true)}
                  className="hover:text-ink underline-offset-4 hover:underline decoration-clay/55"
                >
                  {isEn ? 'Cookie settings' : 'Cookie-Einstellungen'}
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
      {reopenBanner ? (
        <CookieBanner forceOpen onClose={() => setReopenBanner(false)} />
      ) : null}
    </>
  )
}
