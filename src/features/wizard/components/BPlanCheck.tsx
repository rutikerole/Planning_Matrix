import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { BplanLookupResult } from '@/types/bplan'
import { BPlanDetailDialog } from './BPlanDetailDialog'

interface Props {
  result: BplanLookupResult | null
  isLoading: boolean
}

/**
 * Compact status pill above the map. Replaces the inline banner +
 * detail card with a single calm readout that opens the full B-Plan
 * detail in a dialog when clicked. Pulls the legal heaviness off the
 * main wizard flow.
 *
 * Four tone variants (per brief — currently three are observable
 * from the live lookup; § 35 outer / heritage are reserved for
 * future status fields):
 *   • exists      — filled clay-soft bg, paper text
 *   • noneInner   — outline pill, ink-soft text
 *   • noneOuter   — outline pill (reserved)
 *   • heritage    — clay-tint bg, ink text (reserved)
 *
 * On upstream_error the pill silently falls back to noneInner so
 * the flow is never blocked.
 */
export function BPlanCheck({ result, isLoading }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="relative flex items-center gap-2 overflow-hidden border border-pm-hair bg-pm-paper px-3 py-2 font-mono text-[12px] text-pm-clay"
      >
        <span aria-hidden className="block size-1.5 rounded-full border border-pm-clay" />
        {t('wizard.q2.bplan.loading')}
        {/* hairline-sweep underline */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden"
        >
          <span className="block h-px w-12 animate-pm-hairline-sweep bg-pm-clay/70" />
        </span>
      </div>
    )
  }

  if (!result) return null

  // upstream_error → silent fallback to noneInner per brief.
  const status =
    result.status === 'upstream_error' ? 'noneInner' :
    result.status === 'no_plan_found' ? 'noneInner' :
    'exists'

  const tone = status === 'exists'
    ? 'bg-pm-clay-soft text-pm-paper border-pm-clay-soft'
    : 'bg-pm-paper text-pm-ink-soft border-pm-hair-strong hover:bg-pm-paper-tint'

  let copy: string
  if (status === 'exists') {
    copy = t('wizard.q2.bplan.exists', {
      id: result.plan_number ?? '—',
      zone: result.plan_name_de ?? '—',
    })
  } else {
    copy = t('wizard.q2.bplan.noneInner')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group inline-flex items-center justify-between gap-3 border px-3 py-2 text-left transition-colors duration-soft',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper',
          tone,
        )}
      >
        <span className="font-serif text-[13px] italic leading-snug">
          {copy}
        </span>
        <span
          aria-hidden
          className={cn(
            'font-sans text-[11px] tracking-tight',
            status === 'exists' ? 'text-pm-paper/85' : 'text-pm-clay/70',
          )}
        >
          {t('wizard.q2.bplan.detailLink')} →
        </span>
      </button>

      <BPlanDetailDialog open={open} onOpenChange={setOpen} result={result} />
    </>
  )
}
