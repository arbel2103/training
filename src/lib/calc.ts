import type { Sport, WorkoutEntry } from '../store/useStore'

/** Parse "m:ss" → seconds. Returns undefined if malformed. */
export function parsePace(str: string): number | undefined {
  const m = str.trim().match(/^(\d{1,2}):([0-5]?\d)$/)
  if (!m) return undefined
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

/** seconds → "m:ss" */
export function formatPace(sec?: number): string {
  if (sec == null || !isFinite(sec)) return '—'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** minutes → friendly Hebrew duration */
export function formatDuration(min?: number): string {
  if (min == null || !isFinite(min) || min <= 0) return '—'
  const total = Math.round(min)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} דק׳`
  if (m === 0) return `${h} שע׳`
  return `${h} שע׳ ${m} דק׳`
}

export const sportUnit = (sport: Sport): string => (sport === 'swim' ? 'מ׳' : 'ק״מ')

/**
 * Compute aerobic workout duration in minutes — a different formula per sport:
 *  run:  distance(km) × pace(sec/km)
 *  swim: (distance(m) / 100) × pace(sec/100m)
 *  bike: distance(km) / speed(km/h) × 60
 */
export function computeAerobicDuration(args: {
  sport?: Sport
  distance?: number
  paceSec?: number
  speedKmh?: number
}): number | undefined {
  const { sport, distance, paceSec, speedKmh } = args
  if (!sport || !distance || distance <= 0) return undefined
  if (sport === 'run') {
    if (!paceSec) return undefined
    return (distance * paceSec) / 60
  }
  if (sport === 'swim') {
    if (!paceSec) return undefined
    return ((distance / 100) * paceSec) / 60
  }
  if (sport === 'bike') {
    if (!speedKmh || speedKmh <= 0) return undefined
    return (distance / speedKmh) * 60
  }
  return undefined
}

/** Duration for any entry (computed for aerobic, stored for strength/other). */
export function entryDuration(e: WorkoutEntry): number | undefined {
  if (e.category === 'aerobic') return computeAerobicDuration(e)
  return e.durationMin
}
