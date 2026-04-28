import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthSkeleton } from '@/components/shared/AuthSkeleton'
import { ProjectNotFound } from '@/features/chat/pages/ProjectNotFound'
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
  const { t } = useTranslation()
  const params = useParams<{ token: string }>()
  const token = params.token ?? ''
  const { data, isPending, isError } = useSharedProject(token)

  useEffect(() => {
    document.title = `${t('result.titlePrefix', { defaultValue: 'Briefing' })} · Planning Matrix`
  }, [t])

  if (isPending) return <AuthSkeleton />
  if (isError || !data) return <ProjectNotFound />

  return (
    <ResultPageBody
      project={data.project}
      messages={data.messages}
      events={data.events}
      source={{ kind: 'shared', expiresAt: data.expiresAt }}
    />
  )
}
