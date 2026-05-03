import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { ProjectRow } from '@/types/db'

interface Props {
  project: ProjectRow | null
  onClose: () => void
  onConfirm: (id: string) => void
}

export function DeleteDialog({ project, onClose, onConfirm }: Props) {
  const { t } = useTranslation()
  const open = project !== null

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('dashboard.row.deleteDialog.h')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('dashboard.row.deleteDialog.body')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            {t('dashboard.row.deleteDialog.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (project) onConfirm(project.id)
            }}
          >
            {t('dashboard.row.deleteDialog.ok')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
