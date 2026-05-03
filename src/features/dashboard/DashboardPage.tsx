import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { Wordmark } from '@/components/shared/Wordmark'
import { BlueprintSubstrate } from '@/components/shared/BlueprintSubstrate'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { useProjects, type ProjectListEntry } from './hooks/useProjects'
import { useProjectMutations } from './hooks/useProjectMutations'
import { deriveStatus, intelCounts } from './lib/projectIntel'
import { computeLegalRefCounts } from './lib/legalRefCounts'
import { WelcomeBand } from './components/WelcomeBand'
import { FilterPills } from './components/FilterPills'
import { ProjectsSection } from './components/ProjectsSection'
import { EmptyState } from './components/EmptyState'
import { RenameDialog } from './components/RenameDialog'
import { DeleteDialog } from './components/DeleteDialog'
import { CommandPalette } from './components/CommandPalette'
import { FILTER_VALUES, type DashboardFilter } from './lib/filters'
import './styles/dashboard.css'

function welcomeFirstName(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string | null {
  const trimmed = fullName?.trim()
  if (trimmed) {
    const first = trimmed.split(/\s+/)[0]
    if (first) return first
  }
  if (email) {
    const local = email.split('@')[0] ?? ''
    if (!local) return null
    if (!/^[A-Za-zÄÖÜäöüß]/.test(local)) return null
    return local.charAt(0).toUpperCase() + local.slice(1)
  }
  return null
}

function matchesSearch(p: ProjectListEntry, query: string): boolean {
  if (!query.trim()) return true
  const haystack = [p.name, p.plot_address ?? ''].join(' ').toLowerCase()
  return haystack.includes(query.trim().toLowerCase())
}

function matchesFilter(p: ProjectListEntry, filter: DashboardFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'archived') {
    const s = deriveStatus(p)
    return s === 'archived' || s === 'completed'
  }
  return deriveStatus(p) === filter
}

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const auth = useAuth()
  const { user, profile } = useAuthStore()
  const { data: projects, isPending } = useProjects()
  const mutations = useProjectMutations()
  const [params] = useSearchParams()

  const [filter, setFilter] = useState<DashboardFilter>('all')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<ProjectListEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProjectListEntry | null>(null)

  // Legal-ref filter from the palette (?legal=baugb34 etc).
  const legalRef = params.get('legal') as keyof ReturnType<typeof computeLegalRefCounts> | null

  useEffect(() => {
    document.title = t('seo.title.dashboard')
    document.documentElement.lang = i18n.resolvedLanguage ?? 'de'
  }, [t, i18n.resolvedLanguage])

  // Global ⌘K opens the palette.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const all = useMemo(() => projects ?? [], [projects])
  const counts = useMemo(() => intelCounts(all), [all])
  const firstName = welcomeFirstName(profile?.full_name, user?.email)

  const filterCounts = useMemo<Record<DashboardFilter, number>>(() => {
    const out: Record<DashboardFilter, number> = {
      all: all.length,
      active: 0,
      awaiting: 0,
      designer: 0,
      paused: 0,
      archived: 0,
    }
    for (const p of all) {
      const s = deriveStatus(p)
      if (s === 'archived' || s === 'completed') out.archived++
      else if (s === 'active' || s === 'awaiting' || s === 'designer' || s === 'paused') {
        out[s]++
      }
    }
    return out
  }, [all])

  const filtered = useMemo(
    () =>
      all.filter(
        (p) =>
          matchesFilter(p, filter) &&
          matchesSearch(p, '') &&
          (!legalRef || projectMatchesLegalRef(p, legalRef)),
      ),
    [all, filter, legalRef],
  )

  const sectioned = useMemo(() => {
    const active: ProjectListEntry[] = []
    const awaitingDesigner: ProjectListEntry[] = []
    const paused: ProjectListEntry[] = []
    const archived: ProjectListEntry[] = []
    for (const p of filtered) {
      const s = deriveStatus(p)
      if (s === 'paused') paused.push(p)
      else if (s === 'archived' || s === 'completed') archived.push(p)
      else if (s === 'awaiting' || s === 'designer') awaitingDesigner.push(p)
      else active.push(p)
    }
    return { active, awaitingDesigner, paused, archived }
  }, [filtered])

  const showEmpty = !isPending && all.length === 0

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-pm-paper">
      <BlueprintSubstrate />

      <header className="relative z-10 border-b border-pm-hair bg-pm-paper/85 backdrop-blur-[2px] pt-safe">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-8 md:h-[72px]">
          <Wordmark tone="drafting-blue" />
          <div className="flex items-center gap-5">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command palette"
              className="rounded-sm border border-pm-hair px-2 py-0.5 font-mono text-[11px] text-pm-ink-mute2 transition-colors hover:bg-pm-paper-tint hover:text-pm-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
            >
              ⌘ K
            </button>
            <span aria-hidden="true" className="h-4 w-px bg-pm-ink/20" />
            <button
              type="button"
              onClick={() => void auth.signOut()}
              className="rounded-sm px-2.5 py-1.5 font-sans text-[13.5px] font-medium text-pm-ink-mid transition-colors hover:bg-pm-ink/[0.04] hover:text-pm-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
            >
              {t('dashboard.signOut')}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-12 px-8 py-12">
          {showEmpty ? (
            <>
              <WelcomeBand firstName={firstName} counts={counts} />
              <span aria-hidden="true" className="block h-px bg-pm-hair" />
              <EmptyState />
            </>
          ) : (
            <>
              <WelcomeBand firstName={firstName} counts={counts} />

              <div className="flex flex-col gap-5 border-b border-pm-hair pb-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="lg:hidden">
                  <Select value={filter} onValueChange={(v) => setFilter(v as DashboardFilter)}>
                    <SelectTrigger className="w-full max-w-[280px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILTER_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {t(`dashboard.filters.${v}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="hidden lg:block">
                  <FilterPills
                    current={filter}
                    onChange={setFilter}
                    counts={filterCounts}
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3.5">
                  <button
                    type="button"
                    onClick={() => setPaletteOpen(true)}
                    className="flex w-full max-w-[280px] items-center gap-2.5 border-b border-pm-hair-strong px-1 py-1.5 text-left transition-colors hover:border-pm-clay focus-visible:outline-none focus-visible:border-pm-clay"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      aria-hidden="true"
                      className="text-pm-ink-mid shrink-0"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                    <span className="flex-1 truncate font-sans text-[14px] text-pm-ink-mute2">
                      {t('dashboard.palette.open')}
                    </span>
                    <span className="rounded-sm border border-pm-hair px-1.5 py-0.5 font-mono text-[10px] text-pm-ink-mute2">
                      ⌘ K
                    </span>
                  </button>
                  <Link
                    to="/projects/new"
                    className="inline-flex items-center justify-center gap-2 bg-pm-clay px-5 py-2.5 font-sans text-[14px] text-pm-paper transition-colors hover:bg-pm-clay-deep motion-safe:hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    {t('dashboard.newProject')}
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-12">
                <ProjectsSection
                  kind="active"
                  projects={sectioned.active}
                  defaultExpanded
                  onRename={setRenameTarget}
                  onPauseToggle={(p) =>
                    mutations.setStatus.mutate({ id: p.id, status: 'paused' })
                  }
                  onArchive={(p) =>
                    mutations.setStatus.mutate({ id: p.id, status: 'archived' })
                  }
                  onExport={(p) => mutations.exportProject(p)}
                  onDelete={setDeleteTarget}
                />
                <ProjectsSection
                  kind="awaitingDesigner"
                  projects={sectioned.awaitingDesigner}
                  defaultExpanded
                  onRename={setRenameTarget}
                  onPauseToggle={(p) =>
                    mutations.setStatus.mutate({ id: p.id, status: 'paused' })
                  }
                  onArchive={(p) =>
                    mutations.setStatus.mutate({ id: p.id, status: 'archived' })
                  }
                  onExport={(p) => mutations.exportProject(p)}
                  onDelete={setDeleteTarget}
                />
                <ProjectsSection
                  kind="paused"
                  projects={sectioned.paused}
                  defaultExpanded={false}
                  onRename={setRenameTarget}
                  onPauseToggle={(p) =>
                    mutations.setStatus.mutate({ id: p.id, status: 'in_progress' })
                  }
                  onArchive={(p) =>
                    mutations.setStatus.mutate({ id: p.id, status: 'archived' })
                  }
                  onExport={(p) => mutations.exportProject(p)}
                  onDelete={setDeleteTarget}
                />
                <ProjectsSection
                  kind="archived"
                  projects={sectioned.archived}
                  defaultExpanded={false}
                  onRename={setRenameTarget}
                  onPauseToggle={(p) =>
                    mutations.setStatus.mutate({ id: p.id, status: 'in_progress' })
                  }
                  onArchive={(p) =>
                    mutations.setStatus.mutate({ id: p.id, status: 'in_progress' })
                  }
                  onExport={(p) => mutations.exportProject(p)}
                  onDelete={setDeleteTarget}
                />
              </div>
            </>
          )}
        </div>
      </main>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onSignOut={() => auth.signOut()}
      />

      <RenameDialog
        project={renameTarget}
        onClose={() => setRenameTarget(null)}
        onSave={(id, name) => {
          mutations.rename.mutate({ id, name })
          setRenameTarget(null)
        }}
      />
      <DeleteDialog
        project={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(id) => {
          mutations.remove.mutate({ id })
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}

const LEGAL_PATTERNS: Record<string, RegExp> = {
  baugb34: /(§\s*34\s*BauGB|BauGB\s*§\s*34)/i,
  baugb35: /(§\s*35\s*BauGB|BauGB\s*§\s*35)/i,
  baybo57: /(BayBO\s*Art\.?\s*57|Art\.?\s*57\s*BayBO)/i,
  baybo58: /(BayBO\s*Art\.?\s*58|Art\.?\s*58\s*BayBO)/i,
  baunvo6: /(BauNVO\s*§\s*6|§\s*6\s*BauNVO|Mischgebiet)/i,
}

function projectMatchesLegalRef(p: ProjectListEntry, key: string): boolean {
  const pattern = LEGAL_PATTERNS[key]
  if (!pattern) return true
  const state = p.state as { facts?: Array<{ value?: unknown; evidence?: string }> } | null
  const facts = state?.facts ?? []
  for (const f of facts) {
    const evidence = typeof f.evidence === 'string' ? f.evidence : ''
    let value: string
    try {
      value = typeof f.value === 'string' ? f.value : JSON.stringify(f.value ?? '')
    } catch {
      value = ''
    }
    if (pattern.test(`${evidence} ${value}`)) return true
  }
  return false
}
