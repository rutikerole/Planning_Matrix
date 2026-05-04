import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { postChatTurn, ChatTurnError } from '@/lib/chatApi'
import { useAuthStore } from '@/stores/authStore'
import type { BplanLookupResult } from '@/types/bplan'
import type { Fact } from '@/types/projectState'
import { selectTemplate, type Intent } from '../lib/selectTemplate'
import { deriveName } from '../lib/deriveName'

export type CreateProjectStatus =
  | 'idle'
  | 'inserting'
  | 'priming'
  | 'primed'
  | 'insertFailed'
  | 'primeFailed'

interface CreateProjectInput {
  intent: Intent
  hasPlot: boolean
  plotAddress: string | null
  bplanResult?: BplanLookupResult | null
  /** v3 — friendly auto-suggested project name. Falls back to
   *  deriveName(intent, address) when null. */
  suggestedName?: string | null
  /** Phase 5 — true when the user explicitly proceeded with a non-
   *  München address. Persisted as a CLIENT/DECIDED fact so the
   *  system prompt can adjust honesty disclaimers. */
  outsideMunichAcknowledged?: boolean
}

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
 * The hook does not navigate. Its job is to drive the INSERT + priming
 * pipeline and expose the resulting state; the LoaderScreen owns the
 * visual handoff and calls navigate() once the perceived-effort floor
 * has been honoured.
 */
export function useCreateProject() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<CreateProjectStatus>('idle')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(input: CreateProjectInput): Promise<void> {
    setError(null)
    setStatus('inserting')
    setProjectId(null)

    const ownerId = useAuthStore.getState().user?.id
    if (!ownerId) {
      console.error('[wizard] no authenticated user — refusing INSERT')
      setStatus('insertFailed')
      setError(t('wizard.errors.insertFailed'))
      return
    }

    const templateId = selectTemplate(input.intent)
    const nowIso = new Date().toISOString()
    const seededFacts: Fact[] = input.bplanResult
      ? bplanToFacts(input.bplanResult, nowIso)
      : []
    // Phase 5 — when the user proceeded past the soft Münchner-PLZ
    // gate, record the acknowledgement as a CLIENT/DECIDED fact. The
    // system prompt's live-state block will surface this so the model
    // can frame the conversation as "outside München, reduced data"
    // rather than asserting München-specific Satzungen.
    if (input.outsideMunichAcknowledged) {
      seededFacts.push({
        key: 'plot.outside_munich_acknowledged',
        value: true,
        qualifier: {
          source: 'CLIENT',
          quality: 'DECIDED',
          setAt: nowIso,
          setBy: 'user',
          reason:
            'Bauherr hat Adresse außerhalb des aktuellen München-Versorgungsgebiets bewusst bestätigt; System läuft mit reduziertem Datenstand.',
        },
      })
    }
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
        city: 'muenchen',
        template_id: templateId,
        name:
          input.suggestedName?.trim() ||
          deriveName(input.intent, input.hasPlot ? input.plotAddress : null),
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

    const newProjectId = projectRow.id as string
    setProjectId(newProjectId)
    setStatus('priming')

    try {
      const response = await postChatTurn({
        projectId: newProjectId,
        userMessage: null,
        userAnswer: null,
        clientRequestId: crypto.randomUUID(),
      })

      queryClient.setQueryData(['project', newProjectId], {
        ...projectRow,
        state: response.projectState,
        updated_at: new Date().toISOString(),
      })
      queryClient.setQueryData(['messages', newProjectId], [response.assistantMessage])
      setStatus('primed')
    } catch (err) {
      console.warn('[wizard] first-turn priming failed', err)
      if (err instanceof ChatTurnError && import.meta.env.DEV) {
        console.info('[wizard] priming error detail', {
          code: err.code,
          httpStatus: err.httpStatus,
          retryAfterMs: err.retryAfterMs,
          requestId: err.requestId,
        })
      }
      setStatus('primeFailed')
    }
  }

  /**
   * Cancel flow during loader: deletes the in-flight project (if any)
   * so the user's dashboard does not collect ghost rows.
   */
  async function cancelInFlight(): Promise<void> {
    if (projectId) {
      await supabase.from('projects').delete().eq('id', projectId)
    }
    setProjectId(null)
    setStatus('idle')
    setError(null)
  }

  const isInFlight =
    status === 'inserting' ||
    status === 'priming' ||
    status === 'primed' ||
    status === 'primeFailed'

  return {
    submit,
    cancelInFlight,
    status,
    projectId,
    error,
    isInFlight,
    primed: status === 'primed',
    failed: status === 'insertFailed' || status === 'primeFailed',
  }
}
