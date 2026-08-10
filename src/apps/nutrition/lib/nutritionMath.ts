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

/** Whether the session burns glycogen like endurance work, or is gym work. */
export type FuelSport = 'run' | 'bike' | 'swim' | 'strength' | 'other'

export const isEndurance = (sport?: FuelSport): boolean =>
  sport !== 'strength' && sport !== 'other'

export interface FuelInput {
  durationMin: number
  intensity: Intensity
  /** endurance vs gym work — they fuel very differently during the session */
  sport?: FuelSport
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

/**
 * Carbohydrate per hour during the session.
 *
 * Duration sets the band (nothing under ~45 min, 30–60 g/h up to ~2.5 h, up to
 * 90 g/h beyond that), and **intensity moves you within it**: the harder the
 * effort the more of the energy comes from carbohydrate rather than fat, so an
 * easy long ride needs meaningfully less per hour than a threshold session of
 * the same length.
 *
 * Strength/gym work is not endurance work — a normal 45–90 minute session
 * depletes little glycogen and needs no intra-workout feeding at all; what
 * matters there is what surrounds it.
 */
export function carbsPerHour(
  durationMin: number,
  intensity: Intensity,
  sport?: FuelSport,
): number {
  if (!isEndurance(sport)) {
    // only a genuinely long gym session justifies drinking carbs through it
    return durationMin >= 120 ? 30 : 0
  }
  // [ up to N minutes, easy, moderate, hard ] — grams per hour
  const BANDS: [number, number, number, number][] = [
    [45, 0, 0, 0], // nothing is needed this short
    [75, 0, 0, 30], // under ~75 min only a hard session benefits
    [90, 20, 30, 45],
    [150, 40, 50, 60], // the classic 30–60 g/h window
    [180, 55, 65, 75],
    [Infinity, 75, 90, 90], // needs glucose+fructose to be absorbed
  ]
  const band = BANDS.find(([maxMin]) => durationMin < maxMin)!
  return intensity === 'easy' ? band[1] : intensity === 'moderate' ? band[2] : band[3]
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
  const { durationMin, intensity, hot, sport } = input
  const perHour = carbsPerHour(durationMin, intensity, sport)
  const hours = durationMin / 60
  const fluidPerHour = fluidMlPerHour(intensity, hot)
  if (perHour === 0) {
    if (durationMin < 45) return null
    // long enough to need drinking, but not to need carbohydrate
    return {
      carbsPerHour: 0,
      carbsTotal: 0,
      fluidMlPerHour: fluidPerHour,
      fluidMlTotal: r25(fluidPerHour * hours),
      sodiumMgPerHour: sodiumMgPerHour(fluidPerHour, hot),
      needsMultipleCarbSources: false,
      note: isEndurance(sport)
        ? 'בעצימות הזו הגוף מסתמך בעיקר על שומן ועל מאגרי הגליקוגן — מים מספיקים.'
        : 'אימון כוח לא מרוקן גליקוגן כמו אימון סיבולת — מספיק לשתות. מה שחשוב הוא הארוחה שאחריו.',
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

/**
 * Pre-session carbohydrate in g/kg. Two independent things set it:
 *  - what the session actually demands (a 45-minute easy jog needs almost
 *    nothing; a 4-hour ride needs a real meal), and
 *  - how much time there is to digest, which caps how much can be eaten.
 * The 1–4 g/kg figure quoted in the literature is the pre-*event* range for
 * meaningful endurance sessions — it must not be applied to a short easy one.
 */
export function preCarbsPerKg(
  durationMin: number,
  intensity: Intensity,
  hoursUntil: number,
  sport?: FuelSport,
): number {
  let demand: number
  if (!isEndurance(sport)) {
    // a gym session needs to be fuelled, not carb-loaded for
    demand = durationMin >= 90 ? 1 : 0.5
  } else if (durationMin < 60) demand = intensity === 'hard' ? 0.75 : 0.3
  else if (durationMin < 90) demand = intensity === 'easy' ? 0.5 : 1
  else if (durationMin < 150) demand = intensity === 'easy' ? 1 : 2
  else if (durationMin < 240) demand = intensity === 'easy' ? 2 : 3
  else demand = 4

  // no matter the demand, a big load can't be digested right before the start
  const window = hoursUntil <= 1 ? 1 : hoursUntil <= 2 ? 2 : hoursUntil <= 3 ? 3 : 4
  return Math.min(demand, window)
}

/** Pre-session plan: how much to eat, and when. */
export function prePlan(input: FuelInput): PrePlan {
  const { durationMin, intensity, hoursUntil = 2, hot, sport } = input
  const kg = input.weightKg ?? DEFAULT_WEIGHT
  const perKg = preCarbsPerKg(durationMin, intensity, hoursUntil, sport)
  const grams = r5(perKg * kg)

  const timing =
    hoursUntil <= 1
      ? 'בשעה שלפני — מנה קטנה ונוחה לעיכול (בננה, ג׳ל, פרוסה עם דבש).'
      : hoursUntil <= 2
        ? 'כשעתיים לפני — ארוחה קלה ודלת שומן וסיבים.'
        : hoursUntil <= 3
          ? 'כ-3 שעות לפני — ארוחה מבוססת פחמימות.'
          : 'ארוחה מלאה מוקדם, ונשנוש פחמימתי קטן בשעה שלפני.'

  // a small load deserves an explanation, otherwise it reads like an error
  const light =
    perKg <= 0.5
      ? !isEndurance(sport)
        ? 'לפני אימון כוח מספיק משהו קל שמתעכל מהר — אין צורך בטעינת פחמימות.'
        : intensity === 'easy'
          ? 'אימון קצר וקל — אין צורך בטעינה. נשנוש קטן מספיק, ואפשר גם לצאת בלי.'
          : 'אימון קצר — מספיק נשנוש פחמימתי קל, בלי ארוחה גדולה.'
      : null

  const capped = perKg < preCarbsPerKg(durationMin, intensity, 99, sport)
  const cappedNote = capped
    ? ' יש לך מעט זמן לעכל, אז הכמות מוגבלת — השלם את השאר תוך כדי האימון.'
    : ''

  const fluid = r25(clamp(5 * kg, 300, 700))
  return {
    carbsGrams: grams,
    carbsPerKg: perKg,
    fluidMl: fluid,
    sodiumMg: hot ? 500 : 300,
    timing,
    note:
      (light ??
        (hot
          ? 'בחום — הקפד לשתות ולהוסיף נתרן כבר לפני היציאה, זה מקטין את הגירעון מההתחלה.'
          : 'העדף פחמימות פשוטות יחסית ומעט שומן/סיבים כדי למנוע אי-נוחות במעי.')) +
      cappedNote,
  }
}

/** Recovery plan; tighter when another session is coming soon. */
export function postPlan(input: FuelInput): PostPlan {
  const { durationMin, intensity, nextSessionSoon, sport } = input
  const kg = input.weightKg ?? DEFAULT_WEIGHT
  const hours = durationMin / 60
  const gym = !isEndurance(sport)

  // 1.0–1.2 g/kg/h for the first hours only matters when turnaround is short.
  // After gym work there is far less glycogen to replace — protein leads.
  const carbPerKg = gym
    ? 0.5
    : nextSessionSoon
      ? 1.1
      : intensity === 'hard' || hours >= 1.5
        ? 0.8
        : 0.5
  // 0.25–0.4 g/kg per serving; strength sits at the top of that range
  const proteinPerKg = gym || intensity === 'hard' || hours >= 1.5 ? 0.35 : 0.25

  return {
    carbsGrams: r5(carbPerKg * kg),
    proteinGrams: r5(proteinPerKg * kg),
    fluidMl: r25(clamp(hours * 700 * 1.3, 400, 2000)),
    note: gym
      ? 'אחרי אימון כוח החלבון הוא העיקר — מנה של 20–40 גרם בשעה שאחרי, עם פחמימה כדי לתמוך בהתאוששות.'
      : nextSessionSoon
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
  // 1.8–2.0 g/kg — the user's chosen band, at the upper end on heavy days
  const proteinPerKg = hours >= 1.5 ? 2 : 1.8
  const fatPerKg = 1

  return {
    kcal: burnedKcal != null ? r10(burnedKcal) : undefined,
    carbs: r5(carbsPerKg * kg),
    protein: r5up(proteinPerKg * kg),
    fat: r5(fatPerKg * kg),
  }
}
