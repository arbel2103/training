// Evidence-based fueling math for endurance training.
//
// The numbers follow mainstream sports-nutrition consensus (GSSI / ISSN
// position stands and standard endurance coaching practice):
//  - carbohydrate during exercise scales with duration: negligible under ~45
//    min, 30–60 g/h from ~1–2.5 h, and up to ~90 g/h beyond that but only with
//    multiple transportable carbohydrates (glucose+fructose), which the gut
//    has to be trained for.
//  - fluid 400–800 ml/h, pushed toward the top in heat.
//  - sodium ~300–600 mg per litre of fluid, higher for salty sweaters/heat.
//  - pre-exercise carbohydrate 1–4 g/kg depending on how long before the start.
//  - recovery: ~1.0–1.2 g/kg/h carbohydrate when the next session is soon, and
//    0.25–0.4 g/kg protein.
// All functions are pure so they can be unit tested.

import type { FuelSession } from './triLink'

export type Intensity = 'easy' | 'moderate' | 'hard'

export interface FuelInput {
  durationMin: number
  intensity: Intensity
  weightKg?: number
  /** hot/humid conditions push fluid and sodium up */
  hot?: boolean
  /** hours until the session starts, for the pre-workout plan */
  hoursUntil?: number
  /** whether another session follows within ~24 h (tightens recovery carbs) */
  nextSessionSoon?: boolean
}

export interface IntraPlan {
  /** grams of carbohydrate per hour */
  carbsPerHour: number
  /** total grams across the session */
  carbsTotal: number
  fluidMlPerHour: number
  fluidMlTotal: number
  sodiumMgPerHour: number
  /** true once glucose+fructose mixes are required to absorb the target */
  needsMultipleCarbSources: boolean
  note: string
}

export interface PrePlan {
  carbsGrams: number
  /** g/kg used, for transparency */
  carbsPerKg: number
  fluidMl: number
  sodiumMg: number
  timing: string
  note: string
}

export interface PostPlan {
  carbsGrams: number
  proteinGrams: number
  fluidMl: number
  note: string
}

export interface FuelPlan {
  pre: PrePlan
  intra: IntraPlan | null
  post: PostPlan
  durationMin: number
  intensity: Intensity
}

const DEFAULT_WEIGHT = 70
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const r5 = (v: number) => Math.round(v / 5) * 5
/** round up to the nearest 5 — used where a guideline sets a floor, so tidying
 *  the number never drops it under the minimum (1.6 g/kg protein → 112 → 115) */
const r5up = (v: number) => Math.ceil(v / 5) * 5
const r10 = (v: number) => Math.round(v / 10) * 10
const r25 = (v: number) => Math.round(v / 25) * 25

/** Carbohydrate per hour for a session of this length and intensity. */
export function carbsPerHour(durationMin: number, intensity: Intensity): number {
  if (durationMin < 45) return 0 // no fueling needed for a short session
  if (durationMin < 75) return intensity === 'easy' ? 0 : 30
  if (durationMin < 150) return intensity === 'hard' ? 60 : 45
  if (durationMin < 180) return 60
  // beyond ~3 h, go as high as the gut allows with mixed carb sources
  return intensity === 'easy' ? 75 : 90
}

/** Fluid per hour; heat pushes toward the upper end of the range. */
export function fluidMlPerHour(intensity: Intensity, hot = false): number {
  const base = intensity === 'hard' ? 650 : intensity === 'moderate' ? 550 : 450
  return clamp(hot ? base + 150 : base, 400, 900)
}

/** Sodium per hour, derived from fluid at ~300–600 mg per litre. */
export function sodiumMgPerHour(fluidPerHour: number, hot = false): number {
  const perLitre = hot ? 700 : 450
  return r25((fluidPerHour / 1000) * perLitre)
}

/** During-session plan; null when the session is too short to need fueling. */
export function intraPlan(input: FuelInput): IntraPlan | null {
  const { durationMin, intensity, hot } = input
  const perHour = carbsPerHour(durationMin, intensity)
  const hours = durationMin / 60
  const fluidPerHour = fluidMlPerHour(intensity, hot)
  if (perHour === 0) {
    if (durationMin < 45) return null
    // easy hour: no carbs needed, but still drink
    return {
      carbsPerHour: 0,
      carbsTotal: 0,
      fluidMlPerHour: fluidPerHour,
      fluidMlTotal: r25(fluidPerHour * hours),
      sodiumMgPerHour: sodiumMgPerHour(fluidPerHour, hot),
      needsMultipleCarbSources: false,
      note: 'אימון קצר וקל — מים מספיקים, אין צורך בפחמימות תוך כדי.',
    }
  }
  const needsMulti = perHour > 60
  return {
    carbsPerHour: perHour,
    carbsTotal: r5(perHour * hours),
    fluidMlPerHour: fluidPerHour,
    fluidMlTotal: r25(fluidPerHour * hours),
    sodiumMgPerHour: sodiumMgPerHour(fluidPerHour, hot),
    needsMultipleCarbSources: needsMulti,
    note: needsMulti
      ? 'מעל 60 ג׳/שעה צריך שילוב גלוקוז+פרוקטוז (2:1) כדי שהמעי יספיק לספוג — ואת זה מאמנים בהדרגה.'
      : 'התחל לצרוך אחרי כ-20 דקות וחלק למנות קטנות כל 15–20 דקות.',
  }
}

