// ───────────────────────────────────────────────────────────────────────
// Phase 13 Week 1 — qualifier-write-gate unit tests
//
// Run: deno test supabase/functions/chat-turn/qualifierGate.test.ts
//
// Verifies gateQualifiersByRole behaviour:
//   - client/anonymous callers attempting DESIGNER+VERIFIED are
//     downgraded to DESIGNER+ASSUMED, and a downgrade event is emitted
//     for each affected qualifier (extracted_facts / recommendations /
//     procedures / documents / roles).
//   - designer + system callers pass through untouched (no events).
//   - non-DESIGNER sources or non-VERIFIED qualities are left alone.
//   - `op: 'remove'` deltas are never inspected.
//
// The Edge Function (chat-turn/index.ts + streaming.ts) wraps these
// events into event_log rows with name='qualifier.downgraded'.
// ───────────────────────────────────────────────────────────────────────

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  gateQualifiersByRole,
  QUALIFIER_GATE_REJECTS,
  QualifierRoleViolationError,
} from '../../../src/lib/projectStateHelpers.ts'
import type { RespondToolInput } from '../../../src/types/respondTool.ts'

// Phase 13 Week 2 — invariant pinning. The constant + the error class
// MUST stay in their post-flip shape for the rejection wiring in
// chat-turn/index.ts and streaming.ts to fire. The smokeWalk static
// gate also asserts these via source-text regex; the duplication is
// deliberate (test file = unit guard, smokeWalk = pre-build guard).
Deno.test('Week 2 invariant: QUALIFIER_GATE_REJECTS = true', () => {
  assertEquals(QUALIFIER_GATE_REJECTS, true)
})

Deno.test('Week 2 invariant: QualifierRoleViolationError carries events + code', () => {
  const err = new QualifierRoleViolationError([
    {
      field: 'extracted_fact',
      item_id: 'k',
      attempted_source: 'DESIGNER',
      attempted_quality: 'VERIFIED',
      enforced_source: 'DESIGNER',
      enforced_quality: 'ASSUMED',
      caller_role: 'client',
      reason: 'test',
    },
  ])
  assertEquals(err.code, 'qualifier_role_violation')
  assertEquals(err.events.length, 1)
  assertEquals(err.name, 'QualifierRoleViolationError')
})

const baseEnvelope = {
  specialist: 'moderator' as const,
  message_de: 'm',
  message_en: 'm',
  input_type: 'none' as const,
}

Deno.test('client + DESIGNER+VERIFIED extracted_fact → downgrade to ASSUMED', () => {
  const tool: RespondToolInput = {
    ...baseEnvelope,
    extracted_facts: [
      {
        key: 'site.height',
        value: 6.8,
        source: 'DESIGNER',
        quality: 'VERIFIED',
      },
    ],
  }
  const events = gateQualifiersByRole(tool, 'client')
  assertEquals(events.length, 1)
  assertEquals(events[0].field, 'extracted_fact')
  assertEquals(events[0].item_id, 'site.height')
  assertEquals(events[0].caller_role, 'client')
  assertEquals(events[0].attempted_quality, 'VERIFIED')
  assertEquals(events[0].enforced_quality, 'ASSUMED')
  // Mutation in-place
  assertEquals(tool.extracted_facts![0].quality, 'ASSUMED')
  assertEquals(tool.extracted_facts![0].source, 'DESIGNER')
})

Deno.test('client + DESIGNER+VERIFIED recommendation upsert → downgrade', () => {
  const tool: RespondToolInput = {
    ...baseEnvelope,
    recommendations_delta: [
      {
        op: 'upsert',
        id: 'rec-1',
        title_de: 't',
        title_en: 't',
        detail_de: 'd',
        detail_en: 'd',
        qualifier: { source: 'DESIGNER', quality: 'VERIFIED' },
      },
    ],
  }
  const events = gateQualifiersByRole(tool, 'client')
  assertEquals(events.length, 1)
  assertEquals(events[0].field, 'recommendation')
  assertEquals(events[0].item_id, 'rec-1')
  const rec = tool.recommendations_delta![0]
  if (rec.op !== 'upsert') throw new Error('expected upsert')
  assertEquals(rec.qualifier?.quality, 'ASSUMED')
})

