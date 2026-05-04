/* eslint-disable react-refresh/only-export-components */
// Phase 7.5 — ThreadContext.
//
// Carries an imperative handle so the Spine can scroll the Thread
// to a specific message index without prop-drilling. The Thread
// publishes its handle on mount; consumers use useThreadController().
//
// Helpers + types live in `./threadScrollHelpers`. The hook
// (useThreadController) lives here next to the provider — Vite's
// fast-refresh plugin flags the mixed export, but splitting a 3-line
// hook into a third file is more friction than the warning is worth.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import type { ThreadController } from './threadScrollHelpers'

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
