// Phase 7.6 §1.3 — debug panel.
//
// Shown only when the URL has `?debug=spine`. Prints (a) live
// useSpineStages output, (b) raw state.facts keys, (c) state.areas,
// (d) procedures/roles/recommendations counts, (e) currentSpecialist
// + currentTurn. Floating top-right; safe to leave in production —
// gated by URL param.
//
// Use this to ground-truth "the stages feel fake" complaints in 30s
// on the live preview.

import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ProjectRow, MessageRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import type { ResolvedSpineStage } from '../../../hooks/useSpineStages'
import type { ChamberProgress } from '../../../hooks/useChamberProgress'

interface Props {
  project: ProjectRow
  messages: MessageRow[]
  stages: ResolvedSpineStage[]
  progress: ChamberProgress
}

export function SpineDebugPanel({ project, messages, stages, progress }: Props) {
  const [params] = useSearchParams()
  const enabled = params.get('debug') === 'spine'

  const state = (project.state ?? {}) as Partial<ProjectState>
  const factKeys = useMemo(
    () => (state.facts ?? []).map((f) => f.key),
    [state.facts],
  )
  const areas = useMemo(
    () =>
      state.areas ?? {
        A: { state: 'PENDING' as const },
        B: { state: 'PENDING' as const },
        C: { state: 'PENDING' as const },
      },
    [state.areas],
  )
  const counts = useMemo(
    () => ({
      facts: state.facts?.length ?? 0,
      procedures: state.procedures?.length ?? 0,
      documents: state.documents?.length ?? 0,
      roles: state.roles?.length ?? 0,
      recommendations: state.recommendations?.length ?? 0,
      messages: messages.length,
      assistants: messages.filter((m) => m.role === 'assistant').length,
    }),
    [
      state.facts?.length,
      state.procedures?.length,
      state.documents?.length,
      state.roles?.length,
      state.recommendations?.length,
      messages,
    ],
  )

  // Echo to console.table for copy-paste.
  useEffect(() => {
    if (!enabled) return
    console.groupCollapsed('%c[spine debug]', 'color:#7a5232; font-weight:600')
    console.log('progress', progress)
    console.log('counts', counts)
    console.log('areas', areas)
    console.log('factKeys', factKeys)
    console.table(stages.map((s) => ({
      idx: s.index,
      id: s.id,
      status: s.status,
      title: s.title,
      snippet: s.snippet,
      firstMsgIdx: s.firstMessageIndex,
    })))
    console.groupEnd()
  }, [enabled, stages, progress, factKeys, counts, areas])

  if (!enabled) return null

  return (
    <aside
      role="complementary"
      aria-label="Spine debug panel"
      className="fixed top-14 right-4 z-[60] w-[340px] max-h-[80vh] overflow-y-auto bg-paper border border-clay/40 rounded-md shadow-[0_10px_36px_-8px_rgba(26,22,18,0.32)] p-3 font-mono text-[11px] leading-tight"
    >
      <header className="flex items-baseline justify-between mb-2">
        <p className="text-[10px] uppercase tracking-[0.18em] text-clay-deep font-medium">
          spine debug
        </p>
        <a
          href={window.location.pathname}
          className="text-[10px] text-clay/72 hover:text-clay underline"
        >
          close
        </a>
      </header>

      <Section title="progress">
        <KV label="percent" value={`${progress.percent}%`} />
        <KV label="currentTurn" value={String(progress.currentTurn)} />
        <KV label="totalEstimate" value={String(progress.totalEstimate)} />
        <KV label="recentSpecialist" value={progress.recentSpecialist ?? 'null'} />
        <KV label="currentStageId" value={progress.currentStageId ?? 'null'} />
        <KV label="isReadyForReview" value={String(progress.isReadyForReview)} />
      </Section>

      <Section title="counts">
        {Object.entries(counts).map(([k, v]) => (
          <KV key={k} label={k} value={String(v)} />
        ))}
      </Section>

      <Section title="areas">
        {(['A', 'B', 'C'] as const).map((k) => (
          <KV key={k} label={k} value={areas[k]?.state ?? 'PENDING'} />
        ))}
      </Section>

      <Section title="factKeys">
        {factKeys.length === 0 ? (
          <p className="text-clay/60 italic">— empty —</p>
        ) : (
          <ul className="space-y-0.5">
            {factKeys.map((k, i) => (
              <li key={i} className="text-ink/80 break-all">
                {k}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="stages">
        <table className="w-full text-[10.5px]">
          <thead>
            <tr className="text-clay/72 text-left">
              <th className="font-normal pr-1">#</th>
              <th className="font-normal pr-1">id</th>
              <th className="font-normal">status</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((s) => (
              <tr key={s.id}>
                <td className="text-ink/60 pr-1">{s.index}</td>
                <td className="text-ink/85 pr-1 break-all">{s.id}</td>
                <td className={statusColor(s.status)}>{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </aside>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-2.5 pb-2 border-b border-[var(--hairline,rgba(26,22,18,0.10))] last:border-0 last:pb-0 last:mb-0">
      <p className="text-[9px] uppercase tracking-[0.16em] text-clay/72 mb-1">
        {title}
      </p>
      <div className="text-ink/85">{children}</div>
    </section>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-clay/72">{label}</span>
      <span className="text-ink tabular-nums break-all text-right">{value}</span>
    </div>
  )
}

function statusColor(status: string): string {
  if (status === 'live') return 'text-clay font-medium'
  if (status === 'done') return 'text-clay/55'
  if (status === 'next') return 'text-ink/65'
  return 'text-ink/35'
}
