/**
 * What to take in **during** a session — carbohydrate, fluid and sodium per
 * hour. Deliberately scoped to the workout itself; what to eat before and
 * after is a different question and is not answered here.
 *
 * The numbers follow the mainstream consensus:
 *
 * - **Carbohydrate is set by duration, then moved by intensity.** ACSM: nothing
 *   beyond a mouth rinse under ~45–75 min, 30–60 g/h for 1–2.5 h, and up to
 *   90 g/h beyond ~2.5–3 h. Intensity decides where inside the band you land —
 *   the harder the effort, the larger the share of energy coming from
 *   carbohydrate rather than fat, so an easy long ride needs meaningfully less
 *   per hour than a threshold session of the same length.
 * - **Above ~60 g/h you need two carbohydrate sources.** A single glucose-based
 *   carbohydrate saturates the SGLT1 intestinal transporter at roughly
 *   60 g/h (Jeukendrup); adding fructose, which crosses on GLUT5, lifts the
 *   oxidation ceiling to ~90 g/h at a ~2:1 glucose(or maltodextrin):fructose
 *   ratio. Targets that high also need the gut trained for them in advance.
 * - **Fluid 400–800 ml/h** — roughly what the gut can absorb — pushed up by
 *   heat and intensity.
 * - **Sodium is shown as a range on purpose.** Sweat sodium varies about
 *   ten-fold between people (~200 to >2000 mg/l). ~500–600 mg/h is the usual
 *   starting point without a sweat test, and salty sweaters in heat genuinely
 *   need 1000 mg/h and up. A single number here would be false precision.
 * - **Gym work is not endurance work.** A normal strength session barely dents
 *   glycogen; only a very long one justifies drinking carbohydrate through it.
 *
 * Everything is pure so it can be unit tested.
 */
import type { AerobicIntensity, PlanSession, Sport, WorkoutEntry } from '../store/useStore'

export type FuelIntensity = 'easy' | 'moderate' | 'hard'

/** An inclusive low–high range, for the figures individual variation dominates. */
export interface Range {
  low: number
  high: number
}

export interface FuelInput {
  durationMin: number
  intensity: FuelIntensity
  /** endurance work vs gym work — they fuel completely differently */
  endurance: boolean
  /** heat and humidity push fluid and sodium up */
  hot?: boolean
}

export type IntraFuel =
  | { needed: false; reason: string }
  | {
      needed: true
      carbsPerHour: number
      carbsTotal: number
      fluidMlPerHour: Range
      sodiumMgPerHour: Range
      durationMin: number
      /** the target is past the single-transporter ceiling (~60 g/h) */
      needsMixedCarbs: boolean
      /** the same session in heat — shown alongside rather than guessed at */
      hotWeather: { fluidMlPerHour: Range; sodiumMgPerHour: Range } | null
      notes: string[]
    }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const r5 = (v: number) => Math.round(v / 5) * 5
const r50 = (v: number) => Math.round(v / 50) * 50

/** Above this, one glucose-based source can no longer be absorbed fast enough. */
export const SINGLE_TRANSPORTER_CEILING = 60

/**
 * Carbohydrate per hour.
 *
 * `[ up to N minutes, easy, moderate, hard ]` — duration picks the row,
 * intensity picks the column.
 */
const CARB_BANDS: [number, number, number, number][] = [
  [45, 0, 0, 0], // nothing this short is worth fuelling
  [75, 0, 0, 30], // under ~75 min only a hard session benefits
  [90, 20, 30, 45],
  [150, 40, 50, 60], // the classic 30–60 g/h window
  [180, 55, 65, 75],
  [Infinity, 75, 90, 90], // needs glucose + fructose to be absorbed at all
]

export function carbsPerHour(
  durationMin: number,
  intensity: FuelIntensity,
  endurance = true,
): number {
  // only a genuinely long gym session justifies drinking carbohydrate through it
  if (!endurance) return durationMin >= 120 ? 30 : 0
  const band = CARB_BANDS.find(([maxMin]) => durationMin < maxMin)!
  return intensity === 'easy' ? band[1] : intensity === 'moderate' ? band[2] : band[3]
}

