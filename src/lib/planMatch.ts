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
  const startISO = week.weekStart
  // a week with no real start date can't be matched to anything — say so
  // instead of throwing, which used to blank the whole program page
  if (typeof startISO !== 'string' || Number.isNaN(fromISO(startISO).getTime())) {
    return Object.fromEntries((week.sessions ?? []).map((s) => [s.id, { done: false }]))
  }
  const start = fromISO(startISO)
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
  const days: Record<ID, number> = {}
  for (const { session, workout } of pairWithBoard(week, plannedInWeek).pairs) {
    days[session.id] = fromISO(workout.date).getDay()
  }
  return days
}

/** One plan session and the board workout that represents it this week. */
interface BoardPair {
  session: PlanSession
  workout: PlannedWorkout
  /** the pairing came from a sport match, not an explicit planSessionId link */
  bySport: boolean
}

/**
 * The single matcher every board-facing helper shares: pair each plan session
 * with at most one board workout — an explicit `planSessionId` link first, then
 * a greedy sport match — and report what was left over on both sides.
 */
function pairWithBoard(
  week: PlanWeek,
  plannedInWeek: PlannedWorkout[],
): { pairs: BoardPair[]; lonelySessions: PlanSession[]; unclaimed: PlannedWorkout[] } {
  const claimed = new Set<ID>()
  const pairs: BoardPair[] = []
  const paired = new Set<ID>()

  // pass 1: sessions explicitly linked to a planned workout
  for (const session of week.sessions) {
    const linked = plannedInWeek.find(
      (p) => p.planSessionId === session.id && !claimed.has(p.id),
    )
    if (linked) {
      claimed.add(linked.id)
      paired.add(session.id)
      pairs.push({ session, workout: linked, bySport: false })
    }
  }

  // pass 2: match the rest by sport, preferring a workout whose name matches
  // the session label so e.g. "רגליים" doesn't grab the "פלג גוף עליון" session
  for (const session of week.sessions) {
    if (paired.has(session.id)) continue
    const sameSport = plannedInWeek.filter(
      (p) => !claimed.has(p.id) && sessionMatchesPlanned(session, p),
    )
    const label = (session.label ?? '').trim()
    const match =
      (label &&
        sameSport.find(
          (p) => (p.strengthName ?? p.otherName ?? '').trim() === label,
        )) ||
      sameSport[0]
    if (match) {
      claimed.add(match.id)
      paired.add(session.id)
      pairs.push({ session, workout: match, bySport: true })
    }
  }

  return {
    pairs,
    lonelySessions: week.sessions.filter((s) => !paired.has(s.id)),
    unclaimed: plannedInWeek.filter((p) => !claimed.has(p.id)),
  }
}

/** A board workout expressed as a plan session for the day it sits on. */
function plannedToSession(p: PlannedWorkout, id: ID): PlanSession {
  const day = fromISO(p.date).getDay()
  const durationMin = p.durationMin
  // `fromBoard` marks the session as the board's echo rather than something the
  // plan prescribes, so deleting the workout can take the session with it
  const base = { id, day, durationMin, fromBoard: true as const }
  if (p.category === 'strength')
    return { ...base, sport: 'strength', label: p.strengthName }
  if (p.category === 'other') return { ...base, sport: 'other', label: p.otherName }
  return { ...base, sport: p.sport ?? 'run', distance: p.distance }
}

/** A plan session expressed as the board workout that would schedule it. */
export function sessionToPlanned(
  s: PlanSession,
  date: string,
): Omit<PlannedWorkout, 'id'> {
  const base = {
    date,
    time: '18:00',
    durationMin: s.durationMin || 60,
    planSessionId: s.id,
  }
  if (s.sport === 'strength')
    return { ...base, category: 'strength', strengthName: s.label || undefined }
  if (s.sport === 'other')
    return { ...base, category: 'other', otherName: s.label || 'אימון' }
  return { ...base, category: 'aerobic', sport: s.sport, distance: s.distance }
}

/** The outcome of a board→plan reconciliation. */
export interface PlanBoardDiff {
  sessions: PlanSession[]
  /** `planSessionId` values the board is missing, so the pairing stops being a guess */
  links: { id: ID; planSessionId: ID }[]
}

/**
 * Reconcile a plan week with the planning board — **the board wins**.
 *
 * Use after the user rearranges the board: matched sessions move to the weekday
 * their workout sits on, a workout with no session at all gets one created, and
 * a session that only ever existed as the board's echo (`fromBoard`) disappears
 * once its workout is deleted. A session the plan genuinely prescribes is never
 * removed — it just goes back to being unscheduled. Idempotent.
 *
 * Also reports the `planSessionId` links the board should record. Sport matching
 * is a good guess but only a guess; writing the link back turns every later sync
 * into an exact lookup, and it is what lets the plan tell an ad-hoc workout from
 * one it put there itself.
 */
