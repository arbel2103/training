// Training load using the session-RPE (Foster) method: load = duration × effort.
// Effort comes from the best signal available on each entry (RPE → intensity
// label → heart rate → sensible default). Pure; unit tested.
import type { WorkoutEntry } from '../store/useStore'
import { entryDuration } from './calc'
import { addDays, startOfWeek, toISODate } from './dates'

/** Perceived effort 1–10 for a workout, from whatever the entry provides. */
export function effortOf(e: WorkoutEntry, maxHrRef?: number): number {
  if (e.rpe && e.rpe > 0) return Math.min(10, e.rpe)

  if (e.aerobicIntensity) {
    const byLabel: Record<string, number> = {
      easy: 3,
      technique: 3,
      long: 5,
      intense: 8,
    }
    const v = byLabel[e.aerobicIntensity]
    if (v) return v
  }

  // heart rate as a share of the reference max → 1–10
  if (e.avgHr && maxHrRef && maxHrRef > 0) {
    const pct = e.avgHr / maxHrRef
    return Math.max(1, Math.min(10, Math.round((pct - 0.4) * 16.7)))
  }

  if (e.category === 'strength') {
    const byStrength: Record<string, number> = { light: 3, medium: 5, heavy: 8 }
    return byStrength[e.intensity ?? 'medium'] ?? 5
  }
  return 5
}

/** A reference max HR: the highest max seen in the log (fallback for effort). */
export function maxHrReference(log: WorkoutEntry[]): number | undefined {
  const maxes = log.map((e) => e.maxHr).filter((v): v is number => typeof v === 'number')
  return maxes.length ? Math.max(...maxes) : undefined
}

/** Session load in arbitrary units (minutes × effort). */
export function loadOf(e: WorkoutEntry, maxHrRef?: number): number {
  const min = entryDuration(e) ?? 0
  if (min <= 0) return 0
  return Math.round(min * effortOf(e, maxHrRef))
}

export interface WeekLoad {
  weekStart: string // yyyy-mm-dd (Sunday)
  load: number
}

/** Total load per calendar week (Sunday-start) for the last `weeks` weeks. */
export function weeklyLoads(log: WorkoutEntry[], weeks = 12): WeekLoad[] {
  const maxHrRef = maxHrReference(log)
  const thisWeek = startOfWeek(new Date())
  const out: WeekLoad[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(thisWeek, -7 * i)
    const startISO = toISODate(start)
    const endISO = toISODate(addDays(start, 6))
    const load = log
      .filter((e) => e.date >= startISO && e.date <= endISO)
      .reduce((s, e) => s + loadOf(e, maxHrRef), 0)
    out.push({ weekStart: startISO, load })
  }
  return out
}

export type AcwrZone = 'low' | 'optimal' | 'high' | 'danger'

export interface Acwr {
  acute: number // last 7 days
  chronic: number // average week over the last 28 days
  ratio: number
  zone: AcwrZone
  label: string
  color: string // 'r g b'
  advice: string
}

const sumRange = (log: WorkoutEntry[], fromISO: string, toISOStr: string, ref?: number) =>
  log
    .filter((e) => e.date >= fromISO && e.date <= toISOStr)
    .reduce((s, e) => s + loadOf(e, ref), 0)

/**
 * Acute:chronic workload ratio — this week's load vs the 4-week average.
 * ~0.8–1.3 is the commonly cited "sweet spot"; well above it means the jump in
 * load is outpacing what the body is adapted to.
 */
export function computeAcwr(log: WorkoutEntry[], today = new Date()): Acwr | null {
  const maxHrRef = maxHrReference(log)
  const todayISO = toISODate(today)
  const acute = sumRange(log, toISODate(addDays(today, -6)), todayISO, maxHrRef)
  const chronicTotal = sumRange(log, toISODate(addDays(today, -27)), todayISO, maxHrRef)
  const chronic = chronicTotal / 4

  if (chronic <= 0) return null
  const ratio = Math.round((acute / chronic) * 100) / 100

  let zone: AcwrZone
  let label: string
  let color: string
  let advice: string
  if (ratio < 0.8) {
    zone = 'low'
    label = 'עומס נמוך'
    color = 'var(--c-swim)'
    advice = 'הנפח ירד מול החודש האחרון — מתאים לשבוע התאוששות, אבל אם זה נמשך תאבד כושר.'
  } else if (ratio <= 1.3) {
    zone = 'optimal'
    label = 'טווח אופטימלי'
    color = 'var(--c-bike)'
    advice = 'העומס עולה בקצב שהגוף מסתגל אליו. המשך כך.'
  } else if (ratio <= 1.5) {
    zone = 'high'
    label = 'עומס גבוה'
    color = 'var(--accent)'
    advice = 'קפיצה מהירה בנפח. שמור על ימי התאוששות והימנע מהעלאה נוספת השבוע.'
  } else {
    zone = 'danger'
    label = 'קפיצת עומס חדה'
    color = 'var(--c-run)'
    advice = 'העומס השבוע גבוה בהרבה מהרגלך — זה הטווח שמזוהה עם סיכון מוגבר לפציעה. שקול להוריד נפח.'
  }

  return { acute: Math.round(acute), chronic: Math.round(chronic), ratio, zone, label, color, advice }
}
