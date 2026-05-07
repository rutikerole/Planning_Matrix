import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

type Status =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'success'; projectId: string; alreadyAccepted: boolean }
  | { kind: 'error'; message: string }

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Phase 13 Week 3 — invite-claim route at /architect/accept?token=...
 *
 * The owner generated a project_members row with a UUID invite_token
 * and copy-paste-shared the URL with the architect. This page:
 *   1. Reads ?token= from the URL.
 *   2. If the user isn't signed in, redirects to /sign-in?next=...
 *      so they come back here after auth.
 *   3. Once authed, POSTs to /functions/v1/share-project with the
 *      token. The Edge Function checks profiles.role='designer' and
 *      flips user_id + accepted_at on the matching row.
 *   4. On success, links to /architect (and surfaces the resolved
 *      project_id). On failure, shows the server-side error message.
 *
 * Idempotent: hitting Refresh re-claims; the Edge Function returns
 * `alreadyAccepted: true` if the row was already filled with this
 * caller's user_id.
 */
export function AcceptInvite() {
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
      setStatus({ kind: 'error', message: 'Ungültiger oder fehlender Einladungs-Token.' })
      return
    }
    if (status.kind !== 'idle') return

    setStatus({ kind: 'pending' })
    void claimInvite(token).then((result) => setStatus(result))
  }, [authLoading, user, token, navigate, status.kind])

  return (
    <div className="grid min-h-screen place-items-center bg-[hsl(var(--paper))] px-6">
      <div className="max-w-md space-y-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--ink))]/45">
          Architekt-Einladung
        </p>

        {status.kind === 'idle' || status.kind === 'pending' ? (
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55">
            Einladung wird geprüft …
          </p>
        ) : null}

        {status.kind === 'success' && (
          <>
            <h1 className="text-xl text-[hsl(var(--ink))]">
              {status.alreadyAccepted
                ? 'Einladung bereits angenommen'
                : 'Einladung angenommen'}
            </h1>
            <p className="text-sm text-[hsl(var(--ink))]/65">
              Sie haben jetzt Zugriff auf das Projekt.
            </p>
            <p>
              <Link
                to={`/architect/projects/${status.projectId}/verify`}
                className="border-b border-[hsl(var(--ink))]/30 pb-0.5 text-sm text-[hsl(var(--ink))] hover:border-[hsl(var(--ink))]"
              >
                Zur Verifikations-Oberfläche →
              </Link>
            </p>
            <p>
              <Link
                to="/architect"
                className="font-mono text-[11px] uppercase tracking-[0.18em] text-[hsl(var(--ink))]/55 hover:text-[hsl(var(--ink))]"
              >
                oder Übersicht
              </Link>
            </p>
          </>
        )}

        {status.kind === 'error' && (
          <>
            <h1 className="text-xl text-[hsl(var(--ink))]">Einladung nicht akzeptiert</h1>
            <p className="text-sm text-[hsl(var(--ink))]/65">{status.message}</p>
            <p>
              <Link
                to="/dashboard"
                className="border-b border-[hsl(var(--ink))]/30 pb-0.5 text-sm text-[hsl(var(--ink))] hover:border-[hsl(var(--ink))]"
              >
                Zurück zum Dashboard
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

async function claimInvite(token: string): Promise<Status> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) {
    return { kind: 'error', message: 'Sitzung abgelaufen.' }
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
      | { ok: false; error: { code: string; message: string } }
      | null
    if (!body) {
      return { kind: 'error', message: `Server-Fehler (HTTP ${res.status}).` }
    }
    if (!body.ok) {
      return { kind: 'error', message: body.error.message }
    }
    return {
      kind: 'success',
      projectId: body.projectId,
      alreadyAccepted: body.alreadyAccepted,
    }
  } catch (err) {
    return {
      kind: 'error',
      message: err instanceof Error ? err.message : 'Netzwerkfehler.',
    }
  }
}
