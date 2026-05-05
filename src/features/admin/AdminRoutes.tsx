import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminGuard } from './AdminGuard'
import { AtelierConsoleLayout } from './AtelierConsoleLayout'
import { ProjectInspectorList } from './pages/ProjectInspectorList'
import { ProjectInspectorDetail } from './pages/ProjectInspectorDetail'
import { TurnDeepDive } from './pages/TurnDeepDive'
import { LiveStream } from './pages/LiveStream'
import { CostDashboard } from './pages/CostDashboard'
import { Search } from './pages/Search'

/**
 * Phase 9 — Atelier Console route tree.
 *
 * Mounted via a single lazy import in src/app/router.tsx so all
 * /admin/* code lands in a separate Vite chunk and never touches
 * the main bundle.
 *
 * The default landing destination is /admin/logs/projects — the
 * Project Inspector list. /admin alone redirects there.
 */
export default function AdminRoutes() {
  return (
    <AdminGuard>
      <Routes>
        <Route element={<AtelierConsoleLayout />}>
          <Route index element={<Navigate to="/admin/logs/projects" replace />} />
          <Route path="logs/projects" element={<ProjectInspectorList />} />
          <Route path="logs/projects/:projectId" element={<ProjectInspectorDetail />} />
          <Route
            path="logs/projects/:projectId/turns/:traceId"
            element={<TurnDeepDive />}
          />
          <Route path="logs/stream" element={<LiveStream />} />
          <Route path="logs/cost" element={<CostDashboard />} />
          <Route path="logs/search" element={<Search />} />
          <Route path="*" element={<Navigate to="/admin/logs/projects" replace />} />
        </Route>
      </Routes>
    </AdminGuard>
  )
}
