/**
 * Strength: what was actually lifted, and how much of it each muscle got.
 *
 * The template in "תוכנית אימונים → כוח" says what you mean to do. This module
 * is about the other half — the sets you really performed — and everything
 * derived from them: what you lifted last time, an estimated 1RM, and weekly
 * set counts per muscle group.
 *
 * All pure, so all unit tested.
 */
import type { ID, WorkoutEntry } from '../store/useStore'

/** Muscle groups an exercise can be tagged with. */
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
]

export const muscleLabel: Record<MuscleGroup, string> = {
  chest: 'חזה',
  back: 'גב',
  shoulders: 'כתפיים',
  biceps: 'יד קדמית',
  triceps: 'יד אחורית',
  quads: 'ארבע ראשי',
  hamstrings: 'מיתרים',
  glutes: 'ישבן',
  calves: 'תאומים',
  core: 'ליבה',
}

/**
 * Weekly set-count landmarks, in the Renaissance Periodization sense:
 * below MEV a muscle is not getting enough to grow, MEV–MRV is the working
 * range, and past MRV you are accumulating more fatigue than you can recover.
 *
 * Deliberately one generic band rather than a per-muscle table: the real values
 * differ per person and per muscle, and inventing a precise number for each
 * would look authoritative without being any more true.
 */
export const MEV = 10
export const MRV = 22

export type VolumeZone = 'under' | 'working' | 'over'

export function volumeZone(sets: number): VolumeZone {
  if (sets < MEV) return 'under'
  if (sets > MRV) return 'over'
  return 'working'
}

/**
 * Pull a number of kilos out of the template's free-text weight field.
 *
 * The template stores weight as text so it can hold "משקל גוף" or "גומייה",
 * which no number would capture. When starting a session we still want a
 * sensible prefill, so read a leading number when there is one and give up
 * quietly when there isn't.
 */
export function parseWeightKg(text?: string): number | undefined {
  if (!text) return undefined
  const m = text.replace(',', '.').match(/-?\d+(\.\d+)?/)
  if (!m) return undefined
  const v = Number(m[0])
  return isFinite(v) && v > 0 ? v : undefined
}

/** Epley: the load you could theoretically lift once, from a set of `reps`. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (!(weightKg > 0) || !(reps > 0)) return 0
  if (reps === 1) return weightKg
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}

/** Total kilos moved: weight × reps, summed. Bodyweight sets contribute 0. */
export function tonnage(sets: { weightKg?: number; reps: number }[]): number {
  return Math.round(sets.reduce((t, s) => t + (s.weightKg ?? 0) * s.reps, 0))
}

/** Strength entries that actually carry logged sets, newest first. */
export function loggedSessions(log: WorkoutEntry[]): WorkoutEntry[] {
  return log
    .filter((e) => e.category === 'strength' && (e.sets?.length ?? 0) > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export interface LastPerformance {
  date: string
  sets: { weightKg?: number; reps: number }[]
}

/**
 * What you did for this exercise the last time you trained it.
 *
 * This is the number that makes progressive overload automatic — you can only
 * beat last week if the app remembers it. Matched on the exercise id, falling
 * back to the name so history survives an exercise being recreated.
 */
export function lastPerformance(
  log: WorkoutEntry[],
  exerciseId: ID,
  exerciseName?: string,
  before?: string,
): LastPerformance | null {
  for (const session of loggedSessions(log)) {
    if (before && session.date >= before) continue
    const sets = (session.sets ?? []).filter(
      (s) =>
        s.exerciseId === exerciseId ||
        (!!exerciseName && s.exerciseName === exerciseName),
    )
    if (sets.length) {
      return {
        date: session.date,
        sets: sets.map((s) => ({ weightKg: s.weightKg, reps: s.reps })),
      }
    }
  }
  return null
}

/** The heaviest single set ever logged for an exercise, by estimated 1RM. */
export function personalBest(
  log: WorkoutEntry[],
  exerciseId: ID,
  exerciseName?: string,
): { weightKg: number; reps: number; e1rm: number; date: string } | null {
  let best: { weightKg: number; reps: number; e1rm: number; date: string } | null =
    null
  for (const session of loggedSessions(log)) {
    for (const s of session.sets ?? []) {
      const mine =
        s.exerciseId === exerciseId ||
        (!!exerciseName && s.exerciseName === exerciseName)
      if (!mine || !s.weightKg) continue
      const e1rm = estimate1RM(s.weightKg, s.reps)
      if (!best || e1rm > best.e1rm)
        best = { weightKg: s.weightKg, reps: s.reps, e1rm, date: session.date }
    }
  }
  return best
}

/**
 * Sets per muscle group over a date range (inclusive).
 *
 * A set counts once for every muscle it is tagged with — tag the muscles an
 * exercise really drives, not every muscle involved, or a bench press would
 * inflate three groups at once. Untagged sets are counted separately so the UI
 * can say how much of the picture is missing rather than silently undercounting.
 */
export function volumeByMuscle(
  log: WorkoutEntry[],
  from: string,
  to: string,
): { byMuscle: Record<MuscleGroup, number>; untaggedSets: number } {
  const byMuscle = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, 0])) as Record<
    MuscleGroup,
    number
  >
  let untaggedSets = 0

  for (const e of log) {
    if (e.category !== 'strength' || e.date < from || e.date > to) continue
    for (const s of e.sets ?? []) {
      const muscles = s.muscles ?? []
      if (muscles.length === 0) {
        untaggedSets += 1
        continue
      }
      for (const m of muscles) if (m in byMuscle) byMuscle[m] += 1
    }
  }
  return { byMuscle, untaggedSets }
}