/** Fluid per hour, bounded by what the gut can actually absorb. */
export function fluidMlPerHour(intensity: FuelIntensity, hot = false): Range {
  const mid = intensity === 'hard' ? 650 : intensity === 'moderate' ? 550 : 450
  const base = hot ? mid + 150 : mid
  return { low: clamp(base - 100, 400, 800), high: clamp(base + 100, 400, 800) }
}

/**
 * Sodium per hour. A range, not a number — without a sweat test this is a
 * starting point to calibrate from, not a measurement.
 */
export function sodiumMgPerHour(
  durationMin: number,
  intensity: FuelIntensity,
  hot = false,
): Range {
  let low = intensity === 'hard' ? 500 : intensity === 'moderate' ? 400 : 300
  let high = low + 300
  if (durationMin >= 150) {
    // hours of sweating turn a small hourly deficit into a real one
    low += 100
    high += 200
  }
  if (hot) {
    low += 200
    high += 400
  }
  return { low: r50(clamp(low, 300, 1200)), high: r50(clamp(high, 400, 1800)) }
}

/** The during-session plan, or why there isn't one. */
export function intraFuel(input: FuelInput): IntraFuel {
  const { durationMin, intensity, endurance, hot } = input
  if (!(durationMin > 0)) return { needed: false, reason: 'אין משך לאימון' }

  const perHour = carbsPerHour(durationMin, intensity, endurance)
  const hours = durationMin / 60

  if (perHour === 0) {
    return {
      needed: false,
      reason: !endurance
        ? 'אימון כוח — אין צורך בפחמימות תוך כדי, מספיק לשתות'
        : durationMin < 45
          ? 'קצר מדי מכדי להזדקק לתדלוק — מים בלבד'
          : 'בעצימות הזו המאגרים מספיקים — מים בלבד',
    }
  }

  const notes: string[] = []
  const needsMixedCarbs = perHour > SINGLE_TRANSPORTER_CEILING
  if (needsMixedCarbs)
    notes.push(
      `מעל ${SINGLE_TRANSPORTER_CEILING} גר׳/שעה צריך שני מקורות פחמימה — גלוקוז (או מלטודקסטרין) ופרוקטוז ביחס 2:1, אחרת המעי לא מספיק לספוג.`,
    )
  if (perHour >= 75)
    notes.push('קצב כזה דורש הרגלה הדרגתית של המעי — אל תנסה אותו לראשונה בתחרות.')
  if (durationMin >= 90)
    notes.push('התחל לאכול מוקדם, בערך אחרי 20–30 דקות, ואל תחכה להרגיש ריק.')
  notes.push('כמות הנתרן היא נקודת פתיחה — מזיע מלוח דורש יותר, ושווה לכייל לפי משקל לפני ואחרי.')

  return {
    needed: true,
    carbsPerHour: perHour,
    carbsTotal: r5(perHour * hours),
    fluidMlPerHour: fluidMlPerHour(intensity, hot),
    sodiumMgPerHour: sodiumMgPerHour(durationMin, intensity, hot),
    durationMin,
    needsMixedCarbs,
    // the app has no weather, and heat changes fluid and sodium more than
    // anything else does — so show both columns instead of quietly picking one
    hotWeather: hot
      ? null
      : {
          fluidMlPerHour: fluidMlPerHour(intensity, true),
          sodiumMgPerHour: sodiumMgPerHour(durationMin, intensity, true),
        },
    notes,
  }
}

/* ---------------- deriving the inputs from what the app already knows ---------------- */

/** Endurance sessions burn glycogen; gym work doesn't, in these quantities. */
export const isEnduranceSport = (sport: PlanSession['sport']): boolean =>
  sport === 'run' || sport === 'bike' || sport === 'swim'

