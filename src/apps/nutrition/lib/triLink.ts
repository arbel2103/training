// The bridge to TriLife. All three mini-apps ship in one bundle and share one
// localStorage, so this is a plain cross-store read — no API, no sync layer.
import { useStore as useTriStore, type PlanSession, type WorkoutEntry } from '../../../store/useStore'
import { addDays, fromISO, toISODate, weekDays } from '../../../lib/dates'
import { entryDuration } from '../../../lib/calc'

export interface DayEnergy {
  date: string
  /** total kcal burned across the day (active + resting), from Garmin */
  totalBurned?: number
  /** kcal burned through movement/training */
  activeBurned?: number
  /** total − active; the baseline metabolic burn Garmin reports */
  restingBurned?: number
  steps?: number
}

/** Garmin's energy expenditure for a day (defaults to today). */
export function dayEnergy(dateISO?: string): DayEnergy {
  const date = dateISO ?? toISODate(new Date())
  const d = useTriStore.getState().garminDaily.find((x) => x.date === date)
  const total = d?.calories
  const active = d?.activeCalories
  return {
    date,
    totalBurned: total,
    activeBurned: active,
    restingBurned: total != null && active != null ? Math.max(0, total - active) : undefined,
    steps: d?.steps,
  }
}

/** A workout as the nutrition app cares about it: what, how long, how hard. */
export interface FuelSession {
  id: string
  date: string
  sport: PlanSession['sport']
  label?: string
  distance?: number
  durationMin?: number
  /** already logged as done */
  done: boolean
  /** 'intense' | 'long' | 'easy' | 'technique' when known */
  intensity?: string
}

/** Planned sessions for a date, taken from the TriLife training plan. */
export function plannedSessionsFor(dateISO: string): FuelSession[] {
  const { trainingPlan, log } = useTriStore.getState()
  if (!trainingPlan) return []
  const d = fromISO(dateISO)
  const weekStart = toISODate(weekDays(d)[0])
  const week = trainingPlan.weeks.find((w) => w.weekStart === weekStart)
  if (!week) return []
  const dayLog = log.filter((e) => e.date === dateISO)
  return week.sessions
    .filter((s) => s.day === d.getDay())
    .map((s) => ({
      id: s.id,
      date: dateISO,
      sport: s.sport,
      label: s.label,
      distance: s.distance,
      durationMin: s.durationMin,
      done: dayLog.some((e) =>
        s.sport === 'strength'
          ? e.category === 'strength'
          : s.sport === 'other'
            ? e.category === 'other'
            : e.category === 'aerobic' && e.sport === s.sport,
      ),
    }))
}

/** Workouts actually completed on a date, with real duration where known. */
export function completedOn(dateISO: string): FuelSession[] {
  return useTriStore
    .getState()
    .log.filter((e: WorkoutEntry) => e.date === dateISO)
    .map((e) => ({
      id: e.id,
      date: e.date,
      sport: e.category === 'aerobic' ? (e.sport ?? 'other') : e.category === 'strength' ? 'strength' : 'other',
      label: e.strengthName ?? e.otherName,
      distance: e.distance,
      durationMin: entryDuration(e) ?? e.durationMin,
      done: true,
      intensity: e.aerobicIntensity,
    })) as FuelSession[]
}

/** Today's and tomorrow's sessions — what fueling advice is built around. */
export function upcomingSessions(): { today: FuelSession[]; tomorrow: FuelSession[] } {
  const now = new Date()
  const todayISO = toISODate(now)
  const tomorrowISO = toISODate(addDays(now, 1))
  // prefer what was actually done today over what was merely planned
  const doneToday = completedOn(todayISO)
  const plannedToday = plannedSessionsFor(todayISO)
  return {
    today: plannedToday.length ? plannedToday : doneToday,
    tomorrow: plannedSessionsFor(tomorrowISO),
  }
}

/** Body weight from the latest TriLife weigh-in, for g/kg math. */
export function latestWeightKg(): number | undefined {
  const weighIns = useTriStore.getState().weighIns
  if (!weighIns.length) return undefined
  const latest = [...weighIns].sort((a, b) => b.date.localeCompare(a.date))[0]
  return latest?.weight
}
