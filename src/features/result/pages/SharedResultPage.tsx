import { useParams } from 'react-router-dom'
import { SEO } from '@/components/SEO'
import { AuthSkeleton } from '@/components/shared/AuthSkeleton'
import { ProjectNotFound } from '@/components/shared/ProjectNotFound'
import { useSharedProject } from '../hooks/useSharedProject'
import { ResultPageBody } from './ResultPage'

/**
 * Phase 3.5 #65 — public read-only result page mounted at
 * `/result/share/:token`. Calls the get-shared-project Edge Function
 * with the URL token, then renders the same ResultPageBody with
 * source.kind === 'shared'. No auth required.
 *
 * Invalid / expired / revoked tokens render the existing
 * ProjectNotFound page (404 register), preserving the same calm 404
 * behaviour the rest of the product uses.
 */
export function SharedResultPage() {
  const params = useParams<{ token: string }>()
  const token = params.token ?? ''
  const { data, isPending, isError } = useSharedProject(token)

  if (isPending) return <AuthSkeleton />
  if (isError || !data) return <ProjectNotFound />

  return (
    <>
      <SEO
        titleKey="seo.title.share"
        descriptionKey="seo.description.share"
        params={{ name: data.project.name }}
      />
      <ResultPageBody
        project={data.project}
        messages={data.messages}
        events={data.events}
        source={{ kind: 'shared', expiresAt: data.expiresAt }}
      />
    </>
  )
}
