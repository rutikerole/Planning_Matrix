import { useTranslation } from 'react-i18next'

interface Event {
  id: string
  created_at: string
  triggered_by: string
  event_type: string
  reason?: string | null
}

interface Props {
  events: Event[]
}

/**
 * Phase 3.2 #44 — audit log as an architectural timeline.
 *
 * A vertical hairline runs the full height of the timeline; each
 * event is a row with a tick mark stepping off the rule, an italic
 * Serif timestamp printed left-of-rule, and the event detail
 * printed right-of-rule. Reads as the "Vorgangsverlauf" register
 * of a building permit binder.
 */
export function AuditTimeline({ events }: Props) {
  const { i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  return (
    <ol className="relative flex flex-col gap-5 pl-[180px]">
      {/* Vertical hairline rule running the whole timeline */}
      <span
        aria-hidden="true"
        className="absolute left-[148px] top-1 bottom-1 w-px bg-ink/15"
      />
      {events.map((ev, idx) => {
        const date = new Date(ev.created_at)
        const valid = !Number.isNaN(date.getTime())
        const dateStr = valid
          ? date.toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', {
              day: '2-digit',
              month: 'short',
              year: '2-digit',
            })
          : ''
        const timeStr = valid
          ? date.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'de-DE', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : ''

        return (
          <li key={ev.id} className="relative flex items-baseline gap-4 leading-snug">
            {/* Tick mark — short hairline that crosses the rule */}
            <span
              aria-hidden="true"
              className="absolute left-[140px] top-[9px] w-[18px] h-px bg-ink/35"
            />
            {/* Roman index in italic Serif clay-deep, anchors the row */}
            <span
              aria-hidden="true"
              className="absolute -left-[180px] top-0 w-12 text-center font-serif italic text-[11px] text-clay/72 tabular-figures pt-1"
            >
              {String(idx + 1).padStart(2, '0')}
            </span>
            {/* Date column — italic Serif, ends just before the rule */}
            <span
              className="absolute -left-[128px] top-0 w-[120px] text-right font-serif italic text-[12px] text-clay-deep tabular-figures pt-0.5 leading-tight"
            >
              {dateStr}
              {timeStr && (
                <span className="block text-[11px] text-clay/72">{timeStr}</span>
              )}
            </span>
            {/* Event detail — Inter 12 ink */}
            <div className="flex flex-col gap-0.5 pt-0.5">
              <p className="text-[12px] text-ink leading-snug">
                <span className="text-clay/85 font-medium">{ev.triggered_by}</span>
                <span className="text-ink/40 mx-2">·</span>
                <span>{ev.event_type}</span>
              </p>
              {ev.reason && (
                <p className="font-serif italic text-[11px] text-ink/55 leading-snug">
                  {ev.reason}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
