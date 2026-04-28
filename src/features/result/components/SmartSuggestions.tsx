import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProjectRow } from '@/types/db'
import type { ProjectState, Recommendation } from '@/types/projectState'
import { pickSmartSuggestions } from '../lib/smartSuggestionsMatcher'

interface Props {
  project: ProjectRow
  state: Partial<ProjectState>
}

/**
 * Phase 3.5 #64 — Section XI: Smart suggestions.
 *
 * 3–5 proactive next steps drawn from `smartSuggestionsBayern.ts`,
 * filtered by intent + bundesland + scope keywords. Each suggestion
 * gets a "Zu Empfehlungen hinzufügen" action that appends a new
 * recommendation row to projects.state via supabase update.
 *
 * The new recommendation uses id `smart-{suggestion.id}` so the
 * matcher can de-duplicate on subsequent renders. Optimistic update
 * via TanStack Query so the UI moves immediately.
 */
export function SmartSuggestions({ project, state }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())

  const suggestions = pickSmartSuggestions({ project, state })
  if (suggestions.length === 0) return null

  const addToRecommendations = async (suggestionId: string) => {
    const sug = suggestions.find((s) => s.id === suggestionId)
    if (!sug) return
    setBusy(suggestionId)
    try {
      const recId = `smart-${sug.id}`
      const existing = state.recommendations ?? []
      const newRec: Recommendation = {
        id: recId,
        rank: existing.length + 1,
        title_de: sug.titleDe,
        title_en: sug.titleEn,
        detail_de: sug.bodyDe,
        detail_en: sug.bodyEn,
        createdAt: new Date().toISOString(),
        qualifier: { source: 'LEGAL', quality: 'CALCULATED' },
      }
      // The DB row's `state` is always a fully-hydrated ProjectState
      // (initialProjectState + applied deltas). The Partial<…> wrapping
      // in caller props is just a render-time safety; here we cast back.
      const nextState = {
        ...state,
        recommendations: [...existing, newRec],
      } as ProjectState
      const { error } = await supabase
        .from('projects')
        .update({ state: nextState })
        .eq('id', project.id)
      if (error) throw error

      // Optimistic — update the cache so the section IX dashboard
      // and III Top-3 hero re-render with the new entry.
      queryClient.setQueryData<ProjectRow | null | undefined>(
        ['project', project.id],
        (old) =>
          old
            ? ({ ...old, state: nextState, updated_at: new Date().toISOString() } as ProjectRow)
            : old,
      )
      setAdded((prev) => new Set(prev).add(suggestionId))
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[smart-suggestion] failed to add', err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section
      id="sec-suggestions"
      className="px-6 sm:px-12 lg:px-20 py-20 sm:py-24 max-w-3xl mx-auto w-full scroll-mt-16 flex flex-col gap-8"
    >
      <header className="flex items-baseline gap-4">
        <span className="font-serif italic text-[20px] text-clay-deep tabular-figures leading-none w-10 shrink-0">
          XI
        </span>
        <span className="text-[10px] uppercase tracking-[0.22em] font-medium text-foreground/65">
          {t('result.suggestions.eyebrow', {
            defaultValue: 'Sie könnten auch benötigen',
          })}
        </span>
      </header>

      <span aria-hidden="true" className="block h-px w-12 bg-ink/20" />

      <p className="font-serif italic text-[15px] text-ink/65 leading-relaxed max-w-xl">
        {t('result.suggestions.intro', {
          defaultValue: 'Auf Basis Ihres Profils empfehlen wir:',
        })}
      </p>

      <ul className="flex flex-col gap-4">
        {suggestions.map((sug) => {
          const title = lang === 'en' ? sug.titleEn : sug.titleDe
          const body = lang === 'en' ? sug.bodyEn : sug.bodyDe
          const isAdded = added.has(sug.id)
          const isBusy = busy === sug.id
          return (
            <li
              key={sug.id}
              className="border border-ink/12 rounded-[2px] bg-paper px-5 py-4 grid grid-cols-[24px_1fr_auto] gap-x-3 items-start"
              style={{ boxShadow: 'inset 0 1px 0 hsl(0 0% 100% / 0.55)' }}
            >
              <DiamondGlyph />
              <div className="flex flex-col gap-1.5">
                <p className="font-serif text-[16px] text-ink leading-snug">
                  {title}
                </p>
                <p className="text-[13px] text-ink/70 leading-[1.6]">{body}</p>
              </div>
              <button
                type="button"
                disabled={isAdded || isBusy}
                onClick={() => addToRecommendations(sug.id)}
                className={
                  'self-center text-[12px] italic underline underline-offset-4 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm whitespace-nowrap ' +
                  (isAdded
                    ? 'text-clay-deep decoration-clay/0 cursor-default'
                    : 'text-clay/85 hover:text-ink decoration-clay/55')
                }
              >
                {isAdded
                  ? t('result.suggestions.added', { defaultValue: '✓ hinzugefügt' })
                  : isBusy
                    ? t('result.suggestions.adding', {
                        defaultValue: 'wird hinzugefügt …',
                      })
                    : t('result.suggestions.addAction', {
                        defaultValue: 'Zu Empfehlungen hinzufügen →',
                      })}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function DiamondGlyph() {
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
      className="text-drafting-blue/65 shrink-0 mt-1"
    >
      <path d="M 10 3 L 17 10 L 10 17 L 3 10 Z" />
      <path d="M 10 7 L 13 10 L 10 13 L 7 10 Z" strokeOpacity="0.55" />
    </svg>
  )
}
