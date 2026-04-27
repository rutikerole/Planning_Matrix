import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

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
      aria-label={t('common.languageGerman') + ' / ' + t('common.languageEnglish')}
      className={cn(
        'inline-flex items-center gap-3 text-[13px] font-medium tabular-nums',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setLang('de')}
        aria-pressed={current === 'de'}
        className={cn(
          'transition-colors duration-soft hover:text-ink rounded-sm',
          current === 'de' ? 'text-ink' : 'text-muted-foreground',
        )}
      >
        DE
      </button>
      <span className="h-[10px] w-px bg-border-strong" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={current === 'en'}
        className={cn(
          'transition-colors duration-soft hover:text-ink rounded-sm',
          current === 'en' ? 'text-ink' : 'text-muted-foreground',
        )}
      >
        EN
      </button>
    </div>
  )
}
