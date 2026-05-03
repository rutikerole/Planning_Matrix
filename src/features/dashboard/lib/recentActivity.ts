/**
 * Map a `project_events.event_type` value to a single-line
 * localised summary. Used by the ActivityTicker rotation and the
 * Cmd+K palette's "Aktivität" group.
 *
 * Unknown event types fall through to a generic "Aktivität" /
 * "activity" string — the chat-turn pipeline writes new event
 * types over time, so the ticker must never surface a raw
 * `event_type` to the user.
 */
const SUMMARIES: Record<string, { de: string; en: string }> = {
  fact_added: { de: 'Fakt erfasst', en: 'fact recorded' },
  qualifier_changed: { de: 'Qualifizierung geändert', en: 'qualifier changed' },
  rec_upserted: { de: 'Empfehlung aktualisiert', en: 'recommendation updated' },
  area_state: { de: 'Bereich aktualisiert', en: 'area updated' },
  turn_closed: { de: 'Wechsel abgeschlossen', en: 'turn closed' },
  // v3 fix #5 — chat-turn writes `turn_processed`; previously
  // unmapped, so the ticker rendered the raw enum string.
  turn_processed: { de: 'Wechsel abgeschlossen', en: 'turn closed' },
  designer_requested: { de: 'Architekt:in angefragt', en: 'designer requested' },
}

export function summarizeEvent(eventType: string, locale: 'de' | 'en'): string {
  const known = SUMMARIES[eventType]
  if (known) return known[locale]
  // Fallback — never surface the raw event_type enum to users.
  return locale === 'de' ? 'Aktivität' : 'activity'
}
