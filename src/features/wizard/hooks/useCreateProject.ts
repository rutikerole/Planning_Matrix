import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { postChatTurn, ChatTurnError } from '@/lib/chatApi'
import { useAuthStore } from '@/stores/authStore'
import type { BplanLookupResult } from '@/types/bplan'
import type { Fact } from '@/types/projectState'
import { useWizardState } from './useWizardState'
import { selectTemplate, type Intent } from '../lib/selectTemplate'
import { deriveName } from '../lib/deriveName'

export type CreateProjectStatus =
  | 'idle'
  | 'inserting'
  | 'priming'
  | 'navigating'
  | 'insertFailed'

interface CreateProjectInput {
  intent: Intent
  hasPlot: boolean
  plotAddress: string | null
  /** Phase 6a — admin-only B-Plan lookup result. When present and
   *  status === 'found', 4 AUTHORITY/VERIFIED facts are seeded into
   *  the project's initial state so the chat-turn priming turn sees
   *  them. When status === 'no_plan_found', a single fact records
   *  that finding so the model's first turn can hedge honestly. When
   *  null or status === 'upstream_error', no facts are seeded — the
   *  chat-turn pipeline still works normally. */
  bplanResult?: BplanLookupResult | null
}

// ─── Phase 6a — convert a BplanLookupResult into projectState facts ───
//
// Only called when bplanResult is non-null. Produces an empty array
// for upstream_error (we don't fabricate evidence on transient WMS
// failures). Each fact carries the full Qualifier shape (source +
// quality + setAt + setBy) so it round-trips cleanly through the
// existing chat-turn helpers + EckdatenPanel.
function bplanToFacts(result: BplanLookupResult, nowIso: string): Fact[] {
  if (result.status === 'upstream_error') return []

  const baseQualifier = {
    source: 'AUTHORITY' as const,
    quality: 'VERIFIED' as const,
    setAt: nowIso,
    setBy: 'system' as const,
    reason:
      'Aus dem WMS-Layer vagrund_baug_umgriff_veredelt_in_kraft des Geoportals der Landeshauptstadt München (Phase-6a-Live-Lookup).',
  }

  if (result.status === 'no_plan_found') {
    return [
      {
        key: 'bplan.coverage_status',
        value: 'no_plan_found',
        qualifier: baseQualifier,
        evidence: 'Geoportal München, WMS-Layer vagrund_baug_umgriff_veredelt_in_kraft',
      },
    ]
  }

  // status === 'found' — emit up to 4 facts depending on availability.
  const facts: Fact[] = []
  if (result.plan_number) {
    facts.push({
      key: 'bplan.number',
      value: result.plan_number,
      qualifier: baseQualifier,
      evidence: `WMS feature_id ${result.feature_id ?? '(unknown)'}`,
    })
  }
  if (result.plan_name_de) {
    facts.push({
      key: 'bplan.name',
      value: result.plan_name_de,
      qualifier: baseQualifier,
    })
  }
  if (result.in_force_since) {
    facts.push({
      key: 'bplan.in_force_since',
      value: result.in_force_since,
      qualifier: baseQualifier,
    })
  }
  if (result.pdf_url_plan) {
    facts.push({
      key: 'bplan.pdf_url_plan',
      value: result.pdf_url_plan,
      qualifier: baseQualifier,
    })
  }
  return facts
}

/**
 * Wizard submission orchestrator.
 *
 *   1. INSERT the project (RLS auto-fills owner_id from the caller's JWT).
 *   2. Move to "priming" — call chat-turn with userMessage: null so the
 *      moderator opens the conversation.
 *   3. Pre-seed the TanStack Query cache so the chat workspace renders
 *      the moderator message immediately, no re-fetch flicker.
 *   4. Navigate to /projects/:id with replace.
 *
 * If priming fails (Anthropic upstream / network), we navigate anyway —
 * the project row exists, and the chat workspace's own empty-state
 * handler will detect zero messages and trigger the D7 retry path.
 *
 * If the INSERT itself fails (RLS / network), we keep the user on the
 * wizard with a calm error message and re-enable the submit button.
 */
