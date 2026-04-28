import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { m, useReducedMotion } from 'framer-motion'
import { NorthArrow } from '@/features/chat/components/NorthArrow'
import { useAuthStore } from '@/stores/authStore'
import type { ProjectRow, MessageRow } from '@/types/db'
import { buildDocumentNumber } from '../lib/documentNumber'
import {
  shouldAnimateCover,
  markCoverAnimated,
} from '../lib/sessionAnimationFlag'
import { IntentAxonometricXL } from './IntentAxonometricXL'

interface Props {
  project: ProjectRow
  messages: MessageRow[]
  /** Cover animation scope key — defaults to project id; pass the share
   *  token id when rendering inside `/result/share/:token` (#65). */
  scopeKey?: string
  /** When `kind === 'shared'`, hide owner-bound meta lines + show the
   *  read-only badge instead. Wired in #65. */
  source?: { kind: 'owned' } | { kind: 'shared'; expiresAt: string }
}

const STAGGER_MS = 80

/**
 * Phase 3.5 #60 — result-page cover hero (Section I).
 *
 * Real architectural-document cover sheet at full-viewport height on
 * first load. Animation choreography on the FIRST visit per session
 * (sessionStorage-scoped):
 *
 *   t=0    paper card fades in over 320 ms
 *   t=320  NorthArrow strokes itself in over 1.6 s (component-internal)
 *   t=320  typography lines stagger fade-up, 80 ms apart
 *   t=720  XL axonometric draws line-by-line over 2.4 s
 *   t=...  scale bar fades in last
 *
 * Reduced-motion: every layer renders instantly. Subsequent visits
 * within the same session also render instantly.
 */
