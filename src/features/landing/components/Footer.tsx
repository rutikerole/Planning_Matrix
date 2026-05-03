import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const COL_KEYS = ['produkt', 'wissen', 'vertrauen', 'ueber'] as const
type Col = (typeof COL_KEYS)[number]

const COL_SPAN: Record<Col, string> = {
  produkt: 'md:col-span-2',
  wissen: 'md:col-span-2',
  vertrauen: 'md:col-span-2',
  ueber: 'md:col-span-1',
}

export function Footer() {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function setLang(lng: 'de' | 'en') {
    if (!i18n.language.startsWith(lng)) i18n.changeLanguage(lng)
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const v = email.trim()
    if (!v) {
      setError(t('landing.footer.errorEmpty'))
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setError(t('landing.footer.errorInvalid'))
      return
    }
    setError(null)
    setSubmitted(true)
  }

  return (
    <footer className="border-t border-pm-hair bg-pm-paper-warm pb-10 pt-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Newsletter */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1" aria-hidden>
                <span className="h-1 w-1 rounded-full bg-pm-clay" />
                <span className="h-1 w-1 rounded-full bg-pm-clay" />
                <span className="h-1 w-1 rounded-full bg-pm-clay" />
              </span>
              <span className="font-serif text-base text-pm-ink">
                Planning Matrix
              </span>
            </div>
            <h3 className="mt-6 font-serif text-[clamp(1.25rem,1.8vw,1.5rem)] text-pm-ink">
              {t('landing.footer.updates')}
            </h3>
            <p className="mt-2 max-w-prose font-sans text-[14px] leading-relaxed text-pm-ink-mid">
              {t('landing.footer.updatesSub')}
            </p>

            {submitted ? (
              <p className="mt-6 font-sans text-[14px] text-pm-clay">
                {t('landing.footer.thankyou')}
              </p>
            ) : (
              <form onSubmit={onSubmit} noValidate className="mt-6">
                <div className="flex max-w-md items-center gap-3 border-b border-pm-hair pb-2">
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    aria-label={t('landing.footer.emailPlaceholder') as string}
                    aria-invalid={error ? true : undefined}
                    placeholder={t('landing.footer.emailPlaceholder') as string}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent font-sans text-[15px] text-pm-ink outline-none placeholder:text-pm-ink-mute2"
                  />
                  <button
                    type="submit"
                    className="font-sans text-[14px] text-pm-clay hover:text-pm-clay-deep"
                  >
                    {t('landing.footer.submit')}
                  </button>
                </div>
                {error ? (
                  <p
                    role="alert"
                    className="mt-2 font-sans text-[12px] text-pm-clay-deep"
                  >
                    {error}
                  </p>
                ) : null}
              </form>
            )}

            <p className="mt-3 font-mono text-[10px] text-pm-ink-mute2">
              {t('landing.footer.hint')}
            </p>
          </div>

          {/* Link columns */}
          {COL_KEYS.map((c) => (
            <FooterCol key={c} col={c} className={COL_SPAN[c]} />
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-pm-hair pt-6 font-mono text-[11px] text-pm-ink-mute2 md:flex-row md:items-center">
          <span>{t('landing.footer.rights')}</span>
          <span>{t('landing.footer.version')}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang('de')}
              className={
                i18n.language.startsWith('de')
                  ? 'text-pm-ink'
                  : 'hover:text-pm-ink'
              }
            >
              DE
            </button>
            <span>/</span>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={
                i18n.language.startsWith('en')
                  ? 'text-pm-ink'
                  : 'hover:text-pm-ink'
              }
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterCol({ col, className }: { col: Col; className: string }) {
  const { t } = useTranslation()
  const raw = t(`landing.footer.links.${col}`, { returnObjects: true })
  const links: string[] = Array.isArray(raw) ? (raw as string[]) : []
  return (
    <div className={className}>
      <h4 className="font-mono text-[11px] uppercase tracking-[0.18em] text-pm-clay">
        {t(`landing.footer.${col}`)}
      </h4>
      <ul className="mt-3 list-none space-y-2">
        {links.map((l, i) => (
          <li key={i}>
            <a
              href="#"
              className="font-sans text-[14px] text-pm-ink-mid hover:text-pm-ink"
            >
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