export function reconcilePlanWeek(
  week: PlanWeek,
  plannedInWeek: PlannedWorkout[],
  newId: () => ID,
): PlanBoardDiff {
  const { pairs, unclaimed } = pairWithBoard(week, plannedInWeek)
  const dayById = new Map(
    pairs.map((p) => [p.session.id, fromISO(p.workout.date).getDay()]),
  )
  const links = pairs
    .filter((p) => p.workout.planSessionId !== p.session.id)
    .map((p) => ({ id: p.workout.id, planSessionId: p.session.id }))

  const sessions: PlanSession[] = []
  for (const s of week.sessions) {
    const day = dayById.get(s.id)
    if (day == null) {
      if (s.fromBoard) continue // its workout is gone, and so is its reason to exist
      sessions.push(s)
      continue
    }
    sessions.push(day === s.day ? s : { ...s, day })
  }
  for (const p of unclaimed) {
    const session = plannedToSession(p, newId())
    sessions.push(session)
    links.push({ id: p.id, planSessionId: session.id })
  }
  return { sessions, links }
}

/** What the board has to change for it to match the plan week. */
export interface BoardPlanDiff {
  updates: { id: ID; patch: Partial<PlannedWorkout> }[]
  creates: Omit<PlannedWorkout, 'id'>[]
  /** board workouts the plan no longer prescribes — surfaced, never deleted */
  orphans: ID[]
}

/**
 * Work out how the board should follow a plan week — **the plan wins**.
 *
 * Use after the plan itself changes (the coach edited it, or a proposal was
 * approved): each session's workout moves to the day the plan now prescribes,
 * a session with no workout gets one scheduled, and anything touched is flagged
 * `needsPush` so the user is asked before it is re-sent to Google Calendar.
 *
 * A week the user has not started scheduling is left completely alone — the
 * plan prescribing twelve future weeks shouldn't fill the board with them.
 * Nothing is ever deleted; a workout the plan dropped is reported as an orphan
 * for the UI to offer removing.
 */
export function boardWorkoutsForPlan(
  week: PlanWeek,
  plannedInWeek: PlannedWorkout[],
): BoardPlanDiff {
  const empty: BoardPlanDiff = { updates: [], creates: [], orphans: [] }
  if (plannedInWeek.length === 0) return empty

  const start = fromISO(week.weekStart)
  const { pairs, lonelySessions, unclaimed } = pairWithBoard(week, plannedInWeek)

  const updates: BoardPlanDiff['updates'] = []
  for (const { session, workout, bySport } of pairs) {
    const date = toISODate(addDays(start, session.day))
    const patch: Partial<PlannedWorkout> = {}
    if (workout.date !== date) patch.date = date
    // a sport match means the explicit link was lost (the coach rewrote the
    // week); re-tie it now so the next edit can move this exact workout
    if (bySport || workout.planSessionId !== session.id)
      patch.planSessionId = session.id
    if (Object.keys(patch).length === 0) continue
    updates.push({ id: workout.id, patch: { ...patch, needsPush: true } })
  }

  const creates = lonelySessions
    // a `fromBoard` session with nothing to pair with is the leftover of a
    // workout the user deleted — scheduling it again would undo that delete
    .filter((s) => !s.fromBoard)
    .map((s) => ({
      ...sessionToPlanned(s, toISODate(addDays(start, s.day))),
      needsPush: true,
    }))

  return { updates, creates, orphans: unclaimed.map((p) => p.id) }
}

/**
 * Carry session ids across a rewrite of a plan week.
 *
 * The coach hands back a whole week with freshly minted ids even when it only
 * moved one workout, which would sever every `planSessionId` link the board
 * holds — and a severed link is what let a later board→plan sync drag the
 * coach's change back to the old day. Pair the new sessions with the old ones
 * (same sport, preferring the same label, then the same day) and keep the old
 * id, so a session that survived an edit stays the same session.
 */
export function carryOverSessionIds(
  previous: PlanSession[],
  next: PlanSession[],
): PlanSession[] {
  const used = new Set<ID>()
  const takenBy = new Map<ID, ID>() // new session id → id to reuse

  const claim = (s: PlanSession, pool: PlanSession[]): boolean => {
    const avail = pool.filter((o) => !used.has(o.id) && o.sport === s.sport)
    if (!avail.length) return false
    const label = (s.label ?? '').trim()
    const pick =
      (label && avail.find((o) => (o.label ?? '').trim() === label)) ||
      avail.find((o) => o.day === s.day) ||
      avail[0]
    used.add(pick.id)
    takenBy.set(s.id, pick.id)
    return true
  }

  // an exact label match is worth more than any same-sport neighbour, so give
  // every session a shot at one before falling back to day/order matching
  for (const s of next) {
    const label = (s.label ?? '').trim()
    if (!label) continue
    claim(
      s,
      previous.filter((o) => (o.label ?? '').trim() === label),
    )
  }
  for (const s of next) {
    if (takenBy.has(s.id)) continue
    claim(s, previous)
  }

  return next.map((s) => (takenBy.has(s.id) ? { ...s, id: takenBy.get(s.id)! } : s))
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
