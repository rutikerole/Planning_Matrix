import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'
import { Drawer } from 'vaul'
import { cn } from '@/lib/utils'
import { Container } from '@/components/shared/Container'
import { Wordmark } from '@/components/shared/Wordmark'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { CtaButton } from '@/components/shared/CtaButton'

const MAILTO = 'mailto:vibecoders786@gmail.com?subject=Planning%20Matrix%20%E2%80%94%20Fr%C3%BChzugang'

interface NavLink {
  href: string
  key: 'product' | 'audience' | 'pricing' | 'faq'
}

const PRIMARY_LINKS: NavLink[] = [
  { href: '#product', key: 'product' },
  { href: '#audience', key: 'audience' },
  { href: '#pricing', key: 'pricing' },
]

const ALL_LINKS: NavLink[] = [
  { href: '#product', key: 'product' },
  { href: '#audience', key: 'audience' },
  { href: '#pricing', key: 'pricing' },
  { href: '#faq', key: 'faq' },
]

export function Nav() {
  const { t } = useTranslation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 12)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-40 transition-[background-color,backdrop-filter,border-color] duration-soft ease-soft',
        scrolled
          ? 'bg-background/72 backdrop-blur-xl backdrop-saturate-150 border-b border-border'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      <Container className="flex h-16 items-center justify-between md:h-[72px]">
        <Wordmark />

        <nav
          className="hidden lg:flex items-center gap-9"
          aria-label="Hauptnavigation"
        >
          {PRIMARY_LINKS.map((link) => (
            <NavInlineLink key={link.key} href={link.href}>
              {t(`nav.${link.key}`)}
            </NavInlineLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-6">
          <LanguageSwitcher />
          <span
            className="h-4 w-px bg-border-strong"
            aria-hidden="true"
          />
          <a
            href="#"
            className="text-[14px] font-medium text-ink/80 hover:text-ink transition-colors duration-soft"
          >
            {t('common.ctaLogin')}
          </a>
          <CtaButton href={MAILTO} variant="primary">
            {t('common.ctaPrimary')}
          </CtaButton>
        </div>

        {/* Mobile: hamburger trigger */}
        <div className="flex lg:hidden items-center gap-3">
          <LanguageSwitcher />
          <span className="h-4 w-px bg-border-strong" aria-hidden="true" />
          <Drawer.Root>
            <Drawer.Trigger asChild>
              <button
                type="button"
                aria-label={t('common.openMenu')}
                className="inline-flex size-10 items-center justify-center rounded-sm -mr-2 text-ink hover:bg-muted/60 transition-colors duration-soft"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]" />
              <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex flex-col rounded-t-[20px] bg-paper border-t border-border outline-none">
                <div
                  className="mx-auto mt-3 h-1 w-12 rounded-full bg-border-strong"
                  aria-hidden="true"
                />
                <Drawer.Title className="sr-only">
                  Planning Matrix
                </Drawer.Title>
                <Drawer.Description className="sr-only">
                  {t('common.openMenu')}
                </Drawer.Description>
                <div className="flex flex-col gap-1 px-6 pt-7 pb-8">
                  {ALL_LINKS.map((link) => (
                    <Drawer.Close asChild key={link.key}>
                      <a
                        href={link.href}
                        className="font-display text-[28px] leading-[1.1] text-ink py-3 border-b border-border last:border-b-0"
                      >
                        {t(`nav.${link.key}`)}
                      </a>
                    </Drawer.Close>
                  ))}
                  <Drawer.Close asChild>
                    <a
                      href="#"
                      className="text-[15px] text-muted-foreground hover:text-ink py-3 mt-2"
                    >
                      {t('common.ctaLogin')}
                    </a>
                  </Drawer.Close>
                  <Drawer.Close asChild>
                    <CtaButton href={MAILTO} variant="primary" className="mt-4 self-start">
                      {t('common.ctaPrimary')}
                    </CtaButton>
                  </Drawer.Close>
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </div>
      </Container>
    </header>
  )
}

function NavInlineLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      className="group relative inline-block py-1.5 text-[14px] font-medium text-ink/80 hover:text-ink transition-colors duration-soft"
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 -bottom-0.5 h-px origin-left scale-x-0 bg-clay transition-transform duration-soft ease-soft group-hover:scale-x-100"
      />
    </a>
  )
}