Deno.test('client + DESIGNER+VERIFIED procedure/document/role upserts → downgrade', () => {
  const tool: RespondToolInput = {
    ...baseEnvelope,
    procedures_delta: [
      { op: 'upsert', id: 'p-1', source: 'DESIGNER', quality: 'VERIFIED' },
    ],
    documents_delta: [
      { op: 'upsert', id: 'd-1', source: 'DESIGNER', quality: 'VERIFIED' },
    ],
    roles_delta: [
      { op: 'upsert', id: 'r-1', source: 'DESIGNER', quality: 'VERIFIED' },
    ],
  }
  const events = gateQualifiersByRole(tool, 'client')
  assertEquals(events.length, 3)
  assertEquals(events.map((e) => e.field).sort(), [
    'document',
    'procedure',
    'role',
  ])
  const proc = tool.procedures_delta![0]
  if (proc.op !== 'upsert') throw new Error('expected upsert')
  assertEquals(proc.quality, 'ASSUMED')
  const doc = tool.documents_delta![0]
  if (doc.op !== 'upsert') throw new Error('expected upsert')
  assertEquals(doc.quality, 'ASSUMED')
  const role = tool.roles_delta![0]
  if (role.op !== 'upsert') throw new Error('expected upsert')
  assertEquals(role.quality, 'ASSUMED')
})

Deno.test('designer + DESIGNER+VERIFIED → pass-through, no events', () => {
  const tool: RespondToolInput = {
    ...baseEnvelope,
    extracted_facts: [
      {
        key: 'site.height',
        value: 6.8,
        source: 'DESIGNER',
        quality: 'VERIFIED',
      },
    ],
    recommendations_delta: [
      {
        op: 'upsert',
        id: 'r-1',
        title_de: 't',
        title_en: 't',
        detail_de: 'd',
        detail_en: 'd',
        qualifier: { source: 'DESIGNER', quality: 'VERIFIED' },
      },
    ],
  }
  const events = gateQualifiersByRole(tool, 'designer')
  assertEquals(events.length, 0)
  assertEquals(tool.extracted_facts![0].quality, 'VERIFIED')
  const rec = tool.recommendations_delta![0]
  if (rec.op !== 'upsert') throw new Error('expected upsert')
  assertEquals(rec.qualifier?.quality, 'VERIFIED')
})

Deno.test('system caller passes through DESIGNER+VERIFIED unchanged', () => {
  const tool: RespondToolInput = {
    ...baseEnvelope,
    extracted_facts: [
      {
        key: 'k',
        value: 1,
        source: 'DESIGNER',
        quality: 'VERIFIED',
      },
    ],
  }
  const events = gateQualifiersByRole(tool, 'system')
  assertEquals(events.length, 0)
  assertEquals(tool.extracted_facts![0].quality, 'VERIFIED')
})

// v1.0.24 Bug Q extension — CLIENT/USER/BAUHERR+VERIFIED is now
// downgraded at write-time. Test split: legitimate sources stay
// untouched; client-side sources are gated.
Deno.test('LEGAL/AUTHORITY+VERIFIED untouched even on client (legitimate)', () => {
  const tool: RespondToolInput = {
    ...baseEnvelope,
    extracted_facts: [
      { key: 'b', value: 1, source: 'LEGAL', quality: 'VERIFIED' },
      { key: 'c', value: 1, source: 'AUTHORITY', quality: 'VERIFIED' },
    ],
  }
  const events = gateQualifiersByRole(tool, 'client')
  assertEquals(events.length, 0)
  for (const f of tool.extracted_facts!) {
    assertEquals(f.quality, 'VERIFIED')
  }
})

