// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #69 — Compact ChatProgressBar variant for the mobile top bar
//
// Renders the segment row + percent, no labels, no border. Tapping
// (handled by MobileTopBar) opens the existing top-direction vaul
// drawer with the full <ChatProgressBar />.
// ───────────────────────────────────────────────────────────────────────

import { ChatProgressBar } from './ChatProgressBar'

export function ChatProgressBarMobile() {
  return <ChatProgressBar compact />
}
