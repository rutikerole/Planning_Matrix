// ───────────────────────────────────────────────────────────────────────
// Phase 7 Move 11 + Move 13 — Stand-up "pause and orient" surface
//
// A floating button at the bottom-right of the chat workspace opens a
// modal that surfaces:
//   • Story-so-far timeline derived from project_events (filtered to
//     MEANINGFUL_EVENT_TYPES per Phase 6 A.7).
//   • Open questions card derived from state.facts (ASSUMED quality)
//     and state.areas (PENDING).
//   • Action group mirroring UnifiedFooter's exports (PDF / Markdown
//     / View briefing / Export project data) — Move 13 keeps
//     UnifiedFooter as primary; this is a secondary surface that
//     also surfaces the same actions during pause.
//
// Hidden until ≥ 4 assistant turns to avoid early noise.
//
// Built on the existing Dialog primitives so backdrop blur, focus
// trap, Esc, scroll lock, and the data-state animations all come for
// free. The default Dialog content has landing-scope tokens
// (bg-pm-paper); we override via cn() to use the chat workspace's
// paper-card + hairline-strong tokens.
// ───────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Download, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { factLabel } from '@/lib/factLabel'
import { buildExportFilename } from '@/lib/export/exportFilename'
import { buildExportMarkdown } from '@/lib/export/exportMarkdown'
import { buildExportJson } from '@/lib/export/exportJson'
import {
  MEANINGFUL_EVENT_TYPES,
  summarizeEvent,
} from '@/features/dashboard/lib/recentActivity'
import { logExportEvent } from '@/lib/telemetry'
import type { MessageRow, ProjectRow } from '@/types/db'
import type { ProjectState } from '@/types/projectState'
import type { ProjectEventRow } from '../hooks/useProjectEvents'

interface Props {
  project: ProjectRow
  messages: MessageRow[]
  events: ProjectEventRow[]
  /**
   * Phase 7 Pass 2 — `link` renders a small mono-caps text link for
   * inline mounting inside InputBar's IDK row (Pass 2 item 8 — the
   * floating FAB overlapped thread content). `fab` is the legacy
   * floating pill, kept available for any remaining caller. Default
   * `link` since the floating pill is no longer mounted.
   */
  variant?: 'fab' | 'link'
}

const SHOW_AT_TURNS = 4

export function StandUpButton({
  project,
  messages,
  events,
  variant = 'link',
}: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const turnCount = messages.reduce(
    (n, m) => (m.role === 'assistant' ? n + 1 : n),
    0,
  )
  if (turnCount < SHOW_AT_TURNS) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {variant === 'fab' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('chat.standup.button', {
            defaultValue: 'Stand up & look around',
          })}
          className="
            fixed bottom-20 right-4 z-30
            lg:bottom-6 lg:right-[calc(var(--rail-r)+24px)]
            inline-flex items-center gap-2 px-3.5 py-2.5
            bg-paper-card border border-hairline-strong rounded-full
            font-mono text-[10px] tracking-[0.14em] uppercase text-ink-soft
            shadow-[0_1px_0_rgba(26,22,18,0.04),0_8px_28px_-10px_rgba(26,22,18,0.16)]
            transition-[border-color,color,transform] duration-[220ms] ease-ease
            hover:border-clay hover:text-clay motion-safe:hover:-translate-y-px
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper
          "
        >
          <StandUpIcon />
          {t('chat.standup.button', {
            defaultValue: 'Stand up & look around',
          })}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('chat.standup.button', {
            defaultValue: 'Stand up & look around',
          })}
          className="
            inline-flex items-center gap-1.5 px-1.5 py-1
            font-mono text-[10px] tracking-[0.14em] uppercase text-ink-mute
            transition-colors duration-[180ms] ease-ease
            hover:text-clay
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper rounded-sm
          "
        >
          <span aria-hidden="true">↗</span>
          {t('chat.standup.button', {
            defaultValue: 'Stand up & look around',
          })}
        </button>
      )}
      <StandUpDialog
        project={project}
        messages={messages}
        events={events}
        onClose={() => setOpen(false)}
      />
    </Dialog>
  )
}

// ── Modal body ──────────────────────────────────────────────────────

interface DialogProps {
  project: ProjectRow
  messages: MessageRow[]
  events: ProjectEventRow[]
  onClose: () => void
}

