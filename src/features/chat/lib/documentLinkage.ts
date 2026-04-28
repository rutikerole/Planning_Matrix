// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #68 — document checklist linkage on upload
//
// Q9 (locked): when a Bauherr uploads a file with category
// `b_plan` / `plot_plan` / `building_plan`, auto-set the matching
// checklist document to `liegt_vor` and link the project_files row.
// If the model hasn't emitted a matching document yet, inject one.
//
// Mutates the cached project state directly via TanStack Query
// setQueryData. The change is local — chat-turn isn't called. The
// audit trail catches the upload via the project_files row itself.
// ───────────────────────────────────────────────────────────────────────

import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { FileCategory } from '@/types/chatInput'
import type { ProjectRow } from '@/types/db'
import type { DocumentItem, ProjectState, Qualifier } from '@/types/projectState'

const NOW_QUALIFIER: Qualifier = {
  source: 'CLIENT',
  quality: 'VERIFIED',
  setAt: new Date().toISOString(),
  setBy: 'user',
  reason: 'Datei wurde hochgeladen.',
}

/** Categories that auto-link into the checklist on upload. */
export function shouldAutoLink(category: FileCategory): boolean {
  return (
    category === 'b_plan' ||
    category === 'plot_plan' ||
    category === 'building_plan'
  )
}

/**
 * Map upload category → likely checklist document id + fallback titles
 * the model uses for the same artefact across DE/EN.
 */
function categoryDocumentTemplate(category: FileCategory): {
  id: string
  title_de: string
  title_en: string
  match: (id: string, titleDe: string) => boolean
} | null {
  if (category === 'b_plan') {
    return {
      id: 'D-Bebauungsplan',
      title_de: 'Bebauungsplan-Auszug',
      title_en: 'Development plan extract',
      match: (id, title) =>
        id.toLowerCase().includes('bebauung') ||
        title.toLowerCase().includes('bebauungsplan') ||
        title.toLowerCase().includes('b-plan') ||
        title.toLowerCase().includes('development plan'),
    }
  }
  if (category === 'plot_plan') {
    return {
      id: 'D-Lageplan',
      title_de: 'Amtlicher Lageplan',
      title_en: 'Official site plan',
      match: (id, title) =>
        id.toLowerCase().includes('lageplan') ||
        title.toLowerCase().includes('lageplan') ||
        title.toLowerCase().includes('site plan'),
    }
  }
  if (category === 'building_plan') {
    return {
      id: 'D-Bauzeichnungen',
      title_de: 'Bauzeichnungen (Bestand)',
      title_en: 'Existing building drawings',
      match: (id, title) =>
        id.toLowerCase().includes('bauzeichn') ||
        title.toLowerCase().includes('bauzeichn') ||
        title.toLowerCase().includes('drawings'),
    }
  }
  return null
}

interface ApplyArgs {
  queryClient: QueryClient
  projectId: string
  fileRowId: string
  category: FileCategory
}

/**
 * Apply checklist linkage: find or inject the matching document,
 * mark it `liegt_vor`, and persist the patched state via supabase.
 */
export async function applyDocumentLinkage({
  queryClient,
  projectId,
  fileRowId,
  category,
}: ApplyArgs): Promise<void> {
  const template = categoryDocumentTemplate(category)
  if (!template) return

  const project = queryClient.getQueryData<ProjectRow>(['project', projectId])
  if (!project) return

  const state = (project.state ?? {}) as Partial<ProjectState>
  const documents: DocumentItem[] = [...(state.documents ?? [])]

  const existingIdx = documents.findIndex((d) =>
    template.match(d.id, d.title_de),
  )

  if (existingIdx >= 0) {
    const existing = documents[existingIdx]
    documents[existingIdx] = {
      ...existing,
      status: 'liegt_vor',
      qualifier: NOW_QUALIFIER,
    }
  } else {
    // Inject a new row — the model can re-classify on the next turn
    // if it disagrees.
    documents.push({
      id: template.id,
      title_de: template.title_de,
      title_en: template.title_en,
      status: 'liegt_vor',
      required_for: [],
      produced_by: ['bauherr'],
      qualifier: NOW_QUALIFIER,
    })
  }

  const nextState: Partial<ProjectState> = { ...state, documents }

  // Persist. RLS allows the owner to UPDATE projects (set in 0003).
  const { error } = await supabase
    .from('projects')
    .update({ state: nextState })
    .eq('id', projectId)

  if (error) {
    if (import.meta.env.DEV) {
      console.warn('[documentLinkage] persist failed:', error.message)
    }
    return
  }

  // Mirror the change into the TanStack cache so the UI updates
  // without a refetch. project_files.document_id is set in a
  // follow-up so the audit trail records the binding.
  queryClient.setQueryData<ProjectRow>(['project', projectId], (old) =>
    old ? { ...old, state: nextState as ProjectRow['state'] } : old,
  )

  const linkedDocId = documents.find((d) => template.match(d.id, d.title_de))?.id
  if (linkedDocId) {
    void supabase
      .from('project_files')
      .update({ document_id: linkedDocId })
      .eq('id', fileRowId)
  }
}
