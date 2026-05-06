import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import './features/landing/styles/tokens.css'
import App from './App.tsx'

// Phase 9.2 — Sentry init moved out of main.tsx into
// SentryLifecycle.tsx (consent-gated). This entry stays minimal so
// the SDK only loads when the user clicks Accept All / Customize +
// Functional. See src/features/cookies/SentryLifecycle.tsx.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
