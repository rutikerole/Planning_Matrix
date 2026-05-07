import { Link, useParams } from 'react-router-dom'

/**
 * Phase 13 Week 2 — verification panel placeholder.
 *
 * Week 3 implements the actual qualifier-verification UX (per-card
 * "Vorläufig" footer, verify-fact / share-project Edge Functions,
 * two-account Playwright multi-context spec). This file exists so
 * the route at `/architect/projects/:id/verify` resolves cleanly
 * from the Week 2 dashboard's "Prüfen" CTA — clicking it lands on
 * a holding page rather than a 404.
 */
export function VerificationPanel() {
  const { projectId } = useParams<{ projectId: string }>()
  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-6 border-b border-[hsl(var(--ink))]/10 pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--ink))]/45">
          Verifizierung
        </p>
        <h1 className="mt-1 text-2xl text-[hsl(var(--ink))]">
          Projekt {projectId?.slice(0, 8) ?? '—'}
        </h1>
      </header>

      <div className="border border-dashed border-[hsl(var(--ink))]/15 px-6 py-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--ink))]/45">
          In Vorbereitung
        </p>
        <p className="mt-2 max-w-xl text-sm text-[hsl(var(--ink))]/65">
          Die ausführliche Verifikations-Oberfläche (Festlegungs&shy;übersicht,
          Quellen, Freigabe-Aktion) folgt in der nächsten Iteration. Aktuell
          dient diese Seite als Anker für den Einladungs-Flow — der serverseitige
          Qualifier-Gate lehnt nicht-bestätigte DESIGNER+VERIFIED-Schreibungen
          bereits ab.
        </p>
        <p className="mt-4">
          <Link
            to="/architect"
            className="border-b border-[hsl(var(--ink))]/30 pb-0.5 font-mono text-[12px] text-[hsl(var(--ink))] hover:border-[hsl(var(--ink))]"
          >
            ← Zurück zur Übersicht
          </Link>
        </p>
      </div>
    </div>
  )
}
