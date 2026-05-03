/**
 * Map a `project_events.event_type` value to a single-line
 * localised summary. Used by the ActivityTicker rotation and the
 * Cmd+K palette's "Aktivität" group.
 *
 * Unknown event types fall through to the raw `event_type` string —
 * the chat-turn pipeline writes new event types over time, so the
 * dashboard should never crash on a row it doesn't recognise.
 */
export type ProjectEventTypeKey =
  | 'fact_added'
  | 'qualifier_changed'
  | 'rec_upserted'
  | 'area_state'
  | 'turn_closed'
  | 'designer_requested'

const SUMMARIES: Record<ProjectEventTypeKey, { de: string; en: string }> = {
  fact_added: { de: 'Fakt erfasst', en: 'fact recorded' },
  qualifier_changed: { de: 'Qualifizierung geändert', en: 'qualifier changed' },
  rec_upserted: { de: 'Empfehlung aktualisiert', en: 'recommendation updated' },
  area_state: { de: 'Bereich aktualisiert', en: 'area updated' },
  turn_closed: { de: 'Wechsel abgeschlossen', en: 'turn closed' },
  designer_requested: { de: 'Architekt:in angefragt', en: 'designer requested' },
}

export function summarizeEvent(eventType: string, locale: 'de' | 'en'): string {
  const known = SUMMARIES[eventType as ProjectEventTypeKey]
  return known ? known[locale] : eventType
}
