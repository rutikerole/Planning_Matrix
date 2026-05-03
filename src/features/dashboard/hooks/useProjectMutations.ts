import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProjectRow } from '@/types/db'
import type { ProjectListEntry } from './useProjects'

const LIST_KEY = ['projects', 'list'] as const

function patchListRow(
  client: ReturnType<typeof useQueryClient>,
  id: string,
  patch: Partial<ProjectRow>,
) {
  client.setQueryData<ProjectListEntry[]>(LIST_KEY, (prev) => {
    if (!prev) return prev
    return prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
  })
}

function removeListRow(
  client: ReturnType<typeof useQueryClient>,
  id: string,
) {
  client.setQueryData<ProjectListEntry[]>(LIST_KEY, (prev) => {
    if (!prev) return prev
    return prev.filter((p) => p.id !== id)
  })
}

/**
 * Mutations the dashboard row menu invokes. Each one optimistically
 * patches the project list cache and only rolls back if the round
 * trip fails. Export is purely client-side (no Supabase writes).
 */
export function useProjectMutations() {
  const queryClient = useQueryClient()

  const rename = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('empty-name')
      const { error } = await supabase
        .from('projects')
        .update({ name: trimmed })
        .eq('id', id)
      if (error) throw error
      return { id, name: trimmed }
    },
    onSuccess: ({ id, name }) => patchListRow(queryClient, id, { name }),
  })

  const setStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string
      status: ProjectRow['status']
    }) => {
      const { error } = await supabase
        .from('projects')
        .update({ status })
        .eq('id', id)
      if (error) throw error
      return { id, status }
    },
    onSuccess: ({ id, status }) => patchListRow(queryClient, id, { status }),
  })

  const remove = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      return { id }
    },
    onSuccess: ({ id }) => removeListRow(queryClient, id),
  })

  function exportProject(project: ProjectRow) {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const slug = project.name?.replace(/[^a-z0-9]+/gi, '-').toLowerCase() ?? project.id
    const link = document.createElement('a')
    link.href = url
    link.download = `${slug}-${project.id.slice(0, 8)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return { rename, setStatus, remove, exportProject }
}
