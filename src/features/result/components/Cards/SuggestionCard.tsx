import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import type { ProjectRow } from '@/types/db'
import type { ProjectState, Recommendation } from '@/types/projectState'
import type {
  SmartSuggestion,
  SuggestionCategory,
} from '@/data/smartSuggestionsMuenchen'

interface Props {
  project: ProjectRow
  state: Partial<ProjectState>
  suggestion: SmartSuggestion
  /** Owner mode — gates the supabase write on Add-to-checklist. In
   *  shared mode the Add button is hidden (recipients can't mutate
   *  the project; supabase RLS would silently fail anyway). */
  ownerMode: boolean
  onAdded: (id: string) => void
  onDismissed: (id: string) => void
}

export type { SuggestionCategory }

/**
 * Phase 8 — single suggestion card on Tab 6. Derives a category from
 * the suggestion's id heuristically (the matcher's data file has no
 * category field, so we group at render time). Three actions: Add to
 * checklist (writes a Recommendation row to projects.state), Dismiss
 * (localStorage flag scoped to project + suggestion), Tell me more
 * (collapses an extended detail block).
 */
export function SuggestionCard({
  project,
  state,
  suggestion,
  ownerMode,
  onAdded,
  onDismissed,
}: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState(false)
  const [open, setOpen] = useState(false)

  const title = lang === 'en' ? suggestion.titleEn : suggestion.titleDe
  const body = lang === 'en' ? suggestion.bodyEn : suggestion.bodyDe
  const reasoning =
    lang === 'en' ? suggestion.reasoningEn : suggestion.reasoningDe
  const category = suggestion.category

  const handleAdd = async () => {
    if (busy || added) return
    setBusy(true)
    try {
      const recId = `smart-${suggestion.id}`
      const existing = state.recommendations ?? []
      const newRec: Recommendation = {
        id: recId,
        rank: existing.length + 1,
        title_de: suggestion.titleDe,
        title_en: suggestion.titleEn,
        detail_de: suggestion.bodyDe,
        detail_en: suggestion.bodyEn,
        createdAt: new Date().toISOString(),
        qualifier: { source: 'LEGAL', quality: 'CALCULATED' },
      }
      const nextState = {
        ...state,
        recommendations: [...existing, newRec],
      } as ProjectState
      const { error } = await supabase
        .from('projects')
        .update({ state: nextState })
        .eq('id', project.id)
      if (error) throw error
      queryClient.setQueryData<ProjectRow | null | undefined>(
        ['project', project.id],
        (old) =>
          old
            ? ({
                ...old,
                state: nextState,
                updated_at: new Date().toISOString(),
              } as ProjectRow)
            : old,
      )
      setAdded(true)
      onAdded(suggestion.id)
    } catch (err) {
      console.error('[suggestion] add failed', err)
    } finally {
      setBusy(false)
    }
  }

  const handleDismiss = () => {
    onDismissed(suggestion.id)
  }

  return (
    <article className="border border-ink/12 rounded-[10px] bg-paper-card p-4 sm:p-5 flex flex-col gap-3">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-[10px] font-medium uppercase tracking-[0.20em] text-clay leading-none">
            {t(`result.workspace.suggestions.category.${category}`)}
          </span>
          <h3 className="font-serif italic text-[16px] text-ink leading-snug">
            {title}
          </h3>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t('result.workspace.suggestions.dismiss')}
          className="shrink-0 size-7 inline-flex items-center justify-center rounded-full text-ink/45 hover:text-ink hover:bg-ink/[0.06] transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card"
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      </header>

      <p className="text-[13px] text-ink/85 leading-[1.55] max-w-prose">
        {body}
      </p>

      <p className="font-serif italic text-[11.5px] text-clay leading-snug max-w-prose">
        <span className="not-italic font-medium uppercase tracking-[0.16em] text-clay/72 text-[9.5px] mr-1.5">
          {t('result.workspace.suggestions.reasoningPrefix')}
        </span>
        {reasoning}
      </p>

      {open && (
        <div className="border-t border-ink/12 pt-3 flex flex-col gap-1.5">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-clay">
            {t('result.workspace.suggestions.matchedFilters')}
          </p>
          <p className="text-[12px] italic text-clay/85 leading-relaxed">
            {filtersFor(suggestion, lang)}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 text-[11.5px] italic text-clay/85 hover:text-ink underline underline-offset-4 decoration-clay/55 transition-colors duration-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card rounded-sm"
        >
          {t('result.workspace.suggestions.tellMeMore')}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'size-3 transition-transform duration-soft',
              open && 'rotate-180',
            )}
          />
        </button>
        {ownerMode && (
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={busy || added}
            className={cn(
              'inline-flex items-center h-8 px-3 rounded-full text-[11.5px] font-medium transition-colors duration-soft',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper-card',
              added
                ? 'bg-paper border border-ink/15 text-ink/65 cursor-default'
                : busy
                  ? 'bg-ink/15 border border-ink/15 text-ink/40 cursor-wait'
                  : 'bg-ink text-paper hover:bg-ink/92',
            )}
          >
            {added
              ? t('result.workspace.suggestions.added')
              : t('result.workspace.suggestions.addToChecklist')}
          </button>
        )}
      </div>
    </article>
  )
}

function filtersFor(s: SmartSuggestion, lang: 'de' | 'en'): string {
  const filters: string[] = []
  if (s.intents && s.intents.length > 0) {
    filters.push(
      lang === 'en'
        ? `applies to ${s.intents.join(' / ')}`
        : `gilt für ${s.intents.join(' / ')}`,
    )
  }
  if (s.bundeslaender && s.bundeslaender.length > 0) {
    filters.push(
      lang === 'en'
        ? `Bundesland: ${s.bundeslaender.join(', ')}`
        : `Bundesland: ${s.bundeslaender.join(', ')}`,
    )
  }
  if (s.scopeMatch) {
    filters.push(
      lang === 'en' ? 'matches your scope keywords' : 'passt zu Ihren Stichworten',
    )
  }
  if (filters.length === 0) {
    return lang === 'en'
      ? 'Generally relevant for projects of this kind.'
      : 'Allgemein relevant für Vorhaben dieser Art.'
  }
  return filters.join(' · ')
}
