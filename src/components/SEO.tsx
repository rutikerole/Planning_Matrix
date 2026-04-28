// ───────────────────────────────────────────────────────────────────────
// Phase 4.1 #124 — Per-route document head metadata
//
// Wraps the small set of route-level metadata each page renders. Uses
// React 19's native document-metadata hoisting: a `<title>` or `<meta>`
// element rendered anywhere in the tree is moved into <head> at commit
// time, and the previous value is restored when the component unmounts.
// No third-party helmet library required.
//
// Note: index.html already carries the static OG / Twitter tags + the
// landing-page title and description. Per Phase 3.0 D11 the canonical
// social preview stays static — this component is purely about the
// browser-tab title and (for public routes) the meta description.
// ───────────────────────────────────────────────────────────────────────

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
  return (
    <>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
    </>
  )
}
