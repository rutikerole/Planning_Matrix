// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #68 — AttachmentPicker (real implementation)
//
// Replaces the #67 Coming-Soon stub. Two surfaces:
//   • Desktop popover  — anchored above the paperclip; primary CTA
//     opens the file dialog; below it, a compact category select
//     (Q3 locked: optional, default 'other').
//   • Mobile vaul drawer — same controls, full-width.
//
// File validation + storage upload + project_files insert all live in
// `useUploadFile` / `uploadApi`. The picker just orchestrates: pick →
// validate → kick off the mutation → close.
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Drawer } from 'vaul'
import { Paperclip, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FileCategory } from '@/types/chatInput'
import { useUploadFile } from '../../hooks/useUploadFile'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
}

const CATEGORY_OPTIONS: Array<{
  value: FileCategory
  label_de: string
  label_en: string
}> = [
  { value: 'other', label_de: 'Sonstiges', label_en: 'Other' },
  { value: 'plot_plan', label_de: 'Lageplan', label_en: 'Site plan' },
  { value: 'building_plan', label_de: 'Bauzeichnung', label_en: 'Building drawing' },
  { value: 'b_plan', label_de: 'Bebauungsplan', label_en: 'Development plan' },
  { value: 'photo', label_de: 'Foto', label_en: 'Photo' },
  { value: 'grundbuch', label_de: 'Grundbuch', label_en: 'Land registry' },
  {
    value: 'energy_certificate',
    label_de: 'Energieausweis',
    label_en: 'Energy certificate',
  },
]

const ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.doc,.docx,.dwg,.dxf,application/pdf,image/png,image/jpeg,image/jpg'

export function AttachmentPicker({ open, onOpenChange }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'
  const { id: projectId } = useParams<{ id: string }>()
  const upload = useUploadFile()
  const panelRef = useRef<HTMLDivElement>(null)
  const fileInputId = useId()
  const [category, setCategory] = useState<FileCategory>('other')

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onOpenChange(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', onClick)
    }, 0)
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(id)
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !projectId) return
    onOpenChange(false)
    // Up to 5 files per click — beyond that we drop the rest with a
    // friendly message below the input bar (#67's chip surface
    // surfaces failed uploads via the chip's red border).
    const slice = Array.from(files).slice(0, 5)
    for (const file of slice) {
      try {
        await upload.mutateAsync({ projectId, file, category })
      } catch {
        // useUploadFile already flips the chip to `failed` and stamps
        // the error message — nothing more to do here.
      }
    }
  }

  const heading = t('chat.input.attachment.title', {
    defaultValue: 'Datei anhängen',
  })
  const helper = t('chat.input.attachment.helper', {
    defaultValue:
      'Pläne, Fotos und PDFs · max. 25 MB · PDF, JPG, PNG, DOCX, DWG.',
  })
  const categoryLabel = t('chat.input.attachment.category', {
    defaultValue: 'Kategorie',
  })

  const Body = (
    <>
      <p className="text-[12px] italic text-clay/75 leading-relaxed">{helper}</p>

      <label
        htmlFor={`${fileInputId}-category`}
        className="text-[11px] font-medium uppercase tracking-[0.18em] text-clay/85 mt-1"
      >
        {categoryLabel}
      </label>
      <select
        id={`${fileInputId}-category`}
        value={category}
        onChange={(e) => setCategory(e.target.value as FileCategory)}
        className="h-9 px-3 bg-paper border border-ink/15 text-[13px] text-ink rounded-[var(--pm-radius-input)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {CATEGORY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {lang === 'en' ? opt.label_en : opt.label_de}
          </option>
        ))}
      </select>

      <input
        id={fileInputId}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="sr-only"
      />
      <label
        htmlFor={fileInputId}
        className={cn(
          'mt-2 inline-flex w-full items-center justify-center gap-2 h-10 px-4 cursor-pointer text-[13px] font-medium text-paper bg-ink hover:bg-ink/92 rounded-[var(--pm-radius-input)] transition-colors duration-soft',
          'focus-within:outline-none focus-within:ring-2 focus-within:ring-ink focus-within:ring-offset-2 focus-within:ring-offset-background',
        )}
      >
        <Paperclip className="size-4" aria-hidden="true" />
        {t('chat.input.attachment.choose', {
          defaultValue: 'Dateien auswählen…',
        })}
      </label>
    </>
  )

  return (
    <>
      {/* Desktop popover. */}
      <div className="hidden md:block">
        {open && (
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={heading}
            className="absolute left-0 bottom-full mb-3 w-[340px] z-30 bg-paper border border-ink/15 shadow-[0_8px_32px_-12px_hsl(220_15%_11%/0.22)] rounded-[var(--pm-radius-card)] p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-clay/85">
                <Paperclip aria-hidden="true" className="size-3.5" />
                {heading}
              </span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label={t('chat.input.attachment.close', {
                  defaultValue: 'Schließen',
                })}
                className="size-7 inline-flex items-center justify-center rounded-full text-ink/55 hover:text-ink hover:bg-ink/[0.06] transition-colors duration-soft"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </div>
            {Body}
          </div>
        )}
      </div>

      {/* Mobile drawer. */}
      <div className="md:hidden">
        <Drawer.Root open={open} onOpenChange={onOpenChange} direction="bottom">
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-40" />
            <Drawer.Content
              aria-label={heading}
              className="fixed inset-x-0 bottom-0 z-50 bg-paper border-t border-ink/15 outline-none px-6 pt-6 pb-10 rounded-t-[var(--pm-radius-card)] flex flex-col gap-3"
            >
              <Drawer.Title className="sr-only">{heading}</Drawer.Title>
              <div className="flex items-center justify-between mb-1">
                <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-clay/85">
                  <Paperclip aria-hidden="true" className="size-3.5" />
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
              {Body}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      </div>
    </>
  )
}
