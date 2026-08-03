// Pure helpers for placing a workout around the day's existing commitments.
import type { CalendarBusy } from '../store/useStore'

export interface Slot {
  start: number // minutes from midnight
  end: number
}

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export const toHHMM = (mins: number): string => {
  const m = ((mins % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/** Busy intervals for one day; all-day events block the whole day. */
export function busySlots(events: CalendarBusy[]): Slot[] {
  const slots: Slot[] = []
  for (const e of events) {
    if (!e.start) {
      slots.push({ start: 0, end: 1440 }) // all-day
      continue
    }
    const start = toMin(e.start)
    const end = e.end ? toMin(e.end) : start + 60
    slots.push({ start, end: Math.max(end, start + 15) })
  }
  return slots.sort((a, b) => a.start - b.start)
}

/** True when [start, start+duration) overlaps any busy interval. */
export function overlaps(start: number, durationMin: number, slots: Slot[]): boolean {
  const end = start + durationMin
  return slots.some((s) => start < s.end && end > s.start)
}

/** Anything on the day that clashes with the given time. */
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

/** Day window we're willing to schedule inside, and the search step. */
const DAY_START = 5 * 60 // 05:00
const DAY_END = 22 * 60 // 22:00
const STEP = 15

/**
 * First free window that fits `durationMin`, searched outward from `preferred`
 * so suggestions stay near the time the user already had in mind.
 */
export function findFreeSlot(
  events: CalendarBusy[],
  durationMin: number,
  preferred = '18:00',
): string | null {
  const slots = busySlots(events)
  const want = toMin(preferred)
  const candidates: number[] = []

  for (let t = DAY_START; t + durationMin <= DAY_END; t += STEP) candidates.push(t)
  candidates.sort((a, b) => Math.abs(a - want) - Math.abs(b - want))

  for (const start of candidates) {
    if (!overlaps(start, durationMin, slots)) return toHHMM(start)
  }
  return null
}
