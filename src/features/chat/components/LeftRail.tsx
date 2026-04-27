import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { AreaState } from '@/types/projectState'
import type { MessageRow, ProjectRow } from '@/types/db'

interface Props {
  project: ProjectRow
  messages: MessageRow[]
}

/**
 * Left rail — "Verlauf". Project header at the top, then a vertical
 * list of gates as a navigation map (informational in v1; gate routes
 * land in batch 4+). Below that, "Am Tisch" auto-detected from the
 * last 6 assistant turns. Footer link returns to the dashboard.
 *
 * Gates are styled identically to landing-page eyebrows + hairline
 * dividers — single-source vocabulary.
 */
export function LeftRail({ project, messages }: Props) {
  const { t } = useTranslation()

  return (
    <div className="w-full flex flex-col px-5 py-7 gap-7">
      {/* Project header */}
      <div className="flex flex-col gap-1">
        <p
          className="text-[14px] font-medium text-ink leading-tight truncate"
          title={project.name}
        >
          {project.name}
        </p>
        {project.plot_address && (
          <p
            className="text-[12px] text-clay/85 leading-tight truncate"
            title={project.plot_address}
          >
            {project.plot_address}
          </p>
        )}
      </div>

      <span aria-hidden="true" className="block h-px bg-border-strong/35" />

      {/* Gates */}
      <GateList project={project} />

      <span aria-hidden="true" className="block h-px bg-border-strong/30" />

      {/* Am Tisch */}
      <SpecialistsAtTheTable messages={messages} />

      <div className="flex-1" />

      {/* Footer */}
      <Link
        to="/dashboard"
        className="text-[12px] text-clay/85 hover:text-ink transition-colors duration-soft underline-offset-4 hover:underline decoration-clay/55 self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
      >
        ← {t('chat.leaveProject')}
      </Link>
    </div>
  )
}

// ── Gates ───────────────────────────────────────────────────────────

type GateState = AreaState

interface GateNode {
  id: string
  level: 0 | 1
  derive: (project: ProjectRow) => GateState
}

const GATES: GateNode[] = [
  { id: '00', level: 0, derive: () => 'ACTIVE' },
  { id: '10', level: 0, derive: () => 'ACTIVE' },
  {
    id: '20',
    level: 0,
    derive: (p) => (p.has_plot ? 'ACTIVE' : 'VOID'),
  },
  { id: '30', level: 0, derive: () => 'PENDING' },
  { id: '40', level: 0, derive: () => 'PENDING' },
  {
    id: '41',
    level: 1,
    derive: (p) => readArea(p, 'A'),
  },
  {
    id: '42',
    level: 1,
    derive: (p) => readArea(p, 'B'),
  },
  {
    id: '43',
    level: 1,
    derive: (p) => readArea(p, 'C'),
  },
  { id: '44', level: 1, derive: () => 'PENDING' },
  { id: '45', level: 1, derive: () => 'PENDING' },
  { id: '50', level: 0, derive: () => 'PENDING' },
  { id: '60', level: 0, derive: () => 'PENDING' },
]

function readArea(project: ProjectRow, key: 'A' | 'B' | 'C'): GateState {
  const state = project.state as { areas?: { [k: string]: { state: AreaState } } }
  return state.areas?.[key]?.state ?? 'PENDING'
}

function GateList({ project }: { project: ProjectRow }) {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-col">
      {GATES.map((gate) => {
        const state = gate.derive(project)
        return (
          <li key={gate.id}>
            <div
              className={cn(
                'flex items-center gap-2.5 py-1.5 text-[13px] text-ink/80 hover:text-ink transition-colors duration-soft cursor-default rounded-sm',
                gate.level === 1 && 'pl-5 text-ink/65 hover:text-ink/85',
              )}
            >
              <GateMarker state={state} />
              <span className="font-mono text-[10px] tracking-tight text-ink/45 tabular-nums">
                {gate.id}
              </span>
              <span className="truncate">{t(`chat.gates.${gate.id}`)}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function GateMarker({ state }: { state: GateState }) {
  if (state === 'ACTIVE') {
    return <span aria-label="aktiv" className="block size-1.5 rounded-full bg-clay shrink-0" />
  }
  if (state === 'VOID') {
    return (
      <span
        aria-label="nicht ermittelbar"
        className="block h-px w-1.5 bg-border-strong/55 shrink-0"
      />
    )
  }
  return (
    <span
      aria-label="ausstehend"
      className="block size-1.5 rounded-full border border-clay/45 shrink-0"
    />
  )
}

// ── Am Tisch ────────────────────────────────────────────────────────

const SPECIALIST_LABEL_KEYS: Record<string, string> = {
  moderator: 'chat.specialists.moderator',
  planungsrecht: 'chat.specialists.planungsrecht',
  bauordnungsrecht: 'chat.specialists.bauordnungsrecht',
  sonstige_vorgaben: 'chat.specialists.sonstige_vorgaben',
  verfahren: 'chat.specialists.verfahren',
  beteiligte: 'chat.specialists.beteiligte',
  synthesizer: 'chat.specialists.synthesizer',
}

function SpecialistsAtTheTable({ messages }: { messages: MessageRow[] }) {
  const { t } = useTranslation()

  // Last 6 assistant specialists, deduped, most recent first.
  const recent = messages
    .filter((m) => m.role === 'assistant' && m.specialist)
    .slice(-6)
    .reverse()
  const seen = new Set<string>()
  const unique: string[] = []
  for (const m of recent) {
    if (m.specialist && !seen.has(m.specialist)) {
      seen.add(m.specialist)
      unique.push(m.specialist)
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="eyebrow text-foreground/60 text-[10px]">{t('chat.atTheTable')}</p>
      {unique.length === 0 ? (
        <p className="text-[12px] text-clay/70 italic leading-relaxed">
          {t('chat.atTheTableEmpty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {unique.map((spec) => (
            <li key={spec} className="flex items-center gap-2 text-[12px]">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-clay shrink-0" />
              <span className="uppercase tracking-[0.04em] text-ink/75">
                {t(SPECIALIST_LABEL_KEYS[spec] ?? `chat.specialists.${spec}`)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
