import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Drawer } from 'vaul'
import { useMotionValueEvent, useScroll } from 'framer-motion'

const NAV_LINKS = [
  { key: 'product', href: '#chat' },
  { key: 'analyzer', href: '#analyzer' },
  { key: 'audience', href: '#perspectives' },
  { key: 'pricing', href: '#pricing' },
  { key: 'faq', href: '#faq' },
] as const

export function Header() {
  const { t, i18n } = useTranslation()
  const { scrollY } = useScroll()
  const [condensed, setCondensed] = useState(false)
  const [open, setOpen] = useState(false)

  useMotionValueEvent(scrollY, 'change', (v) => {
    setCondensed(v > 80)
  })

  function setLang(lng: 'de' | 'en') {
    if (!i18n.language.startsWith(lng)) i18n.changeLanguage(lng)
  }

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-40 transition-all duration-300 ${
        condensed
          ? 'h-14 border-b border-pm-hair bg-pm-paper/85 backdrop-blur-sm'
          : 'h-20 bg-pm-paper'
      }`}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
        {/* Brand */}
        <a href="#top" className="flex items-center gap-3">
          <span className="flex items-center gap-1" aria-hidden>
            <span className="h-1 w-1 rounded-full bg-pm-clay animate-pm-pulse-clay" />
            <span
              className="h-1 w-1 rounded-full bg-pm-clay animate-pm-pulse-clay"
              style={{ animationDelay: '0.4s' }}
            />
            <span
              className="h-1 w-1 rounded-full bg-pm-clay animate-pm-pulse-clay"
              style={{ animationDelay: '0.8s' }}
            />
          </span>
          <span className="font-serif text-lg text-pm-ink">Planning Matrix</span>
        </a>

        {/* Center nav (desktop) */}
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Hauptnavigation">
          {NAV_LINKS.map((l) => (
            <a
              key={l.key}
              href={l.href}
              className="group relative font-sans text-sm text-pm-ink-mid transition-colors hover:text-pm-ink"
            >
              {t(`landing.nav.${l.key}`)}
              <span className="pointer-events-none absolute -bottom-1 left-0 h-px w-0 bg-pm-clay transition-all duration-200 group-hover:w-full" />
            </a>
          ))}
        </nav>

        {/* Right cluster (desktop) */}
        <div className="hidden items-center gap-4 lg:flex">
          <div className="flex items-center gap-1 font-sans text-xs" role="group" aria-label="Sprache">
            <button
              type="button"
              onClick={() => setLang('de')}
              className={
                i18n.language.startsWith('de')
                  ? 'font-medium text-pm-ink'
                  : 'text-pm-ink-mute2 hover:text-pm-ink'
              }
            >
              DE
            </button>
            <span className="text-pm-ink-mute2">/</span>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={
                i18n.language.startsWith('en')
                  ? 'font-medium text-pm-ink'
                  : 'text-pm-ink-mute2 hover:text-pm-ink'
              }
            >
              EN
            </button>
          </div>
          <Link
            to="/sign-in"
            className="font-sans text-sm text-pm-ink-mid transition-colors hover:text-pm-ink"
          >
            {t('common.ctaLogin')}
          </Link>
          <Link
            to="/sign-up"
            className="border border-pm-clay bg-pm-clay px-5 py-2 font-sans text-sm text-pm-paper transition-colors hover:bg-pm-clay-deep"
          >
            {t('landing.nav.cta')}
          </Link>
        </div>

        {/* Mobile hamburger + Vaul drawer */}
        <Drawer.Root open={open} onOpenChange={setOpen} direction="top">
          <Drawer.Trigger
            className="text-pm-ink p-2 lg:hidden"
            aria-label="Menü öffnen"
          >
            <svg width="20" height="14" viewBox="0 0 20 14" aria-hidden>
              <line x1="0" y1="2" x2="20" y2="2" stroke="currentColor" strokeWidth="1.5" />
              <line x1="0" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1.5" />
              <line x1="0" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-40 bg-pm-ink/30" />
            <Drawer.Content className="fixed inset-x-0 top-0 z-50 border-b border-pm-hair bg-pm-paper p-6 pt-16">
              <Drawer.Title className="sr-only">Navigation</Drawer.Title>
              <Drawer.Description className="sr-only">
                Hauptnavigation Planning Matrix.
              </Drawer.Description>
              <nav className="flex flex-col">
                {NAV_LINKS.map((l) => (
                  <a
                    key={l.key}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="border-b border-pm-hair py-3 font-sans text-base text-pm-ink"
                  >
                    {t(`landing.nav.${l.key}`)}
                  </a>
                ))}
              </nav>
              <div className="mt-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-sans text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setLang('de')
                        setOpen(false)
                      }}
                      className={
                        i18n.language.startsWith('de')
                          ? 'font-medium text-pm-ink'
                          : 'text-pm-ink-mute2'
                      }
                    >
                      DE
                    </button>
                    <span className="text-pm-ink-mute2">/</span>
                    <button
                      type="button"
                      onClick={() => {
                        setLang('en')
                        setOpen(false)
                      }}
                      className={
                        i18n.language.startsWith('en')
                          ? 'font-medium text-pm-ink'
                          : 'text-pm-ink-mute2'
                      }
                    >
                      EN
                    </button>
                  </div>
                  <Link
                    to="/sign-in"
                    onClick={() => setOpen(false)}
                    className="font-sans text-sm text-pm-ink-mid"
                  >
                    {t('common.ctaLogin')}
                  </Link>
                </div>
                <Link
                  to="/sign-up"
                  onClick={() => setOpen(false)}
                  className="border border-pm-clay bg-pm-clay px-5 py-3 text-center font-sans text-sm text-pm-paper"
                >
                  {t('landing.nav.cta')}
                </Link>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </header>
  )
}
