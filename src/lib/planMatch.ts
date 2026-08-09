import type {
  AerobicTargets,
  ID,
  PlanSession,
  PlanWeek,
  PlannedWorkout,
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

  // claim the best unused, sport-matching entry from `pool` for a session,
  // preferring the real Garmin activity (actual numbers) over a manual placeholder
  const claim = (session: PlanSession, pool: WorkoutEntry[]): boolean => {
    const avail = pool.filter(
      (e) => !used.has(e.id) && sessionMatchesEntry(session, e),
    )
    const pick = avail.find((e) => e.source === 'garmin') ?? avail[0]
    if (!pick) return false
    used.add(pick.id)
    result[session.id] = { done: true, entry: pick }
    return true
  }

  // pass 1: every session first claims a workout logged on its own day, so a
  // same-day match always wins globally — otherwise a same-sport session on a
  // different day could greedily consume today's entry before today's session
  // (which is that entry's real match) gets a chance.
  for (const session of week.sessions) {
    const dayISO = toISODate(addDays(start, session.day))
    claim(
      session,
      weekLog.filter((e) => e.date === dayISO),
    )
  }

  // pass 2: sessions still unmatched fall back to any remaining in-week entry
  for (const session of week.sessions) {
    if (result[session.id]?.done) continue
    if (!claim(session, weekLog)) result[session.id] = { done: false }
  }

  return result
}

function sessionMatchesPlanned(session: PlanSession, p: PlannedWorkout): boolean {
  if (session.sport === 'strength') return p.category === 'strength'
  if (session.sport === 'other') return p.category === 'other'
  return p.category === 'aerobic' && p.sport === session.sport
}

/**
 * Plan sessions for a week that aren't on the planning board yet.
 *
 * Matching is by sport, not by day — the day a session lands on is decided
 * week by week. A workout scheduled by the coach (or added by hand) carries no
 * link back to its session, so an explicit planSessionId is honoured first and
 * everything else falls back to a greedy sport match, each planned workout
 * being consumed at most once.
 */
export function unscheduledSessions(
  week: PlanWeek,
  plannedInWeek: PlannedWorkout[],
): PlanSession[] {
  const used = new Set<ID>()
  const scheduled = new Set<ID>()

  // pass 1: sessions explicitly linked to a planned workout
  for (const session of week.sessions) {
    const linked = plannedInWeek.find(
      (p) => p.planSessionId === session.id && !used.has(p.id),
    )
    if (linked) {
      used.add(linked.id)
      scheduled.add(session.id)
    }
  }

  // pass 2: match the rest by sport
  for (const session of week.sessions) {
    if (scheduled.has(session.id)) continue
    const match = plannedInWeek.find(
      (p) => !used.has(p.id) && sessionMatchesPlanned(session, p),
    )
    if (match) {
      used.add(match.id)
      scheduled.add(session.id)
    }
  }

  return week.sessions.filter((s) => !scheduled.has(s.id))
}

/**
 * Map each plan session to the weekday (0–6) of the planned workout it was
 * placed on this week, so the plan's template days can be realigned to however
 * the user actually arranged the board. Matching mirrors `unscheduledSessions`:
 * an explicit `planSessionId` link first, then a greedy sport match, each
 * planned workout consumed at most once. Sessions with no match are omitted.
 */
export function boardDaysForWeek(
  week: PlanWeek,
  plannedInWeek: PlannedWorkout[],
): Record<ID, number> {
  const used = new Set<ID>()
  const out: Record<ID, number> = {}
  const dayOf = (dateISO: string) => fromISO(dateISO).getDay()

  // pass 1: sessions explicitly linked to a planned workout
  for (const session of week.sessions) {
    const linked = plannedInWeek.find(
      (p) => p.planSessionId === session.id && !used.has(p.id),
    )
    if (linked) {
      used.add(linked.id)
      out[session.id] = dayOf(linked.date)
    }
  }

  // pass 2: match the rest by sport, preferring a workout whose name matches
  // the session label so e.g. "רגליים" doesn't grab the "פלג גוף עליון" session
  for (const session of week.sessions) {
    if (out[session.id] != null) continue
    const sameSport = plannedInWeek.filter(
      (p) => !used.has(p.id) && sessionMatchesPlanned(session, p),
    )
    const label = (session.label ?? '').trim()
    const match =
      (label &&
        sameSport.find(
          (p) => (p.strengthName ?? p.otherName ?? '').trim() === label,
        )) ||
      sameSport[0]
    if (match) {
      used.add(match.id)
      out[session.id] = dayOf(match.date)
    }
  }

  return out
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
