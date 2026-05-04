// Phase 7 Chamber — LedgerPeek.
//
// Slide-out card from the right edge (desktop hover/focus) /
// vaul drawer from the right (mobile tap). Surfaces:
//   - Eyebrow + project name
//   - Areas A/B/C state
//   - 5 most-recent captured facts
//   - Top-3 next steps
//   - Footer link → /projects/:id/result
//
// `Vorläufig — bestätigt durch …` legal preliminary footer is
// rendered under the Top-3 list per §29 of the brief.

import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { factLabel, factValueWithUnit } from '@/lib/factLabel'
import type { LedgerSummary } from '@/lib/projectStateHelpers'

interface Props {
  projectId: string
  projectName: string
  summary: LedgerSummary
  /** Render mode — anchored slide-out or full bottom-sheet content. */
  variant?: 'anchored' | 'sheet'
  className?: string
}

export function LedgerPeek({ projectId, projectName, summary, variant = 'anchored', className }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  return (
    <div
      className={cn(
        // Phase 7.7 §1.6 — paper-pinned-card character. No drop shadow.
        // 0.5 px hairline on left/top/bottom (right is the viewport
        // edge). 12 px radius on the visible left corners only. A
        // single-pixel clay glow on the left edge gives the
        // "pinned-to-the-board" feel without elevation.
        'flex flex-col gap-5 bg-paper-card',
        variant === 'anchored'
          ? 'p-5 w-[300px] border-y border-l border-[var(--hairline,rgba(26,22,18,0.10))] rounded-l-xl shadow-[-1px_0_0_0_rgba(123,92,63,0.18)]'
          : 'p-5',
        className,
      )}
    >
      <header className="flex flex-col gap-1.5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.20em] text-clay leading-none">
          {t('chat.chamber.ledgerEyebrow')}
        </p>
        {/* Phase 7.7 §1.6 — italic Georgia 14 px ink, not 82 % alpha. */}
        <p
          className="font-serif italic text-[14px] text-ink leading-tight truncate"
          title={projectName}
          style={{ fontFamily: "Georgia, 'Instrument Serif', serif" }}
        >
          {projectName.split('·')[0]?.trim() ?? projectName}
        </p>
      </header>

      {summary.factCount === 0 && summary.recCount === 0 ? (
        <p className="font-serif italic text-[12px] text-clay/82 leading-relaxed">
          {t('chat.chamber.ledgerEmpty')}
        </p>
      ) : (
        <>
          {/* Areas */}
          <section className="flex flex-col gap-1.5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink/55 font-medium">
              {t('chat.chamber.ledgerAreas')}
            </p>
            <ul className="flex flex-col gap-1">
              {summary.areas.map(({ key, state }) => (
                <li key={key} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="font-serif italic text-clay-deep">{key}</span>
                  <span className="flex-1 truncate text-ink/85">{t(`chat.areas.${key}`)}</span>
                  {/* Phase 7.7 §1.6 — small-caps with tracking
                    * 0.16em rather than mono caps. Reads as a
                    * margin annotation. */}
                  <span
                    className={cn(
                      'text-[10px] px-2 py-[2px] rounded-[2px]',
                      'lowercase',
                      state === 'ACTIVE' && 'bg-[hsl(var(--clay)/0.12)] text-clay-deep',
                      state === 'PENDING' && 'bg-paper-deep text-ink/55',
                      state === 'VOID' && 'border border-dashed border-[var(--hairline-strong)] text-ink/40',
                    )}
                    style={{
                      fontVariant: 'small-caps',
                      letterSpacing: '0.16em',
                    }}
                  >
                    {t(`chat.areas.state.${state.toLowerCase()}`)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Facts */}
          {summary.facts.length > 0 && (
            <section className="flex flex-col gap-1.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-ink/55 font-medium">
                {t('chat.chamber.ledgerFacts')}
              </p>
              <ul className="flex flex-col gap-2">
                {summary.facts.map((f) => {
                  const { label } = factLabel(f.key, lang)
                  const value = factValueWithUnit(f.key, f.value, lang)
                  return (
                    <li key={f.key} className="flex flex-col gap-0.5 border-b border-[var(--hairline-faint,rgba(26,22,18,0.05))] last:border-0 pb-1.5 last:pb-0">
                      <span className="text-[10.5px] uppercase tracking-[0.14em] text-clay/82">
                        {label}
                      </span>
                      <span className="text-[13px] font-medium text-ink leading-tight break-words">
                        {value}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* Top 3 */}
          {summary.topRecs.length > 0 && (
            <section className="flex flex-col gap-1.5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-ink/55 font-medium">
                {t('chat.chamber.ledgerNextSteps')}
              </p>
              <ol className="flex flex-col gap-1.5">
                {summary.topRecs.map((rec, i) => (
                  <li key={rec.id} className="flex items-baseline gap-2 text-[12.5px]">
                    <span className="font-serif italic text-clay-deep tabular-figures shrink-0">
                      {i + 1}.
                    </span>
                    <span className="text-ink/90 leading-snug">
                      {lang === 'en' ? rec.title_en : rec.title_de}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="font-serif italic text-[10.5px] text-ink/55 leading-relaxed mt-1">
                {t('chat.preliminaryFooter')}
              </p>
            </section>
          )}
        </>
      )}

      <Link
        to={`/projects/${projectId}/result`}
        className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-clay hover:text-clay-deep transition-colors duration-150 self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-sm"
      >
        {t('chat.chamber.ledgerOpenFull')}
      </Link>
    </div>
  )
}
