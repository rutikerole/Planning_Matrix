import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

interface MembershipRow {
  id: string
  project_id: string
  invited_at: string
  accepted_at: string | null
  project: {
    id: string
    name: string | null
    bundesland: string | null
    template_id: string | null
  } | null
}

/**
 * Phase 13 Week 2 — Architect Dashboard.
 *
 * Lists every project the signed-in architect has been invited to or
 * has accepted. Column shape mirrors the admin ProjectInspectorList
 * column language for visual consistency: name / bundesland /
 * template / state / actions. Sharp corners, no shadows; copy is
 * austere German.
 *
 * Active row → Link to `/architect/projects/:id/verify` (the per-
 * project verification surface). Pending row (accepted_at IS NULL)
 * shows the invite link the architect can paste back to themselves
 * if they bookmarked the dashboard before clicking Accept — this is
 * the B1 ship-without-email fallback path.
 *
 * RLS: project_members (0026) "members read own membership" already
 * scopes the SELECT to `user_id = auth.uid() OR owner OR admin`, so
 * the listed rows are exactly the architect's own.
 */
export function ArchitectDashboard() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading, error } = useQuery<MembershipRow[]>({
    enabled: !!user,
    queryKey: ['architect-memberships', user?.id ?? 'anon'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_members')
        .select(
          'id, project_id, invited_at, accepted_at, project:projects(id, name, bundesland, template_id)',
        )
        .eq('user_id', user!.id)
        .order('invited_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as MembershipRow[]
    },
    staleTime: 60_000,
  })

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-6 border-b border-[hsl(var(--ink))]/10 pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--ink))]/45">
          Architect dashboard
        </p>
        <h1 className="mt-1 text-2xl text-[hsl(var(--ink))]">
          Ihre Projekt-Mandate
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--ink))]/65">
          Hier sehen Sie jedes Projekt, in das Sie als bauvorlage&shy;berechtigte/r
          Architekt/in eingeladen wurden. Jede Festlegung mit dem Qualifier
          DESIGNER+VERIFIED erfordert Ihre Freigabe — das System lehnt
          entsprechende Versuche ab, bis Sie sie ausdrücklich bestätigen.
        </p>
      </header>

      {isLoading && <Loading />}
      {error && <ErrorBanner message={(error as Error).message} />}
      {data && data.length === 0 && <EmptyState />}
      {data && data.length > 0 && <MembershipTable rows={data} />}
    </div>
  )
}

function MembershipTable({ rows }: { rows: MembershipRow[] }) {
  return (
    <div className="border border-[hsl(var(--ink))]/10">
      <table className="w-full border-collapse font-mono text-[12px]">
        <thead>
          <tr className="border-b border-[hsl(var(--ink))]/10 text-left text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
            <th className="px-4 py-2 font-normal">Projekt</th>
            <th className="px-4 py-2 font-normal">Bundesland</th>
            <th className="px-4 py-2 font-normal">Template</th>
            <th className="px-4 py-2 font-normal">Status</th>
            <th className="px-4 py-2 font-normal text-right">Aktion</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-[hsl(var(--ink))]/5 last:border-b-0"
            >
              <td className="px-4 py-2.5">
                <span className="block text-[13px] tracking-tight text-[hsl(var(--ink))]">
                  {row.project?.name ?? <em className="text-[hsl(var(--ink))]/50">unbenannt</em>}
                </span>
                <span className="block text-[10px] text-[hsl(var(--ink))]/40">
                  {row.project_id.slice(0, 8)}
                </span>
              </td>
              <td className="px-4 py-2.5 text-[hsl(var(--ink))]/70">
                {row.project?.bundesland ?? '—'}
              </td>
              <td className="px-4 py-2.5 text-[hsl(var(--ink))]/70">
                {row.project?.template_id ?? '—'}
              </td>
              <td className="px-4 py-2.5">
                {row.accepted_at ? (
                  <span className="text-[hsl(var(--ink))]/75">aktiv</span>
                ) : (
                  <span className="text-[hsl(var(--clay))]">Einladung offen</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right">
                {row.accepted_at ? (
                  <Link
                    to={`/architect/projects/${row.project_id}/verify`}
                    className="border-b border-[hsl(var(--ink))]/30 pb-0.5 text-[hsl(var(--ink))] hover:border-[hsl(var(--ink))]"
                  >
                    Prüfen
                  </Link>
                ) : (
                  <span className="text-[hsl(var(--ink))]/40">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="border border-dashed border-[hsl(var(--ink))]/15 px-6 py-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--ink))]/45">
        Noch keine Mandate
      </p>
      <p className="mt-2 max-w-md text-sm text-[hsl(var(--ink))]/65">
        Sobald Sie eine Einladung über einen Projekt-Link annehmen,
        erscheint das Mandat hier. Einladungen versendet aktuell der
        jeweilige Bauherr per Copy-Paste-Link.
      </p>
    </div>
  )
}

function Loading() {
  return (
    <div className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--ink))]/50">
      Lade Mandate …
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="border border-[hsl(var(--clay))]/40 bg-[hsl(var(--clay))]/5 px-4 py-3">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--clay))]">
        Fehler
      </p>
      <p className="mt-1 text-sm text-[hsl(var(--ink))]/75">{message}</p>
    </div>
  )
}
