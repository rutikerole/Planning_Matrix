// ───────────────────────────────────────────────────────────────────────
// Phase 4.1 #124 — Per-route document head metadata
//
// Wraps the small set of route-level metadata each page renders. The
// `<title>` uses React 19's native document-metadata hoisting (a
// `<title>` rendered anywhere in the tree is moved into <head> at
// commit time, with the previous value restored when the component
// unmounts). For `<meta name="description">` we update the existing
// tag imperatively via `useEffect` rather than rendering a new one —
// React 19's hoisting *appends* metas without deduping by `name`, and
// `index.html` already ships a static fallback description for
// noscript/pre-hydration crawlers. Rendering a second tag would leave
// the page with two competing `<meta name="description">` elements.
//
// Note: index.html also carries the static OG / Twitter tags. Per
// Phase 3.0 D11 the canonical social preview stays static — this
// component is purely about the browser-tab title and (for public
// routes) the meta description.
// ───────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  /** i18n key for the page title — must resolve to a string. */
  titleKey: string
  /** Optional i18n key for `<meta name="description">`. */
  descriptionKey?: string
  /** Optional t() params if the title or description includes
   * placeholders like `{{name}}`. */
  params?: Record<string, string | number>
}

export function SEO({ titleKey, descriptionKey, params }: Props) {
  const { t } = useTranslation()
  const title = t(titleKey, params)
  const description = descriptionKey ? t(descriptionKey, params) : undefined

  useEffect(() => {
    if (description === undefined) return
    if (typeof document === 'undefined') return
    const meta = document.querySelector('meta[name="description"]')
    if (!meta) return
    const previous = meta.getAttribute('content') ?? ''
    meta.setAttribute('content', description)
    return () => {
      meta.setAttribute('content', previous)
    }
  }, [description])

  return <title>{title}</title>
}
