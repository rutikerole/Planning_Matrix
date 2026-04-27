import type { ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useProject } from '@/features/chat/hooks/useProject'
import { AuthSkeleton } from '@/components/shared/AuthSkeleton'
import { ProjectNotFound } from '@/features/chat/pages/ProjectNotFound'

interface Props {
  children: ReactNode
}

/**
 * Route guard for /projects/:id. Verifies the project exists AND the
 * caller owns it; falls back to a calm ProjectNotFound page in either
 * failure case. The owner check is redundant with RLS (a non-owner
 * fetch returns null anyway) but cheap, explicit, and serves as
 * defense-in-depth.
 *
 * Loading state reuses the AuthSkeleton hairline pulse so the
 * dashboard → project transition flows visually without a different
 * loader showing up mid-route.
 */
export function ProjectGuard({ children }: Props) {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)
  const { data, isLoading, isError } = useProject(id ?? '')

  if (!id) return <ProjectNotFound />
  if (isLoading) return <AuthSkeleton />
  if (isError || !data) return <ProjectNotFound />
  if (!user?.id || data.owner_id !== user.id) return <ProjectNotFound />

  return <>{children}</>
}
