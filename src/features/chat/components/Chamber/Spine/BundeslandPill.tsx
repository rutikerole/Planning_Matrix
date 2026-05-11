// v1.0.7 Bug 10 — Update Bundesland pill + dialog.
//
// Surfaces the current `projects.bundesland` value in the chat
// sidebar and lets the bauherr correct it post-creation. Needed
// because v1.0.6 fixed the wizard hardcode for NEW projects (Bug 0)
// but EXISTING projects created pre-v1.0.6 still carry the legacy
// 'bayern' value regardless of address. Without this control the
// only paths to fix an existing project are an SQL UPDATE or a
// fresh project, neither of which is appropriate for the bauherr
// audience.
//
// On confirm: writes `projects.bundesland` via the Supabase JS
// client (RLS-allowed because the caller is the project owner) +
// invalidates the project + chat-state queries so the next chat
// turn composes the prompt prefix against the corrected state.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { BundeslandCode } from '@/legal/states/_types'

const BUNDESLAND_OPTIONS: ReadonlyArray<{ code: BundeslandCode; labelKey: string }> = [
  { code: 'bayern',         labelKey: 'bundesland.bayern' },
  { code: 'bw',             labelKey: 'bundesland.baden_wuerttemberg' },
  { code: 'berlin',         labelKey: 'bundesland.berlin' },
  { code: 'brandenburg',    labelKey: 'bundesland.brandenburg' },
  { code: 'bremen',         labelKey: 'bundesland.bremen' },
  { code: 'hamburg',        labelKey: 'bundesland.hamburg' },
  { code: 'hessen',         labelKey: 'bundesland.hessen' },
  { code: 'mv',             labelKey: 'bundesland.mecklenburg_vorpommern' },
  { code: 'niedersachsen',  labelKey: 'bundesland.niedersachsen' },
  { code: 'nrw',            labelKey: 'bundesland.nordrhein_westfalen' },
  { code: 'rlp',            labelKey: 'bundesland.rheinland_pfalz' },
  { code: 'saarland',       labelKey: 'bundesland.saarland' },
  { code: 'sachsen',        labelKey: 'bundesland.sachsen' },
  { code: 'sachsen-anhalt', labelKey: 'bundesland.sachsen_anhalt' },
  { code: 'sh',             labelKey: 'bundesland.schleswig_holstein' },
  { code: 'thueringen',     labelKey: 'bundesland.thueringen' },
] as const

interface Props {
  projectId: string
  currentBundesland: string | null | undefined
}

export function BundeslandPill({ projectId, currentBundesland }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const initial = (currentBundesland ?? 'bayern') as BundeslandCode
  const [selected, setSelected] = useState<BundeslandCode>(initial)

  const mutation = useMutation({
    mutationFn: async (next: BundeslandCode) => {
      const { data, error } = await supabase
        .from('projects')
        .update({ bundesland: next })
        .eq('id', projectId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate so the chat workspace re-reads project.bundesland
      // and the next chat turn composes the correct prompt prefix.
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['messages', projectId] })
      setOpen(false)
    },
  })

  const currentLabel = (() => {
    const opt = BUNDESLAND_OPTIONS.find((o) => o.code === initial)
    return opt ? t(opt.labelKey) : t('bundesland.bayern')
  })()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setSelected(initial)
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'mt-2 inline-flex items-center gap-1.5 rounded-sm px-1 py-0.5',
            'font-mono text-[10.5px] uppercase tracking-[0.18em] text-clay/85',
            'transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/55 focus-visible:ring-offset-1',
          )}
        >
          <span>{t('chat.spine.bundesland.label')}: {currentLabel}</span>
          <span aria-hidden="true" className="text-clay underline underline-offset-2">
            {t('chat.spine.bundesland.update')}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('chat.spine.bundesland.dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('chat.spine.bundesland.dialog.body')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="bundesland-update-select"
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-clay"
          >
            {t('chat.spine.bundesland.label')}
          </label>
          <select
            id="bundesland-update-select"
            value={selected}
            onChange={(e) => setSelected(e.target.value as BundeslandCode)}
            className="w-full border border-pm-hair bg-pm-paper px-3 py-2 font-sans text-[14px] text-ink"
          >
            {BUNDESLAND_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
          {mutation.isError ? (
            <p className="text-[12px] text-clay-deep">
              {t('chat.spine.bundesland.dialog.error')}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 items-center px-3 font-sans text-[13px] text-clay-deep hover:text-ink"
          >
            {t('chat.spine.bundesland.dialog.cancel')}
          </button>
          <button
            type="button"
            disabled={mutation.isPending || selected === initial}
            onClick={() => mutation.mutate(selected)}
            className={cn(
              'inline-flex h-9 items-center px-4 font-sans text-[13px]',
              selected === initial || mutation.isPending
                ? 'cursor-not-allowed bg-ink/15 text-paper/80'
                : 'bg-clay text-paper hover:bg-clay-deep',
            )}
          >
            {mutation.isPending
              ? t('chat.spine.bundesland.dialog.saving')
              : t('chat.spine.bundesland.dialog.confirm')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
