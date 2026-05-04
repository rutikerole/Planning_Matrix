// Phase 7 Chamber — global keyboard shortcuts.
//
//   /          → focus the input textarea
//   ?          → open StandUp overlay
//   Esc        → close StandUp / popovers (dispatched as a CustomEvent
//                 so individual surfaces can hook in without a global
//                 priority queue)
//   j          → scroll to next message
//   k          → scroll to previous message
//   gg         → scroll to top of thread
//   G          → scroll to latest assistant message
//   Cmd/Ctrl+Enter, Shift+Enter → already handled by InputBar.

import { useEffect, useRef } from 'react'

interface Options {
  onSlash: () => void
  onQuestionMark: () => void
  onGotoLatest: () => void
}

export function useKeyboardShortcuts(opts: Options) {
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    let lastG = 0
    const isTextField = (el: Element | null) => {
      if (!el) return false
      const tag = el.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      const editable = (el as HTMLElement).isContentEditable
      return !!editable
    }

    const onKey = (e: KeyboardEvent) => {
      // Allow `Esc` to bubble up via CustomEvent regardless of focus.
      if (e.key === 'Escape') {
        document.dispatchEvent(new CustomEvent('chamber:escape'))
        return
      }
      // Ignore other shortcuts while the user is typing.
      if (isTextField(document.activeElement)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === '/') {
        e.preventDefault()
        optsRef.current.onSlash()
        return
      }
      if (e.key === '?') {
        e.preventDefault()
        optsRef.current.onQuestionMark()
        return
      }
      if (e.key === 'j') {
        e.preventDefault()
        scrollToAdjacentMessage(1)
        return
      }
      if (e.key === 'k') {
        e.preventDefault()
        scrollToAdjacentMessage(-1)
        return
      }
      if (e.key === 'G') {
        e.preventDefault()
        optsRef.current.onGotoLatest()
        return
      }
      if (e.key === 'g') {
        const now = Date.now()
        if (now - lastG < 600) {
          e.preventDefault()
          window.scrollTo({ top: 0, behavior: 'smooth' })
          lastG = 0
        } else {
          lastG = now
        }
        return
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
}

function scrollToAdjacentMessage(direction: 1 | -1) {
  const items = Array.from(
    document.querySelectorAll<HTMLElement>('[data-chamber-message]'),
  )
  if (items.length === 0) return
  const cy = window.innerHeight / 2
  // Find current focused message; fallback to nearest viewport center.
  let activeIdx = items.findIndex((el) => el.getAttribute('data-focus') === 'true')
  if (activeIdx === -1) {
    let best = Infinity
    items.forEach((el, i) => {
      const rect = el.getBoundingClientRect()
      const ec = (rect.top + rect.bottom) / 2
      const d = Math.abs(ec - cy)
      if (d < best) {
        best = d
        activeIdx = i
      }
    })
  }
  const next = items[activeIdx + direction]
  if (!next) return
  const rect = next.getBoundingClientRect()
  window.scrollTo({ top: window.scrollY + rect.top - 90, behavior: 'smooth' })
}