export function useCreateProject() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const reset = useWizardState((s) => s.reset)
  const [status, setStatus] = useState<CreateProjectStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(input: CreateProjectInput): Promise<void> {
    setError(null)
    setStatus('inserting')

    // RLS requires owner_id = auth.uid() on insert. Read the current
    // user from the auth store; if it's not present, abort the wizard
    // (ProtectedRoute should have prevented this, but defend in depth).
    const ownerId = useAuthStore.getState().user?.id
    if (!ownerId) {
      console.error('[wizard] no authenticated user — refusing INSERT')
      setStatus('insertFailed')
      setError(t('wizard.errors.insertFailed'))
      return
    }

    // ── 1. INSERT project ────────────────────────────────────────────
    const templateId = selectTemplate(input.intent)
    // Phase 6a — pre-seed state.facts with the B-Plan lookup result
    // (when present + non-upstream-error). The chat-turn function
    // hydrates missing fields, so passing partial state is safe.
    const seededFacts = input.bplanResult
      ? bplanToFacts(input.bplanResult, new Date().toISOString())
      : []
    const initialState =
      seededFacts.length > 0 ? { facts: seededFacts } : undefined
    const { data: projectRow, error: insertErr } = await supabase
      .from('projects')
      .insert({
        owner_id: ownerId,
        intent: input.intent,
        has_plot: input.hasPlot,
        plot_address: input.hasPlot ? input.plotAddress : null,
        bundesland: 'bayern',
        // Phase 5 — v1 active city pivots from Erlangen → München via
        // the wizard's PLZ gate (70 München Stadtgebiet postcodes).
        // The `city` column was installed by migration 0009 and
        // widened to admit both 'erlangen' (legacy) and 'muenchen'
        // (active) by migration 0010, with the default flipped to
        // 'muenchen'. We now pass `city: 'muenchen'` explicitly so
        // the value is unambiguous on prod once 0010 has landed.
        // Sequencing requirement: ship migration 0010 BEFORE this
        // SPA build — otherwise the explicit insert would fail the
        // 0009-era CHECK ('erlangen' only). Phase 5's commit
        // ordering (Commit 3 = migration 0010, Commit 4 = wizard
        // swap) plus the apply-then-deploy gate keeps that
        // contract honest.
        city: 'muenchen',
        template_id: templateId,
        name: deriveName(input.intent, input.hasPlot ? input.plotAddress : null),
        ...(initialState ? { state: initialState } : {}),
      })
      .select()
      .single()

    if (insertErr || !projectRow) {
      console.error('[wizard] project insert failed', insertErr)
      setStatus('insertFailed')
      setError(t('wizard.errors.insertFailed'))
      return
    }

    const projectId = projectRow.id as string

    // ── 2. Prime the first turn (best-effort) ───────────────────────
    setStatus('priming')

    try {
      const response = await postChatTurn({
        projectId,
        userMessage: null,
        userAnswer: null,
        clientRequestId: crypto.randomUUID(),
      })

      // ── 3. Pre-seed cache so chat workspace renders without flicker
      queryClient.setQueryData(['project', projectId], {
        ...projectRow,
        state: response.projectState,
        updated_at: new Date().toISOString(),
      })
      queryClient.setQueryData(
        ['messages', projectId],
        [response.assistantMessage],
      )
    } catch (err) {
      // Project row exists; the chat workspace will surface a retry
      // affordance for the missing first turn (D7).
      console.warn('[wizard] first-turn priming failed; routing anyway', err)
      if (err instanceof ChatTurnError && import.meta.env.DEV) {
        console.info('[wizard] priming error detail', {
          code: err.code,
          httpStatus: err.httpStatus,
          retryAfterMs: err.retryAfterMs,
          requestId: err.requestId,
        })
      }
    }

    // ── 4. Navigate ─────────────────────────────────────────────────
    // Polish Move 5 — wrap navigation in document.startViewTransition
    // so the wizard's transition-screen hairline morphs into the
    // moderator's match-cut rule (both elements share viewTransitionName
    // 'pm-handoff-hairline'). Falls back to a plain navigate where
    // the API isn't supported (Firefox + older Safari).
    setStatus('navigating')
    reset()
    const target = `/projects/${projectId}`
    type DocWithVT = Document & { startViewTransition?: (cb: () => void) => unknown }
    const doc = document as DocWithVT
    if (typeof doc.startViewTransition === 'function') {
      doc.startViewTransition(() => navigate(target, { replace: true }))
    } else {
      navigate(target, { replace: true })
    }
  }

  return { submit, status, error }
}
