// ───────────────────────────────────────────────────────────────────────
// Phase 3.8 #84 — MobileAttachmentSheet
//
// Mobile-native attachment surface. Replaces the desktop popover from
// Phase 3.6's AttachmentPicker on mobile. Three rows in a vaul drawer:
//
//   📷  Foto aufnehmen          → camera (capture="environment")
//   🖼️  Aus Galerie wählen      → photo library
//   📄  Datei wählen             → document picker (PDFs etc)
//
// Each row is a label wrapping a hidden file input with the correct
// `accept` + `capture` attributes — taps on the row trigger the
// native picker without a click intermediary, which is the only
// way iOS Safari reliably opens the camera.
//
// Q3 locked: capture="environment" enables rear camera for plot photos.
// ───────────────────────────────────────────────────────────────────────

import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Drawer } from 'vaul'
import { Camera, FileText, Image as ImageIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileCategory } from '@/types/chatInput'
import { useUploadFile } from '../../hooks/useUploadFile'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
}

const DOC_ACCEPT =
  '.pdf,.doc,.docx,.dwg,.dxf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export function MobileAttachmentSheet({ open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const { id: projectId } = useParams<{ id: string }>()
  const upload = useUploadFile()
  const [busy, setBusy] = useState(false)
  const cameraId = useId()
  const galleryId = useId()
  const fileId = useId()

  const handlePicked = async (
    files: FileList | null,
    category: FileCategory,
  ) => {
    if (!files || files.length === 0 || !projectId || busy) return
    setBusy(true)
    try {
      onOpenChange(false)
      const slice = Array.from(files).slice(0, 5)
      for (const file of slice) {
        try {
          await upload.mutateAsync({ projectId, file, category })
        } catch {
          /* useUploadFile flips chip to failed; nothing to do here */
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const heading = t('chat.input.attachment.title', {
    defaultValue: 'Datei anhängen',
  })

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction="bottom">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-40" />
        <Drawer.Content
          aria-label={heading}
          className="fixed inset-x-0 bottom-0 z-50 bg-paper border-t border-ink/15 outline-none px-4 pt-3 pb-safe rounded-t-[var(--pm-radius-card-lg,1rem)]"
        >
          <Drawer.Title className="sr-only">{heading}</Drawer.Title>

          {/* Drawer handle */}
          <div className="flex justify-center mb-3">
            <span className="block h-1 w-10 rounded-full bg-clay/40" />
          </div>

          <div className="flex items-center justify-between mb-2 px-2">
            <span className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-clay/85">
              {heading}
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label={t('chat.input.attachment.close', {
                defaultValue: 'Schließen',
              })}
              className="size-8 inline-flex items-center justify-center rounded-full text-ink/55 hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <ul className="flex flex-col gap-1 pb-4">
            <SheetRow
              icon={Camera}
              label={t('chat.input.attachment.camera', {
                defaultValue: 'Foto aufnehmen',
              })}
              hint={t('chat.input.attachment.cameraHint', {
                defaultValue: 'Kamera · Rückseite',
              })}
              htmlFor={cameraId}
            >
              <input
                id={cameraId}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePicked(e.target.files, 'photo')}
                className="sr-only"
              />
            </SheetRow>
            <SheetRow
              icon={ImageIcon}
              label={t('chat.input.attachment.gallery', {
                defaultValue: 'Aus Galerie wählen',
              })}
              hint={t('chat.input.attachment.galleryHint', {
                defaultValue: 'Bilder vom Gerät',
              })}
              htmlFor={galleryId}
            >
              <input
                id={galleryId}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePicked(e.target.files, 'photo')}
                className="sr-only"
              />
            </SheetRow>
            <SheetRow
              icon={FileText}
              label={t('chat.input.attachment.document', {
                defaultValue: 'Datei wählen',
              })}
              hint={t('chat.input.attachment.documentHint', {
                defaultValue: 'PDF, DOCX, DWG · max. 25 MB',
              })}
              htmlFor={fileId}
            >
              <input
                id={fileId}
                type="file"
                accept={DOC_ACCEPT}
                multiple
                onChange={(e) => handlePicked(e.target.files, 'other')}
                className="sr-only"
              />
            </SheetRow>
          </ul>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

interface SheetRowProps {
  icon: typeof Camera
  label: string
  hint: string
  htmlFor: string
  children: React.ReactNode
}

function SheetRow({ icon: Icon, label, hint, htmlFor, children }: SheetRowProps) {
  return (
    <li>
      <label
        htmlFor={htmlFor}
        className={cn(
          'group flex items-center gap-3 px-3 py-3 cursor-pointer rounded-[var(--pm-radius-card,0.5rem)]',
          'border border-ink/10 bg-paper hover:border-ink/25 hover:bg-ink/[0.02] transition-colors duration-soft',
          'min-h-[56px]',
        )}
      >
        <span className="size-10 inline-flex items-center justify-center rounded-full bg-drafting-blue/15 text-drafting-blue">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <span className="flex flex-col min-w-0">
          <span className="text-[15px] font-medium text-ink leading-tight">{label}</span>
          <span className="text-[12px] italic text-clay/72 leading-tight mt-0.5">
            {hint}
          </span>
        </span>
        {children}
      </label>
    </li>
  )
}