export function CoverHero({ project, messages, scopeKey, source }: Props) {
  const { t, i18n } = useTranslation()
  const reduced = useReducedMotion()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const { user } = useAuthStore()

  const key = scopeKey ?? project.id
  const isShared = source?.kind === 'shared'
  const [animate] = useState(() => !reduced && shouldAnimateCover(key))

  useEffect(() => {
    if (!reduced) markCoverAnimated(key)
  }, [reduced, key])

  // Aggregate meta — total session time + turn count.
  const turnCount = messages.filter((m) => m.role === 'assistant').length
  const sessionStartIso = messages[0]?.created_at ?? project.created_at
  const sessionEndIso =
    messages[messages.length - 1]?.created_at ?? project.updated_at
  const elapsedMinutes = Math.max(
    1,
    Math.round(
      (new Date(sessionEndIso).getTime() - new Date(sessionStartIso).getTime()) /
        60_000,
    ),
  )

  const documentNo = buildDocumentNumber(project.id)
  const intentLabel = t(`wizard.q1.options.${project.intent}`, {
    defaultValue: t('wizard.q1.options.sonstige'),
  })
  // Strip the "Neubau " prefix if present so we can render the typology
  // word large and the building type below it.
  const intentTypology = intentLabel.match(/^(Neubau|Sanierung|Umnutzung|Abbruch|Sonstiges)/i)?.[0] ?? null
  const intentBuildingType = intentTypology
    ? intentLabel.replace(intentTypology, '').trim() || intentTypology
    : intentLabel

  const createdAt = new Date(project.created_at)
  const createdLong = createdAt.toLocaleString(
    lang === 'en' ? 'en-GB' : 'de-DE',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  )

  const expiresLong = isShared
    ? new Date(source.expiresAt).toLocaleDateString(
        lang === 'en' ? 'en-GB' : 'de-DE',
        { day: '2-digit', month: 'long', year: 'numeric' },
      )
    : null

  // Stagger timeline. Each line uses absolute delay from t=0.
  const delays = {
    eyebrow: 0.0,
    docNo: STAGGER_MS / 1000,
    rule1: (STAGGER_MS * 2) / 1000,
    typology: (STAGGER_MS * 3) / 1000,
    buildingType: (STAGGER_MS * 4) / 1000,
    address: (STAGGER_MS * 5) / 1000,
    rule2: (STAGGER_MS * 6) / 1000,
    axonometric: (STAGGER_MS * 7) / 1000,
    rule3: (STAGGER_MS * 7 + 2400) / 1000,
    bundesland: (STAGGER_MS * 8 + 2400) / 1000,
    meta: (STAGGER_MS * 9 + 2400) / 1000,
    scale: (STAGGER_MS * 10 + 2400) / 1000,
    footer: (STAGGER_MS * 11 + 2400) / 1000,
  }

  const fadeUp = (delay: number) =>
    animate
      ? {
          initial: { opacity: 0, y: 6 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
        }
      : { initial: false, animate: { opacity: 1, y: 0 } as const }

  return (
    <m.section
      initial={animate ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: animate ? 0.32 : 0, ease: [0.16, 1, 0.3, 1] }}
      className="relative min-h-screen flex flex-col justify-between bg-paper px-6 sm:px-12 lg:px-20 pt-12 sm:pt-16 pb-10"
      data-print-target="cover-hero"
    >
      {/* Top meta */}
      <header className="relative flex items-start justify-between gap-6">
        <div className="flex flex-col gap-2 max-w-2xl">
          <m.p
            {...fadeUp(delays.eyebrow)}
            className="eyebrow text-foreground/65 leading-none"
          >
            <span className="accent-dot" aria-hidden="true" />
            Planning Matrix
          </m.p>
          <m.p
            {...fadeUp(delays.docNo)}
            className="font-serif italic text-[12px] text-clay/85 leading-none tabular-figures"
          >
            {t('result.cover.docNoLabel', {
              defaultValue: 'Atelier-Briefing No.',
            })}{' '}
            <span className="text-clay-deep">{documentNo}</span>
          </m.p>
          <m.span
            aria-hidden="true"
            initial={animate ? { scaleX: 0 } : false}
            animate={{ scaleX: 1 }}
            transition={{
              duration: animate ? 0.4 : 0,
              delay: delays.rule1,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{ transformOrigin: 'left center' }}
            className="block h-px w-32 bg-ink/30 mt-1"
          />
        </div>
        <m.div
          {...fadeUp(delays.eyebrow)}
          className="shrink-0 text-drafting-blue"
        >
          <NorthArrow />
        </m.div>
      </header>

      {/* Centre block — the headline, axonometric, sub */}
      <div className="flex flex-col items-center gap-10 sm:gap-14 max-w-3xl mx-auto w-full text-center py-10">
        <div className="flex flex-col items-center gap-3">
          {intentTypology && (
            <m.p
              {...fadeUp(delays.typology)}
              className="text-[11px] font-medium uppercase tracking-[0.36em] text-clay leading-none"
            >
              {intentTypology}
            </m.p>
          )}
          <m.h1
            {...fadeUp(delays.buildingType)}
            className="font-display text-[clamp(40px,7vw,72px)] text-ink leading-[1.05] -tracking-[0.024em]"
          >
            {intentBuildingType}
          </m.h1>
          {project.plot_address && (
            <m.p
              {...fadeUp(delays.address)}
              className="font-serif italic text-[16px] sm:text-[18px] text-ink/70 leading-snug max-w-xl"
            >
              {project.plot_address}
            </m.p>
          )}
        </div>

        <m.span
          aria-hidden="true"
          initial={animate ? { scaleX: 0 } : false}
          animate={{ scaleX: 1 }}
          transition={{
            duration: animate ? 0.5 : 0,
            delay: delays.rule2,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{ transformOrigin: 'center' }}
          className="block h-px w-24 bg-clay/55"
        />

        <m.div
          {...fadeUp(delays.axonometric)}
          className="w-full max-w-[480px]"
        >
          <IntentAxonometricXL intent={project.intent} animateDraw={animate} />
        </m.div>

        <m.span
          aria-hidden="true"
          initial={animate ? { scaleX: 0 } : false}
          animate={{ scaleX: 1 }}
          transition={{
            duration: animate ? 0.5 : 0,
            delay: delays.rule3,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{ transformOrigin: 'center' }}
          className="block h-px w-24 bg-clay/55"
        />

        <m.p
          {...fadeUp(delays.bundesland)}
          className="font-serif italic text-[15px] sm:text-[16px] text-ink/65 leading-snug"
        >
          {project.bundesland} · {t('result.cover.subtitle', {
            defaultValue: 'Bauantrag-Vorbereitung',
          })}
        </m.p>
      </div>

      {/* Footer meta + scale bar + caveat */}
      <footer className="flex flex-col gap-4">
        <m.div
          {...fadeUp(delays.meta)}
          className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3"
        >
          <ul className="flex flex-col gap-1.5 text-[12px] text-ink/65 leading-snug min-w-[260px]">
            <li>
              <span className="font-medium text-ink/85">
                {t('result.cover.createdLabel', { defaultValue: 'Erstellt' })}:
              </span>{' '}
              <span className="font-serif italic text-clay-deep tabular-figures">
                {createdLong}
              </span>
            </li>
            {!isShared && user?.email && (
              <li>
                <span className="font-medium text-ink/85">
                  {t('result.cover.bauherrLabel', { defaultValue: 'Bauherr' })}:
                </span>{' '}
                <span className="font-serif italic text-ink/85">{user.email}</span>
              </li>
            )}
            {messages.length > 1 && (
              <li>
                <span className="font-medium text-ink/85">
                  {t('result.cover.sessionLabel', {
                    defaultValue: 'Bearbeitungszeit',
                  })}
                  :
                </span>{' '}
                <span className="font-serif italic text-clay-deep tabular-figures">
                  {elapsedMinutes}{' '}
                  {t('result.cover.minutes', { defaultValue: 'Min.' })}
                </span>
                <span className="text-ink/40 mx-2">·</span>
                <span className="font-serif italic text-clay-deep tabular-figures">
                  {turnCount}
                </span>{' '}
                {t('result.cover.turns', { defaultValue: 'Wendungen' })}
              </li>
            )}
            {isShared && expiresLong && (
              <li className="text-clay/85">
                <span className="font-medium uppercase tracking-[0.2em] text-[10px]">
                  {t('result.cover.readOnly', {
                    defaultValue: 'Schreibgeschützt',
                  })}
                </span>{' '}
                <span className="font-serif italic text-clay-deep">
                  · {t('result.cover.validUntil', {
                    defaultValue: 'gültig bis',
                  })}{' '}
                  {expiresLong}
                </span>
              </li>
            )}
          </ul>
          <m.span
            {...fadeUp(delays.scale)}
            aria-label="Maßstab 1 zu 100"
            className="inline-flex items-center gap-2 text-clay/70 self-end"
          >
            <svg
              width="78"
              height="12"
              viewBox="0 0 78 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.9"
              aria-hidden="true"
            >
              <line x1="3" y1="7" x2="68" y2="7" strokeLinecap="round" />
              <line x1="3" y1="3" x2="3" y2="10" />
              <line x1="19.25" y1="4.5" x2="19.25" y2="9.5" />
              <line x1="35.5" y1="3" x2="35.5" y2="10" />
              <line x1="51.75" y1="4.5" x2="51.75" y2="9.5" />
              <line x1="68" y1="3" x2="68" y2="10" />
              <rect x="3" y="6" width="16.25" height="2" fill="currentColor" stroke="none" fillOpacity="0.6" />
            </svg>
            <span className="font-serif italic text-[12px] tabular-figures">
              M&nbsp;1:100
            </span>
          </m.span>
        </m.div>

        <m.span
          aria-hidden="true"
          initial={animate ? { scaleX: 0 } : false}
          animate={{ scaleX: 1 }}
          transition={{
            duration: animate ? 0.4 : 0,
            delay: delays.footer,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{ transformOrigin: 'left center' }}
          className="block h-px w-12 bg-ink/30"
        />

        <m.p
          {...fadeUp(delays.footer)}
          className="font-serif italic text-[13px] text-clay leading-relaxed max-w-2xl"
        >
          {t('result.cover.caveat', {
            defaultValue:
              'Vorläufige Einschätzung — bestätigt durch eine/n bauvorlageberechtigte/n Architekt/in.',
          })}
        </m.p>
      </footer>
    </m.section>
  )
}
