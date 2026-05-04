// Phase 7 Chamber — StandUp overlay.
//
// Triggered by:
//   - clicking the astrolabe (full or compact)
//   - pressing `?`
//   - clicking the "Stand up & look around" link below the input bar
//
// Full-screen modal with:
//   - Header (project + plot)
//   - Big astrolabe (180px, non-interactive)
//   - SpecialistTeam strip (md size = 24px sigils)
//   - Story so far (per-specialist contribution timeline)
//   - Open questions
//   - Top-3 next steps
//   - Areas A/B/C
//   - All captured facts
//   - Footer: Resume + Open briefing →
//   - Sidebar listing keyboard shortcuts

import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { factLabel, factValueWithUnit } from '@/lib/factLabel'
import { extractLedgerSummary } from '@/lib/projectStateHelpers'
import type { ProjectRow } from '@/types/db'
import type { Specialist, ProjectState } from '@/types/projectState'
import { Astrolabe } from './Astrolabe'
import { SpecialistTeam } from './SpecialistTeam'
import type { ChamberProgress } from '../../hooks/useChamberProgress'
import type { MessageRow } from '@/types/db'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
  project: ProjectRow
  messages: MessageRow[]
  progress: ChamberProgress
}

export function StandUp({ open, onOpenChange, project, messages, progress }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  // Esc handled by Dialog primitive natively; also subscribe to the
  // chamber:escape CustomEvent so the keyboard-shortcuts hook can
  // close us in priority order.
  useEffect(() => {
    if (!open) return
    const onEsc = () => onOpenChange(false)
    document.addEventListener('chamber:escape', onEsc as EventListener)
    return () => document.removeEventListener('chamber:escape', onEsc as EventListener)
  }, [open, onOpenChange])

  const state = (project.state ?? {}) as Partial<ProjectState>
  const summary = extractLedgerSummary(state as ProjectState | undefined)

  // Story-so-far — last spoken line per specialist.
  const story = useStorySoFar(messages)

  // Open questions — facts marked ASSUMED + areas in PENDING.
  const openQuestions = (() => {
    const out: string[] = []
    for (const f of state.facts ?? []) {
      if (f.qualifier?.quality === 'ASSUMED') {
        out.push(t('chat.standup.verifyAssumed', {
          label: factLabel(f.key, lang).label,
          defaultValue: `Bestätigen: ${factLabel(f.key, lang).label}`,
        }))
      }
    }
    summary.areas.forEach((a) => {
      if (a.state === 'PENDING') {
        out.push(`${t('chat.areas.' + a.key)} · ${t('chat.areas.state.pending')}`)
      }
    })
    return out
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-label={t('chat.chamber.standUpTitle')}
        className="max-w-3xl bg-paper border-[var(--hairline-strong)] p-0 overflow-hidden"
      >
        <div className="flex flex-col max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <header className="px-6 pt-7 pb-4 flex flex-col gap-1">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.20em] text-clay leading-none">
              {t('chat.chamber.standUpEyebrow')}
            </p>
            <DialogTitle className="font-serif italic text-[26px] text-ink leading-tight m-0">
              {project.name}
            </DialogTitle>
            {project.plot_address && (
              <p className="font-serif italic text-[14px] text-clay/82">
                {project.plot_address}
              </p>
            )}
          </header>

          {/* Astrolabe + team */}
          <section className="px-6 py-2 flex flex-col items-center gap-4 border-b border-[var(--hairline)]">
            <Astrolabe
              percent={progress.percent}
              currentTurn={progress.currentTurn}
              totalEstimate={progress.totalEstimate}
              currentSpecialist={progress.recentSpecialist}
              spokenSpecialists={progress.spokenSpecialists}
              size="full"
              ariaLabel={t('chat.chamber.astrolabeLabel', { percent: progress.percent })}
            />
            <SpecialistTeam
              active={progress.recentSpecialist}
              spoken={progress.spokenSpecialists}
              size="md"
            />
          </section>

          {/* Body sections */}
          <div className="px-6 py-6 flex flex-col gap-7">
            <Section title={t('chat.chamber.standUpStorySoFar')}>
              {story.length === 0 ? (
                <p className="font-serif italic text-[13px] text-clay/72">
                  {t('chat.standup.storyEmpty', { defaultValue: 'Noch keine Meilensteine.' })}
                </p>
              ) : (
                <ol className="flex flex-col gap-1.5">
                  {story.map((row, i) => (
                    <li key={i} className="flex items-baseline gap-3 text-[13px]">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-clay shrink-0 w-[110px]">
                        {t(`chat.specialists.${row.specialist}`)}
                      </span>
                      <span className="text-ink/85 leading-snug truncate">{row.snippet}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Section>

            <Section title={t('chat.chamber.standUpOpenQuestions')}>
              {openQuestions.length === 0 ? (
                <p className="font-serif italic text-[13px] text-clay/72">
                  {t('chat.standup.openEmpty', { defaultValue: 'Aktuell keine offenen Fragen.' })}
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {openQuestions.map((q, i) => (
                    <li key={i} className="text-[13px] text-ink/85 leading-snug">
                      · {q}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {summary.topRecs.length > 0 && (
              <Section title={t('chat.chamber.standUpTop3')}>
                <ol className="flex flex-col gap-1.5">
                  {summary.topRecs.map((r, i) => (
                    <li key={r.id} className="flex items-baseline gap-3 text-[14px]">
                      <span className="font-serif italic text-clay-deep tabular-figures shrink-0">
                        {i + 1}.
                      </span>
                      <span className="text-ink/90 leading-snug">
                        {lang === 'en' ? r.title_en : r.title_de}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="font-serif italic text-[11px] text-ink/55 mt-2">
                  {t('chat.preliminaryFooter')}
                </p>
              </Section>
            )}

            <Section title={t('chat.chamber.standUpAreas')}>
              <ul className="flex flex-col gap-1.5">
                {summary.areas.map(({ key, state }) => (
                  <li key={key} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="flex items-baseline gap-2">
                      <span className="font-serif italic text-clay-deep">{key}</span>
                      <span className="text-ink/85">{t(`chat.areas.${key}`)}</span>
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/55">
                      {t(`chat.areas.state.${state.toLowerCase()}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>

            {summary.factCount > 0 && (
              <Section title={t('chat.chamber.standUpAllFacts')}>
                <ul className="flex flex-col gap-2">
                  {(state.facts ?? []).slice().reverse().map((f) => (
                    <li key={f.key} className="flex flex-col gap-0.5 border-b border-[var(--hairline-faint)] last:border-0 pb-1.5 last:pb-0">
                      <span className="text-[10.5px] uppercase tracking-[0.14em] text-clay/82">
                        {factLabel(f.key, lang).label}
                      </span>
                      <span className="text-[13px] text-ink leading-tight break-words">
                        {factValueWithUnit(f.key, f.value, lang)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title={t('chat.chamber.stickyHeaderShortcuts')}>
              <ul className="flex flex-col gap-1 text-[13px] text-ink/72 font-mono">
                <li>{t('chat.chamber.keyboardSearch')}</li>
                <li>{t('chat.chamber.keyboardHelp')}</li>
                <li>{t('chat.chamber.keyboardScrollUp')}</li>
                <li>{t('chat.chamber.keyboardScrollDown')}</li>
                <li>{t('chat.chamber.keyboardEscape')}</li>
              </ul>
            </Section>
          </div>

          {/* Footer */}
          <footer className="border-t border-[var(--hairline)] px-6 py-4 flex items-center justify-between gap-3 sticky bottom-0 bg-paper/95 backdrop-blur-[3px]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-clay hover:text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 rounded-sm"
            >
              {t('chat.chamber.standUpResume')}
            </button>
            <Link
              to={`/projects/${project.id}/result`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-clay text-paper text-[14px] font-medium hover:bg-clay-deep transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              {t('chat.chamber.standUpOpenBriefing')}
            </Link>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.20em] text-clay m-0">
        {title}
      </h3>
      {children}
    </section>
  )
}

function useStorySoFar(messages: MessageRow[]) {
  const out: { specialist: Specialist; snippet: string }[] = []
  const seen = new Set<string>()
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'assistant' || !m.specialist) continue
    if (seen.has(m.specialist)) continue
    seen.add(m.specialist)
    const sentence = (m.content_de ?? '').split(/[.!?]/)[0]?.trim() ?? ''
    out.push({
      specialist: m.specialist as Specialist,
      snippet: sentence.length > 80 ? sentence.slice(0, 78) + '…' : sentence,
    })
  }
  return out.reverse()
}
