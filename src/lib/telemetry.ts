// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #73 — thin telemetry helper writing to project_events
//
// Used by the export flow to log attempt / success / failure rows so
// Rutik has a window into how often PDF / Markdown / JSON exports
// fail in production. Keeps the wire shape simple — fire-and-forget,
// failures are swallowed (we don't want telemetry to surface its own
// errors and confuse the user-facing flow).
// ───────────────────────────────────────────────────────────────────────

import { supabase } from '@/lib/supabase'

export type ExportEventType =
  | 'pdf_export_attempted'
  | 'pdf_export_succeeded'
  | 'pdf_export_failed'
  | 'md_export_attempted'
  | 'md_export_succeeded'
  | 'md_export_failed'
  | 'json_export_attempted'
  | 'json_export_succeeded'
  | 'json_export_failed'

interface LogArgs {
  projectId: string
  eventType: ExportEventType
  reason?: string | null
}

/**
 * Append a project_events row. Best-effort — caller never awaits, and
 * a failure here is logged in DEV but never thrown.
 */
export function logExportEvent(args: LogArgs): void {
  // Sanitize reason — truncate to 200 chars and strip newlines so the
  // audit log stays one-line per row.
  const reason = args.reason
    ? args.reason.replace(/\s+/g, ' ').slice(0, 200)
    : null

  void supabase
    .from('project_events')
    .insert({
      project_id: args.projectId,
      triggered_by: 'user',
      event_type: args.eventType,
      reason,
    })
    .then((res) => {
      if (res.error && import.meta.env.DEV) {
        console.warn('[telemetry] event insert failed:', res.error.message)
      }
    })
}