/** Words the user (or the coach) puts on a session that imply the effort. */
const HARD_WORDS = ['אינטרוול', 'עצים', 'ספרינט', 'סף', 'טמפו', 'מהיר', 'תחרות', 'הר']
const EASY_WORDS = ['קל', 'שחרור', 'התאוששות', 'טכניקה', 'רגוע', 'אירובי נמוך']

export function intensityFromLabel(label?: string): FuelIntensity | null {
  const t = (label ?? '').trim()
  if (!t) return null
  if (HARD_WORDS.some((w) => t.includes(w))) return 'hard'
  if (EASY_WORDS.some((w) => t.includes(w))) return 'easy'
  // "ארוכה" is a volume marker, not an easy one, but a long session is run
  // below threshold by definition
  if (t.includes('ארוכ')) return 'easy'
  return null
}

/** The board's explicit intensity, which beats guessing from a label. */
export function intensityFromPlanned(v?: AerobicIntensity): FuelIntensity | null {
  if (v === 'intense') return 'hard'
  if (v === 'easy' || v === 'long' || v === 'technique') return 'easy'
  return null
}

/**
 * Typical minutes per unit of distance for this athlete, from what they have
 * actually logged — so an estimated duration reflects their pace, not a
 * textbook one. Falls back to a sane default for a sport with no history.
 */
export function paceMinPerUnit(log: WorkoutEntry[], sport: Sport): number {
  const DEFAULTS: Record<Sport, number> = {
    run: 6, // min/km
    bike: 2, // min/km (≈30 km/h)
    swim: 2 / 100, // min/m (≈2:00 per 100 m)
  }
  const samples = log
    .filter(
      (e) =>
        e.category === 'aerobic' &&
        e.sport === sport &&
        (e.distance ?? 0) > 0 &&
        (e.durationMin ?? 0) > 0,
    )
    .map((e) => e.durationMin! / e.distance!)
    .sort((a, b) => a - b)
  if (samples.length < 3) return DEFAULTS[sport]
  return samples[Math.floor(samples.length / 2)] // median resists one odd session
}

/**
 * How long today's session will take: the planned duration when there is one,
 * otherwise distance at the athlete's own typical pace.
 */
export function sessionDurationMin(
  session: PlanSession,
  log: WorkoutEntry[],
): number | undefined {
  if (session.durationMin && session.durationMin > 0) return session.durationMin
  if (!isEnduranceSport(session.sport) || !session.distance) return undefined
  return Math.round(session.distance * paceMinPerUnit(log, session.sport as Sport))
}

/** Format a range the way it should read in Hebrew, low-to-high. */
export const formatRange = (r: Range, unit: string): string =>
  r.low === r.high ? `${r.low} ${unit}` : `${r.low}–${r.high} ${unit}`

/** Typical carbohydrate in one energy gel, grams. */
const GEL_CARBS = 25
/** Typical carbohydrate in a 500 ml bottle of ~6% sports drink, grams. */
const BOTTLE_CARBS = 30

/**
 * The hourly carbohydrate target as things you actually carry.
 *
 * "75 גר׳ לשעה" is a number; "בקבוק איזו + 2 ג׳לים" is a plan you can pack. A
 * bottle covers both the drinking and part of the carbohydrate, so it is
 * counted first and gels fill the gap.
 */
export function practicalCarbs(perHour: number): string | null {
  if (perHour <= 0) return null
  if (perHour <= GEL_CARBS) return `≈ ג׳ל אחד לשעה, או חצי בקבוק משקה איזוטוני`
  const gels = Math.round((perHour - BOTTLE_CARBS) / GEL_CARBS)
  const bottle = 'בקבוק משקה איזוטוני (500 מ״ל)'
  if (gels <= 0) return `≈ ${bottle} לשעה`
  return `≈ ${bottle} + ${gels === 1 ? 'ג׳ל' : `${gels} ג׳לים`} לשעה`
}
