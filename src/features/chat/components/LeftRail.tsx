import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Wordmark } from '@/components/shared/Wordmark'
import type { AreaState } from '@/types/projectState'
import type { MessageRow, ProjectRow } from '@/types/db'
import { SpecialistSigil } from './SpecialistSigils'
import { ProgressMeter } from './ProgressMeter'

interface Props {
  project: ProjectRow
  messages: MessageRow[]
}

/**
 * Phase 3.2 #41 — left rail rebuilt as project specification index.
 *
 * Roman numeral chapter labels, sub-letter sub-items (V.a / V.b / V.c),
 * state indicators on the right (filled clay = active, hairline = pending,
 * faded slash = void). Reads like the spec index of a thick architectural
 * binder.
 *
 * "Am Tisch" specialist list reuses the SpecialistSigil glyphs (#38) and
 * adds a tabular turn-count per specialist — small Instrument Serif italic
 * 10 clay numeral on the right of each row. Fountain pen + inkwell SVG
 * anchors the bottom of the rail as the "signature line."
 */
export function LeftRail({ project, messages }: Props) {
  const { t } = useTranslation()

  return (
    <div className="w-full flex flex-col px-5 py-7 gap-7">
      {/* Phase 3.3 #50 — wordmark anchored at the top of the rail as a
       * persistent identity anchor. Desktop only (mobile keeps the
       * folded-paper-tab triggers + title-block centre). */}
      <Wordmark size="xs" />

      {/* Project header */}
      <div className="flex flex-col gap-1.5">
        <p className="font-serif text-[16px] text-ink leading-tight truncate" title={project.name}>
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
      </div>

      <span aria-hidden="true" className="block h-px bg-ink/15" />

      {/* Roman-numeral spec index */}
      <SpecIndex project={project} />

      <span aria-hidden="true" className="block h-px bg-ink/12" />

      {/* Phase 3.4 #53 — progress meter */}
      <ProgressMeter />

      <span aria-hidden="true" className="block h-px bg-ink/12" />

      {/* Am Tisch */}
      <SpecialistsAtTheTable messages={messages} />

      <div className="flex-1" />

      {/* Fountain-pen + inkwell footer signature */}
      <FountainPenFooter />

      <Link
        to="/dashboard"
        className="text-[12px] text-clay/85 hover:text-ink transition-colors duration-soft underline-offset-4 hover:underline decoration-clay/55 self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
      >
        ← {t('chat.leaveProject')}
      </Link>
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

function SpecIndex({ project }: { project: ProjectRow }) {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-col">
      {GATES.map((gate) => {
        const state = gate.derive(project)
        return (
          <li key={gate.id}>
            <div
              className={cn(
                'flex items-center gap-3 py-1.5 text-[13px] text-ink/85 hover:text-ink transition-colors duration-soft cursor-default',
                gate.level === 1 && 'pl-5 text-ink/65 hover:text-ink/85',
              )}
            >
              {/* Roman numeral or sub-letter prefix */}
              {gate.level === 0 ? (
                <span className="font-serif italic text-[11px] text-clay tabular-figures w-6 shrink-0">
                  {gate.romanNumeral}
                </span>
              ) : (
                <span className="font-serif italic text-[11px] text-ink/40 w-6 shrink-0">
                  {gate.subLetter}·
                </span>
              )}
              <span className="flex-1 truncate">{t(`chat.gates.${gate.id}`)}</span>
              <GateStateMarker state={state} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function GateStateMarker({ state }: { state: GateStateValue }) {
  if (state === 'ACTIVE') {
    return <span aria-label="aktiv" className="block size-1.5 rounded-full bg-clay shrink-0" />
  }
  if (state === 'VOID') {
    return (
      <span aria-label="nicht ermittelbar" className="block h-px w-2 bg-ink/30 shrink-0" />
    )
  }
  return (
    <span
      aria-label="ausstehend"
      className="block size-1.5 rounded-full border border-clay/50 shrink-0"
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

  // Count per-specialist turns; preserve order by most-recent appearance.
  const order: string[] = []
  const counts = new Map<string, number>()
  const sortedRecent = messages.filter((m) => m.role === 'assistant' && m.specialist)
  for (const m of sortedRecent) {
    const s = m.specialist!
    if (!counts.has(s)) order.unshift(s)
    counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  // Take last 6 distinct specialists by recency.
  const distinctRecent = [...new Set(sortedRecent.slice(-6).reverse().map((m) => m.specialist!))]

  // Identify the currently-speaking specialist (the latest assistant turn).
  const latest = sortedRecent[sortedRecent.length - 1]?.specialist ?? null

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-foreground/60">
        {t('chat.atTheTable')}
      </p>
      {distinctRecent.length === 0 ? (
        <p className="font-serif italic text-[12px] text-clay/70 leading-relaxed">
          {t('chat.atTheTableEmpty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {distinctRecent.map((spec) => {
            const turns = counts.get(spec) ?? 0
            const isActive = spec === latest
            return (
              <li
                key={spec}
                className="flex items-center gap-2.5 text-[12px]"
              >
                <SpecialistSigil specialist={spec} className="text-drafting-blue/75" />
                <span
                  className={cn(
                    'uppercase tracking-[0.04em] flex-1 truncate transition-colors duration-soft',
                    isActive ? 'text-ink' : 'text-ink/65',
                  )}
                >
                  {t(SPECIALIST_LABEL_KEYS[spec] ?? `chat.specialists.${spec}`)}
                </span>
                <span className="font-serif italic text-[10px] text-clay tabular-figures">
                  {turns}
                </span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute h-px bg-drafting-blue/60"
                    style={{ left: 0, right: 0, bottom: -2, marginInline: '0 4rem' }}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Fountain pen + inkwell footer ───────────────────────────────────

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
      {/* Inkwell (squat trapezoid with neck) */}
      <path
        d="M 8 30 L 8 22 L 6 22 L 6 19 L 18 19 L 18 22 L 16 22 L 16 30 Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Pen body — from inkwell rim across the page */}
      <path
        d="M 18 21 L 60 17 L 70 13 L 68 11"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Pen nib triangle */}
      <path
        d="M 70 13 L 75 14 L 73 9 Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Tiny ink line trailing off — suggests writing.
       * Phase 3.2 #46: signature shimmer — a slow opacity pulse on the
       * trailing ink line so the rail's "signature line" feels alive
       * even when the workspace is still. Reduced-motion: static. */}
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
