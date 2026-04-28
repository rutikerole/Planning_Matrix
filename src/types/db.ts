// ───────────────────────────────────────────────────────────────────────
// Planning Matrix — DB row shapes
//
// Snake_case mirrors the Postgres schema so we don't translate at the
// query boundary. SPA components read these directly out of TanStack
// Query cache. The Edge Function defines its own copies in
// supabase/functions/chat-turn/persistence.ts since it can't easily
// import from @/ — keep them in sync; the schema is authoritative.
// ───────────────────────────────────────────────────────────────────────

import type { ProjectState, TemplateId } from './projectState'

export type ProjectStatus = 'in_progress' | 'paused' | 'archived' | 'completed'

export interface ProjectRow {
  id: string
  owner_id: string
  intent: string
  has_plot: boolean
  plot_address: string | null
  bundesland: string
  template_id: TemplateId
  name: string
  status: ProjectStatus
  /** May be `{}` immediately after the wizard insert; hydrate via projectStateHelpers. */
  state: ProjectState | Record<string, never>
  created_at: string
  updated_at: string
}

export type MessageRole = 'user' | 'assistant' | 'system'

export interface MessageRow {
  id: string
  project_id: string
  role: MessageRole
  specialist: string | null
  content_de: string
  content_en: string | null
  input_type: string | null
  input_options: unknown
  allow_idk: boolean | null
  /** Phase 3.1 #33: hint shown in the next turn's ThinkingIndicator. */
  thinking_label_de: string | null
  /** Phase 3.4 #54: up to 3 plausible short replies for free-text turns. */
  likely_user_replies: string[] | null
  user_answer: unknown
  client_request_id: string | null
  model: string | null
  input_tokens: number | null
  output_tokens: number | null
  cache_read_tokens: number | null
  cache_write_tokens: number | null
  latency_ms: number | null
  created_at: string
}
