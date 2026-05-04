// Phase 7 Chamber — AttachmentPicker placeholder.
// Mounts a simple file-input bridge to useUploadFile. Real richer
// picker (camera / gallery / document split on mobile) lands in commit 14.

import { useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUploadFile } from '../../hooks/useUploadFile'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
}

export function AttachmentPicker({ open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const { id: projectId } = useParams<{ id: string }>()
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadFile()

  if (!open) return null

  const handleFiles = (files: FileList | null) => {
    if (!files || !projectId) return
    Array.from(files).slice(0, 5).forEach((file) =>
      upload.mutate({ projectId, file, category: 'other' }),
    )
    onOpenChange(false)
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-label={t('chat.input.attachment.title', { defaultValue: 'Datei anhängen' })}
        className="absolute left-0 bottom-full mb-3 z-50 w-[280px] bg-paper border border-[var(--hairline-strong)] rounded-md shadow-[0_10px_36px_-8px_rgba(26,22,18,0.18)] p-3"
      >
        <p className="font-serif italic text-[14px] text-ink mb-2 px-1">
          {t('chat.input.attachment.title', { defaultValue: 'Datei anhängen' })}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf,.docx,.dwg"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full text-left px-3 py-2 rounded-md hover:bg-[hsl(var(--clay)/0.08)] transition-colors duration-150"
        >
          <p className="text-[14px] text-ink leading-tight">
            {t('chat.input.attachment.choose', { defaultValue: 'Dateien auswählen…' })}
          </p>
          <p className="text-[11.5px] text-clay/82">
            {t('chat.input.attachment.helper')}
          </p>
        </button>
      </div>
    </>
  )
}
