import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { ProjectState } from '@/types/projectState'
import { verifyFact, type VerifyFactField } from '../lib/verifyFactClient'

interface ProjectRow {
  id: string
  name: string | null
  bundesland: string | null
  template_id: string | null
  state: ProjectState | null
  /**
   * v1.0.6 Phase A — projects.state_version (column + trigger added in
   * migration 0033). Sent as `expectedStateVersion` on verify-fact so
   * the Edge Function can refuse the UPDATE if a concurrent writer has
   * mutated state since this row was read. Optional in the type for
   * defense-in-depth: a row queried before migration 0033 lands would
   * have no column. Code below treats `undefined` as 0 (the column
   * default) which matches the trigger semantics.
   */
  state_version?: number
}

/**
 * Phase 13 Week 3 — VerificationPanel.
 *
 * Reads the project's full state (RLS-allowed via 0028 architect-read
 * policy), groups every qualifier-bearing entry by section
 * (Fakten / Empfehlungen / Verfahren / Dokumente / Rollen), and lets
 * the architect flip DESIGNER+ASSUMED → DESIGNER+VERIFIED via the
 * verify-fact Edge Function. Already-verified rows render greyed.
 *
 * Visual posture matches the Architect dashboard's austere atelier
 * mode — sharp corners, no shadows, mono-leaning headings, paper /
 * ink / clay tokens. Each row's "Bestätigen" CTA shows the locked
 * German copy from the user's spec.
 */
export function VerificationPanel() {
  const { projectId } = useParams<{ projectId: string }>()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [pendingNote, setPendingNote] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading, error: queryError } = useQuery<ProjectRow | null>({
    enabled: !!projectId && !!user,
    queryKey: ['architect-project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, bundesland, template_id, state, state_version')
        .eq('id', projectId!)
        .maybeSingle()
      if (error) throw error
      return (data as ProjectRow | null) ?? null
    },
    staleTime: 30_000,
  })

  // v1.0.6 Phase A — separate state for the conflict toast. The 409
  // path is fundamentally different from a generic error: we MUST
  // refetch (the local view is now stale) and we MUST show the
  // locked DE+EN copy. Generic errors stay in `error`.
  const [conflictToast, setConflictToast] = useState<boolean>(false)

  const verifyMutation = useMutation({
    mutationFn: async (args: { field: VerifyFactField; itemId: string; note?: string }) => {
      if (!projectId) throw new Error('no projectId')
      const result = await verifyFact({
        projectId,
        field: args.field,
        itemId: args.itemId,
        note: args.note,
        expectedStateVersion: data?.state_version,
      })
      return result
    },
    onSuccess: (result) => {
      if (result.ok) {
        void queryClient.invalidateQueries({ queryKey: ['architect-project', projectId] })
        return
      }
      // v1.0.6 — surface 409 distinctly. Refetch regardless of code so
      // a partially-stale local view doesn't keep stale qualifier
      // labels visible after a transient error either.
      void queryClient.invalidateQueries({ queryKey: ['architect-project', projectId] })
      if (result.error.code === 'state_conflict') {
        setConflictToast(true)
        setError(null)
      } else {
        setError(result.error.message)
        setConflictToast(false)
      }
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
      setConflictToast(false)
    },
  })

  const sections = useMemo(() => deriveSections(data?.state ?? null), [data])

  if (isLoading) {
    return (
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--ink))]/50">
        Lade Projektzustand …
      </p>
    )
  }
  if (queryError || !data) {
    return (
      <ErrorBanner
        message={
          queryError instanceof Error
            ? queryError.message
            : 'Projekt nicht gefunden oder Sie sind kein bestätigter Architekt.'
        }
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <header className="mb-6 border-b border-[hsl(var(--ink))]/10 pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--ink))]/45">
          Verifizierung
        </p>
        <h1 className="mt-1 text-2xl text-[hsl(var(--ink))]">
          {data.name ?? 'Unbenanntes Projekt'}
        </h1>
        <p className="mt-1 font-mono text-[11px] text-[hsl(var(--ink))]/55">
          {data.bundesland ?? '—'} · {data.template_id ?? '—'} ·{' '}
          {projectId?.slice(0, 8)}
        </p>
        <p className="mt-3 max-w-2xl text-sm text-[hsl(var(--ink))]/65">
          Jede markierte Festlegung ist derzeit nur „vorläufig" — das
          System hat sie als ASSUMED hinterlegt. Bestätigen Sie eine
          Zeile, wenn Sie sie auf Grundlage Ihrer Bauvorlageberechtigung
          freigeben können. Die Festlegung wird dann auf
          DESIGNER+VERIFIED gesetzt und der Bauherr sieht den
          „Vorläufig"-Hinweis nicht mehr.
        </p>
      </header>

      {conflictToast && (
        <div className="mb-4 border border-[hsl(var(--ink))]/40 bg-[hsl(var(--paper))] px-4 py-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/70">
            Konflikt · Conflict
          </p>
          <p className="mt-1 text-sm text-[hsl(var(--ink))]/85">
            Diese Festlegung wurde inzwischen geändert. Der Projektzustand
            wurde neu geladen — bitte erneut bestätigen.
          </p>
          <p className="mt-1 text-sm text-[hsl(var(--ink))]/55">
            This entry was modified by another caller in the meantime. The
            project state has been refreshed — please re-confirm.
          </p>
          <button
            type="button"
            onClick={() => setConflictToast(false)}
            className="mt-2 font-mono text-[11px] text-[hsl(var(--ink))]/45 hover:text-[hsl(var(--ink))]"
          >
            schließen
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-1 font-mono text-[11px] text-[hsl(var(--ink))]/45 hover:text-[hsl(var(--ink))]"
          >
            schließen
          </button>
        </div>
      )}

      {sections.map((section) => (
        <Section
          key={section.field}
          field={section.field}
          title={section.title}
          rows={section.rows}
          pendingNote={pendingNote}
          setPendingNote={setPendingNote}
          onVerify={(field, itemId, note) =>
            verifyMutation.mutate({ field, itemId, note })
          }
          isPending={verifyMutation.isPending}
        />
      ))}

      <p className="mt-6">
        <Link
          to="/architect"
          className="border-b border-[hsl(var(--ink))]/30 pb-0.5 font-mono text-[12px] text-[hsl(var(--ink))] hover:border-[hsl(var(--ink))]"
        >
          ← Zurück zur Übersicht
        </Link>
      </p>
    </div>
  )
}

