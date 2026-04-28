import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import { factLabel, factValueWithUnit } from '@/lib/factLabel'

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
            className="font-display text-[clamp(28px,4vw,36px)] text-ink leading-[1.08] -tracking-[0.018em]"
          >
            {lang === 'en' ? primary.title_en : primary.title_de}
          </h2>
          <p className="font-display text-[clamp(18px,2.4vw,22px)] text-ink/80 leading-tight italic">
            {(lang === 'en' ? primary.rationale_en : primary.rationale_de) ?? ''}
          </p>

          <span aria-hidden="true" className="block h-px w-16 bg-clay/55 my-1" />

          {/* Phase 3.6 #72 — expandable "Warum dieses Verfahren?" */}
          <details className="group">
            <summary className="cursor-pointer text-[13px] font-medium text-ink/75 hover:text-ink inline-flex items-center gap-2 select-none list-none">
              <span aria-hidden="true" className="font-serif italic text-clay group-open:rotate-90 inline-block transition-transform duration-soft">
                ›
              </span>
              {t('result.verdict.whyToggle', {
                defaultValue: 'Warum dieses Verfahren?',
              })}
            </summary>
            <div className="pt-3 pl-5 flex flex-col gap-2.5 text-[14px] text-ink/85 leading-[1.6]">
              <p>
                {t('result.verdict.basisIntro', {
                  defaultValue: 'Diese Einordnung basiert auf:',
                })}
              </p>
              <DeterminingFactorsList state={state} />
            </div>
          </details>

          <p className="text-[12px] text-clay/85 italic">
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

/**
 * Phase 3.6 #72 — ordered list of LEGAL-source / CALCULATED facts that
 * drove the procedure determination, each rendered with its qualifier
 * badge so the architect (or auditor) can sanity-check the chain.
 */
function DeterminingFactorsList({ state }: { state: Partial<ProjectState> }) {
  const { i18n, t } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  const facts = (state.facts ?? []).filter(
    (f) => f.qualifier?.source === 'LEGAL' || f.qualifier?.quality === 'CALCULATED',
  )
  if (facts.length === 0) {
    return (
      <p className="italic text-clay/65">
        {t('result.verdict.noFactors', {
          defaultValue: 'Noch keine bestimmenden Fakten erfasst.',
        })}
      </p>
    )
  }
  return (
    <ol className="flex flex-col gap-1.5 list-decimal pl-5 marker:text-clay/65 marker:font-serif marker:italic">
      {facts.slice(0, 6).map((f) => {
        const label = factLabel(f.key, lang).label
        const value =
          typeof f.value === 'string'
            ? f.value
            : factValueWithUnit(f.key, f.value, lang)
        return (
          <li key={f.key} className="leading-snug">
            <span className="text-ink">{label}:</span>{' '}
            <span className="text-ink/75">{value}</span>{' '}
            <span className="ml-1 text-[10px] uppercase tracking-[0.16em] text-clay/65">
              {f.qualifier.source} · {f.qualifier.quality.charAt(0)}
            </span>
          </li>
        )
      })}
    </ol>
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
