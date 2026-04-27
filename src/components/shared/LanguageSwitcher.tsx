import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

/**
 * Segmented-pill language switcher — DE | EN inside a single rounded
 * frame, active language filled with ink. Replaces the utilitarian
 * pipe-separator look of earlier phases.
 */
export function LanguageSwitcher({ className }: Props) {
  const { i18n, t } = useTranslation()
  const current = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  useEffect(() => {
    document.documentElement.lang = current
  }, [current])

  const setLang = (lang: 'de' | 'en') => {
    if (lang !== current) void i18n.changeLanguage(lang)
  }

  return (
    <div
      role="group"
      aria-label={`${t('common.languageGerman')} / ${t('common.languageEnglish')}`}
      className={cn(
        'inline-flex items-center text-[11px] font-medium tracking-[0.04em] tabular-nums rounded-[3px] border border-border-strong/45 bg-paper/40 backdrop-blur-sm overflow-hidden',
        className,
      )}
    >
      {(['de', 'en'] as const).map((lang) => {
        const active = current === lang
        return (
          <button
            key={lang}
            type="button"
            onClick={() => setLang(lang)}
            aria-pressed={active}
            aria-label={
              lang === 'de'
                ? t('common.languageGerman')
                : t('common.languageEnglish')
            }
            className={cn(
              'px-2.5 py-1 transition-colors duration-soft ease-soft uppercase',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1 focus-visible:ring-offset-background',
              active
                ? 'bg-ink text-paper'
                : 'text-muted-foreground hover:text-ink hover:bg-muted/40',
            )}
          >
            {lang}
          </button>
        )
      })}
    </div>
  )
}
