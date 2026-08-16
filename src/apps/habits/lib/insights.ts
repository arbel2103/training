/**
 * What the habits data says when you line it up against training and sleep.
 *
 * All three apps live in one bundle and one localStorage, so this is a plain
 * cross-store read rather than an integration: habits come from this app,
 * sleep and workouts from TriLife's store.
 *
 * The honesty rules baked in here matter more than the maths:
 *  - nothing is reported below `MIN_GROUP` days on *each* side of a comparison,
 *    because two good nights and one bad one is not a finding;
 *  - frozen days are skipped entirely — they are excused, not evidence;
 *  - the output is a difference in averages, never a p-value or a correlation
 *    coefficient, because that would dress up a handful of days as statistics;
 *  - the copy says "on days when", never "because" — this observes, it does not
 *    explain.
 *
 * All pure, so all unit tested.
 */
import type { GlobalFreeze, Habit, ISODate } from './types'
import { isFrozen, isGloballyFrozen } from './habitMath'

/** Days needed on each side of a comparison before it is worth showing. */
export const MIN_GROUP = 4

/** One day, with everything the three apps know about it. */
export interface DayFacts {
  date: ISODate
  /** share of that day's trackable habits that were ticked, 0–1 */
  habitPct: number | null
  sleepScore?: number
  sleepMin?: number
  restingHr?: number
  hrv?: number
  /** a workout was logged that day */
  trained: boolean
  trainingMin: number
}

/** The shape this module needs from TriLife — declared here so the habits app
 *  never depends on TriLife's full store type. */
export interface HealthDay {
  date: string
  sleepScore?: number
  sleepMin?: number
  restingHr?: number
  hrvLastNight?: number
}
export interface WorkoutDay {
  date: string
  durationMin?: number
}

