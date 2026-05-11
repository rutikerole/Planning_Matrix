import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { postChatTurn, ChatTurnError } from '@/lib/chatApi'
import { useAuthStore } from '@/stores/authStore'
import type { BplanLookupResult } from '@/types/bplan'
import type { Fact, ProjectState } from '@/types/projectState'
import { initialProjectState } from '@/lib/projectStateHelpers'
import { selectTemplate, type Intent } from '../lib/selectTemplate'
import { deriveName } from '../lib/deriveName'
import type { BundeslandCode } from '@/legal/states/_types'

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
  /** v1.0.6 (Bug 0 — B04 surgical mitigation) — explicit Bundesland
   *  selection from the wizard. Required input — wizard always passes
   *  the user's selection (default 'bayern' when unchanged). Writes
   *  through to `projects.bundesland`. */
  bundesland: BundeslandCode
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
 * pipeline and expose the resulting state; the AtelierOpening transition
 * owns the visual handoff and calls navigate() once both the visual
 * floor (5 s) and `primed` are met.
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
    // Audit B02 fix — seed the FULL canonical ProjectState shape, not
    // just `{ facts: seededFacts }`. Two reasons it matters:
    //   1. v1.5 §7.0.04 — when I-02 = "kein Grundstück" the
    //      Bereichsqualifier of areas A (Planungsrecht) and C (Sonstige
    //      Vorgaben) MUST be VOID; both areas are not substantively
    //      etablierbar without a Grundstücksbezug. Bereich B
    //      (Bauordnungsrecht) stays PENDING because the MBO/BayBO-
    //      default still applies even without a plot.
    //   2. hydrateProjectState() (in projectStateHelpers.ts) only
    //      preserves a stored state that carries `schemaVersion: 1`.
    //      The pre-fix wizard wrote a schema-less `{ facts: [...] }`
    //      blob that hydrate silently discarded on the first turn,
    //      taking the seeded B-Plan facts with it. Writing the
    //      canonical shape here keeps the seed alive through hydrate.
    const baseState = initialProjectState(templateId)
    const initialState: ProjectState = {
      ...baseState,
      facts: seededFacts.length > 0 ? seededFacts : baseState.facts,
      areas: input.hasPlot
        ? baseState.areas
        : {
            // I-02 = no plot named ⇒ areas A and C lose their site
            // anchor and cannot be substantively assessed. Bereich B
            // stays PENDING because BayBO-defaults still apply
            // location-independent. Reason strings stay short and
            // English-language — they live in audit-only state, not
            // in any user-visible surface, and the canonical German
            // labels for the areas are owned by locale files.
            A: { state: 'VOID', reason: 'I-02: no site named' },
            B: { state: 'PENDING' },
            C: { state: 'VOID', reason: 'I-02: no site named' },
          },
    }

    // v1.0.6 (Bug 0 — B04 surgical mitigation) — write the wizard's
    // explicit Bundesland selection to projects.bundesland. The legacy
    // wizard hardcoded 'bayern' regardless of address, which made every
    // non-Bayern project resolve to Bayern law downstream. `city` stays
    // 'muenchen' only when the project is in Bayern, since the cityBlock
    // pilot is München-only (other Bundesländer have no cityBlock yet).
    const { data: projectRow, error: insertErr } = await supabase
      .from('projects')
      .insert({
        owner_id: ownerId,
        intent: input.intent,
        has_plot: input.hasPlot,
        plot_address: input.hasPlot ? input.plotAddress : null,
        bundesland: input.bundesland,
        city: input.bundesland === 'bayern' ? 'muenchen' : null,
        template_id: templateId,
        name:
          input.suggestedName?.trim() ||
          deriveName(input.intent, input.hasPlot ? input.plotAddress : null),
        state: initialState,
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
