// ───────────────────────────────────────────────────────────────────────
// Phase 3 — Anthropic tool schema for chat-turn
//
// The single tool the model is forced to call every turn. The JSON schema
// here is sent verbatim to Anthropic as the tool's input_schema; the
// matching Zod schema in src/types/respondTool.ts validates the model's
// response on the way back.
//
// Drift between the two files is the most likely failure mode:
//   • If this file gains a field the Zod schema doesn't know about,
//     Zod will reject (top-level .strict()) and the function falls
//     through to the model_response_invalid retry path. Loud.
//   • If this file loses a field the Zod schema requires, the model
//     stops emitting it and Zod still accepts (the field is optional
//     in Zod for everything except specialist / message_de / message_en
//     / input_type — those are required here too). Subtler — keep a
//     close eye on the diff in PRs.
// ───────────────────────────────────────────────────────────────────────

// Model — Sonnet 4.5 locked for v1 per the brief.
//
// TODO(model-upgrade): evaluate claude-sonnet-4-6 in Phase 3.5 — same
// pricing, reportedly stronger reasoning. Don't ship the upgrade until
// we have real conversation transcripts to A/B against.
export const MODEL = 'claude-sonnet-4-5' as const

export const RESPOND_TOOL_NAME = 'respond' as const

const SOURCE_VALUES = ['LEGAL', 'CLIENT', 'DESIGNER', 'AUTHORITY'] as const
const QUALITY_VALUES = ['CALCULATED', 'VERIFIED', 'ASSUMED', 'DECIDED'] as const
const AREA_STATE_VALUES = ['ACTIVE', 'PENDING', 'VOID'] as const
const SPECIALIST_VALUES = [
  'moderator',
  'planungsrecht',
  'bauordnungsrecht',
  'sonstige_vorgaben',
  'verfahren',
  'beteiligte',
  'synthesizer',
] as const
const INPUT_TYPE_VALUES = [
  'text',
  'yesno',
  'single_select',
  'multi_select',
  'address',
  'none',
] as const
const ITEM_STATUS_VALUES = [
  'nicht_erforderlich',
  'erforderlich',
  'liegt_vor',
  'freigegeben',
  'eingereicht',
  'genehmigt',
] as const
const COMPLETION_SIGNAL_VALUES = [
  'continue',
  'needs_designer',
  'ready_for_review',
  'blocked',
] as const

// Helper — discriminated-union delta item. `upsertProps` describes the
// optional fields allowed on an upsert. `remove` only needs `id`.
function deltaItem(upsertProps: Record<string, unknown>) {
  return {
    oneOf: [
      {
        type: 'object',
        required: ['op', 'id'],
        properties: {
          op: { const: 'upsert' },
          id: { type: 'string' },
          ...upsertProps,
        },
      },
      {
        type: 'object',
        required: ['op', 'id'],
        properties: {
          op: { const: 'remove' },
          id: { type: 'string' },
        },
      },
    ],
  } as const
}

const areaPatch = {
  type: 'object',
  properties: {
    state: { type: 'string', enum: [...AREA_STATE_VALUES] },
    reason: { type: 'string' },
  },
  required: ['state'],
} as const

