import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { Check, Copy, Mail, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { ProjectRow } from '@/types/db'
import {
  createArchitectInvite,
  type ArchitectInvite,
} from '../lib/architectInviteApi'

interface Props {
  project: ProjectRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * C7 (Bug 29) — owner-side verification-invite modal.
 *
 * DISTINCT from SendToArchitectModal (which mints a read-only 30-day
 * briefing link). This calls share-project CREATE → an architect
 * MEMBERSHIP invite that grants verify-fact WRITE access. Visual
 * hierarchy is deliberately different: emerald "verified" accent +
 * Check icon (vs the clay/dashed read-only share styling), explicit
 * write-access copy, and a close-confirm if the link wasn't copied.
 *
 * Bug 114 — the invite is minted on an explicit "create" submit (a
 * mutation), NOT on open, so the token can be BOUND to the architect's
 * email at create-time. A user-initiated mutation also fires exactly once
 * per click, so React 19 strict-mode cannot mint duplicate
 * project_members rows.
 */
export function InviteArchitectModal({ project, open, onOpenChange }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')

  // Bug 114 — bind the invite to this email at create-time. The link is minted
  // only when the owner submits a valid address; the server rejects any other
  // caller from accepting it.
  const emailTrimmed = email.trim()
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailTrimmed)

  const inviteMutation = useMutation<ArchitectInvite, Error>({
    mutationFn: () => createArchitectInvite(project.id, emailTrimmed),
  })
  const invite = inviteMutation.data ?? null
  const loading = inviteMutation.isPending
  const error =
    inviteMutation.error instanceof Error
      ? inviteMutation.error.message
      : inviteMutation.error
        ? String(inviteMutation.error)
        : null

  const expiryHuman = invite
    ? new Date(invite.expiresAt).toLocaleDateString(
        lang === 'en' ? 'en-GB' : 'de-DE',
        { day: '2-digit', month: 'long', year: 'numeric' },
      )
    : ''

  const handleOpenChange = (next: boolean) => {
    // Don't lose an uncopied invite on accidental close.
    if (!next && invite && !copied) {
      const proceed = window.confirm(
        t('result.workspace.inviteArchitect.closeConfirm'),
      )
      if (!proceed) return
    }
    if (!next) {
      setCopied(false)
      setEmail('')
      inviteMutation.reset()
    }
    onOpenChange(next)
  }

  const handleCopy = async () => {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.acceptUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2400)
    } catch {
      // clipboard denied — the link is visible in the read-only field
    }
  }

  const handleMailto = () => {
    if (!invite) return
    const subject = t('result.workspace.inviteArchitect.subject', {
      name: project.name,
    })
    const body = t('result.workspace.inviteArchitect.mailBody', {
      name: project.name,
      acceptUrl: invite.acceptUrl,
      expiry: expiryHuman,
    })
    const to = email.trim() ? encodeURIComponent(email.trim()) : ''
    const url =
      `mailto:${to}?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`
    window.location.assign(url)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="bg-paper border border-emerald-700/30 rounded-[10px] p-6 max-w-[480px] flex flex-col gap-4"
        aria-describedby="invite-architect-desc"
      >
        <div className="flex items-baseline justify-between gap-3">
          <DialogTitle className="inline-flex items-center gap-2 font-serif italic text-[20px] text-ink leading-snug">
            <Check aria-hidden="true" className="size-4 text-emerald-700" />
            {t('result.workspace.inviteArchitect.modalTitle')}
          </DialogTitle>
          <DialogClose
            className="size-7 inline-flex items-center justify-center rounded-full text-ink/45 hover:text-ink hover:bg-ink/[0.06] transition-colors duration-soft"
            aria-label={t('result.workspace.inviteArchitect.close')}
          >
            <X aria-hidden="true" className="size-3.5" />
          </DialogClose>
        </div>

        <DialogDescription
          id="invite-architect-desc"
          className="text-[12.5px] text-ink/70 leading-relaxed"
        >
          {t('result.workspace.inviteArchitect.intro')}
        </DialogDescription>

        {loading && (
          <div className="inline-flex items-center gap-2 text-[12.5px] text-ink/65">
            <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            {t('result.workspace.inviteArchitect.loading')}
          </div>
        )}

        {error && !loading && (
          <div className="border border-clay/40 bg-clay/5 px-3 py-2.5 rounded-[6px]">
            <p className="text-[12.5px] text-ink/80">
              {t('result.workspace.inviteArchitect.errorPrefix')} {error}
            </p>
            <button
              type="button"
              onClick={() => inviteMutation.mutate()}
              className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-clay hover:text-ink transition-colors duration-soft"
            >
              {t('result.workspace.inviteArchitect.retry')}
            </button>
          </div>
        )}

        {!invite && !loading && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="invite-architect-email"
              className="text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-800 leading-none"
            >
              {t('result.workspace.inviteArchitect.emailLabel')}
            </label>
            <input
              id="invite-architect-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={t('result.workspace.inviteArchitect.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 w-full rounded-[6px] border border-ink/15 bg-paper-card px-2.5 text-[13px] text-ink focus:outline-none focus:border-emerald-700/50"
            />
            <button
              type="button"
              disabled={!emailValid}
              onClick={() => inviteMutation.mutate()}
              className={cn(
                'mt-1 inline-flex self-start items-center gap-1.5 h-9 px-3 rounded-full text-[12px]',
                'bg-emerald-700 text-paper hover:bg-emerald-800 transition-colors duration-soft',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-700',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
              )}
            >
              <Check aria-hidden="true" className="size-3" />
              <span>{t('result.workspace.inviteArchitect.generateCta')}</span>
            </button>
          </div>
        )}

        {invite && !loading && !error && (
          <>
            <div className="flex flex-col gap-1.5 border border-emerald-700/25 bg-emerald-700/[0.04] rounded-[8px] p-3">
              <label
                htmlFor="invite-architect-link"
                className="text-[10px] font-medium uppercase tracking-[0.18em] text-emerald-800 leading-none"
              >
                {t('result.workspace.inviteArchitect.linkLabel')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="invite-architect-link"
                  type="text"
                  readOnly
                  value={invite.acceptUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-9 min-w-0 flex-1 rounded-[6px] border border-ink/15 bg-paper-card px-2.5 font-mono text-[12px] text-ink focus:outline-none focus:border-emerald-700/50"
                />
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 h-9 px-3 rounded-full text-[12px]',
                    'bg-emerald-700 text-paper hover:bg-emerald-800 transition-colors duration-soft',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                  )}
                >
                  {copied ? (
                    <Check aria-hidden="true" className="size-3" />
                  ) : (
                    <Copy aria-hidden="true" className="size-3" />
                  )}
                  <span>
                    {copied
                      ? t('result.workspace.inviteArchitect.linkCopied')
                      : t('result.workspace.inviteArchitect.copyCta')}
                  </span>
                </button>
              </div>
              <p className="text-[11px] italic text-ink/55">
                {t('result.workspace.inviteArchitect.expiresLine', {
                  date: expiryHuman,
                })}
              </p>
              <p className="text-[11px] text-emerald-800/90">
                {t('result.workspace.inviteArchitect.boundTo', {
                  email: emailTrimmed,
                })}
              </p>
            </div>

            <button
              type="button"
              onClick={handleMailto}
              className="inline-flex self-start items-center gap-1.5 h-9 px-3 rounded-full text-[12px] bg-paper-card border border-ink/15 text-ink/85 hover:text-ink hover:border-ink/30 transition-colors duration-soft"
            >
              <Mail aria-hidden="true" className="size-3" />
              <span>{t('result.workspace.inviteArchitect.mailtoCta')}</span>
            </button>

            <p className="text-[10.5px] italic text-emerald-800/80 leading-relaxed">
              {t('result.workspace.inviteArchitect.distinctNote')}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
