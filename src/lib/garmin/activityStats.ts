// Pure per-sport aggregations over the workout log, for the Stats tab.
import type { Sport, WorkoutEntry } from '../../store/useStore'
import { entryDuration } from '../calc'

export interface SportSummary {
  count: number
  totalDistance: number // km (run/bike) or meters (swim)
  totalDurationMin: number
  avgHr?: number
  avgPaceSec?: number // run/swim
  avgSpeedKmh?: number // bike
  avgCadence?: number
}

/** Aerobic entries of one sport, oldest first. */
export function sportEntries(log: WorkoutEntry[], sport: Sport): WorkoutEntry[] {
  return log
    .filter((e) => e.category === 'aerobic' && e.sport === sport)
    .sort((a, b) =>
      a.date === b.date
        ? (a.startTime ?? '').localeCompare(b.startTime ?? '')
        : a.date.localeCompare(b.date),
    )
}

function mean(nums: number[]): number | undefined {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : undefined
}

const pluck = (entries: WorkoutEntry[], key: keyof WorkoutEntry): number[] =>
  entries
    .map((e) => e[key])
    .filter((v): v is number => typeof v === 'number')

export function summarize(entries: WorkoutEntry[], sport: Sport): SportSummary {
  const totalDistance = pluck(entries, 'distance').reduce((s, n) => s + n, 0)
  const totalDurationMin = entries.reduce((s, e) => s + (entryDuration(e) ?? 0), 0)
  return {
    count: entries.length,
    totalDistance: Math.round(totalDistance * 10) / 10,
    totalDurationMin: Math.round(totalDurationMin),
    avgHr: round(mean(pluck(entries, 'avgHr'))),
    avgPaceSec: sport !== 'bike' ? round(mean(pluck(entries, 'paceSec'))) : undefined,
    avgSpeedKmh: sport === 'bike' ? round(mean(pluck(entries, 'speedKmh')), 1) : undefined,
    avgCadence: round(mean(pluck(entries, 'cadence'))),
  }
}

function round(n: number | undefined, d = 0): number | undefined {
  if (n == null) return undefined
  const f = 10 ** d
  return Math.round(n * f) / f
}

export interface TrendPoint {
  label: string
  value: number
}

/** A trend series for a numeric field, one point per entry that has it. */
export function trend(
  entries: WorkoutEntry[],
  key: keyof WorkoutEntry,
): TrendPoint[] {
  const out: TrendPoint[] = []
  for (const e of entries) {
    const v = e[key]
    if (typeof v === 'number') {
      out.push({ label: shortDate(e.date), value: v })
    }
  }
  return out
}

function shortDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
}

/* ---------------- strength ---------------- */

export interface StrengthSummary {
  count: number
  totalDurationMin: number
  avgDurationMin?: number
  perWeek: number
  byName: { name: string; count: number }[]
  byIntensity: { light: number; medium: number; heavy: number }
  weeks: { weekStart: string; count: number }[]
}

/** Strength entries in the log, oldest first. */
export function strengthEntries(log: WorkoutEntry[]): WorkoutEntry[] {
  return log
    .filter((e) => e.category === 'strength')
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * How consistently strength is being trained: volume of sessions, which
 * workouts come up most, and how the sessions split by intensity.
 */
export function summarizeStrength(
  entries: WorkoutEntry[],
  weekStarts: string[],
): StrengthSummary {
  const durations = entries
    .map((e) => e.durationMin)
    .filter((v): v is number => typeof v === 'number' && v > 0)
  const totalDurationMin = Math.round(durations.reduce((s, n) => s + n, 0))

  const nameCounts = new Map<string, number>()
  for (const e of entries) {
    const name = e.strengthName?.trim() || 'ללא שם'
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)
  }

  const byIntensity = { light: 0, medium: 0, heavy: 0 }
  for (const e of entries) {
    if (e.intensity && e.intensity in byIntensity) byIntensity[e.intensity]++
  }

  const weeks = weekStarts.map((weekStart) => {
    const end = new Date(weekStart + 'T00:00:00')
    end.setDate(end.getDate() + 6)
    const endISO = end.toISOString().slice(0, 10)
    return {
      weekStart,
      count: entries.filter((e) => e.date >= weekStart && e.date <= endISO).length,
    }
  })

  return {
    count: entries.length,
    totalDurationMin,
    avgDurationMin: durations.length
      ? Math.round(totalDurationMin / durations.length)
      : undefined,
    perWeek: weeks.length
      ? Math.round((entries.length / weeks.length) * 10) / 10
      : 0,
    byName: [...nameCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    byIntensity,
    weeks,
  }
}
