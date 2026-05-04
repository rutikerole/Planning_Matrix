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
  // Legacy event types (kept for backwards compat with historical rows)
  fact_added: { de: 'Fakt erfasst', en: 'fact recorded' },
  qualifier_changed: { de: 'Qualifizierung geändert', en: 'qualifier changed' },
  rec_upserted: { de: 'Empfehlung aktualisiert', en: 'recommendation updated' },
  area_state: { de: 'Bereich aktualisiert', en: 'area updated' },
  turn_closed: { de: 'Wechsel abgeschlossen', en: 'turn closed' },
  turn_processed: { de: 'Dialog-Block abgeschlossen', en: 'dialog block completed' },
  designer_requested: { de: 'Architekt:in angefragt', en: 'designer requested' },

  // Phase 6 A.7 — semantic event types emitted by the diff-based
  // logTurnEvent in the chat-turn function. Each is meaningful in
  // the Bauherr-grade audit log.
  recommendation_added: { de: 'Empfehlung hinzugefügt', en: 'recommendation added' },
  procedure_committed: { de: 'Verfahren festgelegt', en: 'procedure committed' },
  procedure_status_changed: { de: 'Verfahrens-Status geändert', en: 'procedure status changed' },
  area_state_changed: { de: 'Bereich aktiviert', en: 'area state changed' },
  document_added: { de: 'Dokument erforderlich', en: 'document added' },
  role_added: { de: 'Fachperson markiert', en: 'specialist role added' },
  role_needed_changed: { de: 'Fachpersonen-Bedarf geändert', en: 'role need changed' },
  fact_extracted: { de: 'Detail erfasst', en: 'detail captured' },
}

/**
 * Phase 6 A.7 — mirrors the server-side MEANINGFUL_EVENT_TYPES set
 * (supabase/functions/chat-turn/persistence.ts). The PDF and Markdown
 * exports filter audit rows through this set; the JSON export
 * includes all event types.
 */
export const MEANINGFUL_EVENT_TYPES: ReadonlySet<string> = new Set([
  'recommendation_added',
  'procedure_committed',
  'procedure_status_changed',
  'area_state_changed',
  'document_added',
  'role_added',
  'role_needed_changed',
])

export function summarizeEvent(eventType: string, locale: 'de' | 'en'): string {
  const known = SUMMARIES[eventType]
  if (known) return known[locale]
  // Fallback — never surface the raw event_type enum to users.
  return locale === 'de' ? 'Aktivität' : 'activity'
}
