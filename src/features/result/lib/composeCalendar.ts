import {
  findClosure,
  type ClosureWindow,
} from '@/data/muenchenAuthorityCalendar'
import { approximateTotalWeeks } from './composeTimeline'

export interface CalendarProse {
  targetDate: Date
  expectedDate: Date
  /** When the expected date lands inside a closure window, this is set. */
  closureHit: ClosureWindow | null
  /** The pushed-out date if the closure shifts approval. */
  fallbackDate: Date | null
  /** ISO yyyy-mm-dd for tooltip / debug. */
  iso: {
    target: string
    expected: string
    fallback: string | null
  }
}

interface Args {
  /** Defaults to today. Injectable for tests. */
  now?: Date
  /** Weeks of prep before submission; default 10 (LP 1-3 + Bauamt prep). */
  prepWeeks?: number
}

/**
 * Phase 8.3 (C.3) — calendar math for the Cost & Timeline tab's
 * narrator note. Adds prep weeks → submission, then procedure duration
 * → expected approval. If the expected approval falls inside the
 * München authority's Christmas or summer closure, push the target
 * out to the first working day after the window and surface the
 * reason.
 */
export function composeCalendar({
  now = new Date(),
  prepWeeks = 10,
}: Args = {}): CalendarProse {
  const totalWeeks = approximateTotalWeeks()
  const procedureWeeksAvg = (totalWeeks.min + totalWeeks.max) / 2

  const targetDate = addWeeks(now, prepWeeks)
  const expectedDate = addWeeks(targetDate, procedureWeeksAvg - 1)

  const closure = findClosure(expectedDate)
  let fallbackDate: Date | null = null
  if (closure) {
    fallbackDate = nextWorkingDayAfter(closure, expectedDate)
  }

  return {
    targetDate,
    expectedDate,
    closureHit: closure,
    fallbackDate,
    iso: {
      target: toIso(targetDate),
      expected: toIso(expectedDate),
      fallback: fallbackDate ? toIso(fallbackDate) : null,
    },
  }
}

export function formatCalendarDate(date: Date, lang: 'de' | 'en'): string {
  return date.toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function addWeeks(date: Date, weeks: number): Date {
  const out = new Date(date)
  out.setDate(out.getDate() + Math.round(weeks * 7))
  return out
}

function toIso(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Returns the first weekday after the closure ends. Uses end-of-window
 * + 1 day; if that's a weekend, advances to Monday.
 */
function nextWorkingDayAfter(closure: ClosureWindow, ref: Date): Date {
  const out = new Date(ref)
  // Set to closure's end day in the same year as ref.
  out.setMonth(closure.endMonth - 1)
  out.setDate(closure.endDay)
  // If we wrapped (Dec→Jan), move to next calendar year.
  if (closure.startMonth > closure.endMonth && ref.getMonth() + 1 >= closure.startMonth) {
    out.setFullYear(ref.getFullYear() + 1)
  }
  out.setDate(out.getDate() + 1)
  while (out.getDay() === 0 || out.getDay() === 6) {
    out.setDate(out.getDate() + 1)
  }
  return out
}
