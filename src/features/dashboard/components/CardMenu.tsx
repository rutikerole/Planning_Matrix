import { type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { ProjectRow } from '@/types/db'

interface Props {
  project: ProjectRow
  onRename: () => void
  onPauseToggle: () => void
  onArchive: () => void
  onExport: () => void
  onDelete: () => void
}

/**
 * v3 three-dot menu on a project card. Visible on hover at md+ and
 * always visible on touch devices via `@media (hover: none)` (the
 * `pm-card-menu` class flips opacity to 1 on coarse pointers).
 *
 * Click on trigger does NOT bubble — the parent card's `<Link>`
 * should not navigate when the user opens the menu.
 */
export function CardMenu({
  project,
  onRename,
  onPauseToggle,
  onArchive,
  onExport,
  onDelete,
}: Props) {
  const { t } = useTranslation()
  const isPaused = project.status === 'paused'

  const handleTriggerClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Project actions"
          onClick={handleTriggerClick}
          className={cn(
            'pm-card-menu',
            'inline-flex size-8 items-center justify-center rounded-sm font-sans text-[16px] leading-none text-pm-ink-mid',
            'transition-opacity hover:bg-pm-paper-tint hover:text-pm-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper',
            'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          )}
        >
          ⋯
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onRename}>
          {t('dashboard.row.menu.rename')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onPauseToggle}>
          {isPaused ? t('dashboard.row.menu.resume') : t('dashboard.row.menu.pause')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onArchive}>
          {t('dashboard.row.menu.archive')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExport}>
          {t('dashboard.row.menu.export')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-pm-clay-deep data-[highlighted]:bg-pm-clay/10"
        >
          {t('dashboard.row.menu.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
