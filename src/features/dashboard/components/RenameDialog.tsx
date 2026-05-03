import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ProjectRow } from '@/types/db'

interface Props {
  project: ProjectRow | null
  onClose: () => void
  onSave: (id: string, name: string) => void
}

export function RenameDialog({ project, onClose, onSave }: Props) {
  return (
    <Dialog
      open={project !== null}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent>
        {project ? (
          <Form
            key={project.id}
            project={project}
            onClose={onClose}
            onSave={onSave}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function Form({
  project,
  onClose,
  onSave,
}: {
  project: ProjectRow
  onClose: () => void
  onSave: (id: string, name: string) => void
}) {
  const { t } = useTranslation()
  // Remounted via parent key={project.id} when target changes —
  // initial state stays in lockstep with the project being renamed.
  const [value, setValue] = useState(project.name ?? '')

  const trimmed = value.trim()

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('dashboard.row.renameDialog.h')}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('dashboard.row.renameDialog.description')}
        </DialogDescription>
      </DialogHeader>
      <label className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-pm-clay">
          {t('dashboard.row.renameDialog.label')}
        </span>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && trimmed) {
              onSave(project.id, trimmed)
            }
          }}
          className="w-full border-0 border-b border-pm-ink/25 bg-transparent py-2 font-sans text-[16px] text-pm-ink transition-colors focus:border-pm-clay focus:outline-none focus:ring-0"
        />
      </label>
      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center border border-pm-hair bg-transparent px-5 py-2.5 font-sans text-[14px] text-pm-ink transition-colors hover:bg-pm-paper-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
        >
          {t('dashboard.row.renameDialog.cancel')}
        </button>
        <button
          type="button"
          disabled={!trimmed}
          onClick={() => {
            if (trimmed) onSave(project.id, trimmed)
          }}
          className="inline-flex items-center justify-center bg-pm-clay px-5 py-2.5 font-sans text-[14px] text-pm-paper transition-colors hover:bg-pm-clay-deep disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pm-clay focus-visible:ring-offset-2 focus-visible:ring-offset-pm-paper"
        >
          {t('dashboard.row.renameDialog.save')}
        </button>
      </DialogFooter>
    </>
  )
}
