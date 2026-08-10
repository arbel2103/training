// Pure conversions from raw Garmin JSON to the app's own types. No I/O — unit
// tested. Distance/pace/speed follow the app conventions in lib/calc.ts:
//   run  → distance km, paceSec sec/km
//   swim → distance meters, paceSec sec/100m
//   bike → distance km, speedKmh
import type { Category, Sport, WorkoutEntry } from '../../store/useStore'
import type { DailyHealth, GarminActivitySummary, GarminDailyBundle } from './types'
import { classifyIntensity } from './autoTag'

const RUN_KEYS = new Set([
  'running',
  'treadmill_running',
  'trail_running',
  'track_running',
  'indoor_running',
  'virtual_run',
  'obstacle_run',
])
const BIKE_KEYS = new Set([
  'cycling',
  'road_biking',
  'indoor_cycling',
  'virtual_ride',
  'mountain_biking',
  'gravel_cycling',
  'cyclocross',
  'bmx',
  'e_bike_fitness',
])
const SWIM_KEYS = new Set(['lap_swimming', 'open_water_swimming', 'swimming'])

export interface SportKind {
  category: Category
  sport?: Sport
}

/** Map a Garmin activityType.typeKey to the app's category/sport. */
export function sportFromTypeKey(typeKey: string): SportKind {
  const key = (typeKey || '').toLowerCase()
  if (RUN_KEYS.has(key)) return { category: 'aerobic', sport: 'run' }
  if (BIKE_KEYS.has(key)) return { category: 'aerobic', sport: 'bike' }
  if (SWIM_KEYS.has(key)) return { category: 'aerobic', sport: 'swim' }
  if (key.includes('strength')) return { category: 'strength' }
  // fall back on substrings for unlisted variants
  if (key.includes('run')) return { category: 'aerobic', sport: 'run' }
  if (key.includes('bik') || key.includes('cycl')) return { category: 'aerobic', sport: 'bike' }
  if (key.includes('swim')) return { category: 'aerobic', sport: 'swim' }
  return { category: 'other' }
}

const round = (n: number, d = 0): number => {
  const f = 10 ** d
  return Math.round(n * f) / f
}

/**
 * Normalize a Garmin sleep timestamp to an ISO string. Garmin's *Local fields
 * come as epoch-milliseconds encoding local wall-clock time, so reading them as
 * GMT (toISOString) yields the correct local HH:MM. Strings pass through.
 */
export function toIsoLocal(v?: string | number): string | undefined {
  if (v == null) return undefined
  if (typeof v === 'number') {
    const t = new Date(v)
    return Number.isNaN(t.getTime()) ? undefined : t.toISOString()
  }
  return v
}

/** "2026-08-01 06:30:00" → { date: "2026-08-01", time: "06:30" } */
export function splitStartLocal(s?: string): { date?: string; time?: string } {
  if (!s) return {}
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/)
  if (!m) return { date: s.slice(0, 10) || undefined }
  return { date: m[1], time: m[2] }
}

/**
 * Convert a Garmin activity summary to a log entry (without id).
 * `maxHrRef` (the athlete's highest recorded max HR) enables intensity
 * auto-tagging; without it the tag falls back to duration/distance.
 */
