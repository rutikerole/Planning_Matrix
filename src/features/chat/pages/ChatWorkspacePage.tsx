// Phase 7 Chamber — temporary stub. Replaced in commit 25 with the
// real ChamberLayout mount. This shape compiles after the legacy
// delete pass so the rest of the redesign can be staged.

import { useParams } from 'react-router-dom'
import { SEO } from '@/components/SEO'
import { useProject } from '../hooks/useProject'

export function ChatWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const { data: project } = useProject(id ?? '')
  if (!project) return null
  return (
    <>
      <SEO titleKey="seo.title.project" params={{ name: project.name }} />
      <div className="min-h-dvh bg-paper grid place-items-center">
        <p className="font-serif italic text-clay/72">
          Phase 7 Chamber — under construction.
        </p>
      </div>
    </>
  )
}
