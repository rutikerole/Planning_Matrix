import type { MessageRow, ProjectRow } from '@/types/db'

interface ProjectEventRow {
  id: string
  created_at: string
  triggered_by: string
  event_type: string
  reason?: string | null
}

interface BuildArgs {
  project: ProjectRow
  messages: MessageRow[]
  events: ProjectEventRow[]
}

/**
 * Phase 3.4 #55 — portable JSON export.
 *
 * Stable schema, human-readable when prettified. Drops internal
 * telemetry (token counts, latency, client_request_id) — those are
 * platform concerns, not user-facing data. Intended for tool
 * integrations: an architect piping the dossier into project-management
 * software, or a power user diffing two snapshots.
 */
export function buildExportJson({ project, messages, events }: BuildArgs): unknown {
  return {
    schema: 'planning-matrix.export.v1',
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      intent: project.intent,
      bundesland: project.bundesland,
      hasPlot: project.has_plot,
      plotAddress: project.plot_address,
      templateId: project.template_id,
      status: project.status,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    },
    state: project.state,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      specialist: m.specialist,
      contentDe: m.content_de,
      contentEn: m.content_en,
      inputType: m.input_type,
      inputOptions: m.input_options,
      allowIdk: m.allow_idk,
      thinkingLabelDe: m.thinking_label_de,
      likelyUserReplies: m.likely_user_replies,
      userAnswer: m.user_answer,
      createdAt: m.created_at,
    })),
    auditLog: events.slice(0, 30).map((e) => ({
      id: e.id,
      eventType: e.event_type,
      triggeredBy: e.triggered_by,
      reason: e.reason ?? null,
      createdAt: e.created_at,
    })),
  }
}
