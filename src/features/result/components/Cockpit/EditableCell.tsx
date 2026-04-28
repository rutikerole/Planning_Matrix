// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #71 — Inline editor for CLIENT-source fact values
//
// Q4 (locked): every CLIENT-source fact is editable from the cockpit.
// Click value → an input replaces the cell. Enter saves; Esc cancels;
// blur saves. Save dispatches the parent's onSave; the parent owns
// the projects.update + cache mirror so this component stays presentational.
// ───────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  /** Disables the editor (e.g. for non-CLIENT facts). */
  readOnly?: boolean
  onSave: (next: string) => Promise<void> | void
  ariaLabel?: string
}

export function EditableCell({ value, readOnly, onSave, ariaLabel }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  // Re-sync draft when an upstream change overwrites the value.
  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  const save = async () => {
    if (busy) return
    const next = draft.trim()
    if (next.length === 0 || next === value) {
      setEditing(false)
      setDraft(value)
      return
    }
    setBusy(true)
    try {
      await onSave(next)
      setEditing(false)
    } catch {
      // Keep editing open so the user can retry. The parent surfaces
      // errors via console.warn / future toast.
    } finally {
      setBusy(false)
    }
  }

  if (readOnly) {
    return <span className="text-[13px] text-ink leading-snug">{value}</span>
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={ariaLabel}
        className={cn(
          'group inline-flex items-baseline gap-1.5 text-left text-[13px] text-ink leading-snug rounded-[2px]',
          'hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'px-1 -mx-1',
        )}
      >
        <span className="truncate">{value}</span>
        <Pencil
          aria-hidden="true"
          className="size-3 text-ink/30 group-hover:text-ink/70 transition-colors duration-soft"
        />
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={draft}
      disabled={busy}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          void save()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setDraft(value)
          setEditing(false)
        }
      }}
      aria-label={ariaLabel}
      className="w-full max-w-full min-w-0 px-1 -mx-1 h-9 sm:h-7 bg-paper border border-ink/35 rounded-[2px] text-[16px] sm:text-[13px] text-ink focus:outline-none focus:border-ink"
    />
  )
}
