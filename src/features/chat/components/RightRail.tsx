import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { isAdminEmail } from '@/lib/cn-feature-flags'
import type {
  AreaState,
  Fact,
  ProjectState,
} from '@/types/projectState'
import type { ProjectRow } from '@/types/db'
import { Top3 } from './Top3'

interface Props {
  project: ProjectRow
}

/**
 * Right rail — "Was wir wissen". Top-3 next steps, A/B/C area states,
 * Eckdaten (top facts), and three collapsibles (Verfahren / Dokumente
 * / Fachplaner) which are empty in this commit and populate as the
 * model emits deltas in batch 4. CostTicker at the bottom is admin-
 * only (D3).
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
      <EckdatenPanel facts={facts} project={project} />

      <CollapsibleEmpty
        title={t('chat.rail.procedures')}
        emptyCopy={t('chat.rail.proceduresEmpty')}
      />
      <CollapsibleEmpty
        title={t('chat.rail.documents')}
        emptyCopy={t('chat.rail.documentsEmpty')}
      />
      <CollapsibleEmpty
        title={t('chat.rail.roles')}
        emptyCopy={t('chat.rail.rolesEmpty')}
      />

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
    <div className="flex flex-col gap-3">
      <p className="eyebrow text-foreground/60 text-[10px]">{t('chat.rail.areas')}</p>
      <ul className="flex flex-col gap-2">
        {(['A', 'B', 'C'] as const).map((key) => {
          const a = areas[key] ?? { state: 'PENDING' as AreaState }
          return (
            <li
              key={key}
              className="flex items-center gap-3 text-[12px]"
              title={a.reason ?? ''}
            >
              <AreaDot state={a.state} />
              <span className="font-mono text-[10px] text-ink/45 tabular-nums">{key}</span>
              <span className="text-ink/80">{t(`chat.areas.${key}`)}</span>
              <span className="ml-auto text-[10px] text-clay/75 uppercase tracking-[0.06em]">
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

// ── Eckdaten ────────────────────────────────────────────────────────

function EckdatenPanel({
  facts,
  project,
}: {
  facts: Fact[]
  project: ProjectRow
}) {
  const { t } = useTranslation()

  // Always surface intent + plot as derived "facts" even before the
  // model has extracted formal facts — they're known from the wizard.
  const derived: { key: string; value: string; qualifier: string }[] = [
    {
      key: t('chat.rail.intentLabel'),
      value: t(`wizard.q1.options.${project.intent}`),
      qualifier: 'CLIENT · DECIDED',
    },
  ]
  if (project.has_plot && project.plot_address) {
    derived.push({
      key: t('chat.rail.plotLabel'),
      value: project.plot_address,
      qualifier: 'CLIENT · DECIDED',
    })
  }

  const fromState = facts.map((f) => ({
    key: f.key,
    value: typeof f.value === 'string' ? f.value : JSON.stringify(f.value),
    qualifier: `${f.qualifier.source} · ${f.qualifier.quality}`,
  }))

  const all = [...derived, ...fromState].slice(0, 6)

  return (
    <div className="flex flex-col gap-3">
      <p className="eyebrow text-foreground/60 text-[10px]">{t('chat.rail.facts')}</p>
      <ul className="flex flex-col gap-2.5">
        {all.map((row, idx) => (
          <li key={`${row.key}-${idx}`} className="flex flex-col gap-0.5">
            <span className="text-[10px] text-clay/85 uppercase tracking-[0.06em]">
              {row.key}
            </span>
            <span className="text-[13px] text-ink/85 leading-snug break-words">
              {row.value}
            </span>
            <span className="text-[10px] text-ink/45 tabular-nums">{row.qualifier}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Collapsibles ────────────────────────────────────────────────────

function CollapsibleEmpty({
  title,
  emptyCopy,
}: {
  title: string
  emptyCopy: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center justify-between text-left text-[11px] tracking-[0.18em] uppercase font-medium text-foreground/60 hover:text-ink transition-colors duration-soft py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
      >
        <span>{title}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-3 text-ink/55 transition-transform duration-soft',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <p className="text-[12px] text-clay/70 italic leading-relaxed pt-2 pb-1">
          {emptyCopy}
        </p>
      )}
    </div>
  )
}

// ── Cost ticker ─────────────────────────────────────────────────────

function CostTicker({ projectState: _projectState }: { projectState: Partial<ProjectState> }) {
  const user = useAuthStore((s) => s.user)
  if (!isAdminEmail(user?.email)) return null

  // Cost numbers come from the most recent costInfo, which we'd need to
  // accumulate from useChatTurn responses. For #14 this is a placeholder
  // that confirms the gating works; the real running total ships with
  // useChatTurn in batch 4.
  return (
    <p className="text-[9px] text-clay/65 tabular-nums">
      ≈ 0 token used in this conversation
    </p>
  )
}

// suppress unused-locals when only the type position is used
export type _ChildNode = ReactNode
