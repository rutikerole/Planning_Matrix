import { useTranslation } from 'react-i18next'
import type { TemplateId } from '@/types/projectState'

interface Props {
  templateId: TemplateId
  /** When true, renders only the short label (e.g. "EFH"); otherwise
   *  renders the full v3 badge "{label} · {code}" (e.g. "EFH · T-01"). */
  shortOnly?: boolean
}

/**
 * Mono uppercase chip rendered next to a project title. v3 default
 * shape is "{short} · T-XX" (matches the prototype `.tplbadge`).
 * Pass `shortOnly` for the legacy short-label-only variant.
 */
export function TemplateBadge({ templateId, shortOnly }: Props) {
  const { t } = useTranslation()
  const label = t(`dashboard.templates.${templateId}`)

  return (
    <span className="inline-flex items-center border border-pm-clay-tint bg-pm-paper px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-pm-clay">
      {shortOnly ? label : `${label} · ${templateId}`}
    </span>
  )
}
