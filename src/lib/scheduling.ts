// Pure helpers for placing a workout around the day's existing commitments.
import type { CalendarBusy } from '../store/useStore'

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * Anything on the day that clashes with the given time. Events without a start
 * time are all-day and always clash.
 */
export function conflictsFor(
  time: string,
  durationMin: number,
  events: CalendarBusy[],
): CalendarBusy[] {
  const start = toMin(time)
  const end = start + durationMin
  return events.filter((e) => {
    if (!e.start) return true
    const s = toMin(e.start)
    const t = e.end ? toMin(e.end) : s + 60
    return start < t && end > s
  })
}
