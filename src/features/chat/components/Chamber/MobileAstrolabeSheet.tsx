// Phase 7 Chamber — MobileAstrolabeSheet.
//
// On mobile (< 640px), the full astrolabe never appears in the top
// region. Tapping the compact astrolabe in the sticky header opens
// this vaul bottom-sheet showing:
//   - Full astrolabe (132px, non-interactive)
//   - SpecialistTeam strip (24px sigils)
//   - LedgerPeek summary
//   - The same Briefing CTA prominence as the inline thread version

import { useTranslation } from 'react-i18next'
import { Drawer } from 'vaul'
import type { ProjectRow } from '@/types/db'
import type { LedgerSummary } from '@/lib/projectStateHelpers'
import type { ChamberProgress } from '../../hooks/useChamberProgress'
import { Astrolabe } from './Astrolabe'
import { SpecialistTeam } from './SpecialistTeam'
import { LedgerPeek } from './LedgerPeek'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
  project: ProjectRow
  progress: ChamberProgress
  summary: LedgerSummary
}

export function MobileAstrolabeSheet({
  open,
  onOpenChange,
  project,
  progress,
  summary,
}: Props) {
  const { t } = useTranslation()
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="bottom">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-40" />
        <Drawer.Content
          aria-label={t('chat.chamber.standUpTitle')}
          className="fixed inset-x-0 bottom-0 z-50 bg-paper border-t border-[var(--hairline-strong)] outline-none px-5 pt-6 pb-8 rounded-t-[1rem] flex flex-col gap-5 max-h-[85vh] overflow-y-auto"
        >
          <Drawer.Title className="sr-only">
            {t('chat.chamber.standUpTitle')}
          </Drawer.Title>
          <div className="flex flex-col items-center gap-4">
            <Astrolabe
              percent={progress.percent}
              currentTurn={progress.currentTurn}
              totalEstimate={progress.totalEstimate}
              currentSpecialist={progress.recentSpecialist}
              spokenSpecialists={progress.spokenSpecialists}
              size="full"
            />
            <SpecialistTeam
              active={progress.recentSpecialist}
              spoken={progress.spokenSpecialists}
              size="md"
            />
          </div>
          <LedgerPeek
            projectId={project.id}
            projectName={project.name}
            summary={summary}
            variant="sheet"
          />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
