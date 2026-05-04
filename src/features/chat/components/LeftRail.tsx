import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Wordmark } from '@/components/shared/Wordmark'
import type { AreaState } from '@/types/projectState'
import type { MessageRow, ProjectRow } from '@/types/db'
import { AutoSavedIndicator } from './AutoSavedIndicator'

interface Props {
  project: ProjectRow
  messages: MessageRow[]
}

const SPECIALIST_LABEL_KEYS: Record<string, string> = {
  moderator: 'chat.specialists.moderator',
  planungsrecht: 'chat.specialists.planungsrecht',
  bauordnungsrecht: 'chat.specialists.bauordnungsrecht',
  sonstige_vorgaben: 'chat.specialists.sonstige_vorgaben',
  verfahren: 'chat.specialists.verfahren',
  beteiligte: 'chat.specialists.beteiligte',
  synthesizer: 'chat.specialists.synthesizer',
}

const SPECIALIST_TO_GATE: Record<string, string> = {
  moderator: '00',
  planungsrecht: '41',
  bauordnungsrecht: '42',
  sonstige_vorgaben: '43',
  verfahren: '44',
  beteiligte: '30',
  synthesizer: '60',
}

/**
 * Phase 7 Pass 2 — left rail stripped of redundant noise.
 *
 *   Wordmark
 *   Project header (name + plot + auto-saved)
 *   ────
 *   Spec index (Roman numerals + sub-letters; per-gate vertical
 *               hairline progress; active gate gets 2 px clay
 *               left-border)
 *   ────
 *   ● BUILDING CODE · now           ← single line, one job
 *   …
 *   Fountain-pen footer
 *
 * The ProgressMeter (redundant with compass arc on top) and the
 * VerlaufMap journey-dot row (same redundancy) were removed in
 * Pass 2. The 7-line "At the table" specialist list collapsed to
 * a single line showing only who's currently speaking — the
 * compass arc shows the journey, this shows who's on stage.
 */
export function LeftRail({ project, messages }: Props) {
  let latestSpecialist: string | null = null
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'assistant' && m.specialist) {
      latestSpecialist = m.specialist
      break
    }
  }

  return (
    <div className="w-full flex flex-col px-5 py-7 gap-7">
      {/* Wordmark — desktop identity anchor. */}
      <Wordmark size="xs" />

      {/* Project header */}
      <div className="flex flex-col gap-1.5">
        <p
          className="font-serif text-[16px] text-ink leading-tight truncate"
          title={project.name}
        >
          {project.name.split('·')[0]?.trim() ?? project.name}
        </p>
        {project.plot_address && (
          <p
            className="font-serif italic text-[12px] text-clay leading-tight truncate"
            title={project.plot_address}
          >
            {project.plot_address}
          </p>
        )}
        <AutoSavedIndicator />
      </div>

      <span aria-hidden="true" className="block h-px bg-ink/15" />

      <SpecIndex project={project} latestSpecialist={latestSpecialist} />

      <span aria-hidden="true" className="block h-px bg-ink/12" />

      <CurrentSpecialist specialist={latestSpecialist} />

      <div className="flex-1" />

      <FountainPenFooter />
    </div>
  )
}

// ── Spec index ──────────────────────────────────────────────────────

type GateStateValue = AreaState

interface GateNode {
  id: string
  romanNumeral: string
  level: 0 | 1
  subLetter?: string
  derive: (project: ProjectRow) => GateStateValue
}

const GATES: GateNode[] = [
  { id: '00', romanNumeral: 'I', level: 0, derive: () => 'ACTIVE' },
  { id: '10', romanNumeral: 'II', level: 0, derive: () => 'ACTIVE' },
  { id: '20', romanNumeral: 'III', level: 0, derive: (p) => (p.has_plot ? 'ACTIVE' : 'VOID') },
  { id: '30', romanNumeral: 'IV', level: 0, derive: () => 'PENDING' },
  { id: '40', romanNumeral: 'V', level: 0, derive: () => 'PENDING' },
  { id: '41', romanNumeral: '', subLetter: 'a', level: 1, derive: (p) => readArea(p, 'A') },
  { id: '42', romanNumeral: '', subLetter: 'b', level: 1, derive: (p) => readArea(p, 'B') },
  { id: '43', romanNumeral: '', subLetter: 'c', level: 1, derive: (p) => readArea(p, 'C') },
  { id: '44', romanNumeral: '', subLetter: 'd', level: 1, derive: () => 'PENDING' },
  { id: '45', romanNumeral: '', subLetter: 'e', level: 1, derive: () => 'PENDING' },
  { id: '50', romanNumeral: 'VI', level: 0, derive: () => 'PENDING' },
  { id: '60', romanNumeral: 'VII', level: 0, derive: () => 'PENDING' },
]

