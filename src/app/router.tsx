import { Route, Routes } from 'react-router-dom'
import { LandingPage } from '@/features/landing/LandingPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
    </Routes>
  )
}
