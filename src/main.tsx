import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'
import { initSentry } from './lib/errorTracking'

// Phase 8 — boot Sentry before React renders so unhandled errors
// during the initial render are captured. Sentry init is a no-op
// when VITE_SENTRY_DSN is unset (dev / preview environments).
initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
