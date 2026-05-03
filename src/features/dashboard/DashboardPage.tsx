import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
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
import { WelcomeBand } from './components/WelcomeBand'
import { FilterPills } from './components/FilterPills'
import { FILTER_VALUES, type DashboardFilter } from './lib/filters'
import { ProjectSearch } from './components/ProjectSearch'
import { ProjectsSection } from './components/ProjectsSection'
import { EmptyState } from './components/EmptyState'
import { RenameDialog } from './components/RenameDialog'
import { DeleteDialog } from './components/DeleteDialog'

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

  const [filter, setFilter] = useState<DashboardFilter>('all')
  const [query, setQuery] = useState('')
  const [renameTarget, setRenameTarget] = useState<ProjectListEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProjectListEntry | null>(null)

  useEffect(() => {
    document.title = t('seo.title.dashboard')
    document.documentElement.lang = i18n.resolvedLanguage ?? 'de'
  }, [t, i18n.resolvedLanguage])

  const all = useMemo(() => projects ?? [], [projects])
  const counts = useMemo(() => intelCounts(all), [all])
  const firstName = welcomeFirstName(profile?.full_name, user?.email)

  // Per-filter counts feed the pill labels.
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
    () => all.filter((p) => matchesFilter(p, filter) && matchesSearch(p, query)),
    [all, filter, query],
  )

  const sectioned = useMemo(() => {
    const active: ProjectListEntry[] = []
    const paused: ProjectListEntry[] = []
    const archived: ProjectListEntry[] = []
    for (const p of filtered) {
      const s = deriveStatus(p)
      if (s === 'paused') paused.push(p)
      else if (s === 'archived' || s === 'completed') archived.push(p)
      else active.push(p)
    }
    return { active, paused, archived }
  }, [filtered])

  const showEmpty = !isPending && all.length === 0

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-pm-paper">
      <BlueprintSubstrate />

      <header className="relative z-10 border-b border-pm-hair bg-pm-paper/85 backdrop-blur-[2px] pt-safe">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:h-[72px] lg:px-8">
          <Wordmark tone="drafting-blue" />
          <div className="flex items-center gap-5">
            <LanguageSwitcher />
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
        <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-12 lg:px-8">
          {showEmpty ? (
            <>
              <WelcomeBand firstName={firstName} counts={counts} />
              <span aria-hidden="true" className="block h-px bg-pm-hair" />
              <EmptyState />
            </>
          ) : (
            <>
              <WelcomeBand firstName={firstName} counts={counts} />

              {/* Action bar */}
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                {/* Mobile/tablet: filter dropdown */}
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

                {/* Desktop: filter pills */}
                <div className="hidden lg:block">
                  <FilterPills
                    current={filter}
                    onChange={setFilter}
                    counts={filterCounts}
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <ProjectSearch value={query} onChange={setQuery} />
                  <Link
                    to="/projects/new"
                    className="inline-flex items-center justify-center bg-pm-clay px-5 py-2.5 font-sans text-[14px] text-pm-paper transition-colors hover:bg-pm-clay-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
                  >
                    + {t('dashboard.newProject')}
                  </Link>
                </div>
              </div>

              <span aria-hidden="true" className="block h-px bg-pm-hair" />

              {/* Sections */}
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
