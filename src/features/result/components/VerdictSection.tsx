import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'

interface Props {
  project: ProjectRow
  /** When `kind === 'shared'`, the back-to-chat CTA is hidden. */
  source?: { kind: 'owned' } | { kind: 'shared'; expiresAt: string }
}

/**
 * Phase 3.5 #60 — Section II: das Verfahren.
 *
 * The single most important sentence in the whole page — the procedure
 * type determination as a hero statement. Pulls the highest-priority
 * required procedure from `project.state.procedures` and renders its
 * title + the cited article reference at hero scale.
 *
 * Empty state: when no procedures are present yet, render a calm
 * interstitial pointing the user back to chat.
 *
 * The full 240×240 confidence radial mounts here in #63; for #60 we
 * render a small text-only confidence note.
 */
export function VerdictSection({ project, source }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const params = useParams<{ id: string }>()
  const projectId = params.id ?? project.id
  const isShared = source?.kind === 'shared'
  const state = (project.state ?? {}) as Partial<ProjectState>
  const procedures = state.procedures ?? []

  // Prefer the first `erforderlich` procedure (these are the
  // procedures the project actually has to clear); fall back to
  // first-present if none required yet.
  const primary =
    procedures.find((p) => p.status === 'erforderlich') ?? procedures[0]

  return (
    <section
      id="sec-verfahren"
      className="px-6 sm:px-12 lg:px-20 py-20 sm:py-24 max-w-3xl mx-auto w-full scroll-mt-16 flex flex-col gap-7"
      aria-labelledby="verdict-heading"
    >
      <header className="flex items-baseline gap-4">
        <span className="font-serif italic text-[20px] text-clay-deep tabular-figures leading-none w-10 shrink-0">
          II
        </span>
        <span className="text-[10px] uppercase tracking-[0.22em] font-medium text-foreground/65">
          {t('result.verdict.eyebrow', { defaultValue: 'Das Verfahren' })}
        </span>
      </header>

      <span aria-hidden="true" className="block h-px w-12 bg-ink/20" />

      {primary ? (
        <div className="flex flex-col gap-5">
          <h2
            id="verdict-heading"
            className="font-display text-[clamp(36px,5.5vw,56px)] text-ink leading-[1.05] -tracking-[0.022em]"
          >
            {lang === 'en' ? primary.title_en : primary.title_de}
          </h2>
          <p className="font-display text-[clamp(20px,3vw,32px)] text-ink/85 leading-tight italic">
            {/* Article reference is captured in rationale — surface a
             * small helper line here while we await the schema's
             * dedicated `article_reference` field (Phase 4). */}
            {(lang === 'en' ? primary.rationale_en : primary.rationale_de) ?? ''}
          </p>

          <span aria-hidden="true" className="block h-px w-16 bg-clay/55 my-3" />

          <p className="text-[16px] text-ink/85 leading-[1.65] max-w-2xl">
            {t('result.verdict.basisIntro', {
              defaultValue: 'Diese Einordnung basiert auf:',
            })}{' '}
            {/* Render the determining factors from the LEGAL-source facts. */}
            <DeterminingFactors state={state} />
          </p>

          <p className="text-[12px] text-clay/85 italic mt-2">
            {t('result.verdict.confidenceLine', {
              defaultValue: 'Sicherheit der Einordnung:',
            })}{' '}
            <span className="font-serif italic text-clay-deep tabular-figures">
              {estimateInlineConfidence(state)} %
            </span>
          </p>
        </div>
      ) : (
        <EmptyVerdict isShared={isShared} projectId={projectId} t={t} />
      )}
    </section>
  )
}

function DeterminingFactors({ state }: { state: Partial<ProjectState> }) {
  const facts = (state.facts ?? []).filter(
    (f) => f.qualifier?.source === 'LEGAL' || f.qualifier?.quality === 'CALCULATED',
  )
  if (facts.length === 0) {
    return <span className="text-ink/60 italic">—</span>
  }
  // Render up to 4 factors as a sentence with ` · ` separators.
  return (
    <span>
      {facts.slice(0, 4).map((f, idx) => {
        const label =
          typeof f.value === 'string'
            ? f.value
            : `${f.key}: ${JSON.stringify(f.value)}`
        return (
          <span key={f.key}>
            {idx > 0 && <span aria-hidden="true" className="text-ink/40 mx-2">·</span>}
            <span className="text-ink">{label}</span>
          </span>
        )
      })}
    </span>
  )
}

/**
 * Inline confidence stub for #60. Returns a crude 0-100 score from the
 * fact qualifier mix (DECIDED / CALCULATED / VERIFIED count toward
 * confidence; ASSUMED counts against). Replaced by the full radial
 * algorithm in #63.
 */
function estimateInlineConfidence(state: Partial<ProjectState>): number {
  const facts = state.facts ?? []
  if (facts.length === 0) return 50
  let score = 0
  facts.forEach((f) => {
    const q = f.qualifier?.quality
    if (q === 'DECIDED') score += 4
    else if (q === 'VERIFIED') score += 3
    else if (q === 'CALCULATED') score += 2
    else if (q === 'ASSUMED') score -= 1
  })
  const max = facts.length * 4
  const min = -facts.length
  const normalised = Math.max(0, Math.min(1, (score - min) / (max - min)))
  return Math.round(normalised * 100)
}

function EmptyVerdict({
  isShared,
  projectId,
  t,
}: {
  isShared: boolean
  projectId: string
  t: (k: string, opts?: { defaultValue?: string }) => string
}) {
  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <p className="font-serif italic text-[18px] text-ink/65 leading-relaxed">
        {t('result.verdict.empty.body', {
          defaultValue:
            'Die Einordnung erfordert weitere Angaben. Setzen Sie die Konsultation fort, um diesen Abschnitt zu vervollständigen.',
        })}
      </p>
      {!isShared && (
        <Link
          to={`/projects/${projectId}`}
          className="font-serif italic text-[13px] text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft self-start inline-flex items-center gap-1.5"
        >
          ← {t('result.verdict.empty.cta', { defaultValue: 'Zur Konsultation' })}
        </Link>
      )}
    </div>
  )
}
