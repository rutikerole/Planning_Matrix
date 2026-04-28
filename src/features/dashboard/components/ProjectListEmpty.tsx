import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { AtelierTableIllustration } from './AtelierTableIllustration'

/**
 * Phase 3.3 #47 — dashboard empty state.
 *
 * Calm "atelier waiting to begin" register: closed sketchbook +
 * unsharpened pencil + rolled blueprint, with a 1cm scale-bar in the
 * lower-right of the table corner. Below the illustration: italic
 * Serif "Noch kein Projekt." + Inter italic sub + primary CTA.
 */
export function ProjectListEmpty() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center text-center gap-7 py-12">
      <AtelierTableIllustration />

      <div className="flex flex-col items-center gap-3 max-w-sm">
        <h2 className="font-serif text-[28px] sm:text-[32px] text-ink/85 leading-tight italic">
          {t('dashboard.atelier.empty.headline').replace(/\.$/, '')}
          <span className="text-clay">.</span>
        </h2>
        <p className="font-serif italic text-[14px] text-ink/55 leading-relaxed">
          {t('dashboard.atelier.empty.body')}
        </p>
      </div>

      <Link
        to="/projects/new"
        className="group inline-flex items-center gap-2 h-11 px-5 rounded-[5px] bg-ink text-paper text-[14px] font-medium tracking-tight transition-[background-color,color,box-shadow,transform] duration-soft ease-soft hover:bg-ink/92 shadow-[0_1px_0_hsl(var(--paper)/0.05)_inset,0_2px_4px_-1px_hsl(220_15%_11%/0.18)] hover:shadow-[0_1px_0_hsl(var(--paper)/0.05)_inset,0_8px_18px_-6px_hsl(220_15%_11%/0.32)] motion-safe:hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span>{t('dashboard.atelier.empty.cta')}</span>
        <ArrowRight aria-hidden="true" className="size-4 -mr-1 shrink-0 transition-transform duration-soft ease-soft group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}
