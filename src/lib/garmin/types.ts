// Types for the Garmin data pipeline.
//
// The "raw" types mirror exactly what the Python sync script writes into the
// private data repo (already slimmed there). The "normalized" types are what
// the app persists and renders.

// ---- raw shapes committed by sync/garmin_sync.py -------------------------

export interface GarminDailySummary {
  totalSteps?: number
  totalKilocalories?: number
  activeKilocalories?: number
  restingHeartRate?: number
  minHeartRate?: number
  maxHeartRate?: number
  floorsAscended?: number
  moderateIntensityMinutes?: number
  vigorousIntensityMinutes?: number
  totalDistanceMeters?: number
}

export interface GarminSleep {
  score?: number
  totalSeconds?: number
  deepSeconds?: number
  lightSeconds?: number
  remSeconds?: number
  awakeSeconds?: number
  startLocal?: string
  endLocal?: string
}

export interface GarminHrv {
  lastNightAvg?: number
  weeklyAvg?: number
  status?: string
  baselineLow?: number
  baselineHigh?: number
}

export interface GarminSeries {
  avg?: number
  max?: number
  values?: [number, number][]
}

export interface GarminBodyBattery {
  charged?: number
  drained?: number
  high?: number
  low?: number
  values?: [number, number][]
}

export interface GarminHeartRate {
  resting?: number
  min?: number
  max?: number
  values?: [number, number][]
}

export interface GarminDailyBundle {
  summary?: GarminDailySummary
  sleep?: GarminSleep | null
  hrv?: GarminHrv | null
  stress?: GarminSeries | null
  bodyBattery?: GarminBodyBattery | null
  heartRate?: GarminHeartRate | null
  vo2max?: number | null
}

/** One month of daily bundles, keyed by yyyy-mm-dd. */
export type GarminDailyMonth = Record<string, GarminDailyBundle>

export interface GarminActivitySummary {
  activityId: number
  activityName?: string
  activityType: { typeKey: string }
  startTimeLocal?: string
  distance?: number // meters
  duration?: number // seconds
  movingDuration?: number
  averageHR?: number
  maxHR?: number
  calories?: number
  elevationGain?: number
  elevationLoss?: number
  averageSpeed?: number // m/s
  maxSpeed?: number
  averageRunningCadenceInStepsPerMinute?: number
  maxRunningCadenceInStepsPerMinute?: number
  avgGroundContactTime?: number
  avgVerticalOscillation?: number
  avgVerticalRatio?: number
  avgStrideLength?: number
  avgPower?: number
  maxPower?: number
  normPower?: number
  averageBikingCadenceInRevPerMinute?: number
  averageSwimCadenceInStrokesPerMinute?: number
  averageSwolf?: number
  poolLength?: number
  strokes?: number
  aerobicTrainingEffect?: number
  anaerobicTrainingEffect?: number
  vO2MaxValue?: number
}

/** One month of activity summaries, keyed by activityId (as a string). */
export type GarminActivityMonth = Record<string, GarminActivitySummary>

export interface GarminSplit {
  lapIndex?: number
  distance?: number
  duration?: number
  movingDuration?: number
  averageHR?: number
  maxHR?: number
  averageSpeed?: number
  maxSpeed?: number
  averageRunCadence?: number
  averagePower?: number
  elevationGain?: number
  startTimeLocal?: string
  averageSwolf?: number
  totalNumberOfStrokes?: number
}

export interface GarminHrZone {
  zoneNumber?: number
  secsInZone?: number
  zoneLowBoundary?: number
}

export interface GarminDetailStreams {
  descriptors: { index: number; key: string; unit?: string }[]
  rows: number[][]
}

export interface GarminActivityDetailBundle {
  activity?: unknown
  splits?: GarminSplit[]
  hrZones?: GarminHrZone[]
  details?: GarminDetailStreams | null
}

export interface GarminSyncStatusFile {
  lastSyncAt?: string
  ok?: boolean
  error?: string | null
  errorCode?: string | null
  daysSynced?: number
  rangeStart?: string
  rangeEnd?: string
  event?: string
  fake?: boolean
}

// ---- normalized shape the app persists ----------------------------------

/** One day of wellness data, slim enough to keep in localStorage. */
export interface DailyHealth {
  date: string // yyyy-mm-dd
  steps?: number
  calories?: number
  restingHr?: number
  maxHr?: number
  stressAvg?: number
  stressMax?: number
  bodyBatteryHigh?: number
  bodyBatteryLow?: number
  hrvLastNight?: number
  hrvWeeklyAvg?: number
  hrvStatus?: string
  sleepScore?: number
  sleepMin?: number
  deepMin?: number
  lightMin?: number
  remMin?: number
  awakeMin?: number
  sleepStart?: string // ISO local datetime
  sleepEnd?: string
  vo2max?: number
}
