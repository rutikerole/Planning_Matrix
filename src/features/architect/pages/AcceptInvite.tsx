import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/** Localized error buckets — the raw server message is NEVER shown (it mixes
 *  languages). claimInvite maps the server code to one of these. */
type AcceptErrorCode = 'forbidden' | 'notFound' | 'invalidToken' | 'session' | 'generic'

type Status =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'success'; projectId: string; alreadyAccepted: boolean }
  | { kind: 'error'; code: AcceptErrorCode }

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Phase 13 Week 3 — invite-claim route at /architect/accept?token=...
 *
 * The owner generated a project_members row with a UUID invite_token and
 * copy-paste-shared the URL. This page:
 *   1. Reads ?token=; redirects to /sign-in?next=… if not authed.
 *   2. v1.0.32.2 (B) — if the signed-in caller OWNS the token's project,
 *      route them to the read-only verification PREVIEW instead of trying
 *      (and failing) to claim a designer invite as the owner.
 *   3. Otherwise POSTs to share-project; the Edge Function gates on
 *      profiles.role='designer' and flips user_id + accepted_at.
 *   4. On success → link to the verification panel. On failure → a
 *      fully-localized message mapped from the server CODE (v1.0.32.2 A —
 *      no more mixed German/English, no `role=designer` jargon on screen).
 */
export function AcceptInvite() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuthStore()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      const next = encodeURIComponent(`/architect/accept?token=${token}`)
      navigate(`/sign-in?next=${next}`, { replace: true })
      return
    }
    if (!token || !TOKEN_RE.test(token)) {
      setStatus({ kind: 'error', code: 'invalidToken' })
      return
    }
    if (status.kind !== 'idle') return

    setStatus({ kind: 'pending' })
    void (async () => {
      // B — owner previewing their OWN architect invite. RLS lets the owner
      // read the project_members row (is_project_owner) + the project's
      // owner_id; if they match, send them to the read-only preview rather
      // than the designer-only claim (which would 403). Best-effort: any error
      // falls through to the normal claim path.
      try {
        const { data: memberRow } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('invite_token', token)
          .maybeSingle()
        const projectId = (memberRow as { project_id?: string } | null)?.project_id
        if (projectId) {
          const { data: proj } = await supabase
            .from('projects')
            .select('owner_id')
            .eq('id', projectId)
            .maybeSingle()
          if (proj && (proj as { owner_id?: string }).owner_id === user.id) {
            navigate(`/architect/projects/${projectId}/verify?preview=1`, { replace: true })
            return
          }
        }
      } catch {
        // fall through to the normal claim
      }
      setStatus(await claimInvite(token))
    })()
  }, [authLoading, user, token, navigate, status.kind])

  return (
    <div className="grid min-h-screen place-items-center bg-[hsl(var(--paper))] px-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--ink))]/45">
          {t('architect.accept.eyebrow')}
        </p>

        {status.kind === 'idle' || status.kind === 'pending' ? (
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55">
            {t('architect.accept.checking')}
          </p>
        ) : null}

        {status.kind === 'success' && (
          <>
            <h1 className="text-xl text-[hsl(var(--ink))]">
              {status.alreadyAccepted
                ? t('architect.accept.alreadyTitle')
                : t('architect.accept.successTitle')}
            </h1>
            <p className="text-sm text-[hsl(var(--ink))]/65">
              {t('architect.accept.successBody')}
            </p>
            <p>
              <Link
                to={`/architect/projects/${status.projectId}/verify`}
                className="border-b border-[hsl(var(--ink))]/30 pb-0.5 text-sm text-[hsl(var(--ink))] hover:border-[hsl(var(--ink))]"
              >
                {t('architect.accept.toVerify')}
              </Link>
            </p>
            <p>
              <Link
                to="/architect"
                className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55 hover:text-[hsl(var(--ink))]"
              >
                {t('architect.accept.toOverview')}
              </Link>
            </p>
          </>
        )}

        {status.kind === 'error' && (
          <>
            <h1 className="text-xl text-[hsl(var(--ink))]">
              {t('architect.accept.errorTitle')}
            </h1>
            <p className="text-sm text-[hsl(var(--ink))]/65">
              {t(`architect.accept.error.${status.code}`)}
            </p>
            <p>
              <Link
                to="/dashboard"
                className="border-b border-[hsl(var(--ink))]/30 pb-0.5 text-sm text-[hsl(var(--ink))] hover:border-[hsl(var(--ink))]"
              >
                {t('architect.accept.back')}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

/** Maps the share-project server error code to a localized client bucket.
 *  The raw server message is intentionally discarded — it is hardcoded
 *  English/German and would mix languages against the user's UI locale. */
function mapServerCode(code: string | undefined): AcceptErrorCode {
  switch (code) {
    case 'forbidden':
      return 'forbidden'
    case 'not_found':
      return 'notFound'
    default:
      return 'generic'
  }
}

async function claimInvite(token: string): Promise<Status> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) {
    return { kind: 'error', code: 'session' }
  }
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/share-project`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ inviteToken: token }),
    })
    const body = (await res.json().catch(() => null)) as
      | { ok: true; projectId: string; alreadyAccepted: boolean }
      | { ok: false; error?: { code?: string; message?: string } }
      | null
    if (!body) {
      return { kind: 'error', code: 'generic' }
    }
    if (!body.ok) {
      return { kind: 'error', code: mapServerCode(body.error?.code) }
    }
    return {
      kind: 'success',
      projectId: body.projectId,
      alreadyAccepted: body.alreadyAccepted,
    }
  } catch {
    return { kind: 'error', code: 'generic' }
  }
}
