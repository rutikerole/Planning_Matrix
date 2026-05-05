// Phase 8 — site-wide footer with legal links + cookie reopen.
//
// Phase 8.7 — visibility is now an explicit allowlist instead of the
// chat-workspace denylist that leaked the footer onto the wizard +
// result + share routes. Footer renders only on public-marketing,
// dashboard, auth, and the standalone legal pages. Focused workspace
// surfaces (wizard, chat, result, public share) opt out; legal links
// are reachable from inside those surfaces via the user-avatar
// dropdown's Legal section (see AppHeader.tsx → UserMenu).

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CookieBanner } from '@/features/cookies/CookieBanner'

const APP_VERSION = '1.0'

// Allowlist of routes that render the footer. Anything else returns
// null. The auth flow shows the footer on each step so the legal
// links sit one click away during sign-up. The standalone legal
// pages keep their footer for cross-link navigation between
// Impressum / Datenschutz / AGB / Cookies.
const FOOTER_ALLOWLIST: ReadonlyArray<string> = [
  '/',
  '/dashboard',
  '/sign-up',
  '/sign-in',
  '/forgot-password',
  '/reset-password',
  '/check-email',
  '/verify-email',
  '/impressum',
  '/datenschutz',
  '/agb',
  '/cookies',
]

interface Props {
  /** When true, render even on routes that aren't in the allowlist.
   *  Reserved for one-off marketing surfaces; not used today. */
  force?: boolean
}

export function SiteFooter({ force = false }: Props) {
  const { i18n } = useTranslation()
  const isEn = (i18n.resolvedLanguage ?? 'de') === 'en'
  const { pathname } = useLocation()
  const [reopenBanner, setReopenBanner] = useState(false)

  if (!force && !FOOTER_ALLOWLIST.includes(pathname)) return null

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