Deno.test('client + CLIENT+VERIFIED → downgrade to CLIENT+DECIDED', () => {
  const tool: RespondToolInput = {
    ...baseEnvelope,
    extracted_facts: [
      { key: 'a', value: 1, source: 'CLIENT', quality: 'VERIFIED' },
    ],
  }
  const events = gateQualifiersByRole(tool, 'client')
  assertEquals(events.length, 1)
  assertEquals(events[0].field, 'extracted_fact')
  assertEquals(events[0].attempted_source, 'CLIENT')
  assertEquals(events[0].attempted_quality, 'VERIFIED')
  assertEquals(events[0].enforced_source, 'CLIENT')
  assertEquals(events[0].enforced_quality, 'DECIDED')
  assertEquals(tool.extracted_facts![0].source, 'CLIENT')
  assertEquals(tool.extracted_facts![0].quality, 'DECIDED')
})

Deno.test('DESIGNER + non-VERIFIED quality untouched on client', () => {
  const tool: RespondToolInput = {
    ...baseEnvelope,
    extracted_facts: [
      { key: 'a', value: 1, source: 'DESIGNER', quality: 'ASSUMED' },
      { key: 'b', value: 1, source: 'DESIGNER', quality: 'CALCULATED' },
      { key: 'c', value: 1, source: 'DESIGNER', quality: 'DECIDED' },
    ],
  }
  const events = gateQualifiersByRole(tool, 'client')
  assertEquals(events.length, 0)
  assertEquals(tool.extracted_facts![0].quality, 'ASSUMED')
  assertEquals(tool.extracted_facts![1].quality, 'CALCULATED')
  assertEquals(tool.extracted_facts![2].quality, 'DECIDED')
})

Deno.test('remove ops are never inspected (id-only payloads)', () => {
  const tool: RespondToolInput = {
    ...baseEnvelope,
    recommendations_delta: [{ op: 'remove', id: 'r-1' }],
    procedures_delta: [{ op: 'remove', id: 'p-1' }],
    documents_delta: [{ op: 'remove', id: 'd-1' }],
    roles_delta: [{ op: 'remove', id: 'role-1' }],
  }
  const events = gateQualifiersByRole(tool, 'client')
  assertEquals(events.length, 0)
})

Deno.test('engineer / authority caller behaves like client (downgrade)', () => {
  const mk = (): RespondToolInput => ({
    ...baseEnvelope,
    extracted_facts: [
      { key: 'k', value: 1, source: 'DESIGNER', quality: 'VERIFIED' },
    ],
  })
  for (const role of ['engineer', 'authority'] as const) {
    const tool = mk()
    const events = gateQualifiersByRole(tool, role)
    assertEquals(events.length, 1)
    assertEquals(events[0].caller_role, role)
    assertEquals(tool.extracted_facts![0].quality, 'ASSUMED')
  }
})

// v1.0.24 Bug Q extension — both DESIGNER+VERIFIED and CLIENT+VERIFIED
// are now gated. LEGAL/AUTHORITY+VERIFIED and DESIGNER+ASSUMED pass
// through.
Deno.test('mixed payload: DESIGNER+VERIFIED and CLIENT+VERIFIED both gated', () => {
  const tool: RespondToolInput = {
    ...baseEnvelope,
    extracted_facts: [
      { key: 'gated-designer', value: 1, source: 'DESIGNER', quality: 'VERIFIED' },
      { key: 'gated-client', value: 1, source: 'CLIENT', quality: 'VERIFIED' },
      { key: 'free-designer', value: 1, source: 'DESIGNER', quality: 'ASSUMED' },
      { key: 'free-authority', value: 1, source: 'AUTHORITY', quality: 'VERIFIED' },
    ],
  }
  const events = gateQualifiersByRole(tool, 'client')
  assertEquals(events.length, 2)
  // DESIGNER path → DESIGNER+ASSUMED
  assertEquals(tool.extracted_facts![0].source, 'DESIGNER')
  assertEquals(tool.extracted_facts![0].quality, 'ASSUMED')
  // CLIENT path → CLIENT+DECIDED
  assertEquals(tool.extracted_facts![1].source, 'CLIENT')
  assertEquals(tool.extracted_facts![1].quality, 'DECIDED')
  // Other paths untouched
  assertEquals(tool.extracted_facts![2].quality, 'ASSUMED')
  assertEquals(tool.extracted_facts![3].quality, 'VERIFIED')
})
