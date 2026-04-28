// ───────────────────────────────────────────────────────────────────────
// Phase 3.8 #89 — SkipLink
//
// "Skip to main content" link for keyboard + screen-reader users.
// Visually hidden until focused; on focus, jumps into the top-left of
// the viewport with an ink-fill button. Routes that have a `<main>`
// element (or any element with id="main-content") get a usable skip
// target; the rest get the body root.
//
// Mounted once at the providers root, so it's available on every page
// regardless of layout.
// ───────────────────────────────────────────────────────────────────────

import { useTranslation } from 'react-i18next'

export function SkipLink() {
  const { t } = useTranslation()
  return (
    <a
      href="#root"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:text-paper focus:px-4 focus:py-2 focus:rounded-sm focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper focus:text-[14px] focus:font-medium"
    >
      {t('a11y.skipToMain', { defaultValue: 'Zum Hauptinhalt springen' })}
    </a>
  )
}
