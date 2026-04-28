// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #68 — Chat workspace drag-and-drop zone
//
// Wraps the message column in a div that listens for drag events.
// On dragenter/over: render a drafting-blue dashed overlay + "Datei
// hier ablegen" badge. On drop: fire useUploadFile for each file
// with category='other'. Touch-only devices skip the listeners
// (pointer: coarse) so we don't waste cycles on non-DnD platforms.
// ───────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUploadFile } from '../hooks/useUploadFile'

interface Props {
  children: ReactNode
  /** True while a chat turn is in flight — drops are ignored. */
  disabled?: boolean
}

export function ChatDropZone({ children, disabled }: Props) {
  const { t } = useTranslation()
  const { id: projectId } = useParams<{ id: string }>()
  const upload = useUploadFile()
  const [active, setActive] = useState(false)
  const dragCounter = useRef(0)

  // Suppress on coarse pointers (touch). The overlay would never fire
  // anyway, but listening allocates DOM events on every render. Initial
  // value is read synchronously via useState's lazy init so we avoid a
  // setState-in-effect cascade on mount.
  const [isFinePointer, setIsFinePointer] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true
    return window.matchMedia('(pointer: fine)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(pointer: fine)')
    const handler = () => setIsFinePointer(mq.matches)
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])

  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (disabled || !isFinePointer) return
      // Only react to file drags (not text / element drags).
      if (!hasFiles(e.dataTransfer)) return
      e.preventDefault()
      dragCounter.current += 1
      setActive(true)
    },
    [disabled, isFinePointer],
  )

  const onDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (disabled || !isFinePointer) return
      e.preventDefault()
      dragCounter.current = Math.max(0, dragCounter.current - 1)
      if (dragCounter.current === 0) setActive(false)
    },
    [disabled, isFinePointer],
  )

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled || !isFinePointer) return
      if (!hasFiles(e.dataTransfer)) return
      // Set dropEffect so the cursor shows the copy icon.
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    },
    [disabled, isFinePointer],
  )

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      if (disabled || !isFinePointer || !projectId) return
      e.preventDefault()
      dragCounter.current = 0
      setActive(false)
      const files = Array.from(e.dataTransfer.files ?? []).slice(0, 5)
      for (const file of files) {
        try {
          await upload.mutateAsync({ projectId, file, category: 'other' })
        } catch {
          /* useUploadFile flagged the chip; nothing to do here */
        }
      }
    },
    [disabled, isFinePointer, projectId, upload],
  )

  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="relative"
    >
      {children}

      {active && (
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-2 z-30 flex items-center justify-center',
            'rounded-[var(--pm-radius-card)] border-2 border-dashed border-drafting-blue/60 bg-drafting-blue/[0.04]',
          )}
        >
          <div className="flex flex-col items-center gap-2 text-drafting-blue">
            <Paperclip className="size-6" aria-hidden="true" />
            <p className="text-[13px] font-medium tracking-tight">
              {t('chat.dropZone.title', {
                defaultValue: 'Datei hier ablegen',
              })}
            </p>
            <p className="text-[11px] italic opacity-80">
              {t('chat.dropZone.subtitle', {
                defaultValue:
                  'Pläne, Fotos und PDFs · max. 25 MB · bis zu 5 Dateien',
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function hasFiles(dt: DataTransfer): boolean {
  if (!dt) return false
  const types = dt.types
  if (!types) return false
  for (let i = 0; i < types.length; i++) {
    if (types[i] === 'Files') return true
  }
  return false
}
