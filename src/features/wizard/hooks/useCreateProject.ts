import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { postChatTurn, ChatTurnError } from '@/lib/chatApi'
import { useAuthStore } from '@/stores/authStore'
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
      // eslint-disable-next-line no-console
      console.error('[wizard] no authenticated user — refusing INSERT')
      setStatus('insertFailed')
      setError(t('wizard.errors.insertFailed'))
      return
    }

    // ── 1. INSERT project ────────────────────────────────────────────
    const templateId = selectTemplate(input.intent)
    const { data: projectRow, error: insertErr } = await supabase
      .from('projects')
      .insert({
        owner_id: ownerId,
        intent: input.intent,
        has_plot: input.hasPlot,
        plot_address: input.hasPlot ? input.plotAddress : null,
        bundesland: 'bayern',
        template_id: templateId,
        name: deriveName(input.intent, input.hasPlot ? input.plotAddress : null),
      })
      .select()
      .single()

    if (insertErr || !projectRow) {
      // eslint-disable-next-line no-console
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
      // eslint-disable-next-line no-console
      console.warn('[wizard] first-turn priming failed; routing anyway', err)
      if (err instanceof ChatTurnError && import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info('[wizard] priming error detail', {
          code: err.code,
          httpStatus: err.httpStatus,
          retryAfterMs: err.retryAfterMs,
          requestId: err.requestId,
        })
      }
    }

    // ── 4. Navigate ─────────────────────────────────────────────────
    setStatus('navigating')
    reset()
    navigate(`/projects/${projectId}`, { replace: true })
  }

  return { submit, status, error }
}
