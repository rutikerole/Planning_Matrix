import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, Link2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { ProjectRow } from '@/types/db'
import { createShareToken } from '../lib/shareTokenApi'

interface Props {
  project: ProjectRow
  open: boolean
  onOpenChange: (open: boolean) => void
}

const RECENT_KEY = 'pm:recent-architect-emails'
const MAX_RECENT = 5

/**
 * Phase 8.1 (A.9) — Send-to-architect modal. Minimum-viable end-to-end
 * flow: email field + pre-filled cover note + share link generated on
 * demand. Submit opens the user's mail client via mailto:; share link
 * copy is the always-available fallback. Recent recipients persist in
 * localStorage so repeat-sends don't retype.
 *
 * No server-side email — the brief explicitly scopes that out. The
 * mailto: URL carries the full briefing share link in the body so the
 * architect lands on a 30-day read-only view.
 */
export function SendToArchitectModal({ project, open, onOpenChange }: Props) {
  const { t, i18n } = useTranslation()
  const lang = (i18n.resolvedLanguage ?? 'de') as 'de' | 'en'

  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [recent, setRecent] = useState<string[]>(() => readRecent())

  // Reset on close so the modal opens clean each time.
  useEffect(() => {
    if (!open) {
      setEmail('')
      setBusy(false)
      setShareLink(null)
      setLinkCopied(false)
    } else {
      setRecent(readRecent())
    }
  }, [open])

  const ensureShareLink = async (): Promise<string | null> => {
    if (shareLink) return shareLink
    setBusy(true)
    try {
      const result = await createShareToken(project.id)
      setShareLink(result.url)
      return result.url
    } catch (err) {
      console.error('[send-to-architect] share-token failed', err)
      return null
    } finally {
      setBusy(false)
    }
  }

  const handleSend = async () => {
    const link = (await ensureShareLink()) ?? ''
    pushRecent(email.trim())
    setRecent(readRecent())

    const subject = t('result.workspace.sendToArchitect.subject', {
      name: project.name,
    })
    const body = t('result.workspace.sendToArchitect.defaultMessage', {
      plotAddress: project.plot_address ?? '—',
      shareLink: link || '(share link unavailable)',
    })

    const url =
      `mailto:${encodeURIComponent(email.trim())}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`

    // Open the user's mail client. Use _self so single-tab browsers
    // don't pop a blocked tab. iOS / Android handle this fine.
    window.location.href = url
  }

  const handleCopyLink = async () => {
    const link = await ensureShareLink()
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setLinkCopied(true)
      window.setTimeout(() => setLinkCopied(false), 2400)
    } catch {
      // permission denied — user can copy from the visible field
    }
  }

  const validEmail = /\S+@\S+\.\S+/.test(email)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-paper border border-ink/15 rounded-[10px] p-6 max-w-[460px] flex flex-col gap-4"
        aria-describedby="send-architect-desc"
      >
        <div className="flex items-baseline justify-between gap-3">
          <DialogTitle className="font-serif italic text-[20px] text-ink leading-snug">
            {t('result.workspace.sendToArchitect.modalTitle')}
          </DialogTitle>
          <DialogClose
            className="size-7 inline-flex items-center justify-center rounded-full text-ink/45 hover:text-ink hover:bg-ink/[0.06] transition-colors duration-soft"
            aria-label={t('result.workspace.sendToArchitect.close', {
              defaultValue: 'Schließen',
            })}
          >
            <X aria-hidden="true" className="size-3.5" />
          </DialogClose>
        </div>
        <DialogDescription
          id="send-architect-desc"
          className="text-[12.5px] italic text-clay leading-relaxed"
        >
          {t('result.workspace.sendToArchitect.intro')}
        </DialogDescription>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="architect-email"
            className="text-[10px] font-medium uppercase tracking-[0.18em] text-clay leading-none"
          >
            {t('result.workspace.sendToArchitect.emailLabel')}
          </label>
          <input
            id="architect-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t('result.workspace.sendToArchitect.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 px-3 bg-paper-card border border-ink/15 rounded-[6px] text-[14px] text-ink focus:outline-none focus:border-ink/40"
          />
          {recent.length > 0 && (
            <p className="text-[11px] italic text-clay/85 leading-snug">
              {t('result.workspace.sendToArchitect.recentSent')}
              {' '}
              {recent.map((addr, idx) => (
                <button
                  key={addr}
                  type="button"
                  onClick={() => setEmail(addr)}
                  className="underline underline-offset-4 decoration-clay/55 hover:text-ink transition-colors duration-soft"
                >
                  {addr}
                  {idx < recent.length - 1 && ', '}
                </button>
              ))}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            disabled={busy}
            className={cn(
              'inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[12px]',
              'bg-paper-card border border-ink/15 text-ink/85 hover:text-ink hover:border-ink/30 transition-colors duration-soft',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
              busy && 'opacity-60 cursor-wait',
            )}
          >
            <Link2 aria-hidden="true" className="size-3" />
            <span>
              {linkCopied
                ? t('result.workspace.sendToArchitect.linkCopied')
                : t('result.workspace.sendToArchitect.copyLinkCta')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!validEmail || busy}
            className={cn(
              'inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[12.5px] font-medium',
              'bg-ink text-paper hover:bg-ink/92 transition-colors duration-soft',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
              (!validEmail || busy) &&
                'bg-ink/15 text-ink/40 cursor-not-allowed hover:bg-ink/15',
            )}
          >
            <Mail aria-hidden="true" className="size-3" />
            <span>{t('result.workspace.sendToArchitect.sendCta')}</span>
          </button>
        </div>
        <p className="text-[10.5px] italic text-clay/85 leading-relaxed">
          {t('result.workspace.sendToArchitect.privacyNote', {
            defaultValue:
              lang === 'en'
                ? 'Your email client opens with a 30-day share link to the briefing. Recipients see a read-only view; you keep edit rights.'
                : 'Ihr E-Mail-Programm öffnet sich mit einem 30-Tage-Link zum Briefing. Empfänger sehen eine schreibgeschützte Ansicht.',
          })}
        </p>
      </DialogContent>
    </Dialog>
  )
}

function readRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

function pushRecent(email: string) {
  if (!email || typeof window === 'undefined') return
  try {
    const current = readRecent().filter((e) => e !== email)
    const next = [email, ...current].slice(0, MAX_RECENT)
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // incognito — fine
  }
}