interface SectionRow {
  itemId: string
  label: string
  detail: string | null
  source: string
  quality: string
  isVerified: boolean
}

interface SectionData {
  field: VerifyFactField
  title: string
  rows: SectionRow[]
}

function deriveSections(state: ProjectState | null): SectionData[] {
  if (!state) return []
  const facts = (state.facts ?? []).map((f) => ({
    itemId: f.key,
    label: f.key,
    detail: typeof f.value === 'object' ? JSON.stringify(f.value) : String(f.value ?? ''),
    source: f.qualifier?.source ?? '—',
    quality: f.qualifier?.quality ?? '—',
    isVerified:
      f.qualifier?.source === 'DESIGNER' && f.qualifier?.quality === 'VERIFIED',
  }))
  const recommendations = (state.recommendations ?? []).map((r) => ({
    itemId: r.id,
    label: r.title_de,
    detail: r.detail_de,
    source: r.qualifier?.source ?? '—',
    quality: r.qualifier?.quality ?? '—',
    isVerified:
      r.qualifier?.source === 'DESIGNER' && r.qualifier?.quality === 'VERIFIED',
  }))
  const procedures = (state.procedures ?? []).map((p) => ({
    itemId: p.id,
    label: p.title_de,
    detail: p.rationale_de,
    source: p.qualifier?.source ?? '—',
    quality: p.qualifier?.quality ?? '—',
    isVerified:
      p.qualifier?.source === 'DESIGNER' && p.qualifier?.quality === 'VERIFIED',
  }))
  const documents = (state.documents ?? []).map((d) => ({
    itemId: d.id,
    label: d.title_de,
    detail: null,
    source: d.qualifier?.source ?? '—',
    quality: d.qualifier?.quality ?? '—',
    isVerified:
      d.qualifier?.source === 'DESIGNER' && d.qualifier?.quality === 'VERIFIED',
  }))
  const roles = (state.roles ?? []).map((r) => ({
    itemId: r.id,
    label: r.title_de,
    detail: r.rationale_de,
    source: r.qualifier?.source ?? '—',
    quality: r.qualifier?.quality ?? '—',
    isVerified:
      r.qualifier?.source === 'DESIGNER' && r.qualifier?.quality === 'VERIFIED',
  }))
  return [
    { field: 'extracted_fact', title: 'Fakten', rows: facts },
    { field: 'recommendation', title: 'Empfehlungen', rows: recommendations },
    { field: 'procedure', title: 'Verfahren', rows: procedures },
    { field: 'document', title: 'Dokumente', rows: documents },
    { field: 'role', title: 'Rollen', rows: roles },
  ]
}

function Section({
  field,
  title,
  rows,
  pendingNote,
  setPendingNote,
  onVerify,
  isPending,
}: {
  field: VerifyFactField
  title: string
  rows: SectionRow[]
  pendingNote: Record<string, string>
  setPendingNote: React.Dispatch<React.SetStateAction<Record<string, string>>>
  onVerify: (field: VerifyFactField, itemId: string, note?: string) => void
  isPending: boolean
}) {
  if (rows.length === 0) return null
  return (
    <section className="mb-6 border border-[hsl(var(--ink))]/10">
      <header className="border-b border-[hsl(var(--ink))]/10 px-4 py-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55">
          {title}
        </p>
      </header>
      <ul>
        {rows.map((row) => {
          const noteKey = `${field}::${row.itemId}`
          const note = pendingNote[noteKey] ?? ''
          return (
            <li
              key={noteKey}
              className="border-b border-[hsl(var(--ink))]/5 px-4 py-3 last:border-b-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm tracking-tight text-[hsl(var(--ink))]">
                  {row.label}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/45">
                  {row.source} · {row.quality}
                </p>
              </div>
              {row.detail && (
                <p className="mt-1 text-[13px] text-[hsl(var(--ink))]/65">
                  {row.detail}
                </p>
              )}
              {row.isVerified ? (
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-700">
                  Bestätigt
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Notiz (optional)"
                    value={note}
                    onChange={(e) =>
                      setPendingNote((prev) => ({ ...prev, [noteKey]: e.target.value }))
                    }
                    className="min-w-[18rem] flex-1 border border-[hsl(var(--ink))]/15 bg-transparent px-2 py-1 font-mono text-[12px] text-[hsl(var(--ink))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ink))]/40"
                    maxLength={500}
                  />
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onVerify(field, row.itemId, note || undefined)}
                    className="border border-[hsl(var(--ink))] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))] hover:bg-[hsl(var(--ink))] hover:text-[hsl(var(--paper))] disabled:opacity-40"
                  >
                    {isPending ? 'verifiziere …' : 'Bestätigen'}
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
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