function readArea(project: ProjectRow, key: 'A' | 'B' | 'C'): GateStateValue {
  const state = project.state as { areas?: { [k: string]: { state: AreaState } } }
  return state.areas?.[key]?.state ?? 'PENDING'
}

function SpecIndex({
  project,
  latestSpecialist,
}: {
  project: ProjectRow
  latestSpecialist: string | null
}) {
  const { t } = useTranslation()
  const activeGateId = latestSpecialist
    ? SPECIALIST_TO_GATE[latestSpecialist] ?? null
    : null

  return (
    <ul className="flex flex-col">
      {GATES.map((gate) => {
        const state = gate.derive(project)
        // Phase 7 Pass 2 — per-gate progress fill replaces the
        // trailing dot. ACTIVE = 100 %, PENDING = 30 %, VOID = 0 %.
        const fillPct =
          state === 'ACTIVE' ? 100 : state === 'PENDING' ? 30 : 0
        const isActive = gate.id === activeGateId

        return (
          <li key={gate.id}>
            <div
              className={cn(
                'relative flex items-center gap-3 py-1.5 text-[13px] cursor-default',
                'transition-[border-color,color,padding] duration-soft',
                gate.level === 1 ? 'pl-5' : 'pl-0',
                isActive
                  ? 'border-l-2 border-clay text-ink pl-3'
                  : gate.level === 1
                    ? 'text-ink/65 hover:text-ink/85'
                    : 'text-ink/85 hover:text-ink',
              )}
            >
              {gate.level === 0 ? (
                <span className="font-serif italic text-[11px] text-clay tabular-figures w-6 shrink-0">
                  {gate.romanNumeral}
                </span>
              ) : (
                <span className="font-serif italic text-[11px] text-ink/40 w-6 shrink-0">
                  {gate.subLetter}·
                </span>
              )}
              <span className="flex-1 truncate">
                {t(`chat.gates.${gate.id}`)}
              </span>
              {/* Per-gate vertical hairline progress indicator. */}
              <span
                aria-hidden="true"
                className="relative block w-px h-3.5 bg-hairline shrink-0 overflow-hidden"
              >
                <span
                  className="absolute inset-x-0 bottom-0 bg-clay transition-[height] duration-[600ms] ease-ease"
                  style={{ height: `${fillPct}%` }}
                />
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ── Current specialist (collapsed "At the table") ───────────────────

function CurrentSpecialist({ specialist }: { specialist: string | null }) {
  const { t } = useTranslation()
  if (!specialist) return null
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span
        aria-hidden="true"
        className="block w-1.5 h-1.5 rounded-full bg-clay pm-leftrail-pulse shrink-0"
      />
      <span className="font-mono text-[10.5px] tracking-[0.18em] uppercase text-ink leading-none">
        {t(SPECIALIST_LABEL_KEYS[specialist] ?? `chat.specialists.${specialist}`)}
      </span>
      <span className="font-serif italic text-[11px] text-ink-mute leading-none">
        · now
      </span>
      <style>{`
        @keyframes pmLeftRailPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.6; transform: scale(0.85); }
        }
        .pm-leftrail-pulse {
          animation: pmLeftRailPulse 1.4s cubic-bezier(0.32, 0.72, 0, 1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .pm-leftrail-pulse { animation: none; }
        }
      `}</style>
    </div>
  )
}

// ── Fountain pen + inkwell footer (unchanged) ───────────────────────

function FountainPenFooter() {
  return (
    <svg
      width="80"
      height="40"
      viewBox="0 0 80 40"
      fill="none"
      aria-hidden="true"
      className="text-drafting-blue/30 self-start mb-2"
    >
      {/* Inkwell */}
      <path
        d="M 8 30 L 8 22 L 6 22 L 6 19 L 18 19 L 18 22 L 16 22 L 16 30 Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Pen body */}
      <path
        d="M 18 21 L 60 17 L 70 13 L 68 11"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Pen nib */}
      <path
        d="M 70 13 L 75 14 L 73 9 Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Trailing ink line */}
      <path
        d="M 22 33 L 56 31"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeLinecap="round"
        strokeOpacity="0.7"
        className="pm-signature-shimmer"
      />
      <style>{`
        @keyframes pmSignatureShimmer {
          0%, 100% { stroke-opacity: 0.45; }
          50%      { stroke-opacity: 0.85; }
        }
        .pm-signature-shimmer { animation: pmSignatureShimmer 8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .pm-signature-shimmer { animation: none; stroke-opacity: 0.7; }
        }
      `}</style>
    </svg>
  )
}
