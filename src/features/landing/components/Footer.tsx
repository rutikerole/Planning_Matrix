import { useTranslation } from 'react-i18next'
import { Container } from '@/components/shared/Container'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Wordmark } from '@/components/shared/Wordmark'

const MAILTO = 'mailto:vibecoders786@gmail.com'

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border">
      <Container className="py-16 md:py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-5 flex flex-col gap-5">
            <Wordmark />
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              {t('footer.tagline')}
            </p>
            <div className="mt-2">
              <LanguageSwitcher />
            </div>
          </div>

          <FooterCol
            title={t('footer.colProductTitle')}
            links={[
              { label: t('footer.colProductFunctions'), href: '#product' },
              { label: t('footer.colProductDomains'), href: '#domains' },
              { label: t('footer.colProductAudience'), href: '#audience' },
              { label: t('footer.colProductFaq'), href: '#faq' },
            ]}
            className="md:col-span-3"
          />
          <FooterCol
            title={t('footer.colCompanyTitle')}
            links={[
              { label: t('footer.colCompanyAbout'), href: '#' },
              { label: t('footer.colCompanyContact'), href: MAILTO },
              { label: t('footer.colCompanyAccess'), href: '#cta' },
            ]}
            className="md:col-span-2"
          />
          <FooterCol
            title={t('footer.colLegalTitle')}
            links={[
              { label: t('footer.colLegalImprint'), href: '#' },
              { label: t('footer.colLegalPrivacy'), href: '#' },
              { label: t('footer.colLegalTerms'), href: '#' },
            ]}
            className="md:col-span-2"
          />
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col-reverse gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] text-muted-foreground">
            © {year} Planning Matrix. {t('footer.rightsReserved')}
          </p>
          <p className="text-[13px] text-muted-foreground tabular-nums">
            <span
              aria-hidden="true"
              className="inline-block size-1 rounded-full bg-clay align-middle mr-2.5 animate-breath-dot"
              style={{ transformOrigin: 'center' }}
            />
            v0.1 · in Pilotphase
          </p>
        </div>
      </Container>
    </footer>
  )
}

interface FooterColProps {
  title: string
  links: Array<{ label: string; href: string }>
  className?: string
}

function FooterCol({ title, links, className }: FooterColProps) {
  return (
    <div className={className}>
      <h4 className="eyebrow mb-5 font-sans text-ink/90 not-italic">{title}</h4>
      <ul className="flex flex-col gap-3">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              className="text-sm text-muted-foreground hover:text-ink transition-colors duration-soft"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
