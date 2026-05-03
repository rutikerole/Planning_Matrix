import { useEffect, useMemo, useState, useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ProjectListEntry } from '../hooks/useProjects'
import { useProjects } from '../hooks/useProjects'
import { useRecentActivity } from '../hooks/useRecentActivity'
import { useRelativeTime } from '../hooks/useRelativeTime'
import { computeLegalRefCounts, type LegalRefKey } from '../lib/legalRefCounts'
import { summarizeEvent } from '../lib/recentActivity'
import { deriveStatus } from '../lib/projectIntel'

type GroupKey = 'projects' | 'actions' | 'legal' | 'activity'

interface PaletteItem {
  id: string
  group: GroupKey
  ico: string
  title: string
  sub: string
  tag: string
  onSelect: () => void
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSignOut: () => void | Promise<void>
}

const GROUP_ORDER: GroupKey[] = ['projects', 'actions', 'legal', 'activity']
const LEGAL_REF_KEYS: LegalRefKey[] = ['baugb34', 'baugb35', 'baybo57', 'baybo58', 'baunvo6']

function shortAddress(addr: string | null | undefined): string {
  if (!addr) return ''
  return addr.split(',')[0]?.trim() || addr
}

function templateChip(templateId: string): string {
  return templateId.replace('-', '')
}

/**
 * v3 ⌘K palette. Radix Dialog shell, four groups (Projects /
 * Actions / Legal references / Activity), live filter on
 * title + sub, arrow-key nav with global wraparound, Enter
 * activates.
 */
