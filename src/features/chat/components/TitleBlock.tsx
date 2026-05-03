import { useTranslation } from 'react-i18next'
import { NorthArrow } from './NorthArrow'
import { INTENT_TO_I18N } from '@/features/wizard/lib/selectTemplate'
import type { ProjectRow } from '@/types/db'

interface Props {
  project: ProjectRow
}

/**
 * Phase 3.2 #37 — title block per German A1 architectural drawing convention
 * (Q10, locked).
 *
 *   PROJEKT
 *   NEUBAU EINFAMILIENHAUS · MÜNCHEN               [N north arrow]
 *   ─────────────────────────────────────────
 *   Türkenstraße 25, 80799 München
 *   ─────────────────────────────────────────
 *   Erstellt: 28. April 2026
 *
 * Project name in serif italic logic happens at higher size scopes; the
 * title block proper uses Inter for that "DIN-A1 sheet" register. Address
 * in Inter italic clay. "Erstellt:" in monospace as the architectural
 * date stamp.
 */
export function TitleBlock({ project }: Props) {
  const { t } = useTranslation()
  const intentSlug =
    (INTENT_TO_I18N as Record<string, string>)[project.intent] ?? 'sonstige'
  const intentLabel = t(`wizard.q1.options.${intentSlug}.label`).toUpperCase()
  const cityFromName = project.name.split('·').pop()?.trim() ?? ''
  const upperLine = cityFromName
    ? `${intentLabel} · ${cityFromName.toUpperCase()}`
    : intentLabel

  const createdAt = new Date(project.created_at).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <header className="flex items-start justify-between gap-6 pb-6 mb-8">
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-ink/40 leading-none">
          {t('chat.titleBlock.eyebrow')}
        </p>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink leading-tight truncate">
          {upperLine}
        </p>
        <span aria-hidden="true" className="block h-px bg-ink/12 mt-2" />
        {project.plot_address ? (
          <p className="font-serif italic text-[12px] text-clay leading-tight truncate">
            {project.plot_address}
          </p>
        ) : (
          <p className="font-serif italic text-[12px] text-clay/72 leading-tight">
            {t('chat.titleBlock.noPlot')}
          </p>
        )}
        <span aria-hidden="true" className="block h-px bg-ink/12 mt-2" />
        <p className="font-mono text-[9px] tabular-figures text-ink/45 tracking-tight leading-none mt-1">
          {t('chat.titleBlock.created')}: {createdAt}
        </p>
      </div>
      <NorthArrow />
    </header>
  )
}
