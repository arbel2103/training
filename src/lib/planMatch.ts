import type {
  AerobicTargets,
  PlanSession,
  PlanWeek,
  Sport,
  TrainingPlan,
  WorkoutEntry,
} from '../store/useStore'
import { addDays, fromISO, toISODate } from './dates'

export interface SessionMatch {
  done: boolean
  entry?: WorkoutEntry
}

function sessionMatchesEntry(session: PlanSession, e: WorkoutEntry): boolean {
  if (session.sport === 'strength') return e.category === 'strength'
  if (session.sport === 'other') return e.category === 'other'
  return e.category === 'aerobic' && e.sport === session.sport
}

/**
 * For one plan week, match each planned session to a logged workout in that
 * calendar week. Greedy: prefers a same-day log entry, then any in the week;
 * each log entry is consumed at most once.
 */
export function weekCompletion(
  week: PlanWeek,
  log: WorkoutEntry[],
): Record<string, SessionMatch> {
  const start = fromISO(week.weekStart)
  const startISO = week.weekStart
  const endISO = toISODate(addDays(start, 6))
  const weekLog = log.filter((e) => e.date >= startISO && e.date <= endISO)
  const used = new Set<string>()
  const result: Record<string, SessionMatch> = {}

  for (const session of week.sessions) {
    const dayISO = toISODate(addDays(start, session.day))
    const candidates = weekLog.filter(
      (e) => !used.has(e.id) && sessionMatchesEntry(session, e),
    )
    const pick =
      candidates.find((e) => e.date === dayISO) ?? candidates[0]
    if (pick) {
      used.add(pick.id)
      result[session.id] = { done: true, entry: pick }
    } else {
      result[session.id] = { done: false }
    }
  }
  return result
}

/** Weekly aerobic targets derived from the plan week whose weekStart matches. */
export function targetsForWeek(
  plan: TrainingPlan | null,
  weekStartISO: string,
): AerobicTargets {
  const empty: AerobicTargets = { run: [], bike: [], swim: [] }
  const week = plan?.weeks.find((w) => w.weekStart === weekStartISO)
  if (!week) return empty
  const sums: Record<Sport, number> = { run: 0, bike: 0, swim: 0 }
  for (const s of week.sessions) {
    if ((s.sport === 'run' || s.sport === 'bike' || s.sport === 'swim') && s.distance) {
      sums[s.sport] += s.distance
    }
  }
  return {
    run: sums.run > 0 ? [{ id: 'plan-run', distance: sums.run }] : [],
    bike: sums.bike > 0 ? [{ id: 'plan-bike', distance: sums.bike }] : [],
    swim: sums.swim > 0 ? [{ id: 'plan-swim', distance: sums.swim }] : [],
  }
}