export function CommandPalette({ open, onOpenChange, onSignOut }: Props) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { format } = useRelativeTime()
  const { data: projects = [] } = useProjects()
  const { data: events = [] } = useRecentActivity()

  const lang = i18n.language?.startsWith('en') ? 'en' : 'de'
  const otherLang = lang === 'en' ? 'de' : 'en'

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const counts = useMemo(() => computeLegalRefCounts(projects), [projects])

  const allItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = []

    // 1. Projects
    for (const p of projects as ProjectListEntry[]) {
      const status = deriveStatus(p)
      const tagKey =
        status === 'designer'
          ? 'designer'
          : status === 'active' || status === 'awaiting'
            ? 'active'
            : null
      items.push({
        id: `proj:${p.id}`,
        group: 'projects',
        ico: templateChip(p.template_id),
        title: p.name ?? '—',
        sub: p.plot_address ?? '',
        tag: tagKey ? t(`dashboard.palette.tags.${tagKey}`) : '',
        onSelect: () => {
          onOpenChange(false)
          navigate(`/projects/${p.id}`)
        },
      })
    }

    // 2. Actions
    items.push({
      id: 'action:newProject',
      group: 'actions',
      ico: '+',
      title: t('dashboard.palette.actions.newProject'),
      sub: t('dashboard.palette.actions.newProjectSub'),
      tag: t('dashboard.palette.tags.enter'),
      onSelect: () => {
        onOpenChange(false)
        navigate('/projects/new')
      },
    })
    items.push({
      id: 'action:signOut',
      group: 'actions',
      ico: '⏏',
      title: t('dashboard.palette.actions.signOut'),
      sub: t('dashboard.palette.actions.signOutSub'),
      tag: '',
      onSelect: () => {
        onOpenChange(false)
        void onSignOut()
      },
    })
    items.push({
      id: 'action:toggleLang',
      group: 'actions',
      ico: '↻',
      title: t('dashboard.palette.actions.toggleLang'),
      sub: t('dashboard.palette.actions.toggleLangSub'),
      tag: '',
      onSelect: () => {
        void i18n.changeLanguage(otherLang)
        onOpenChange(false)
      },
    })

    // 3. Legal references
    for (const k of LEGAL_REF_KEYS) {
      const title = t(`dashboard.palette.legalRefs.${k}.title`)
      const sub = `${t(`dashboard.palette.legalRefs.${k}.sub`)} · ${t(
        'dashboard.palette.projectsCount',
        { count: counts[k] },
      )}`
      items.push({
        id: `legal:${k}`,
        group: 'legal',
        ico: '§',
        title,
        sub,
        tag: t('dashboard.palette.tags.norm'),
        onSelect: () => {
          // Filter dashboard via URL search param (lightweight v1).
          onOpenChange(false)
          navigate(`/dashboard?legal=${k}`)
        },
      })
    }

    // 4. Activity
    for (const e of events.slice(0, 5)) {
      const sub = `${shortAddress(e.project_address)} · ${format(e.created_at)}`
      items.push({
        id: `event:${e.id}`,
        group: 'activity',
        ico: '●',
        title: summarizeEvent(e.event_type, lang),
        sub,
        tag: t('dashboard.palette.tags.event'),
        onSelect: () => {
          onOpenChange(false)
          navigate(`/projects/${e.project_id}`)
        },
      })
    }

    return items
  }, [projects, events, counts, format, lang, otherLang, t, i18n, navigate, onOpenChange, onSignOut])

  const filtered = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allItems
    return allItems.filter(
      (it) => `${it.title} ${it.sub}`.toLowerCase().includes(q),
    )
  }, [query, allItems])

  // Reset query + selection when palette opens. Focus on next tick.
  // (set-state-in-effect is required here — we sync local state to
  // the prop transition; refactoring to a handler would couple the
  // open prop to its consumer's lifecycle.)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      window.setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => (i + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      filtered[selectedIndex]?.onSelect()
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<GroupKey, PaletteItem[]>()
    for (const it of filtered) {
      const arr = map.get(it.group) ?? []
      arr.push(it)
      map.set(it.group, arr)
    }
    return map
  }, [filtered])

  const itemFlatIndex = useMemo(() => {
    const idx = new Map<string, number>()
    filtered.forEach((it, i) => idx.set(it.id, i))
    return idx
  }, [filtered])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[120px] !translate-y-0 max-w-[600px] overflow-hidden p-0">
        <DialogTitle className="sr-only">
          {t('dashboard.palette.open')}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t('dashboard.palette.open')}
        </DialogDescription>
        <div className="flex items-center gap-3.5 border-b border-pm-hair px-5 py-4">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
            className="text-pm-ink-mid"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKey}
            placeholder={t('dashboard.palette.open')}
            className="flex-1 border-0 bg-transparent font-serif text-[18px] text-pm-ink outline-none placeholder:text-pm-ink-mute2 focus:ring-0"
            aria-label={t('dashboard.palette.open')}
          />
          <span className="rounded-sm border border-pm-hair px-2 py-0.5 font-mono text-[11px] text-pm-ink-mute2">
            {t('dashboard.palette.esc')}
          </span>
        </div>

        <div className="max-h-[480px] overflow-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-5 py-6 text-center font-sans text-[13px] italic text-pm-ink-mute2">
              {t('dashboard.palette.empty')}
            </p>
          ) : (
            GROUP_ORDER.map((g) => {
              const items = grouped.get(g) ?? []
              if (items.length === 0) return null
              return (
                <div key={g}>
                  <div className="px-5 pb-1.5 pt-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-pm-ink-mute2">
                    {t(`dashboard.palette.groups.${g}`)}
                  </div>
                  {items.map((it) => {
                    const flat = itemFlatIndex.get(it.id) ?? -1
                    const isSel = flat === selectedIndex
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onMouseEnter={() => setSelectedIndex(flat)}
                        onClick={it.onSelect}
                        className={cn(
                          'grid w-full grid-cols-[36px_1fr_auto] items-center gap-3.5 px-5 py-2.5 text-left',
                          isSel ? 'bg-pm-paper-tint' : 'bg-transparent',
                          'transition-colors duration-soft',
                        )}
                      >
                        <span className="inline-flex size-7 items-center justify-center border border-pm-hair font-mono text-[10px] tracking-[0.06em] text-pm-ink-mid">
                          {it.ico}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-serif text-[15px] leading-tight text-pm-ink">
                            {it.title}
                          </span>
                          <span className="mt-0.5 block truncate font-mono text-[12px] tracking-[0.04em] text-pm-ink-mute2">
                            {it.sub}
                          </span>
                        </span>
                        {it.tag ? (
                          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-pm-clay">
                            {it.tag}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
