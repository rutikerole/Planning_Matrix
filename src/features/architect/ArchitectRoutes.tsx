import { Navigate, Route, Routes } from 'react-router-dom'
import { ArchitectGuard } from './ArchitectGuard'
import { AtelierArchitectLayout } from './AtelierArchitectLayout'
import { ArchitectDashboard } from './pages/ArchitectDashboard'
import { VerificationPanel } from './pages/VerificationPanel'

/**
 * Phase 13 Week 2 — Architect Console route tree.
 *
 * Mounted via a single lazy import in src/app/router.tsx so the
 * architect surface ships in its own Vite chunk and never inflates
 * the main bundle for clients. Visual posture mirrors the Atelier
 * Console (mono / sharp corners / no shadows / atelier-mode tokens)
 * per the user's "austere matching admin Logs drawer" decision.
 *
 * Route map:
 *   /architect                       → dashboard (membership list)
 *   /architect/projects/:id/verify   → per-project verification panel
 *                                       (Week 3 implementation)
 */
export default function ArchitectRoutes() {
  return (
    <ArchitectGuard>
      <Routes>
        <Route element={<AtelierArchitectLayout />}>
          <Route index element={<ArchitectDashboard />} />
          <Route path="projects/:projectId/verify" element={<VerificationPanel />} />
          <Route path="*" element={<Navigate to="/architect" replace />} />
        </Route>
      </Routes>
    </ArchitectGuard>
  )
}
