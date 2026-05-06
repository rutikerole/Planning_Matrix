import { useCallback } from 'react'
import { eventBus, type EventSource } from '@/lib/eventBus'

/**
 * Phase 9.2 — typed wrapper around eventBus.emit.
 *
 * Returns a stable `emit` callback bound to the given source bucket.
 * Use cases:
 *
 *   const emit = useEventEmitter('wizard')
 *   emit('intent_selected', { intent: 'neubau_einfamilienhaus' })
 *
 *   const emit = useEventEmitter('chat')
 *   emit('send_clicked', { length: text.length })
 *
 * Names are NOT type-checked here on purpose — adding a Phase 9.2
 * event vocabulary union would be churn during the initial sweep.
 * Bring naming into a typed enum in a follow-up if it pays.
 *
 * Project_id is auto-derived from the URL inside eventBus.emit; the
 * hook stays minimal.
 */
export function useEventEmitter(source: EventSource) {
  return useCallback(
    (name: string, attributes?: Record<string, unknown>) => {
      eventBus.emit(source, name, attributes)
    },
    [source],
  )
}
