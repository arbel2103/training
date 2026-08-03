// Infers a workout's intensity label from its own numbers, so synced Garmin
// activities arrive tagged ("קלה" / "ארוכה" / "אינטרוולים" / "טכניקה") instead
// of blank. Always overridable by the user — editing an entry marks it manual.
import type { AerobicIntensity, Sport, WorkoutEntry } from '../../store/useStore'

interface LongThreshold {
  minutes: number
  distance: number // km for run/bike, meters for swim
}

const LONG: Record<Sport, LongThreshold> = {
  run: { minutes: 75, distance: 15 },
  bike: { minutes: 120, distance: 60 },
  swim: { minutes: 60, distance: 2500 },
}

/** Below this a swim is treated as a drill/technique session. */
const SWIM_TECHNIQUE_M = 800

const HARD_HR = 0.85 // share of reference max HR
const EASY_HR = 0.75

/** Highest max heart rate seen across the log — the reference for effort. */
export function maxHrReference(log: WorkoutEntry[]): number | undefined {
  const maxes = log.map((e) => e.maxHr).filter((v): v is number => typeof v === 'number')
  if (!maxes.length) return undefined
  const max = Math.max(...maxes)
  return max > 120 ? max : undefined
}

export interface TagInput {
  sport?: Sport
  distance?: number
  durationMin?: number
  avgHr?: number
}

/**
 * Best-guess intensity label. Returns undefined when there isn't enough
 * signal, so we never invent a tag out of nothing.
 */
export function classifyIntensity(
  a: TagInput,
  maxHrRef?: number,
): AerobicIntensity | undefined {
  const { sport, distance, durationMin, avgHr } = a
  if (!sport) return undefined

  if (sport === 'swim' && distance != null && distance > 0 && distance < SWIM_TECHNIQUE_M) {
    return 'technique'
  }

  const hrShare = avgHr && maxHrRef ? avgHr / maxHrRef : undefined
  if (hrShare != null && hrShare >= HARD_HR) return 'intense'

  const t = LONG[sport]
  const isLong =
    (durationMin != null && durationMin >= t.minutes) ||
    (distance != null && distance >= t.distance)
  if (isLong) return 'long'

  if (hrShare != null) return hrShare <= EASY_HR ? 'easy' : 'intense'

  // no heart rate: only duration/distance told us anything
  return durationMin != null || distance != null ? 'easy' : undefined
}
