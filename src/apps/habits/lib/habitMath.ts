/**
 * Streaks, completion rates and the day-by-day history strip.
 *
 * Everything here is derived from the raw facts on a habit (which days were
 * ticked, which days were excused) plus the global freeze ranges. Nothing is
 * cached or incremented, which is exactly why "come back from a freeze and
 * carry on from the same point" needs no special handling: the frozen days
 * simply never enter the sums.
 *
 * The rules, as specified:
 *  - a ticked day adds 1 to the streak;
 *  - a missed day that was not frozen resets it to 0;
 *  - a frozen day (global or per-habit) neither adds nor resets;
 *  - rate = ticked days / (elapsed days since creation − frozen days).
 *
 * All pure, so all unit tested.
 */
import { addDays, fromISO, toISODate } from '../../../lib/dates'
import type {
  DayCell,
  DayState,
  GlobalFreeze,
  Habit,
  HabitStats,
  ISODate,
} from './types'

/** Is this day inside any global freeze? An open range runs to today. */
export function isGloballyFrozen(date: ISODate, freezes: GlobalFreeze[]): boolean {
  return freezes.some((f) => date >= f.start && (f.end === null || date <= f.end))
}

/** Is this day excused for this habit — globally or just for it? */
export function isFrozen(
  date: ISODate,
  habit: Habit,
  freezes: GlobalFreeze[],
): boolean {
  return habit.frozenDays[date] === true || isGloballyFrozen(date, freezes)
}

/**
 * How one day should read.
 *
 * `pending` is today, not ticked yet — deliberately distinct from `missed`, so
 * an untouched morning neither breaks the streak nor dents the rate.
 */
export function dayState(
  habit: Habit,
  date: ISODate,
  freezes: GlobalFreeze[],
  today: ISODate,
): DayState {
  if (date < habit.createdDate) return 'before'
  if (habit.completions[date]) return 'done'
  if (isFrozen(date, habit, freezes)) return 'frozen'
  if (date >= today) return 'pending'
  return 'missed'
}

/** The last `n` days ending today, oldest first — the mini history strip. */
export function lastNDays(
  habit: Habit,
  freezes: GlobalFreeze[],
  today: ISODate,
  n = 7,
): DayCell[] {
  const end = fromISO(today)
  return Array.from({ length: n }, (_, i) => {
    const date = toISODate(addDays(end, i - (n - 1)))
    return { date, state: dayState(habit, date, freezes, today) }
  })
}

/**
 * Streak, best streak and rate in a single walk over the habit's lifetime.
 *
 * One pass keeps the three numbers consistent with each other by construction,
 * and a habit's lifetime is days, not years of rows, so walking it is cheap.
 */
export function computeStats(
  habit: Habit,
  freezes: GlobalFreeze[],
  today: ISODate,
): HabitStats {
  if (today < habit.createdDate)
    return { currentStreak: 0, bestStreak: 0, rate: null, doneDays: 0, countedDays: 0 }

  let run = 0
  let bestStreak = 0
  let doneDays = 0
  let countedDays = 0
  // the streak that is still alive at the end of the walk
  let currentStreak = 0

  const last = fromISO(today)
  for (let d = fromISO(habit.createdDate); d <= last; d = addDays(d, 1)) {
    const date = toISODate(d)
    const state = dayState(habit, date, freezes, today)

    if (state === 'done') {
      run += 1
      doneDays += 1
      countedDays += 1
      if (run > bestStreak) bestStreak = run
      currentStreak = run
    } else if (state === 'frozen') {
      // excused: the streak survives untouched and the day leaves the maths
      continue
    } else if (state === 'pending') {
      // today, not answered yet — it can still become either, so it neither
      // breaks the streak nor counts against the rate
      continue
    } else {
      // missed
      run = 0
      currentStreak = 0
      countedDays += 1
    }
  }

  return {
    currentStreak,
    bestStreak,
    rate: countedDays > 0 ? Math.round((doneDays / countedDays) * 100) : null,
    doneDays,
    countedDays,
  }
}

/** Habits ticked today, out of those that were not excused today. */
export function todayProgress(
  habits: Habit[],
  freezes: GlobalFreeze[],
  today: ISODate,
): { done: number; total: number; pct: number } {
  const live = habits.filter(
    (h) => !h.archivedAt && h.createdDate <= today && !isFrozen(today, h, freezes),
  )
  const done = live.filter((h) => h.completions[today]).length
  return {
    done,
    total: live.length,
    pct: live.length ? Math.round((done / live.length) * 100) : 0,
  }
}

/** The freeze that is still open, if the app is frozen right now. */
export const openFreeze = (freezes: GlobalFreeze[]): GlobalFreeze | undefined =>
  freezes.find((f) => f.end === null)

/** Whole days a freeze has been running, counting the day it started as 1. */
export function freezeLengthDays(freeze: GlobalFreeze, today: ISODate): number {
  const end = freeze.end ?? today
  return Math.max(
    1,
    Math.round((fromISO(end).getTime() - fromISO(freeze.start).getTime()) / 86_400_000) + 1,
  )
}
