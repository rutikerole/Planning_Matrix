import { useQuery } from '@tanstack/react-query'
import { getSharedProject, type SharedProjectPayload } from '../lib/shareTokenApi'

/**
 * Phase 3.5 #65 — TanStack Query hook for the public share-view.
 *
 * Calls the get-shared-project Edge Function with the URL token,
 * caches under `['shared-project', token]`. Invalid/expired tokens
 * surface as `isError`; the TokenGuard component renders
 * ProjectNotFound in that branch.
 */
export function useSharedProject(token: string) {
  return useQuery<SharedProjectPayload>({
    queryKey: ['shared-project', token],
    queryFn: () => getSharedProject(token),
    enabled: token.length > 16,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