function StandUpDialog({ project, messages, events, onClose }: DialogProps) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const state = (project.state ?? {}) as Partial<ProjectState>

  const timeline = buildTimeline(events, lang)
  const openQuestions = deriveOpenQuestions(state, t, lang)
  const meta = buildMeta(messages, events)

  return (
    <DialogContent
      className="
        w-[calc(100%-2rem)] max-w-3xl gap-0 p-0
        bg-paper-card border border-hairline-strong
        rounded-[6px]
        shadow-[0_1px_0_rgba(26,22,18,0.04),0_24px_72px_-24px_rgba(26,22,18,0.32)]
      "
    >
      {/* Header */}
      <header className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-hairline">
        <DialogTitle className="font-serif text-[24px] leading-tight text-ink m-0">
          {t('chat.standup.title', { defaultValue: 'Stand up & look around' })}
        </DialogTitle>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('chat.standup.close', { defaultValue: 'Close' })}
          className="size-8 inline-flex items-center justify-center rounded-full text-ink-mute hover:text-ink hover:bg-ink/[0.04] transition-colors duration-[180ms] ease-ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </header>

      {/* Two-column body */}
      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-8 px-7 py-6">
        {/* Story so far */}
        <section>
          <SectionHeader
            title={t('chat.standup.storySoFar', {
              defaultValue: 'Story so far',
            })}
            meta={t('chat.standup.storySoFarMeta', {
              turns: meta.turns,
              minutes: meta.minutes,
              defaultValue: `${meta.turns} turns · ${meta.minutes} min`,
            })}
          />
          {timeline.length === 0 ? (
            <p className="font-serif italic text-[13px] text-ink-mute">
              {t('chat.standup.storyEmpty', {
                defaultValue: 'No milestones yet.',
              })}
            </p>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {timeline.map((entry, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[auto_1fr] gap-x-3 text-[13px]"
                >
                  <span className="font-mono text-[10px] tracking-[0.06em] uppercase text-ink-mute pt-0.5 whitespace-nowrap">
                    {entry.time}
                  </span>
                  <span className="text-ink-soft leading-snug">
                    {entry.description}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Open questions */}
        <section>
          <SectionHeader
            title={t('chat.standup.openQuestions', {
              defaultValue: 'Open questions',
            })}
            meta={t('chat.standup.openQuestionsMeta', {
              count: openQuestions.length,
              defaultValue: `${openQuestions.length} to resolve`,
            })}
          />
          {openQuestions.length === 0 ? (
            <p className="font-serif italic text-[13px] text-ink-mute">
              {t('chat.standup.openEmpty', {
                defaultValue: 'No open questions right now.',
              })}
            </p>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {openQuestions.map((q, i) => (
                <li
                  key={i}
                  className="p-3.5 bg-paper border border-hairline rounded-[4px]"
                >
                  <p className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-clay mb-1.5 leading-none">
                    {t(`chat.standup.pending${q.category}`, {
                      defaultValue: `Pending · ${q.category}`,
                    })}
                  </p>
                  <p className="font-serif text-[14.5px] text-ink leading-snug">
                    {q.text}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Action group + Sit back down */}
      <footer className="px-7 py-5 border-t border-hairline flex flex-col gap-4">
        <ActionGroup
          project={project}
          messages={messages}
          events={events}
          lang={lang}
        />
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-hairline-faint">
          <p className="font-serif italic text-[13.5px] text-ink-mute leading-snug">
            {t('chat.standup.resumePrompt', {
              defaultValue:
                "Take a breath. Sit back down whenever you're ready.",
            })}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-ink text-paper text-[13px] font-medium rounded-full transition-colors duration-[180ms] ease-ease hover:bg-clay-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {t('chat.standup.sitBack', { defaultValue: 'Sit back down ↩' })}
          </button>
        </div>
      </footer>
    </DialogContent>
  )
}

// ── Section header ─────────────────────────────────────────────────

function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-baseline justify-between mb-4 pb-1.5 border-b border-hairline">
      <p className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-ink-mute leading-none">
        {title}
      </p>
      <p className="font-serif italic text-[12px] text-ink-faint leading-none">
        {meta}
      </p>
    </div>
  )
}

// ── Action group (Move 13) ─────────────────────────────────────────
//
// Mirrors UnifiedFooter's three exports + a briefing link. Trigger
// logic uses the same builders (buildExportPdf / buildExportMarkdown
// / buildExportJson + buildExportFilename) as ExportMenu, so behaviour
// matches. Telemetry events are emitted under the same names.

function ActionGroup({
  project,
  messages,
  events,
  lang,
}: {
  project: ProjectRow
  messages: MessageRow[]
  events: ProjectEventRow[]
  lang: 'de' | 'en'
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState<'pdf' | 'md' | 'json' | null>(null)

  const triggerExport = async (kind: 'pdf' | 'md' | 'json') => {
    setBusy(kind)
    logExportEvent({
      projectId: project.id,
      eventType: `${kind}_export_attempted`,
    })
    try {
      let blob: Blob
      if (kind === 'pdf') {
        const { buildExportPdf } = await import('../lib/exportPdf')
        const bytes = await buildExportPdf({ project, messages, events, lang })
        blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
      } else if (kind === 'md') {
        const md = buildExportMarkdown({ project, events, lang })
        blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      } else {
        const json = buildExportJson({ project, messages, events })
        blob = new Blob([JSON.stringify(json, null, 2)], {
          type: 'application/json;charset=utf-8',
        })
      }
      download(blob, buildExportFilename(project.name, kind))
      logExportEvent({
        projectId: project.id,
        eventType: `${kind}_export_succeeded`,
      })
    } catch (err) {
      console.error('[standup-export] failed', err)
      logExportEvent({
        projectId: project.id,
        eventType: `${kind}_export_failed`,
        reason: err instanceof Error ? err.message : String(err),
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      <ActionButton
        label={t('chat.standup.action.pdf', { defaultValue: 'Checklist PDF' })}
        busy={busy === 'pdf'}
        onClick={() => triggerExport('pdf')}
      />
      <ActionButton
        label={t('chat.standup.action.markdown', {
          defaultValue: 'Markdown checklist',
        })}
        busy={busy === 'md'}
        onClick={() => triggerExport('md')}
      />
      <ActionButton
        label={t('chat.standup.action.json', {
          defaultValue: 'Export project data',
        })}
        busy={busy === 'json'}
        onClick={() => triggerExport('json')}
      />
      <Link
        to={`/projects/${project.id}/result`}
        className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-paper border border-hairline rounded-[4px] font-mono text-[10px] tracking-[0.14em] uppercase text-ink-soft hover:border-clay hover:text-clay transition-colors duration-[180ms] ease-ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      >
        {t('chat.standup.action.briefing', { defaultValue: 'View briefing' })}
      </Link>
    </div>
  )
}

function ActionButton({
  label,
  busy,
  onClick,
}: {
  label: string
  busy: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-paper border border-hairline rounded-[4px] font-mono text-[10px] tracking-[0.14em] uppercase text-ink-soft hover:border-clay hover:text-clay transition-colors duration-[180ms] ease-ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-60 disabled:cursor-wait"
    >
      <Download aria-hidden="true" className="size-3" />
      {busy ? '…' : label}
    </button>
  )
}

// ── Helpers ────────────────────────────────────────────────────────

interface TimelineEntry {
  time: string
  description: string
}

function buildTimeline(
  events: ProjectEventRow[],
  lang: 'de' | 'en',
): TimelineEntry[] {
  const meaningful = events.filter((e) =>
    MEANINGFUL_EVENT_TYPES.has(e.event_type),
  )
  const sorted = [...meaningful].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  )
  return sorted.slice(-12).map((e) => ({
    time: formatTime(e.created_at, lang),
    description: e.reason
      ? `${summarizeEvent(e.event_type, lang)} — ${e.reason}`
      : summarizeEvent(e.event_type, lang),
  }))
}

function formatTime(iso: string, lang: 'de' | 'en'): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface OpenQuestion {
  category: 'Bauamt' | 'Heritage' | 'You'
  text: string
}

function deriveOpenQuestions(
  state: Partial<ProjectState>,
  t: (key: string, opts?: Record<string, unknown>) => string,
  lang: 'de' | 'en',
): OpenQuestion[] {
  const questions: OpenQuestion[] = []

  // ASSUMED facts that should be verified — top 3 by recency.
  const assumed = (state.facts ?? [])
    .filter((f) => f.qualifier?.quality === 'ASSUMED')
    .slice(-3)
  for (const f of assumed) {
    const label = factLabel(f.key, lang).label
    const isHeritage = /heritage|denkmal/i.test(f.key)
    questions.push({
      category: isHeritage ? 'Heritage' : 'You',
      text: t('chat.standup.verifyAssumed', {
        label,
        defaultValue: `Confirm: ${label}`,
      }),
    })
  }

  // Pending Area A (planning law) is the most common Bauamt-side open
  // question. We don't surface B/C since those typically resolve
  // through specialist conversation rather than an external query.
  if (state.areas?.A?.state === 'PENDING') {
    questions.push({
      category: 'Bauamt',
      text: t('chat.standup.confirmPlanning', {
        defaultValue:
          'Confirm planning law: is there a qualified Bebauungsplan?',
      }),
    })
  }

  return questions.slice(0, 6)
}

function buildMeta(
  messages: MessageRow[],
  events: ProjectEventRow[],
): { turns: number; minutes: number } {
  const turns = messages.reduce(
    (n, m) => (m.role === 'assistant' ? n + 1 : n),
    0,
  )
  let minutes = 0
  if (events.length >= 2) {
    const firstTs = events[events.length - 1]?.created_at // events are desc
    const lastTs = events[0]?.created_at
    if (firstTs && lastTs) {
      const diffMs =
        new Date(lastTs).getTime() - new Date(firstTs).getTime()
      minutes = Math.max(0, Math.round(diffMs / 60000))
    }
  }
  return { turns, minutes }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Decorative icon ────────────────────────────────────────────────

function StandUpIcon() {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M2 10 L2 6 L6 2 L10 6 L10 10" />
      <line x1="2" y1="10" x2="10" y2="10" />
    </svg>
  )
}
