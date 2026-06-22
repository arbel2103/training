export const HEB_DAYS = [
  'ראשון',
  'שני',
  'שלישי',
  'רביעי',
  'חמישי',
  'שישי',
  'שבת',
]
export const HEB_DAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Sunday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - x.getDay())
  return x
}

/** The 7 dates Sun..Sat for the week containing `ref`. */
export function weekDays(ref: Date = new Date()): Date[] {
  const s = startOfWeek(ref)
  return Array.from({ length: 7 }, (_, i) => addDays(s, i))
}

export function formatDayMonth(d: Date): string {
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
}

export function formatFullDate(iso: string): string {
  const d = fromISO(iso)
  return `יום ${HEB_DAYS[d.getDay()]} · ${d.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`
}

export function daysInRange(startISO: string, endISO: string): number {
  const ms = fromISO(endISO).getTime() - fromISO(startISO).getTime()
  return Math.round(ms / 86_400_000) + 1
}

export function weeksInRange(startISO: string, endISO: string): number {
  return Math.max(1, daysInRange(startISO, endISO) / 7)
}

export type PeriodKind = 'week' | 'month' | 'custom'

/** Resolve a period preset to a {start,end} ISO range (inclusive). */
export function resolvePeriod(
  kind: PeriodKind,
  custom?: { start: string; end: string },
): { start: string; end: string } {
  const today = new Date()
  if (kind === 'week') {
    const days = weekDays(today)
    return { start: toISODate(days[0]), end: toISODate(days[6]) }
  }
  if (kind === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return { start: toISODate(start), end: toISODate(end) }
  }
  return (
    custom ?? { start: toISODate(today), end: toISODate(today) }
  )
}

export function inRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end
}
