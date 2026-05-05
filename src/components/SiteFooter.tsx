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
      {/* Phase 8.7.1 — collapsed to a single hairline row. Was a
          ~96-100px tall two-column block with bg-paper (HSL near-
          white) stepping out of the warmer pm-paper substrate
          used by every project surface. New treatment: 24px total
          vertical padding, single inline row (wraps gracefully on
          mobile to ≤80px), pm-paper background, pm-hair top
          hairline. Copy + link targets unchanged. */}
      <footer className="border-t border-pm-hair bg-pm-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3">
          <p className="font-sans text-[12px] leading-none text-pm-ink-mid">
            <span className="font-medium text-pm-ink">Planning Matrix</span>
            <span aria-hidden="true" className="px-2 text-pm-ink-mute2">·</span>
            <span className="text-pm-ink-mute2">München · v{APP_VERSION}</span>
          </p>
          <nav aria-label={isEn ? 'Legal navigation' : 'Rechtliche Navigation'}>
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[12px] leading-none text-pm-ink-mid">
              <li>
                <Link
                  to="/impressum"
                  className="rounded-sm transition-colors hover:text-pm-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
                >
                  Impressum
                </Link>
              </li>
              <li aria-hidden="true" className="text-pm-ink-mute2">·</li>
              <li>
                <Link
                  to="/datenschutz"
                  className="rounded-sm transition-colors hover:text-pm-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
                >
                  {isEn ? 'Privacy' : 'Datenschutz'}
                </Link>
              </li>
              <li aria-hidden="true" className="text-pm-ink-mute2">·</li>
              <li>
                <Link
                  to="/agb"
                  className="rounded-sm transition-colors hover:text-pm-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
                >
                  {isEn ? 'Terms' : 'AGB'}
                </Link>
              </li>
              <li aria-hidden="true" className="text-pm-ink-mute2">·</li>
              <li>
                <Link
                  to="/cookies"
                  className="rounded-sm transition-colors hover:text-pm-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
                >
                  Cookies
                </Link>
              </li>
              <li aria-hidden="true" className="text-pm-ink-mute2">·</li>
              <li>
                <button
                  type="button"
                  onClick={() => setReopenBanner(true)}
                  className="rounded-sm transition-colors hover:text-pm-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
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
