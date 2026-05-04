// Phase 7.5 — Thread scroll helpers, factored out of ThreadContext
// so the .tsx file only exports React components (fast-refresh).

export interface ThreadController {
  scrollToMessage(
    indexOrId: number | string,
    opts?: { behavior?: ScrollBehavior; topOffset?: number },
  ): void
}

/** DOM-scan default. Looks up the message row by index or id and
 *  scrolls its spec-tag (or the row itself) to the top offset. */
export function defaultScrollToMessage(
  indexOrId: number | string,
  opts?: { behavior?: ScrollBehavior; topOffset?: number },
) {
  const items = Array.from(
    document.querySelectorAll<HTMLElement>('[data-chamber-message]'),
  )
  let target: HTMLElement | undefined
  if (typeof indexOrId === 'number') {
    target = items[indexOrId]
  } else {
    target = items.find((el) => el.getAttribute('data-message-id') === indexOrId)
  }
  if (!target) return
  const id = target.getAttribute('data-message-id')
  const tag = id ? document.getElementById(`spec-tag-${id}`) : null
  const el = tag ?? target
  const rect = el.getBoundingClientRect()
  const topOffset = opts?.topOffset ?? 90
  window.scrollTo({
    top: window.scrollY + rect.top - topOffset,
    behavior: opts?.behavior ?? 'smooth',
  })
}
