import { useTranslation } from 'react-i18next'

/**
 * Phase 8.3 (C.5) — placeholder card on the Overview tab footer area.
 * Sits below the action-cards grid and tells the bauherr what's
 * coming without using a "Coming soon" badge tone. Architecture-grade
 * placeholder so future content can drop in.
 */
export function ComparableProjectsSlot() {
  const { t } = useTranslation()
  return (
    <article className="border border-dashed border-clay/35 rounded-[10px] bg-paper-card/50 px-5 py-4 flex flex-col gap-2 max-w-[1100px]">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-clay leading-none">
        {t('result.workspace.comparableProjects.eyebrow')}
      </p>
      <p className="font-serif italic text-[13px] text-ink/85 leading-relaxed max-w-prose">
        {t('result.workspace.comparableProjects.placeholder')}
      </p>
    </article>
  )
}
