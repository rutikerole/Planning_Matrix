// Phase 6c — calm 3-state status banner above the map.
//
// Three states, all rendered with the same hairline-bordered
// shape so the banner doesn't shift layout between transitions:
//
//   • Loading      — ghosted clay outline dot + "Bebauungsplan wird
//                    geprüft …"
//   • Found        — solid clay dot + "Im Bebauungsplan {Nr} —
//                    Bebauung nach § 30 BauGB grundsätzlich möglich."
//   • Not found    — solid muted-ink dot + "Kein rechtsgültiger
//                    Bebauungsplan — Bewertung nach § 34 / § 35
//                    BauGB im Gespräch."
//
// Calm by design: no red/green/yellow, no warning icons, no
// "ALLOWED / DENIED" register. The voice is a fact, calmly stated.
// Truth is "Plan exists" or "Plan does not exist" — not
// "Allowed / Forbidden". The chat-turn pipeline carries the
// nuance; this banner just surfaces what we already know from the
// lookup so the user doesn't have to scroll to the card.
//
// Upstream errors (status === 'upstream_error') render no banner —
// the chat-turn pipeline still works without B-Plan facts and a
// transient WMS hiccup is not user-facing news.

import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { BplanLookupResult } from '@/types/bplan'

interface Props {
  result: BplanLookupResult | null
  isLoading: boolean
}

export function BplanStatusBanner({ result, isLoading }: Props) {
  const { t } = useTranslation()

  if (!isLoading && (!result || result.status === 'upstream_error')) {
    return null
  }

  let dotClass = 'pm-bplan-banner-dot pm-bplan-banner-dot--loading'
  let toneClass = 'text-clay/85'
  let copy: string

  if (isLoading) {
    copy = t('wizard.q2.bplanBanner.loading')
  } else if (result && result.status === 'found') {
    const plan = result.plan_number ?? null
    copy = plan
      ? t('wizard.q2.bplanBanner.found', { plan })
      : t('wizard.q2.bplanBanner.foundUnnamed')
    dotClass = 'pm-bplan-banner-dot pm-bplan-banner-dot--found'
    toneClass = 'text-clay-deep'
  } else if (result && result.status === 'no_plan_found') {
    copy = t('wizard.q2.bplanBanner.notFound')
    dotClass = 'pm-bplan-banner-dot pm-bplan-banner-dot--none'
    toneClass = 'text-ink/75'
  } else {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 mb-2 border-y border-border bg-paper text-[13px] leading-snug',
        toneClass,
      )}
    >
      <span aria-hidden="true" className={dotClass} />
      <span className="font-serif italic">{copy}</span>
    </div>
  )
}
