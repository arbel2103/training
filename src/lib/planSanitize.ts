import type { PlanSession, PlanSport, PlanWeek, TrainingPlan } from '../store/useStore'
import { fromISO, startOfWeek, toISODate } from './dates'
import { uid } from './ids'

/**
 * Repair a training plan into something the app can actually render.
 *
 * The plan is written by the AI coach, which means it can be *almost* right:
 * a week without a `weekStart`, a date that isn't a Sunday, a sport nobody has
 * heard of, a distance that arrived as a string. The views treat those fields
 * as facts — `weekCompletion` calls `fromISO(week.weekStart)` and the program
 * page sorts by `weekStart.localeCompare` — so one malformed week used to throw
 * during render and take the whole "תוכנית" page down with it.
 *
 * Everything here is pure and total: give it any JSON at all and it hands back
 * a plan that renders. Repair beats rejection wherever the intent is obvious
 * (snap a mid-week date to its Sunday, clamp a day, coerce "12" to 12) and
 * only genuinely unusable weeks are dropped.
 */

const PLAN_SPORTS: PlanSport[] = ['run', 'bike', 'swim', 'strength', 'other']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** The Sunday of the week `value` falls in, or null if it isn't a real date. */
export function weekStartOf(value: unknown): string | null {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return null
  const d = fromISO(value)
  return Number.isNaN(d.getTime()) ? null : toISODate(startOfWeek(d))
}

const str = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t ? t : undefined
}

/** A positive, finite number — accepting the numeric strings models like to send. */
const num = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined
}

function sanitizeSession(raw: unknown): PlanSession | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>

  // a session with no placeable day is the one thing we can't guess at
  const rawDay = typeof s.day === 'string' ? Number(s.day) : s.day
  if (typeof rawDay !== 'number' || !Number.isFinite(rawDay)) return null
  const day = Math.min(6, Math.max(0, Math.round(rawDay)))

  const sport = PLAN_SPORTS.includes(s.sport as PlanSport)
    ? (s.sport as PlanSport)
    : 'other'

  return {
    id: str(s.id) ?? uid(),
    day,
    sport,
    ...(str(s.label) ? { label: str(s.label) } : {}),
    ...(num(s.distance) ? { distance: num(s.distance) } : {}),
    ...(num(s.durationMin) ? { durationMin: num(s.durationMin) } : {}),
    ...(str(s.note) ? { note: str(s.note) } : {}),
    ...(s.fromBoard === true ? { fromBoard: true as const } : {}),
  }
}

/**
 * One plan week, or null when it has no usable `weekStart` — without a date a
 * week has nowhere to live, can't be matched against the log, and can't be
 * updated later (every plan action is keyed by `weekStart`).
 */
export function sanitizePlanWeek(raw: unknown): PlanWeek | null {
  if (!raw || typeof raw !== 'object') return null
  const w = raw as Record<string, unknown>
  const weekStart = weekStartOf(w.weekStart)
  if (!weekStart) return null

  const sessions = (Array.isArray(w.sessions) ? w.sessions : [])
    .map(sanitizeSession)
    .filter((s): s is PlanSession => s !== null)

  return {
    id: str(w.id) ?? uid(),
    weekStart,
    ...(str(w.label) ? { label: str(w.label) } : {}),
    ...(str(w.focus) ? { focus: str(w.focus) } : {}),
    sessions,
  }
}

/**
 * A whole plan. Weeks are deduplicated by `weekStart` — two entries for the
 * same week (which happens when dates get snapped to their Sunday) are merged
 * rather than one silently shadowing the other, since every lookup in the app
 * takes the first match.
 */
export function sanitizePlan(raw: unknown): TrainingPlan | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>

  const byWeekStart = new Map<string, PlanWeek>()
  for (const rawWeek of Array.isArray(p.weeks) ? p.weeks : []) {
    const week = sanitizePlanWeek(rawWeek)
    if (!week) continue
    const existing = byWeekStart.get(week.weekStart)
    byWeekStart.set(
      week.weekStart,
      existing
        ? { ...existing, sessions: [...existing.sessions, ...week.sessions] }
        : week,
    )
  }

  const weeks = [...byWeekStart.values()].sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart),
  )

  return {
    ...(str(p.raceName) ? { raceName: str(p.raceName) } : {}),
    ...(str(p.raceDate) ? { raceDate: str(p.raceDate) } : {}),
    weeks,
  }
}
