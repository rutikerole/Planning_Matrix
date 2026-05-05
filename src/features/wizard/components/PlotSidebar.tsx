import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { MuenchenDistrict } from '@/data/muenchenPlzDistricts'

interface Props {
  /** PLZ-derived Stadtbezirk. Comes from `districtFromAddress` in
   *  the parent. Updates per address change. */
  district: MuenchenDistrict | null
  /** Display string derived from the live B-Plan WMS lookup
   *  (`bplanResult` from useBplanLookup). Updates per pin pick. */
  planningLawDisplay: string | null
  /** Friendly auto-suggested project name. Updates per address. */
  suggestedName: string | null
  /** Close affordance — fires on × click, Esc, or click-outside.
   *  The parent owns popoverOpen state. */
  onClose: () => void
}

/**
 * Phase 7.10g — Location profile popover.
 *
 * Click-toggle behaviour: hidden by default; the parent
 * (`QuestionPlot`) opens it whenever a pin appears on the map and
 * closes it on × / Esc / click-outside. Renders only fields that
 * actually update with the inspected location:
 *
 *   • DISTRICT          — from the curated PLZ → Stadtbezirk table
 *                         (src/data/muenchenPlzDistricts.ts)
 *   • PLANNING LAW      — derived from the live Stadt München WMS
 *                         B-Plan lookup (`bplanResult.status`)
 *   • SUGGESTED NAME    — derived from intent + address
 *
 * Phase 7.10g removed the four prototype-mocked rows that did not
 * update per click (estimated area, buildable area, character,
 * heritage proximity). Their data sources still live in
 * usePlotProfile.ts as a hardcoded München fallback for future
 * Phase X work; this popover does not surface them.
 */
export const PlotSidebar = forwardRef<HTMLDivElement, Props>(function PlotSidebar(
  { district, planningLawDisplay, suggestedName, onClose },
  ref,
) {
  const { t } = useTranslation()

  const districtDisplay = district
    ? `${district.number} — ${district.name}`
    : null

  return (
    <aside
      ref={ref}
      role="dialog"
      aria-label={t('wizard.q2.plot.head')}
      tabIndex={-1}
      className="relative flex flex-col gap-[18px] border border-pm-hair bg-pm-paper-tint p-[22px] pb-[26px] focus:outline-none"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t('wizard.q2.plot.popoverClose')}
        className="absolute right-[10px] top-[10px] inline-flex size-7 items-center justify-center rounded-sm font-mono text-[14px] leading-none text-pm-ink-mute2 transition-colors hover:bg-pm-paper hover:text-pm-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper-tint"
      >
        ×
      </button>

      <p className="-mb-2 pt-1 pr-7 font-serif text-[14px] italic text-pm-ink">
        {t('wizard.q2.plot.head')}
      </p>

      <Row
        label={t('wizard.q2.plot.stadtbezirk')}
        value={districtDisplay}
      />

      <hr className="m-0 h-px border-0 bg-pm-hair" />

      <Row
        labelClay
        label={t('wizard.q2.plot.planningLaw')}
        valueItalic={planningLawDisplay}
      />

      <hr className="m-0 h-px border-0 bg-pm-hair" />

      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-pm-ink-mute2">
          {t('wizard.q2.plot.suggestedName')}
        </span>
        <span className="font-serif text-[18px] leading-tight text-pm-ink">
          {suggestedName ?? '—'}
        </span>
      </div>
      <p className="font-mono text-[11px] tracking-[0.04em] text-pm-ink-mute2">
        {t('wizard.q2.plot.editLater')}
      </p>
    </aside>
  )
})

function Row({
  label,
  labelClay,
  value,
  valueItalic,
}: {
  label: string
  labelClay?: boolean
  value?: string | null
  valueItalic?: string | null
}) {
  const v = value ?? valueItalic
  if (!v) {
    return (
      <div className="flex flex-col gap-1">
        <span
          className={cn(
            'font-mono text-[10px] uppercase tracking-[0.16em]',
            labelClay ? 'text-pm-clay' : 'text-pm-ink-mute2',
          )}
        >
          {label}
        </span>
        <span className="font-mono text-[13px] text-pm-ink-mute2">—</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          'font-mono text-[10px] uppercase tracking-[0.16em]',
          labelClay ? 'text-pm-clay' : 'text-pm-ink-mute2',
        )}
      >
        {label}
      </span>
      {value ? (
        <span className="font-serif text-[18px] leading-tight text-pm-ink">{value}</span>
      ) : (
        <span className="font-serif text-[14px] italic text-pm-ink-mid">{valueItalic}</span>
      )}
    </div>
  )
}