export function activityToEntry(
  a: GarminActivitySummary,
  maxHrRef?: number,
): Omit<WorkoutEntry, 'id'> {
  const kind = sportFromTypeKey(a.activityType?.typeKey ?? '')
  const { date, time } = splitStartLocal(a.startTimeLocal)
  const meters = a.distance ?? 0
  const seconds = a.duration ?? 0

  const entry: Omit<WorkoutEntry, 'id'> = {
    date: date ?? '',
    category: kind.category,
    source: 'garmin',
    garminActivityId: a.activityId,
    startTime: time,
    durationMin: seconds ? round(seconds / 60, 1) : undefined,
    avgHr: a.averageHR != null ? round(a.averageHR) : undefined,
    maxHr: a.maxHR != null ? round(a.maxHR) : undefined,
    calories: a.calories != null ? round(a.calories) : undefined,
    elevationGain: a.elevationGain != null ? round(a.elevationGain) : undefined,
  }

  if (kind.category === 'aerobic' && kind.sport) {
    entry.sport = kind.sport
    if (kind.sport === 'swim') {
      entry.distance = meters ? round(meters) : undefined
      if (meters && seconds) entry.paceSec = round(seconds / (meters / 100))
      entry.cadence =
        a.averageSwimCadenceInStrokesPerMinute != null
          ? round(a.averageSwimCadenceInStrokesPerMinute)
          : undefined
      if (a.averageSwolf != null) entry.swolf = round(a.averageSwolf, 1)
    } else if (kind.sport === 'bike') {
      const km = meters / 1000
      entry.distance = km ? round(km, 2) : undefined
      if (km && seconds) entry.speedKmh = round(km / (seconds / 3600), 1)
      entry.cadence =
        a.averageBikingCadenceInRevPerMinute != null
          ? round(a.averageBikingCadenceInRevPerMinute)
          : undefined
      if (a.avgPower != null) entry.power = round(a.avgPower)
      if (a.normPower != null) entry.normPower = round(a.normPower)
    } else {
      const km = meters / 1000
      entry.distance = km ? round(km, 2) : undefined
      if (km && seconds) entry.paceSec = round(seconds / km)
      entry.cadence =
        a.averageRunningCadenceInStepsPerMinute != null
          ? round(a.averageRunningCadenceInStepsPerMinute)
          : undefined
      if (a.avgGroundContactTime != null) entry.gct = round(a.avgGroundContactTime)
      if (a.avgVerticalOscillation != null)
        entry.verticalOscillation = round(a.avgVerticalOscillation, 1)
      if (a.avgStrideLength != null) entry.strideLength = round(a.avgStrideLength)
    }
  } else if (kind.category === 'strength') {
    entry.strengthName = a.activityName || 'אימון כוח'
  } else {
    entry.otherName = a.activityName || 'פעילות'
  }

  if (entry.category === 'aerobic') {
    const tag = classifyIntensity(
      {
        sport: entry.sport,
        distance: entry.distance,
        durationMin: entry.durationMin,
        avgHr: entry.avgHr,
      },
      maxHrRef,
    )
    if (tag) {
      entry.aerobicIntensity = tag
      entry.autoTagged = true
    }
  }

  return entry
}

const secToMin = (s?: number): number | undefined =>
  s != null ? Math.round(s / 60) : undefined

/** Convert a raw daily bundle to the slim DailyHealth the app persists. */
export function toDailyHealth(date: string, b: GarminDailyBundle): DailyHealth {
  const d: DailyHealth = { date }
  const s = b.summary
  if (s) {
    d.steps = s.totalSteps
    d.calories = s.totalKilocalories
    d.activeCalories = s.activeKilocalories
    d.restingHr = s.restingHeartRate
    d.maxHr = s.maxHeartRate
  }
  if (b.heartRate?.resting != null) d.restingHr = b.heartRate.resting
  if (b.stress) {
    d.stressAvg = b.stress.avg
    d.stressMax = b.stress.max
  }
  if (b.bodyBattery) {
    d.bodyBatteryHigh = b.bodyBattery.high
    d.bodyBatteryLow = b.bodyBattery.low
  }
  if (b.hrv) {
    d.hrvLastNight = b.hrv.lastNightAvg
    d.hrvWeeklyAvg = b.hrv.weeklyAvg
    d.hrvStatus = b.hrv.status
    d.hrvBaselineLow = b.hrv.baselineLow
    d.hrvBaselineHigh = b.hrv.baselineHigh
  }
  if (b.sleep) {
    d.sleepScore = b.sleep.score
    d.sleepMin = secToMin(b.sleep.totalSeconds)
    d.deepMin = secToMin(b.sleep.deepSeconds)
    d.lightMin = secToMin(b.sleep.lightSeconds)
    d.remMin = secToMin(b.sleep.remSeconds)
    d.awakeMin = secToMin(b.sleep.awakeSeconds)
    d.sleepStart = toIsoLocal(b.sleep.startLocal)
    d.sleepEnd = toIsoLocal(b.sleep.endLocal)
  }
  if (b.vo2max != null) d.vo2max = b.vo2max
  return d
}
