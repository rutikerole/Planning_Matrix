import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { isAdminEmail } from '@/lib/cn-feature-flags'
import type { AreaState, ProjectState } from '@/types/projectState'
import type { ProjectRow } from '@/types/db'
import { Top3 } from './Top3'
import { ProceduresPanel } from './ProceduresPanel'
import { DocumentsPanel } from './DocumentsPanel'
import { RolesPanel } from './RolesPanel'
import { EckdatenPanel } from './EckdatenPanel'

interface Props {
  project: ProjectRow
}

/**
 * Right rail — "Was wir wissen". Top-3 (#20) + Areas + Eckdaten (#22)
 * + Procedures / Documents / Roles panels (#21) + CostTicker. Dossier
 * register per Polish Move 3.
 */
export function RightRail({ project }: Props) {
  const { t } = useTranslation()
  const state = (project.state ?? {}) as Partial<ProjectState>
  const recommendations = state.recommendations ?? []
  const facts = (state.facts ?? []).slice(-5).reverse()

  return (
    <div className="w-full flex flex-col px-5 py-7 gap-8">
      <Top3 recommendations={recommendations} />
      <AreasPanel state={state} />
      <EckdatenPanel project={project} facts={facts} />

      <ProceduresPanel procedures={state.procedures ?? []} />
      <DocumentsPanel documents={state.documents ?? []} />
      <RolesPanel roles={state.roles ?? []} />

      <div className="flex-1" />

      <button
        type="button"
        disabled
        className="text-[12px] text-clay/65 hover:text-ink underline underline-offset-4 decoration-clay/55 self-start cursor-not-allowed disabled:opacity-70"
      >
        {t('chat.rail.openOverview')}
      </button>

      <CostTicker projectState={state} />
    </div>
  )
}

// ── Areas ───────────────────────────────────────────────────────────

function AreasPanel({ state }: { state: Partial<ProjectState> }) {
  const { t } = useTranslation()
  const areas = state.areas ?? {
    A: { state: 'PENDING' as AreaState },
    B: { state: 'PENDING' as AreaState },
    C: { state: 'PENDING' as AreaState },
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border/40 pt-6">
      <p className="eyebrow text-foreground/60 text-[10px] tracking-[0.18em]">
        {t('chat.rail.areas')}
      </p>
      <ul className="flex flex-col gap-2.5">
        {(['A', 'B', 'C'] as const).map((key) => {
          const a = areas[key] ?? { state: 'PENDING' as AreaState }
          return (
            <li
              key={key}
              className="flex items-center gap-3 text-[12px] py-1"
              title={a.reason ?? ''}
            >
              <AreaDot state={a.state} />
              <span className="font-mono text-[10px] text-ink/45 tabular-nums">{key}</span>
              <span className="text-ink/85">{t(`chat.areas.${key}`)}</span>
              <span
                className={
                  a.state === 'VOID'
                    ? 'ml-auto text-[10px] uppercase tracking-[0.16em] text-ink/30 line-through'
                    : a.state === 'ACTIVE'
                      ? 'ml-auto text-[10px] uppercase tracking-[0.16em] text-clay'
                      : 'ml-auto text-[10px] uppercase tracking-[0.16em] text-clay/60'
                }
              >
                {t(`chat.areas.state.${a.state.toLowerCase()}`)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function AreaDot({ state }: { state: AreaState }) {
  if (state === 'ACTIVE') {
    return <span className="block size-1.5 rounded-full bg-clay shrink-0" aria-hidden="true" />
  }
  if (state === 'VOID') {
    return <span className="block h-px w-1.5 bg-border-strong/55 shrink-0" aria-hidden="true" />
  }
  return (
    <span
      className="block size-1.5 rounded-full border border-clay/45 shrink-0"
      aria-hidden="true"
    />
  )
}

// ── Cost ticker ─────────────────────────────────────────────────────

function CostTicker({ projectState: _projectState }: { projectState: Partial<ProjectState> }) {
  const user = useAuthStore((s) => s.user)
  if (!isAdminEmail(user?.email)) return null
  // Real running total + breakdown tooltip in #28; this remains a
  // placeholder confirming the admin gate works.
  return (
    <p className="text-[9px] text-clay/65 tabular-nums italic text-right">
      ≈ 0 Tokens · 0,00 USD
    </p>
  )
}
