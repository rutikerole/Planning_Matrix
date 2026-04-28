/**
 * Phase 3.5 #62 — localStorage persistence for the document checklist.
 *
 * Per-(project, doc) boolean. Key shape:
 *   pm-doc-{projectId}-{docId} = '1' | (absent)
 *
 * Storage failures (private browsing, disabled, quota) are silently
 * tolerated; the checkbox just doesn't persist in those contexts.
 */

const PREFIX = 'pm-doc-'

function key(projectId: string, docId: string): string {
  return `${PREFIX}${projectId}-${docId}`
}

export function isChecked(projectId: string, docId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(key(projectId, docId)) === '1'
  } catch {
    return false
  }
}

export function setChecked(
  projectId: string,
  docId: string,
  checked: boolean,
): void {
  if (typeof window === 'undefined') return
  try {
    if (checked) window.localStorage.setItem(key(projectId, docId), '1')
    else window.localStorage.removeItem(key(projectId, docId))
  } catch {
    // ignore
  }
}
