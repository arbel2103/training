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
