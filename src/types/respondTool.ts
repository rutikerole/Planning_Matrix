// ───────────────────────────────────────────────────────────────────────
// Planning Matrix — `respond` tool input schema (Zod)
//
// The Anthropic Messages API call in supabase/functions/chat-turn forces
// a single tool call to `respond` (`tool_choice: { type: 'tool', name:
// 'respond' }`). The model never produces free text — every turn is a
// tool_use with the input shape defined here.
//
// This Zod schema is the runtime source of truth for the Edge Function:
// every model response is validated against it before anything is
// persisted. The matching JSON-schema form sent to Anthropic as the
// tool definition lives in supabase/functions/chat-turn/toolSchema.ts —
// the two files MUST stay in sync. Drift here means the model produces
// fields we silently drop or rejects fields we expect; drift there means
// the model omits fields and Zod rejects.
//
// Strictness: top-level `.strict()` — the model cannot invent new top-
// level fields. Inner objects accept extras (forward-compatible for
// fields the model adds inside facts, deltas, etc.). Discriminated
// unions on `recommendations_delta` / `procedures_delta` /
// `documents_delta` / `roles_delta` per D5 — every delta entry MUST
// declare `op: 'upsert' | 'remove'` or Zod rejects.
// ───────────────────────────────────────────────────────────────────────

import { z } from 'zod'

// ── Primitives mirroring src/types/projectState.ts ─────────────────────
const sourceSchema = z.enum(['LEGAL', 'CLIENT', 'DESIGNER', 'AUTHORITY'])
const qualitySchema = z.enum(['CALCULATED', 'VERIFIED', 'ASSUMED', 'DECIDED'])
const areaStateSchema = z.enum(['ACTIVE', 'PENDING', 'VOID'])

const specialistSchema = z.enum([
  'moderator',
  'planungsrecht',
  'bauordnungsrecht',
  'sonstige_vorgaben',
  'verfahren',
  'beteiligte',
  'synthesizer',
])

const inputTypeSchema = z.enum([
  'text',
  'yesno',
  'single_select',
  'multi_select',
  'address',
  'none',
])

const itemStatusSchema = z.enum([
  'nicht_erforderlich',
  'erforderlich',
  'liegt_vor',
  'freigegeben',
  'eingereicht',
  'genehmigt',
])

const completionSignalSchema = z.enum([
  'continue',
  'needs_designer',
  'ready_for_review',
  'blocked',
])

// ── Sub-objects ────────────────────────────────────────────────────────
const inputOptionSchema = z.object({
  value: z.string().min(1),
  label_de: z.string().min(1),
  label_en: z.string().min(1),
})

const extractedFactSchema = z.object({
  key: z.string().min(1),
  /** Heterogeneous by key — narrowed in projectStateHelpers.ts. */
  value: z.unknown(),
  source: sourceSchema,
  quality: qualitySchema,
  evidence: z.string().optional(),
  reason: z.string().optional(),
})

// ── Discriminated unions on *_delta (D5) ───────────────────────────────
//
// Every delta entry must declare op: 'upsert' | 'remove'. Upserts allow
// any subset of fields beyond `id` (the helper merges with the existing
// entry); removes only need an `id`. This forces the model to be explicit
// about intent rather than letting a missing field silently mean "remove".

const recommendationDeltaSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('upsert'),
    id: z.string().min(1),
    rank: z.number().int().min(1).optional(),
    title_de: z.string().min(1).optional(),
    title_en: z.string().min(1).optional(),
    detail_de: z.string().min(1).optional(),
    detail_en: z.string().min(1).optional(),
    ctaLabel_de: z.string().optional(),
    ctaLabel_en: z.string().optional(),
  }),
  z.object({
    op: z.literal('remove'),
    id: z.string().min(1),
  }),
])

const procedureDeltaSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('upsert'),
    id: z.string().min(1),
    title_de: z.string().optional(),
    title_en: z.string().optional(),
    status: itemStatusSchema.optional(),
    rationale_de: z.string().optional(),
    rationale_en: z.string().optional(),
    source: sourceSchema.optional(),
    quality: qualitySchema.optional(),
    reason: z.string().optional(),
  }),
  z.object({
    op: z.literal('remove'),
    id: z.string().min(1),
  }),
])

const documentDeltaSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('upsert'),
    id: z.string().min(1),
    title_de: z.string().optional(),
    title_en: z.string().optional(),
    status: itemStatusSchema.optional(),
    required_for: z.array(z.string()).optional(),
    produced_by: z.array(z.string()).optional(),
    source: sourceSchema.optional(),
    quality: qualitySchema.optional(),
    reason: z.string().optional(),
  }),
  z.object({
    op: z.literal('remove'),
    id: z.string().min(1),
  }),
])

const roleDeltaSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('upsert'),
    id: z.string().min(1),
    title_de: z.string().optional(),
    title_en: z.string().optional(),
    needed: z.boolean().optional(),
    rationale_de: z.string().optional(),
    source: sourceSchema.optional(),
    quality: qualitySchema.optional(),
    reason: z.string().optional(),
  }),
  z.object({
    op: z.literal('remove'),
    id: z.string().min(1),
  }),
])

// ── Areas update — partial; only specified keys mutate ─────────────────
const areaPatchSchema = z.object({
  state: areaStateSchema,
  reason: z.string().optional(),
})

const areasUpdateSchema = z.object({
  A: areaPatchSchema.optional(),
  B: areaPatchSchema.optional(),
  C: areaPatchSchema.optional(),
})

// ── The full tool input ────────────────────────────────────────────────
export const respondToolInputSchema = z
  .object({
    specialist: specialistSchema,
    /** Formal German (Sie). 2–6 sentences. */
    message_de: z.string().min(1),
    /** English mirror of message_de. */
    message_en: z.string().min(1),

    input_type: inputTypeSchema,
    input_options: z.array(inputOptionSchema).optional(),
    allow_idk: z.boolean().optional(),

    /** Tiny label shown briefly in the thinking indicator on the next turn. */
    thinking_label_de: z.string().optional(),
    thinking_label_en: z.string().optional(),

    extracted_facts: z.array(extractedFactSchema).optional(),
    recommendations_delta: z.array(recommendationDeltaSchema).optional(),
    procedures_delta: z.array(procedureDeltaSchema).optional(),
    documents_delta: z.array(documentDeltaSchema).optional(),
    roles_delta: z.array(roleDeltaSchema).optional(),
    areas_update: areasUpdateSchema.optional(),

    completion_signal: completionSignalSchema.optional(),

    /**
     * Phase 3.4 #54 — likely user replies for free-text turns.
     *
     * Up to 3 plausible short replies the user might give to the
     * current message (≤ 6 words each). Rendered as paper-tab chips
     * above the input bar; clicking a chip submits it as the user's
     * next message. Optional — the model emits this only when the
     * `input_type` is `text` AND the question has identifiable
     * plausible answers (e.g. "Wann wurde das Bestandsgebäude
     * errichtet?" → ["Vor 1980", "Zwischen 1980 und 2000", "Nach 2000"]).
     *
     * The model SHOULD omit this field for the very first turn
     * (moderator's address opener) and any free-form research
     * follow-up where suggestions would constrain the user.
     */
    likely_user_replies: z
      .array(z.string().min(1).max(60))
      .max(3)
      .optional(),
  })
  .strict()

export type RespondToolInput = z.infer<typeof respondToolInputSchema>

// Schema re-exports the SPA needs without re-importing zod elsewhere.
export { specialistSchema, inputTypeSchema, completionSignalSchema }