export function buildDayFacts(
  habits: Habit[],
  freezes: GlobalFreeze[],
  health: HealthDay[],
  workouts: WorkoutDay[],
  today: ISODate,
): DayFacts[] {
  const live = habits.filter((h) => !h.archivedAt)
  const byDate = new Map<string, DayFacts>()

  for (const h of health) {
    if (h.date > today) continue
    byDate.set(h.date, {
      date: h.date,
      habitPct: null,
      sleepScore: h.sleepScore,
      sleepMin: h.sleepMin,
      restingHr: h.restingHr,
      hrv: h.hrvLastNight,
      trained: false,
      trainingMin: 0,
    })
  }
  for (const w of workouts) {
    if (w.date > today) continue
    const d = byDate.get(w.date) ?? {
      date: w.date,
      habitPct: null,
      trained: false,
      trainingMin: 0,
    }
    d.trained = true
    d.trainingMin += w.durationMin ?? 0
    byDate.set(w.date, d)
  }

  for (const d of byDate.values()) {
    // only habits that already existed and were not excused count that day
    const tracked = live.filter(
      (h) => h.createdDate <= d.date && !isFrozen(d.date, h, freezes),
    )
    d.habitPct = tracked.length
      ? tracked.filter((h) => h.completions[d.date]).length / tracked.length
      : null
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/** A "days when X" vs "days when not X" comparison of one number. */
export interface Comparison {
  /** what split the days, e.g. a habit name */
  subject: string
  /** what was measured, e.g. 'ציון שינה' */
  metric: string
  /** how to name each side — a habit reads "בוצע/לא בוצע", training reads
   *  "ימי אימון/ימי מנוחה", so the sentence is built per comparison */
  withLabel: string
  withoutLabel: string
  withAvg: number
  withoutAvg: number
  withN: number
  withoutN: number
  /** withAvg − withoutAvg, already rounded for display */
  delta: number
  unit: string
  /** whether a higher number is the good direction, for colouring */
  higherIsBetter: boolean
}

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length
const round1 = (v: number) => Math.round(v * 10) / 10

/**
 * Split days by a yes/no question and compare one measurement across the two
 * groups. Returns null unless both groups clear `MIN_GROUP`.
 */
export function compare(
  days: DayFacts[],
  split: (d: DayFacts) => boolean | null,
  value: (d: DayFacts) => number | undefined,
  meta: {
    subject: string
    metric: string
    unit: string
    higherIsBetter: boolean
    withLabel: string
    withoutLabel: string
  },
): Comparison | null {
  const yes: number[] = []
  const no: number[] = []
  for (const d of days) {
    const side = split(d)
    if (side === null) continue // not applicable that day
    const v = value(d)
    if (v == null || !isFinite(v)) continue
    ;(side ? yes : no).push(v)
  }
  if (yes.length < MIN_GROUP || no.length < MIN_GROUP) return null

  const withAvg = mean(yes)
  const withoutAvg = mean(no)
  return {
    ...meta,
    withAvg: round1(withAvg),
    withoutAvg: round1(withoutAvg),
    withN: yes.length,
    withoutN: no.length,
    delta: round1(withAvg - withoutAvg),
  }
}

/** The measurements worth comparing, in the order they should be tried. */
const METRICS: {
  metric: string
  unit: string
  higherIsBetter: boolean
  get: (d: DayFacts) => number | undefined
}[] = [
  { metric: 'ציון שינה', unit: '', higherIsBetter: true, get: (d) => d.sleepScore },
  {
    metric: 'משך שינה',
    unit: 'שעות',
    higherIsBetter: true,
    get: (d) => (d.sleepMin == null ? undefined : d.sleepMin / 60),
  },
  { metric: 'HRV', unit: '', higherIsBetter: true, get: (d) => d.hrv },
  {
    metric: 'דופק מנוחה',
    unit: '',
    higherIsBetter: false,
    get: (d) => d.restingHr,
  },
]

/**
 * Every comparison the data supports, strongest difference first.
 *
 * Three questions are asked:
 *  - per habit: how did the night look on days you did it?
 *  - training: do you keep up habits better on training days or rest days?
 *  - the reverse direction: after a good night, do you keep up habits better?
 *    (this one is lagged by a day, which is the only ordering that could hint
 *    at cause rather than coincidence)
 */
export function findInsights(
  days: DayFacts[],
  habits: Habit[],
  freezes: GlobalFreeze[],
): Comparison[] {
  const out: Comparison[] = []
  const live = habits.filter((h) => !h.archivedAt)

  // habit → that night
  for (const h of live) {
    for (const m of METRICS) {
      const c = compare(
        days,
        (d) =>
          d.date < h.createdDate || isFrozen(d.date, h, freezes)
            ? null
            : h.completions[d.date] === true,
        m.get,
        {
          subject: h.name,
          metric: m.metric,
          unit: m.unit,
          higherIsBetter: m.higherIsBetter,
          withLabel: 'בימים שבוצע',
          withoutLabel: 'בימים שלא',
        },
      )
      if (c) out.push(c)
    }
  }

  // training day → habit adherence
  const trainingVsHabits = compare(
    days,
    (d) => (d.habitPct == null ? null : d.trained),
    (d) => (d.habitPct == null ? undefined : d.habitPct * 100),
    {
      subject: 'ימי אימון',
      metric: 'ביצוע הרגלים',
      unit: '%',
      higherIsBetter: true,
      withLabel: 'בימי אימון',
      withoutLabel: 'בימי מנוחה',
    },
  )
  if (trainingVsHabits) out.push(trainingVsHabits)

  // last night's sleep → today's habit adherence (the lagged direction)
  const scores = days.filter((d) => d.sleepScore != null).map((d) => d.sleepScore!)
  if (scores.length >= MIN_GROUP * 2) {
    const median = [...scores].sort((a, b) => a - b)[Math.floor(scores.length / 2)]
    const byDate = new Map(days.map((d) => [d.date, d]))
    const lagged = compare(
      days,
      (d) => {
        const prev = byDate.get(shiftDate(d.date, -1))
        if (!prev?.sleepScore || d.habitPct == null) return null
        return prev.sleepScore >= median
      },
      (d) => (d.habitPct == null ? undefined : d.habitPct * 100),
      {
        subject: 'שינה טובה → יום אחרי',
        metric: 'ביצוע הרגלים',
        unit: '%',
        higherIsBetter: true,
        withLabel: 'אחרי לילה טוב',
        withoutLabel: 'אחרי לילה פחות טוב',
      },
    )
    if (lagged) out.push(lagged)
  }

  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
}

/** Shift an ISO date by whole days without pulling in a date library. */
function shiftDate(date: ISODate, days: number): ISODate {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(y, m - 1, d + days)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

/** How many days actually carry both habit data and health data. */
export function coverage(days: DayFacts[]): { withHabits: number; withSleep: number } {
  return {
    withHabits: days.filter((d) => d.habitPct != null).length,
    withSleep: days.filter((d) => d.sleepScore != null).length,
  }
}

/** Overall completion per day, for the heatmap. Frozen days come back as null. */
export function dailyCompletion(
  habits: Habit[],
  freezes: GlobalFreeze[],
  from: ISODate,
  to: ISODate,
): { date: ISODate; pct: number | null; frozen: boolean }[] {
  const live = habits.filter((h) => !h.archivedAt)
  const out: { date: ISODate; pct: number | null; frozen: boolean }[] = []
  for (let date = from; date <= to; date = shiftDate(date, 1)) {
    const globallyFrozen = isGloballyFrozen(date, freezes)
    const tracked = live.filter(
      (h) => h.createdDate <= date && !isFrozen(date, h, freezes),
    )
    out.push({
      date,
      pct: tracked.length
        ? tracked.filter((h) => h.completions[date]).length / tracked.length
        : null,
      frozen: globallyFrozen,
    })
  }
  return out
}
