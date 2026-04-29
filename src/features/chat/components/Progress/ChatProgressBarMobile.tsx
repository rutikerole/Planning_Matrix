// ───────────────────────────────────────────────────────────────────────
// Phase 3.6 #69 — Compact ChatProgressBar variant for the mobile top bar
//
// Renders the segment row + percent, no labels, no border. Tapping
// (handled by MobileTopBar) opens the existing top-direction vaul
// drawer with the full <ChatProgressBar />.
// ───────────────────────────────────────────────────────────────────────

import { ChatProgressBar } from './ChatProgressBar'
import type { MessageRow } from '@/types/db'

interface Props {
  messages?: MessageRow[]
}

export function ChatProgressBarMobile({ messages }: Props) {
  return <ChatProgressBar compact messages={messages} />
}