export const respondToolDefinition = {
  name: RESPOND_TOOL_NAME,
  description:
    'Respond to the user as the active specialist on the planning team and update project state.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['specialist', 'message_de', 'message_en', 'input_type'],
    properties: {
      specialist: { type: 'string', enum: [...SPECIALIST_VALUES] },
      message_de: {
        type: 'string',
        description:
          'The message to the user, in formal German (Sie). 2–6 short sentences. No exclamation marks, no emoji.',
      },
      message_en: { type: 'string', description: 'An English mirror of message_de.' },

      input_type: { type: 'string', enum: [...INPUT_TYPE_VALUES] },
      input_options: {
        type: 'array',
        items: {
          type: 'object',
          required: ['value', 'label_de', 'label_en'],
          properties: {
            value: { type: 'string' },
            label_de: { type: 'string' },
            label_en: { type: 'string' },
          },
        },
      },
      allow_idk: { type: 'boolean', default: true },

      thinking_label_de: {
        type: 'string',
        description:
          'A short phrase shown in the thinking indicator on the next turn — e.g. "Planungsrecht prüft den Bebauungsplan...".',
      },
      thinking_label_en: { type: 'string' },

      extracted_facts: {
        type: 'array',
        items: {
          type: 'object',
          required: ['key', 'value', 'source', 'quality'],
          properties: {
            key: { type: 'string' },
            value: {},
            source: { type: 'string', enum: [...SOURCE_VALUES] },
            quality: { type: 'string', enum: [...QUALITY_VALUES] },
            evidence: { type: 'string' },
            reason: { type: 'string' },
          },
        },
      },

      recommendations_delta: {
        type: 'array',
        items: deltaItem({
          rank: { type: 'integer', minimum: 1 },
          title_de: { type: 'string' },
          title_en: { type: 'string' },
          detail_de: { type: 'string' },
          detail_en: { type: 'string' },
          ctaLabel_de: { type: 'string' },
          ctaLabel_en: { type: 'string' },
          estimated_effort: {
            type: 'string',
            enum: ['1d', '1-3d', '1w', '2-4w', 'months'],
            description:
              'Phase 3.5 — coarse effort estimate. 1d = ein Werktag · 1-3d = 1–3 Werktage · 1w = etwa eine Woche · 2-4w = 2–4 Wochen · months = mehrere Monate.',
          },
          responsible_party: {
            type: 'string',
            enum: ['bauherr', 'architekt', 'fachplaner', 'bauamt'],
            description:
              'Phase 3.5 — who is responsible for executing this recommendation.',
          },
          qualifier: {
            type: 'object',
            required: ['source', 'quality'],
            properties: {
              source: { type: 'string', enum: [...SOURCE_VALUES] },
              quality: { type: 'string', enum: [...QUALITY_VALUES] },
            },
          },
        }),
      },

      procedures_delta: {
        type: 'array',
        items: deltaItem({
          title_de: { type: 'string' },
          title_en: { type: 'string' },
          status: { type: 'string', enum: [...ITEM_STATUS_VALUES] },
          rationale_de: { type: 'string' },
          rationale_en: { type: 'string' },
          source: { type: 'string', enum: [...SOURCE_VALUES] },
          quality: { type: 'string', enum: [...QUALITY_VALUES] },
          reason: { type: 'string' },
        }),
      },

      documents_delta: {
        type: 'array',
        items: deltaItem({
          title_de: { type: 'string' },
          title_en: { type: 'string' },
          status: { type: 'string', enum: [...ITEM_STATUS_VALUES] },
          required_for: { type: 'array', items: { type: 'string' } },
          produced_by: { type: 'array', items: { type: 'string' } },
          source: { type: 'string', enum: [...SOURCE_VALUES] },
          quality: { type: 'string', enum: [...QUALITY_VALUES] },
          reason: { type: 'string' },
        }),
      },

      roles_delta: {
        type: 'array',
        items: deltaItem({
          title_de: { type: 'string' },
          title_en: { type: 'string' },
          needed: { type: 'boolean' },
          rationale_de: { type: 'string' },
          source: { type: 'string', enum: [...SOURCE_VALUES] },
          quality: { type: 'string', enum: [...QUALITY_VALUES] },
          reason: { type: 'string' },
        }),
      },

      areas_update: {
        type: 'object',
        properties: { A: areaPatch, B: areaPatch, C: areaPatch },
      },

      completion_signal: {
        type: 'string',
        enum: [...COMPLETION_SIGNAL_VALUES],
        description:
          'Whether the conversation should continue, escalate to a Designer, present an interim review, or block on missing data.',
      },

      likely_user_replies: {
        type: 'array',
        maxItems: 3,
        items: { type: 'string', maxLength: 60 },
        description:
          'Up to 3 plausible short replies (≤ 6 words each) the Bauherr might give to this question. Emit ONLY when input_type is "text" AND the question has identifiable plausible answers. Omit on the very first turn (address opener) and on free-form research follow-ups where suggestions would constrain the user. Match the conversation language: German for German conversations, English for English.',
      },
    },
  },
} as const

/**
 * Tool-choice config that forces the model to call `respond` on every
 * turn. Sent in the Messages API call alongside `tools: [respondToolDefinition]`.
 */
export const respondToolChoice = {
  type: 'tool' as const,
  name: RESPOND_TOOL_NAME,
}
