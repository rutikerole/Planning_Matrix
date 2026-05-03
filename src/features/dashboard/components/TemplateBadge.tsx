import { useTranslation } from 'react-i18next'
import type { TemplateId } from '@/types/projectState'

interface Props {
  templateId: TemplateId
}

/**
 * Mono 10px uppercase tracking-wide hairline-bordered chip in clay.
 * Sits next to the project name. The label maps to a short form
 * (EFH / MFH / SAN / UMN / ABR) per the brief.
 */
export function TemplateBadge({ templateId }: Props) {
  const { t } = useTranslation()
  const label = t(`dashboard.templates.${templateId}`)

  return (
    <span className="inline-flex items-center border border-pm-hair-strong px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-pm-clay">
      {label}
    </span>
  )
}