/** Pre-session plan; the carb load depends on how long before the start. */
export function prePlan(input: FuelInput): PrePlan {
  const { durationMin, intensity, hoursUntil = 2, hot } = input
  const kg = input.weightKg ?? DEFAULT_WEIGHT
  const long = durationMin >= 90

  // 1–4 g/kg, scaled by the available digestion window
  let perKg: number
  let timing: string
  if (hoursUntil <= 1) {
    perKg = 1
    timing = 'בשעה שלפני — מנה קטנה ונוחה לעיכול (בננה, ג׳ל, פרוסה עם דבש).'
  } else if (hoursUntil <= 2) {
    perKg = long ? 2 : 1.5
    timing = 'כשעתיים לפני — ארוחה קלה ודלת שומן וסיבים.'
  } else if (hoursUntil <= 4) {
    perKg = long ? 3 : 2
    timing = '3–4 שעות לפני — ארוחה מלאה מבוססת פחמימות.'
  } else {
    perKg = long ? 4 : 2.5
    timing = 'ארוחה מלאה מוקדם, ונשנוש פחמימתי קטן בשעה שלפני.'
  }
  if (intensity === 'easy' && !long) perKg = Math.min(perKg, 1)

  const fluid = r25(clamp(5 * kg, 300, 700))
  return {
    carbsGrams: r5(perKg * kg),
    carbsPerKg: perKg,
    fluidMl: fluid,
    sodiumMg: hot ? 500 : 300,
    timing,
    note: hot
      ? 'בחום — הקפד לשתות ולהוסיף נתרן כבר לפני היציאה, זה מקטין את הגירעון מההתחלה.'
      : 'העדף פחמימות פשוטות יחסית ומעט שומן/סיבים כדי למנוע אי-נוחות במעי.',
  }
}

/** Recovery plan; tighter when another session is coming soon. */
export function postPlan(input: FuelInput): PostPlan {
  const { durationMin, intensity, nextSessionSoon } = input
  const kg = input.weightKg ?? DEFAULT_WEIGHT
  const hours = durationMin / 60

  // 1.0–1.2 g/kg/h for the first hours only matters when turnaround is short
  const carbPerKg = nextSessionSoon
    ? 1.1
    : intensity === 'hard' || hours >= 1.5
      ? 0.8
      : 0.5
  const proteinPerKg = intensity === 'hard' || hours >= 1.5 ? 0.35 : 0.25

  return {
    carbsGrams: r5(carbPerKg * kg),
    proteinGrams: r5(proteinPerKg * kg),
    fluidMl: r25(clamp(hours * 700 * 1.3, 400, 2000)),
    note: nextSessionSoon
      ? 'יש אימון נוסף בקרוב — התחל לאכול בתוך 30–60 דקות, זה החלון שבו מילוי הגליקוגן הכי מהיר.'
      : 'אין לחץ של אימון קרוב — ארוחה מאוזנת בשעה-שעתיים הקרובות תעשה את העבודה.',
  }
}

export function buildFuelPlan(input: FuelInput): FuelPlan {
  return {
    pre: prePlan(input),
    intra: intraPlan(input),
    post: postPlan(input),
    durationMin: input.durationMin,
    intensity: input.intensity,
  }
}

/** Best guess at a session's intensity from what the plan/log says. */
export function sessionIntensity(s: FuelSession): Intensity {
  if (s.intensity === 'intense') return 'hard'
  if (s.intensity === 'easy' || s.intensity === 'technique') return 'easy'
  if (s.intensity === 'long') return 'moderate'
  if (s.sport === 'strength') return 'moderate'
  const label = (s.label ?? '').trim()
  if (/אינטרוול|מהיר|ספרינט|עצים|טמפו/.test(label)) return 'hard'
  if (/קל|התאוששות|רגוע/.test(label)) return 'easy'
  if ((s.durationMin ?? 0) >= 120) return 'moderate'
  return 'moderate'
}

/** Rough duration for a session that has no explicit one. */
export function sessionDurationMin(s: FuelSession): number {
  if (s.durationMin) return s.durationMin
  if (s.distance) {
    // crude pace assumptions, only used when the plan omits a duration
    if (s.sport === 'run') return Math.round(s.distance * 5.5)
    if (s.sport === 'bike') return Math.round(s.distance * 2)
    if (s.sport === 'swim') return Math.round((s.distance / 100) * 2)
  }
  return 60
}

/**
 * Daily macro targets from body weight and the day's training load.
 * Carbohydrate periodization: more carbs on heavy days, fewer on easy ones.
 */
export function dailyTargets(
  weightKg: number | undefined,
  trainingMinutes: number,
  burnedKcal?: number,
): { kcal?: number; carbs: number; protein: number; fat: number } {
  const kg = weightKg ?? DEFAULT_WEIGHT
  const hours = trainingMinutes / 60

  const carbsPerKg = hours >= 3 ? 8 : hours >= 1.5 ? 6 : hours >= 0.5 ? 4.5 : 3.5
  const proteinPerKg = hours >= 1.5 ? 1.8 : 1.6
  const fatPerKg = 1

  return {
    kcal: burnedKcal != null ? r10(burnedKcal) : undefined,
    carbs: r5(carbsPerKg * kg),
    protein: r5up(proteinPerKg * kg),
    fat: r5(fatPerKg * kg),
  }
}
