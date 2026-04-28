import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Drawer } from 'vaul'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectState } from '@/types/projectState'
import { factLabel, factValueWithUnit } from '@/lib/factLabel'
import { saveFactValue } from './Cockpit/saveFact'

interface Props {
  state: Partial<ProjectState>
}

interface RiskItem {
  id: string
  tag: 'ANNAHME' | 'HINWEIS' | 'PRÜFEN'
  body: string
  /** Phase 3.6 #72 — present on ANNAHME items so the resolve drawer
   * knows which fact to update. */
  factKey?: string
  factCurrentValue?: string
  factLabel?: string
}

/**
 * Phase 3.5 #63 — Section VIII: Was noch zu prüfen ist.
 * Phase 3.6 #72 adds a "Diese Annahme klären" CTA on ANNAHME cards
 * which opens a vaul drawer with a single-input form. Saving converts
 * the fact qualifier from ASSUMED → DECIDED via saveFactValue.
 */
export function RiskFlags({ state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const projectId = id ?? ''

  const items = collectRisks(state, lang)
  const [resolving, setResolving] = useState<RiskItem | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  if (items.length === 0) return null

  const openResolve = (item: RiskItem) => {
    setResolving(item)
    setDraft(item.factCurrentValue ?? '')
  }
  const closeResolve = () => {
    setResolving(null)
    setDraft('')
    setBusy(false)
  }

  const submitResolve = async () => {
    if (!resolving?.factKey) return
    if (!draft.trim()) return
    setBusy(true)
    try {
      await saveFactValue({
        queryClient,
        projectId,
        factKey: resolving.factKey,
        nextValue: draft.trim(),
      })
      closeResolve()
    } catch {
      setBusy(false)
    }
  }

  return (
    <section
      id="sec-risks"
      className="px-6 sm:px-12 lg:px-20 py-20 sm:py-24 max-w-3xl mx-auto w-full scroll-mt-16 flex flex-col gap-8"
    >
      <header className="flex items-baseline gap-4">
        <span className="font-serif italic text-[20px] text-clay-deep tabular-figures leading-none w-10 shrink-0">
          VIII
        </span>
        <span className="text-[11px] uppercase tracking-[0.22em] font-medium text-foreground/65">
          {t('result.risks.eyebrow', {
            defaultValue: 'Was noch zu prüfen ist',
          })}
        </span>
      </header>

      <span aria-hidden="true" className="block h-px w-12 bg-ink/20" />

      <p className="text-[14px] text-ink/75 leading-relaxed max-w-xl">
        {items.length === 1
          ? t('result.risks.intro_one', {
              defaultValue:
                'Ein Punkt sollten Sie mit Ihrer Architekt:in besprechen.',
            })
          : t('result.risks.intro_other', {
              defaultValue:
                '{{n}} Punkte sollten Sie mit Ihrer Architekt:in besprechen.',
              n: items.length,
            })}
      </p>

      <ul className="flex flex-col gap-3">
        {items.map((it) => (
          <li
            key={it.id}
            className="grid grid-cols-[24px_1fr_auto] items-start gap-x-3 px-5 py-4 border border-ink/12 bg-paper rounded-[var(--pm-radius-card)]"
            style={{ boxShadow: 'var(--pm-shadow-card)' }}
          >
            <TriangleGlyph />
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-[11px] font-medium uppercase tracking-[0.20em] text-clay leading-none">
                {tagLabel(it.tag, lang)}
              </span>
              <p className="text-[14px] text-ink/85 leading-[1.55] break-words">
                {it.body}
              </p>
            </div>
            {it.tag === 'ANNAHME' && it.factKey && (
              <button
                type="button"
                onClick={() => openResolve(it)}
                className="shrink-0 inline-flex items-center h-11 sm:h-8 px-4 sm:px-3 text-[12px] font-medium text-paper bg-ink hover:bg-ink/92 rounded-[var(--pm-radius-pill)] transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {t('result.risks.resolveCta', {
                  defaultValue: 'Diese Annahme klären',
                })}
              </button>
            )}
          </li>
        ))}
      </ul>

      <Drawer.Root
        open={resolving !== null}
        onOpenChange={(open) => {
          if (!open) closeResolve()
        }}
        direction="right"
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-40" />
          <Drawer.Content
            aria-label={t('result.risks.resolveTitle', {
              defaultValue: 'Annahme klären',
            })}
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[440px] bg-paper border-l border-ink/15 outline-none px-6 py-6 flex flex-col gap-4"
          >
            <Drawer.Title className="sr-only">
              {t('result.risks.resolveTitle', {
                defaultValue: 'Annahme klären',
              })}
            </Drawer.Title>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-clay/85">
                {t('result.risks.resolveTitle', {
                  defaultValue: 'Annahme klären',
                })}
              </span>
              <button
                type="button"
                onClick={closeResolve}
                aria-label={t('chat.input.attachment.close', {
                  defaultValue: 'Schließen',
                })}
                className="size-8 inline-flex items-center justify-center rounded-full text-ink/55 hover:text-ink hover:bg-ink/[0.06] transition-colors duration-soft"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>

            {resolving && (
              <>
                <p className="font-display text-[22px] text-ink leading-snug">
                  {resolving.factLabel ?? resolving.body}
                </p>
                <p className="text-[12.5px] italic text-clay/85 leading-relaxed">
                  {t('result.risks.resolveHint', {
                    defaultValue:
                      'Geben Sie den belastbaren Wert ein. Wir markieren den Fakt anschließend als CLIENT · DECIDED und tragen die Korrektur in die Auditspur ein.',
                  })}
                </p>

                <label
                  htmlFor="risk-resolve-input"
                  className="text-[11px] font-medium uppercase tracking-[0.18em] text-clay/85 mt-2"
                >
                  {t('result.risks.resolveValueLabel', {
                    defaultValue: 'Tatsächlicher Wert',
                  })}
                </label>
                <input
                  id="risk-resolve-input"
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void submitResolve()
                    }
                  }}
                  className="h-10 px-3 bg-paper border border-ink/15 text-[14px] text-ink rounded-[var(--pm-radius-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  placeholder={resolving.factCurrentValue ?? ''}
                />

                <div className="flex items-center justify-end gap-2 mt-auto pt-4">
                  <button
                    type="button"
                    onClick={closeResolve}
                    disabled={busy}
                    className="h-10 px-4 text-[13px] text-ink/65 hover:text-ink rounded-[var(--pm-radius-pill)] transition-colors duration-soft"
                  >
                    {t('result.risks.resolveCancel', {
                      defaultValue: 'Abbrechen',
                    })}
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitResolve()}
                    disabled={busy || draft.trim().length === 0}
                    className={cn(
                      'h-10 px-5 text-[13px] font-medium transition-colors duration-soft',
                      'rounded-[var(--pm-radius-pill)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      busy || draft.trim().length === 0
                        ? 'bg-ink/15 text-ink/40 cursor-not-allowed'
                        : 'bg-ink text-paper hover:bg-ink/92',
                    )}
                  >
                    {busy
                      ? t('result.risks.resolveSaving', {
                          defaultValue: 'Wird gespeichert…',
                        })
                      : t('result.risks.resolveSave', {
                          defaultValue: 'Annahme klären',
                        })}
                  </button>
                </div>
              </>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </section>
  )
}

function TriangleGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-drafting-blue/65 shrink-0 mt-0.5"
    >
      <path d="M 10 3.4 L 17.2 16.4 L 2.8 16.4 Z" />
      <circle cx="10" cy="13.4" r="0.7" fill="currentColor" stroke="none" />
      <path d="M 10 8 L 10 11.4" strokeOpacity="0.7" />
    </svg>
  )
}

function tagLabel(tag: RiskItem['tag'], lang: 'de' | 'en'): string {
  if (lang === 'en') {
    return {
      ANNAHME: 'ASSUMPTION · UNVERIFIED',
      HINWEIS: 'NOTE',
      PRÜFEN: 'TO VERIFY',
    }[tag]
  }
  return {
    ANNAHME: 'ANNAHME · NICHT VERIFIZIERT',
    HINWEIS: 'HINWEIS',
    PRÜFEN: 'WICHTIG ZU PRÜFEN',
  }[tag]
}

function collectRisks(
  state: Partial<ProjectState>,
  lang: 'de' | 'en',
): RiskItem[] {
  const out: RiskItem[] = []

  // Assumed facts → ANNAHME (with key for the resolve drawer).
  ;(state.facts ?? []).forEach((f) => {
    if (f.qualifier?.quality !== 'ASSUMED') return
    const labelText = factLabel(f.key, lang).label
    const value = factValueWithUnit(f.key, f.value, lang)
    const body = f.evidence ?? `${labelText}: ${value}`
    out.push({
      id: `f-${f.key}`,
      tag: 'ANNAHME',
      body,
      factKey: f.key,
      factCurrentValue: value,
      factLabel: labelText,
    })
  })

  const triggerRe =
    lang === 'en'
      ? /should|early|verify|check/i
      : /sollte|fr(ü|u)hzeitig|abkl(ä|a)ren|verifizieren|pr(ü|u)fen/i
  ;(state.procedures ?? []).forEach((p) => {
    const text = lang === 'en' ? p.rationale_en : p.rationale_de
    if (text && triggerRe.test(text)) {
      out.push({ id: `p-${p.id}`, tag: 'HINWEIS', body: text })
    }
  })

  ;(state.recommendations ?? []).forEach((r) => {
    if (r.qualifier?.quality !== 'ASSUMED') return
    const text = lang === 'en' ? r.detail_en : r.detail_de
    if (text) out.push({ id: `r-${r.id}`, tag: 'PRÜFEN', body: text })
  })

  return out.slice(0, 5)
}
