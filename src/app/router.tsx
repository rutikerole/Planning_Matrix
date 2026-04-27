import { Route, Routes } from 'react-router-dom'
import { LandingPage } from '@/features/landing/LandingPage'
import { NotFoundPage } from '@/features/not-found/NotFoundPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
