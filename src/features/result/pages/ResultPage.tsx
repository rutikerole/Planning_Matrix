import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BlueprintSubstrate } from '@/components/shared/BlueprintSubstrate'
import { useProject } from '@/features/chat/hooks/useProject'
import { useMessages } from '@/features/chat/hooks/useMessages'
import { CoverHero } from '../components/CoverHero'
import { VerdictSection } from '../components/VerdictSection'
import { TopThreeHero } from '../components/TopThreeHero'
import { LegalLandscape } from '../components/LegalLandscape'
import { DocumentChecklist } from '../components/DocumentChecklist'
import { SpecialistsRequired } from '../components/SpecialistsRequired'
import { CostTimelinePanel } from '../components/CostTimelinePanel'
import { RiskFlags } from '../components/RiskFlags'
import { ConfidenceDashboard } from '../components/ConfidenceDashboard'
import type { ProjectState } from '@/types/projectState'

/**
 * Phase 3.5 — Result Page (`/projects/:id/result`).
 *
 * The product's most important deliverable. Twelve sections that read
 * top-to-bottom as a real architectural-document briefing. Reuses the
 * locked atelier vocabulary; ships one new visual primitive (the
 * confidence radial in #63).
 *
 * Sections land across commits #60–#65:
 *   • #60: I Cover Hero · II Das Verfahren
 *   • #61: III Top-3 hero · IV Legal landscape
 *   • #62: V Document checklist · VI Specialists
 *   • #63: VII Cost & timeline · VIII Risk flags · IX Confidence radial
 *   • #64: X Conversation appendix · XI Smart suggestions · XII Export hub
 *   • #65: print stylesheet · share view
 */
export function ResultPage() {
  const { t } = useTranslation()
  const params = useParams<{ id: string }>()
  const projectId = params.id ?? ''
  const { data: project } = useProject(projectId)
  const { data: messages } = useMessages(projectId)

  useEffect(() => {
    if (project?.name) {
      document.title = `${t('result.titlePrefix', { defaultValue: 'Briefing' })} · ${project.name} · Planning Matrix`
    }
  }, [project?.name, t])

  if (!project) return null

  return (
    <div
      className="min-h-dvh bg-paper relative isolate"
      data-print-target="result-page"
      data-document-no={projectId}
    >
      {/* Atmospheric blueprint substrate — same vocabulary as the chat
       * workspace and dashboard. Calmer settings here so the cover
       * type stays the focal point. */}
      <BlueprintSubstrate lensRadius={260} breathing={false} driftPx={0} />

      {/* Section I — Cover Hero */}
      <CoverHero project={project} messages={messages ?? []} />

      {/* Section II — Verdict */}
      <VerdictSection project={project} />

      {/* Section III — Top 3 Hero */}
      <TopThreeHero state={(project.state ?? {}) as Partial<ProjectState>} />

      {/* Section IV — Legal Landscape */}
      <LegalLandscape state={(project.state ?? {}) as Partial<ProjectState>} />

      {/* Section V — Document Checklist */}
      <DocumentChecklist
        project={project}
        state={(project.state ?? {}) as Partial<ProjectState>}
      />

      {/* Section VI — Specialists Required */}
      <SpecialistsRequired state={(project.state ?? {}) as Partial<ProjectState>} />

      {/* Section VII — Cost & Timeline */}
      <CostTimelinePanel state={(project.state ?? {}) as Partial<ProjectState>} />

      {/* Section VIII — Risk Flags */}
      <RiskFlags state={(project.state ?? {}) as Partial<ProjectState>} />

      {/* Section IX — Confidence Dashboard (THE new primitive) */}
      <ConfidenceDashboard state={(project.state ?? {}) as Partial<ProjectState>} />

      {/* Sections X–XII land in commit #64. */}
    </div>
  )
}
