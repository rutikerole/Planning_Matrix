// Phase 7.5 — ThreadContext.
//
// Carries an imperative handle so the Spine can scroll the Thread
// to a specific message index without prop-drilling.
//
// The Thread component publishes its handle on mount; the Spine
// consumes via useThreadController().

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'

export interface ThreadController {
  scrollToMessage(
    indexOrId: number | string,
    opts?: { behavior?: ScrollBehavior; topOffset?: number },
  ): void
}

interface ThreadContextValue {
  registerController: (c: ThreadController | null) => void
  controllerRef: React.MutableRefObject<ThreadController | null>
  scrollToMessage: ThreadController['scrollToMessage']
}

const ThreadCtx = createContext<ThreadContextValue | null>(null)

export function ThreadContextProvider({ children }: { children: ReactNode }) {
  const controllerRef = useRef<ThreadController | null>(null)
  const registerController = useCallback((c: ThreadController | null) => {
    controllerRef.current = c
  }, [])
  const scrollToMessage = useCallback<ThreadController['scrollToMessage']>(
    (idxOrId, opts) => {
      controllerRef.current?.scrollToMessage(idxOrId, opts)
    },
    [],
  )
  const value = useMemo<ThreadContextValue>(
    () => ({ registerController, controllerRef, scrollToMessage }),
    [registerController, scrollToMessage],
  )
  return <ThreadCtx.Provider value={value}>{children}</ThreadCtx.Provider>
}

export function useThreadController() {
  const ctx = useContext(ThreadCtx)
  return ctx
}

/** Default in-page implementation: looks up the message by id or by
 *  index in the current `[data-chamber-message]` collection and
 *  scrolls its spec-tag (or itself) to the topOffset target. */
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
  // Prefer the spec-tag anchor inside the row when present.
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
