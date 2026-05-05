/**
 * Phase 8.3 (C.3) — closure windows for the München Bauamt that
 * affect realistic submission + approval timing. Hardcoded for v1.
 *
 * Windows are recurring annual; the composer matches them against a
 * candidate date by month/day, ignoring year.
 *
 * verifyBeforePublicLaunch — these are typical patterns, not formal
 * announcements. Always confirm with the local authority for
 * deadline-critical scheduling.
 */

export interface ClosureWindow {
  id: string
  /** First day of the window (1-12 month, 1-31 day). Inclusive. */
  startMonth: number
  startDay: number
  /** Last day of the window. Inclusive. May wrap into next year. */
  endMonth: number
  endDay: number
  /** Match the i18n key under chat.result.workspace.calendar.reason*. */
  reasonKey: string
  reasonDe: string
  reasonEn: string
}

export const MUENCHEN_AUTHORITY_CLOSURES: ClosureWindow[] = [
  {
    id: 'christmas',
    startMonth: 12,
    startDay: 22,
    endMonth: 1,
    endDay: 8,
    reasonKey: 'reasonChristmasClosure',
    reasonDe: 'Weihnachtsschließung des Bauamts (22. Dez – 8. Jan)',
    reasonEn: "the Bauamt's Christmas closure (Dec 22 – Jan 8)",
  },
  {
    id: 'summer',
    startMonth: 7,
    startDay: 15,
    endMonth: 9,
    endDay: 1,
    reasonKey: 'reasonSummerSlowdown',
    reasonDe: 'Sommer-Reduktion des Personals (15. Juli – 1. Sept)',
    reasonEn: 'summer staffing reduction (Jul 15 – Sep 1)',
  },
]

/**
 * Returns the closure window that contains the date, or null when the
 * date is outside every window. Match is by month/day; year ignored.
 */
export function findClosure(date: Date): ClosureWindow | null {
  const m = date.getMonth() + 1
  const d = date.getDate()
  for (const w of MUENCHEN_AUTHORITY_CLOSURES) {
    if (windowContains(w, m, d)) return w
  }
  return null
}

function windowContains(w: ClosureWindow, month: number, day: number): boolean {
  const wraps =
    w.startMonth > w.endMonth ||
    (w.startMonth === w.endMonth && w.startDay > w.endDay)
  if (!wraps) {
    if (month < w.startMonth || month > w.endMonth) return false
    if (month === w.startMonth && day < w.startDay) return false
    if (month === w.endMonth && day > w.endDay) return false
    return true
  }
  // Wrap (e.g., Dec 22 — Jan 8): match if before end OR after start.
  const beforeEnd =
    month < w.endMonth || (month === w.endMonth && day <= w.endDay)
  const afterStart =
    month > w.startMonth || (month === w.startMonth && day >= w.startDay)
  return beforeEnd || afterStart
}
