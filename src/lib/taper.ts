/**
 * What a taper week should look like, and what to eat and how to pace in it.
 *
 * The plan already carries taper weeks — the coach labels them — but a label is
 * all it was. The taper is where the training stops changing anything and the
 * details start deciding the race, so this is where an app has something to add:
 * whether the volume actually came down, what to eat in the last 48 hours, and
 * what pace the athlete's own logs say they can hold.
 *
 * Everything here is pure and derived from data already in the app. Where a
 * number would need a lab (a real sweat rate, a threshold test) it is presented
 * as a starting range to calibrate from, never as a measurement.
 */
import type { PlanSession, PlanWeek, Sport, WorkoutEntry } from '../store/useStore'
import { daysInRange } from './dates'
import { isEnduranceSport, paceMinPerUnit, sessionDurationMin } from './fueling'

const TAPER_WORDS = ['טייפר', 'טפר', 'הורדה', 'taper']

/** Does this week's label mark it as a taper? */
export function isTaperWeek(week: { label?: string; focus?: string }): boolean {
  const t = `${week.label ?? ''} ${week.focus ?? ''}`.toLowerCase()
  return TAPER_WORDS.some((w) => t.includes(w))
}

/** Planned endurance minutes in a week, at this athlete's own pace. */
export function weekLoadMin(sessions: PlanSession[], log: WorkoutEntry[]): number {
  return sessions
    .filter((s) => isEnduranceSport(s.sport))
    .reduce((t, s) => t + (sessionDurationMin(s, log) ?? 0), 0)
}

export interface TaperVolume {
  thisWeekMin: number
  baselineMin: number
  /** this week as a share of the baseline, 0–1 */
  ratio: number
  /** the 40–60% cut a taper is supposed to be */
  onTarget: boolean
  tooHigh: boolean
}

/**
 * Did the volume actually come down?
 *
 * A taper is a 40–60% cut in volume with the intensity left alone, so the
 * check that matters is this week against the weeks that came before it — and
 * that is a comparison the app can make for itself rather than take on trust.
 */
export function taperVolume(
  week: PlanWeek,
  allWeeks: PlanWeek[],
  log: WorkoutEntry[],
): TaperVolume | null {
  const earlier = allWeeks
    .filter((w) => w.weekStart < week.weekStart && !isTaperWeek(w))
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, 3)
  if (!earlier.length) return null

  const thisWeekMin = weekLoadMin(week.sessions, log)
  const baselineMin = Math.round(
    earlier.reduce((t, w) => t + weekLoadMin(w.sessions, log), 0) / earlier.length,
  )
  if (!baselineMin) return null

  const ratio = thisWeekMin / baselineMin
  return {
    thisWeekMin,
    baselineMin,
    ratio,
    onTarget: ratio >= 0.4 && ratio <= 0.6,
    tooHigh: ratio > 0.6,
  }
}

export interface CarbLoad {
  /** grams per kg of body weight, per day */
  perKg: { low: number; high: number }
  /** the same in grams, when a body weight is known */
  grams: { low: number; high: number } | null
  weightKg: number | null
}

/**
 * Carbohydrate for the last days before a race.
 *
 * The loading window is the 36–48 hours before the start, not the whole week:
 * eating 10 g/kg for six days puts on weight without adding glycogen. Expressed
 * per kilo because that is how the research states it and how it scales.
 */
export function carbLoad(weightKg: number | null, loading: boolean): CarbLoad {
  const perKg = loading ? { low: 8, high: 10 } : { low: 5, high: 7 }
  return {
    perKg,
    grams: weightKg
      ? { low: Math.round(perKg.low * weightKg), high: Math.round(perKg.high * weightKg) }
      : null,
    weightKg,
  }
}

export interface SportPace {
  sport: Sport
  /** median minutes per km (run/bike) or per 100 m (swim), from the log */
  easyMinPerUnit: number
  sampleCount: number
}

/**
 * The athlete's own recent pace per sport — a reference, not a prediction.
 *
 * Deliberately reports what they have actually been doing rather than
 * projecting a race time: turning training paces into a finish time needs a
 * proper test, and a confident wrong number on race morning is worse than none.
 */
export function recentPaces(log: WorkoutEntry[], sinceISO: string): SportPace[] {
  const sports: Sport[] = ['swim', 'bike', 'run']
  return sports
    .map((sport) => {
      const samples = log.filter(
        (e) =>
          e.category === 'aerobic' &&
          e.sport === sport &&
          e.date >= sinceISO &&
          (e.distance ?? 0) > 0 &&
          (e.durationMin ?? 0) > 0,
      )
      return {
        sport,
        easyMinPerUnit: paceMinPerUnit(log, sport),
        sampleCount: samples.length,
      }
    })
    .filter((p) => p.sampleCount > 0)
}

/** Days from `today` to the race, or null when there is no race date. */
export function daysToRace(today: string, raceDate?: string): number | null {
  if (!raceDate || raceDate < today) return null
  return daysInRange(today, raceDate) - 1
}

/** Race-week reminders that are about behaviour, not numbers. */
export function taperRules(days: number | null): string[] {
  const rules = [
    'שום דבר חדש ביום המרוץ — נעליים, ג׳ל, משקה או ארוחה שלא ניסית באימון, לא מתחילים בו.',
    'הנפח יורד, העצימות נשארת: כמה מקטעים קצרים בקצב מרוץ שומרים על תחושת המהירות.',
    'תחושת רגליים כבדות באמצע טייפר היא נורמלית וחולפת — היא לא סימן לחוסר כושר.',
  ]
  if (days != null && days <= 3)
    rules.push(
      'תרגל את שגרת הבוקר של המרוץ: אותה ארוחה, באותו פער זמן לפני היציאה.',
      'שתייה קבועה לאורך היום עדיפה על ליטר אחד לפני השינה.',
    )
  return rules
}
